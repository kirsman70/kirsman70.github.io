/* ==========================================================
   workspace.html — course/material workspace logic
   --------------------------------------------------------
   Extracted from workspace.html's inline <script> so the browser
   can parse/cache it normally instead of the router eval()-ing it
   as a giant string on every navigation. Loaded via
   <script src="js/workspace.js"></script>, the same treatment
   auth.js and dashboard-widgets.js already get.

   PRACTICAL DIFFERENCE FROM THE OLD INLINE VERSION: router.js's
   loadExternalAsset() dedupes external scripts by URL (see
   loadedScriptSrcs in router.js) and only ever loads this file
   once per session — it will NOT re-run on subsequent visits to
   workspace.html the way the old inline block re-ran via eval()
   every time. Top-level state here (e.g. the module-scope `let`/
   `const` below) is set up once and then persists across SPA
   navigations, and the window/document-level listeners near the
   bottom of this file (copy/contextmenu/fullscreenchange/blur/
   kir:branch-color-change) are now attached exactly once instead
   of stacking a fresh duplicate copy on every revisit — so this
   also incidentally fixes the same "leftover listener" issue
   router.js's header comment describes for eval()'d pages. If any
   function here truly needs to reset per-visit, hook it to
   'kir:teardown' + a corresponding setup call instead of relying
   on the whole file re-running.
   ========================================================== */

  /* ----------------------------------------------------------
     Markdown+math rendering for course content (node titles/
     descriptions, voyage questions/options, material text bodies)
     PLUS the essay answer's WYSIWYG math/code editor below. This is
     a self-contained copy of the relevant pieces of admin-shared.js
     (kirRenderMarkdownWithMath, KIR_MATH_SNIPPETS,
     kirMathtext*ForEditor, kirWceToolbarHtml) — course.html doesn't
     load admin-shared.js (nothing here is admin-CRUD), so rather
     than pulling in that whole bundle just for these few pieces,
     they're kept local. js/wysiwyg-editor.js (loaded in <head>)
     expects KIR_MATH_SNIPPETS and kirMathtextEscapeBreaksForEditor
     to exist globally, same as it does on voyages.html.

     Math delimiters are protected from marked first (so LaTeX like
     "$x_1$" or "$a*b$" survives Markdown's underscore/asterisk
     rules), then swapped back in after marked runs, then MathJax
     picks them up on the typesetPromise() call that follows each
     render site below. ---------------------------------------- */
  if (window.marked) {
    marked.setOptions({ gfm: true, breaks: true });
  }

  // Word-style toolbar template list for the essay answer's math
  // chips — see js/wysiwyg-editor.js (kirRichToolbarMathInsert) for
  // how each ‹x› placeholder becomes a real fillable box rather than
  // a literal letter in raw text. Kept identical to admin-shared.js's
  // copy so a formula a member inserts here looks the same as one an
  // admin inserts in a voyage's "Teks Soal" field.
  const KIR_MATH_SNIPPETS = [
    { label: 'x²', title: 'Pangkat (superscript)', tex: '^{‹a›}' },
    { label: 'x₂', title: 'Bawah (subscript)', tex: '_{‹a›}' },
    { label: 'a/b', title: 'Pecahan', tex: '\\frac{‹a›}{‹b›}' },
    { label: '√', title: 'Akar kuadrat', tex: '\\sqrt{‹a›}' },
    { label: 'Σ', title: 'Penjumlahan (sigma)', tex: '\\sum_{i=1}^{n} ‹a›' },
    { label: '∫', title: 'Integral', tex: '\\int_{‹a›}^{‹b›}\\,dx' },
    { label: '→', title: 'Panah / reaksi', tex: '\\rightarrow ‹a›' },
    { label: 'π', title: 'Pi', tex: '\\pi ‹a›' },
    { label: 'Δ', title: 'Delta', tex: '\\Delta ‹a›' },
    { label: '≤', title: 'Kurang dari sama dengan', tex: '\\leq ‹a›' },
    { label: '≥', title: 'Lebih dari sama dengan', tex: '\\geq ‹a›' },
    { label: '$…$', title: 'Rumus baru (bebas)', tex: '$‹a›$' },
  ];

  // The rich editor stores every line break as a literal "\n" marker
  // rather than a real newline character (see kirRichEditorInit in
  // wysiwyg-editor.js), so pasted/typed content stays unambiguous.
  // These convert between that stored form and the editor/DOM forms.
  function kirMathtextBreaksToNewlines(raw) {
    return String(raw == null ? '' : raw).replace(/\\n/g, '\n');
  }

  function kirMathtextEscapeBreaksForEditor(raw) {
    return String(raw == null ? '' : raw).replace(/\r\n|\r|\n/g, '\\n');
  }

  function kirRenderCourseMarkdown(raw) {
    if (raw === null || raw === undefined) return '';
    const text = kirMathtextBreaksToNewlines(String(raw));
    if (!window.marked) return kirEscapeHtml(text);

    const mathBlocks = [];
    const stash = (m) => {
      mathBlocks.push(m);
      return `\u0000MATH${mathBlocks.length - 1}\u0000`;
    };
    const protectedText = text
      .replace(/\$\$[\s\S]+?\$\$/g, stash)
      .replace(/\$[^\$\n]+?\$/g, stash);

    let html = marked.parse(protectedText);
    html = html.replace(/\u0000MATH(\d+)\u0000/g, (_, i) => mathBlocks[Number(i)]);

    return window.DOMPurify ? DOMPurify.sanitize(html) : html;
  }

  // Re-typesets MathJax within a given element (or the whole document
  // if omitted). Called after any innerHTML write that may contain
  // $...$/$$...$$ so formulas actually render instead of sitting as
  // raw LaTeX text.
  function kirTypesetCourseMath(el) {
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise(el ? [el] : undefined);
    }
  }

  /* ----------------------------------------------------------
     Static 2D diagram renderer — "diagram", deliberately NOT
     "graph": course.html already uses "graph" everywhere for the
     course node tree itself (COURSE_GRAPH, #course-graph, the
     graphEl var at its render call site below), so reusing that
     word here would be a constant source of confusion in code and
     comments. Everything below says "diagram".

     Lets question/material/node-title Markdown embed a fenced code
     block like:

         ```diagram
         { "shapes": [ { "type": "polygon", "points": [[0,0],[4,0],[2,3]] } ] }
         ```

     `marked` already leaves a fenced block like that alone as
     <pre><code class="language-diagram">...raw JSON...</code></pre>
     (see kirRenderCourseMarkdown above) — kirRenderCourseDiagrams()
     runs *after* that Markdown render, directly on the resulting
     DOM, and swaps each such <pre> for a rendered inline <svg>.

     Why it's built this way:
     - The scene is plain JSON, not a DSL and not raw SVG/JS. That's
       what lets an AI course-generation pipeline produce diagrams
       reliably as structured output, and it's what keeps this
       renderer safe: every shape below is built with
       document.createElementNS from a fixed whitelist of shape
       types — the JSON is never eval'd and never assigned via
       innerHTML.
     - Shape coordinates are *logical* units the author picks freely
       (e.g. a triangle at [[0,0],[4,0],[2,3]]), never pixels.
       kirDiagramBuildSvg() computes a bounding box + padding over
       the whole scene and derives its own logical->pixel transform,
       so the AI generating the JSON never has to reason about
       canvas/pixel size.
     - Any shape/edge/vertex "label" is plain text run through the
       *same* kirRenderCourseMarkdown() (+ DOMPurify) path as every
       other string on this page, placed in a <foreignObject>, so a
       diagram label like "$x$" or "5 cm" is pixel-identical to math
       rendered anywhere else on the page — never a separately
       styled font. Labels are placed in a <g> drawn after (so on
       top of) all shape geometry, and auto-positioned (edge
       midpoint pushed away from the polygon centroid, angle labels
       along the bisector, etc.) so the AI only ever has to supply
       label text, not pixel offsets — an optional "offset": [dx,dy]
       (in the shape's own logical units) is there for manual
       overrides.
     - Static only for this pass: no drag/rotate/interactivity. The
       schema still names things per-vertex/per-edge (rather than,
       say, flattening a triangle into three unrelated line shapes)
       so a future editor UI or drag-handle layer has something
       sane to hang itself off later — it just isn't built yet.

     Shape types (v1): point, line, polygon, circle, angle-marker,
     axes, function-plot. See kirDiagramValidateShape() below for
     the exact fields each one accepts. ---------------------------------------- */

  const KIR_DIAGRAM_SHAPE_TYPES = [
    'point', 'line', 'polygon', 'circle', 'angle-marker', 'axes', 'function-plot',
  ];
  const KIR_DIAGRAM_MAX_SHAPES = 60; // sanity cap against pathological JSON, not a real product limit
  const KIR_DIAGRAM_SVG_NS = 'http://www.w3.org/2000/svg';
  // Rendered pixel footprint of a diagram: derived from the scene's
  // logical bounding box, then clamped into this range so a scene
  // with a huge logical range (e.g. xRange [-1000, 1000]) doesn't
  // shrink its strokes/labels into illegibility, and a tiny one
  // (e.g. a unit triangle) doesn't blow up past what's comfortable
  // inside a voyage/material modal.
  const KIR_DIAGRAM_TARGET_SPAN = 420;
  const KIR_DIAGRAM_MIN_SPAN = 180;
  const KIR_DIAGRAM_MAX_SPAN = 640;

  function kirDiagramIsFiniteNum(v) {
    return typeof v === 'number' && Number.isFinite(v);
  }
  function kirDiagramIsPoint(v) {
    return Array.isArray(v) && v.length === 2 && kirDiagramIsFiniteNum(v[0]) && kirDiagramIsFiniteNum(v[1]);
  }
  function kirDiagramIsRange(v) {
    return Array.isArray(v) && v.length === 2 && kirDiagramIsFiniteNum(v[0]) && kirDiagramIsFiniteNum(v[1]) && v[1] > v[0];
  }
  // A "label" on any shape/edge/vertex is either a plain string
  // (auto-placed) or { text, offset:[dx,dy] } for a manual override.
  // offset is in the *shape's own logical units*, applied before the
  // logical->pixel transform, so it behaves consistently regardless
  // of how big or small the final diagram renders.
  function kirDiagramNormalizeLabel(v) {
    if (typeof v === 'string') return { text: v, offset: null };
    if (v && typeof v === 'object' && typeof v.text === 'string') {
      return { text: v.text, offset: kirDiagramIsPoint(v.offset) ? v.offset : null };
    }
    throw new Error('label must be a string or {text, offset:[dx,dy]}');
  }
  // Deliberately narrow whitelist for any author-supplied color:
  // hex or a plain CSS color keyword. Nothing here ever reaches
  // innerHTML/eval regardless (values are only ever set via
  // setAttribute), but keeping this narrow means a stray value like
  // "url(...)" just gets dropped in favor of the theme default
  // rather than landing on a stroke/fill attribute unexamined.
  function kirDiagramSafeColor(v, fallback) {
    if (typeof v !== 'string') return fallback;
    if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return v;
    if (/^[a-zA-Z]{3,20}$/.test(v)) return v;
    return fallback;
  }
  function kirDiagramSafeNum(v, fallback, min, max) {
    if (!kirDiagramIsFiniteNum(v)) return fallback;
    if (typeof min === 'number' && v < min) return min;
    if (typeof max === 'number' && v > max) return max;
    return v;
  }
  function kirDiagramEvalFamily(shape, x) {
    // Not a general expression evaluator on purpose — "family" is a
    // closed enum of a few common shapes with purely numeric
    // params, so a function-plot can never carry an arbitrary
    // formula string that would need eval()/new Function() to run.
    // (For anything outside this enum, the author supplies "points"
    // directly instead — see kirDiagramValidateShape below.)
    const p = shape.params || {};
    if (shape.family === 'linear') return p.a * x + p.b;
    if (shape.family === 'quadratic') return p.a * x * x + p.b * x + p.c;
    if (shape.family === 'sine') return p.amplitude * Math.sin((2 * Math.PI / p.period) * x + p.phase) + p.vshift;
    return 0;
  }

  /* ---- validation: the whole scene is checked before any DOM is
     built, so a malformed diagram fails as one inline placeholder
     rather than a half-built SVG or an uncaught exception. ---- */
  function kirDiagramValidateScene(scene) {
    if (!scene || typeof scene !== 'object' || !Array.isArray(scene.shapes)) {
      throw new Error('scene must be an object with a "shapes" array');
    }
    if (scene.shapes.length < 1 || scene.shapes.length > KIR_DIAGRAM_MAX_SHAPES) {
      throw new Error(`"shapes" must have between 1 and ${KIR_DIAGRAM_MAX_SHAPES} entries`);
    }
    scene.shapes.forEach((shape, i) => {
      if (!shape || typeof shape !== 'object' || !KIR_DIAGRAM_SHAPE_TYPES.includes(shape.type)) {
        throw new Error(`shapes[${i}]: "type" must be one of ${KIR_DIAGRAM_SHAPE_TYPES.join(', ')}`);
      }
      kirDiagramValidateShape(shape, i);
    });
    return scene;
  }

  function kirDiagramValidateShape(s, i) {
    const err = (msg) => { throw new Error(`shapes[${i}] (${s.type}): ${msg}`); };
    switch (s.type) {
      case 'point':
        if (!kirDiagramIsPoint(s.at)) err('"at" must be [x, y]');
        if (s.label !== undefined) kirDiagramNormalizeLabel(s.label);
        break;
      case 'line':
        if (!kirDiagramIsPoint(s.from)) err('"from" must be [x, y]');
        if (!kirDiagramIsPoint(s.to)) err('"to" must be [x, y]');
        if (s.label !== undefined) kirDiagramNormalizeLabel(s.label);
        break;
      case 'polygon':
        if (!Array.isArray(s.points) || s.points.length < 3 || !s.points.every(kirDiagramIsPoint)) {
          err('"points" must be an array of at least 3 [x, y] pairs');
        }
        ['vertexLabels', 'edgeLabels'].forEach((key) => {
          if (s[key] === undefined) return;
          if (!Array.isArray(s[key])) err(`"${key}" must be an array`);
          s[key].forEach((l) => { if (l !== null && l !== undefined) kirDiagramNormalizeLabel(l); });
        });
        break;
      case 'circle':
        if (!kirDiagramIsPoint(s.center)) err('"center" must be [x, y]');
        if (!kirDiagramIsFiniteNum(s.radius) || s.radius <= 0) err('"radius" must be a positive number');
        if (s.label !== undefined) kirDiagramNormalizeLabel(s.label);
        break;
      case 'angle-marker':
        if (!kirDiagramIsPoint(s.vertex)) err('"vertex" must be [x, y]');
        if (!kirDiagramIsPoint(s.from)) err('"from" must be [x, y]');
        if (!kirDiagramIsPoint(s.to)) err('"to" must be [x, y]');
        if (s.label !== undefined) kirDiagramNormalizeLabel(s.label);
        break;
      case 'axes':
        if (!kirDiagramIsRange(s.xRange)) err('"xRange" must be [min, max] with max > min');
        if (!kirDiagramIsRange(s.yRange)) err('"yRange" must be [min, max] with max > min');
        if (s.xLabel !== undefined) kirDiagramNormalizeLabel(s.xLabel);
        if (s.yLabel !== undefined) kirDiagramNormalizeLabel(s.yLabel);
        break;
      case 'function-plot':
        if (!kirDiagramIsRange(s.xRange)) err('"xRange" must be [min, max] with max > min');
        if (s.points !== undefined) {
          if (!Array.isArray(s.points) || !s.points.every(kirDiagramIsPoint)) err('"points" must be an array of [x, y] pairs');
        } else if (s.family !== undefined) {
          if (!['linear', 'quadratic', 'sine'].includes(s.family)) err('"family" must be "linear", "quadratic", or "sine"');
          const p = s.params || {};
          const need = { linear: ['a', 'b'], quadratic: ['a', 'b', 'c'], sine: ['amplitude', 'period', 'phase', 'vshift'] }[s.family];
          need.forEach((k) => { if (!kirDiagramIsFiniteNum(p[k])) err(`params.${k} must be a number for family "${s.family}"`); });
        } else {
          err('needs either "points" (explicit [x,y] samples) or "family" + "params"');
        }
        if (s.label !== undefined) kirDiagramNormalizeLabel(s.label);
        break;
    }
  }

  // Every logical point a shape contributes, for the scene-wide
  // bounding-box pass in kirDiagramBuildSvg() below.
  function kirDiagramCollectPoints(shape) {
    switch (shape.type) {
      case 'point': return [shape.at];
      case 'line': return [shape.from, shape.to];
      case 'polygon': return shape.points;
      case 'circle': {
        const [cx, cy] = shape.center; const r = shape.radius;
        return [[cx - r, cy - r], [cx + r, cy + r]];
      }
      case 'angle-marker': return [shape.vertex, shape.from, shape.to];
      case 'axes': {
        const [x0, x1] = shape.xRange; const [y0, y1] = shape.yRange;
        return [[x0, y0], [x1, y1]];
      }
      case 'function-plot': {
        if (Array.isArray(shape.points)) return shape.points;
        const [x0, x1] = shape.xRange;
        return [[x0, kirDiagramEvalFamily(shape, x0)], [x1, kirDiagramEvalFamily(shape, x1)]];
      }
      default: return [];
    }
  }

  function kirDiagramEl(tag, attrs) {
    const el = document.createElementNS(KIR_DIAGRAM_SVG_NS, tag);
    if (attrs) Object.keys(attrs).forEach((k) => el.setAttribute(k, attrs[k]));
    return el;
  }

  // Shared arrowhead marker for axes (and any "line" opting into
  // arrowStart/arrowEnd) — defined once per <svg>, referenced by
  // url(#id) from whichever shapes want it.
  function kirDiagramEnsureDefs(svg) {
    const defs = kirDiagramEl('defs');
    const marker = kirDiagramEl('marker', {
      id: 'kir-diagram-arrow', viewBox: '0 0 10 10', refX: '8', refY: '5',
      markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse',
    });
    marker.appendChild(kirDiagramEl('path', { d: 'M0,0 L10,5 L0,10 z', class: 'kir-diagram-arrowhead' }));
    defs.appendChild(marker);
    svg.appendChild(defs);
  }

  // Places `text` (run through the page's normal Markdown+math
  // pipeline, same as every other string on this page) centered on
  // pixel point `anchor`, nudged by `offsetPx`. The foreignObject
  // itself is a 1x1 dummy box with overflow:visible — combined with
  // the centering transform on the inner div (see the .kir-diagram-
  // label rule in the CSS block above the closing </style>), this
  // means the box never has to predict the rendered text's width,
  // so labels of any length just work without measurement.
  function kirDiagramMakeLabel(job) {
    const [px, py] = job.anchor;
    const [ox, oy] = job.offsetPx || [0, 0];
    const fo = kirDiagramEl('foreignObject', {
      x: (px + ox).toFixed(1), y: (py + oy).toFixed(1), width: '1', height: '1',
      style: 'overflow: visible;',
    });
    const div = document.createElement('div');
    div.className = 'kir-diagram-label kir-markdown';
    div.innerHTML = kirRenderCourseMarkdown(job.text);
    fo.appendChild(div);
    return fo;
  }

  function kirDiagramPerpOffsetPx(x1, y1, x2, y2, dist) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    return [(-dy / len) * dist, (dx / len) * dist];
  }

  function kirDiagramDrawPoint(s, g, toPx, labelJobs, scale) {
    const [px, py] = toPx(s.at);
    const style = s.style || {};
    const el = kirDiagramEl('circle', {
      cx: px.toFixed(1), cy: py.toFixed(1),
      r: String(kirDiagramSafeNum(style.radius, 3.5, 1, 12)),
      class: 'kir-diagram-point',
    });
    if (style.color) el.setAttribute('fill', kirDiagramSafeColor(style.color, ''));
    g.appendChild(el);
    if (s.label) {
      const label = kirDiagramNormalizeLabel(s.label);
      const off = label.offset ? [label.offset[0] * scale, -label.offset[1] * scale] : [10, -10];
      labelJobs.push({ anchor: [px, py], offsetPx: off, text: label.text });
    }
  }

  function kirDiagramDrawLine(s, g, toPx, labelJobs, scale) {
    const [x1, y1] = toPx(s.from), [x2, y2] = toPx(s.to);
    const style = s.style || {};
    const el = kirDiagramEl('line', { x1: x1.toFixed(1), y1: y1.toFixed(1), x2: x2.toFixed(1), y2: y2.toFixed(1), class: 'kir-diagram-line' });
    if (style.color) el.setAttribute('stroke', kirDiagramSafeColor(style.color, ''));
    el.setAttribute('stroke-width', String(kirDiagramSafeNum(style.width, 2, 0.5, 8)));
    if (style.dashed) el.setAttribute('stroke-dasharray', '6 5');
    if (style.arrowEnd) el.setAttribute('marker-end', 'url(#kir-diagram-arrow)');
    if (style.arrowStart) el.setAttribute('marker-start', 'url(#kir-diagram-arrow)');
    g.appendChild(el);
    if (s.label) {
      const label = kirDiagramNormalizeLabel(s.label);
      const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
      const off = label.offset ? [label.offset[0] * scale, -label.offset[1] * scale] : kirDiagramPerpOffsetPx(x1, y1, x2, y2, 16);
      labelJobs.push({ anchor: [midX, midY], offsetPx: off, text: label.text });
    }
  }

  function kirDiagramDrawPolygon(s, g, toPx, labelJobs, scale) {
    const pxPoints = s.points.map(toPx);
    const closed = s.closed !== false;
    const style = s.style || {};
    const el = kirDiagramEl(closed ? 'polygon' : 'polyline', {
      points: pxPoints.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' '),
      class: 'kir-diagram-polygon',
    });
    if (style.color) el.setAttribute('stroke', kirDiagramSafeColor(style.color, ''));
    el.setAttribute('stroke-width', String(kirDiagramSafeNum(style.width, 2, 0.5, 8)));
    if (s.fill) {
      el.setAttribute('fill', kirDiagramSafeColor(style.fillColor, 'currentColor'));
      el.setAttribute('fill-opacity', String(kirDiagramSafeNum(style.fillOpacity, 0.12, 0, 1)));
    } else {
      el.setAttribute('fill', 'none');
    }
    g.appendChild(el);

    // Auto-placement anchor for vertex/edge labels: push away from
    // the polygon's own centroid, so labels land outside the shape
    // (on a convex polygon, which covers triangle/square/rectangle —
    // the shapes this is meant for) rather than overlapping it.
    const cx = pxPoints.reduce((a, p) => a + p[0], 0) / pxPoints.length;
    const cy = pxPoints.reduce((a, p) => a + p[1], 0) / pxPoints.length;

    (s.vertexLabels || []).forEach((raw, i) => {
      if (!raw || !pxPoints[i]) return;
      const label = kirDiagramNormalizeLabel(raw);
      const [px, py] = pxPoints[i];
      const dx = px - cx, dy = py - cy; const len = Math.hypot(dx, dy) || 1;
      const off = label.offset ? [label.offset[0] * scale, -label.offset[1] * scale] : [(dx / len) * 16, (dy / len) * 16];
      labelJobs.push({ anchor: [px, py], offsetPx: off, text: label.text });
    });
    (s.edgeLabels || []).forEach((raw, i) => {
      if (!raw) return;
      if (!closed && i === pxPoints.length - 1) return; // no closing edge on an open polyline
      const a = pxPoints[i], b = pxPoints[(i + 1) % pxPoints.length];
      if (!a || !b) return;
      const label = kirDiagramNormalizeLabel(raw);
      const midX = (a[0] + b[0]) / 2, midY = (a[1] + b[1]) / 2;
      const dx = midX - cx, dy = midY - cy; const len = Math.hypot(dx, dy) || 1;
      const off = label.offset ? [label.offset[0] * scale, -label.offset[1] * scale] : [(dx / len) * 14, (dy / len) * 14];
      labelJobs.push({ anchor: [midX, midY], offsetPx: off, text: label.text });
    });
  }

  function kirDiagramDrawCircle(s, g, toPx, labelJobs, scale) {
    const [cx, cy] = toPx(s.center);
    const r = s.radius * scale;
    const style = s.style || {};
    const el = kirDiagramEl('circle', { cx: cx.toFixed(1), cy: cy.toFixed(1), r: r.toFixed(1), class: 'kir-diagram-circle' });
    if (style.color) el.setAttribute('stroke', kirDiagramSafeColor(style.color, ''));
    el.setAttribute('stroke-width', String(kirDiagramSafeNum(style.width, 2, 0.5, 8)));
    if (style.fill) {
      el.setAttribute('fill', kirDiagramSafeColor(style.fillColor, 'currentColor'));
      el.setAttribute('fill-opacity', String(kirDiagramSafeNum(style.fillOpacity, 0.12, 0, 1)));
    } else {
      el.setAttribute('fill', 'none');
    }
    g.appendChild(el);
    if (s.label) {
      const label = kirDiagramNormalizeLabel(s.label);
      const off = label.offset ? [label.offset[0] * scale, -label.offset[1] * scale] : [0, -(r + 16)];
      labelJobs.push({ anchor: [cx, cy], offsetPx: off, text: label.text });
    }
  }

  function kirDiagramDrawAngleMarker(s, g, toPx, labelJobs, scale) {
    const v = toPx(s.vertex), a = toPx(s.from), b = toPx(s.to);
    const style = s.style || {};
    const rPx = kirDiagramSafeNum(s.radius, 0.6, 0.05, 1000) * scale;
    const angA = Math.atan2(a[1] - v[1], a[0] - v[0]);
    const angB = Math.atan2(b[1] - v[1], b[0] - v[0]);
    // Always draw the *minor* (shorter-sweep) arc between the two
    // rays — that's the geometrically meaningful angle for the
    // course-content case this is meant for (marking ∠A of a
    // triangle, two intersecting lines, etc.).
    let delta = angB - angA;
    while (delta <= -Math.PI) delta += 2 * Math.PI;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    const sweep = delta >= 0 ? 1 : 0;
    const endAng = angA + delta;
    const startX = v[0] + rPx * Math.cos(angA), startY = v[1] + rPx * Math.sin(angA);
    const endX = v[0] + rPx * Math.cos(endAng), endY = v[1] + rPx * Math.sin(endAng);
    const d = `M ${startX.toFixed(1)} ${startY.toFixed(1)} A ${rPx.toFixed(1)} ${rPx.toFixed(1)} 0 0 ${sweep} ${endX.toFixed(1)} ${endY.toFixed(1)}`;
    const path = kirDiagramEl('path', { d, class: 'kir-diagram-angle-arc', fill: 'none' });
    if (style.color) path.setAttribute('stroke', kirDiagramSafeColor(style.color, ''));
    g.appendChild(path);
    if (s.label) {
      const label = kirDiagramNormalizeLabel(s.label);
      const bisector = angA + delta / 2;
      const labelR = rPx + 14;
      const anchor = [v[0] + labelR * Math.cos(bisector), v[1] + labelR * Math.sin(bisector)];
      const off = label.offset ? [label.offset[0] * scale, -label.offset[1] * scale] : [0, 0];
      labelJobs.push({ anchor, offsetPx: off, text: label.text });
    }
  }

  function kirDiagramDrawAxes(s, g, toPx, labelJobs, scale) {
    const [x0, x1] = s.xRange, [y0, y1] = s.yRange;
    const step = kirDiagramSafeNum(s.step, 1, 1e-6, Math.max(x1 - x0, y1 - y0));
    if (s.showGrid !== false) {
      for (let x = Math.ceil(x0 / step) * step; x <= x1 + 1e-9; x += step) {
        const [px1, py1] = toPx([x, y0]); const [px2, py2] = toPx([x, y1]);
        g.appendChild(kirDiagramEl('line', { x1: px1.toFixed(1), y1: py1.toFixed(1), x2: px2.toFixed(1), y2: py2.toFixed(1), class: 'kir-diagram-grid-line' }));
      }
      for (let y = Math.ceil(y0 / step) * step; y <= y1 + 1e-9; y += step) {
        const [px1, py1] = toPx([x0, y]); const [px2, py2] = toPx([x1, y]);
        g.appendChild(kirDiagramEl('line', { x1: px1.toFixed(1), y1: py1.toFixed(1), x2: px2.toFixed(1), y2: py2.toFixed(1), class: 'kir-diagram-grid-line' }));
      }
    }
    // Bold axis lines through 0 — only drawn if 0 actually falls
    // within the given range (a scene doesn't have to include the
    // origin at all, e.g. xRange [10, 20]).
    if (x0 <= 0 && 0 <= x1) {
      const [px1, py1] = toPx([0, y0]); const [px2, py2] = toPx([0, y1]);
      g.appendChild(kirDiagramEl('line', { x1: px1.toFixed(1), y1: py1.toFixed(1), x2: px2.toFixed(1), y2: py2.toFixed(1), class: 'kir-diagram-axis-line', 'marker-end': 'url(#kir-diagram-arrow)' }));
      if (s.yLabel) {
        const label = kirDiagramNormalizeLabel(s.yLabel);
        const off = label.offset ? [label.offset[0] * scale, -label.offset[1] * scale] : [14, -6];
        labelJobs.push({ anchor: [px2, py2], offsetPx: off, text: label.text });
      }
    }
    if (y0 <= 0 && 0 <= y1) {
      const [px1, py1] = toPx([x0, 0]); const [px2, py2] = toPx([x1, 0]);
      g.appendChild(kirDiagramEl('line', { x1: px1.toFixed(1), y1: py1.toFixed(1), x2: px2.toFixed(1), y2: py2.toFixed(1), class: 'kir-diagram-axis-line', 'marker-end': 'url(#kir-diagram-arrow)' }));
      if (s.xLabel) {
        const label = kirDiagramNormalizeLabel(s.xLabel);
        const off = label.offset ? [label.offset[0] * scale, -label.offset[1] * scale] : [16, 10];
        labelJobs.push({ anchor: [px2, py2], offsetPx: off, text: label.text });
      }
    }
  }

  function kirDiagramDrawFunctionPlot(s, g, toPx, labelJobs, scale) {
    const style = s.style || {};
    let pts;
    if (Array.isArray(s.points)) {
      pts = s.points;
    } else {
      const [x0, x1] = s.xRange;
      const n = Math.round(kirDiagramSafeNum(s.samples, 60, 10, 300));
      pts = [];
      for (let i = 0; i <= n; i++) {
        const x = x0 + (x1 - x0) * (i / n);
        pts.push([x, kirDiagramEvalFamily(s, x)]);
      }
    }
    const pxPoints = pts.map(toPx);
    const d = pxPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    const path = kirDiagramEl('path', { d, class: 'kir-diagram-plot', fill: 'none' });
    if (style.color) path.setAttribute('stroke', kirDiagramSafeColor(style.color, ''));
    path.setAttribute('stroke-width', String(kirDiagramSafeNum(style.width, 2.5, 0.5, 8)));
    g.appendChild(path);
    if (s.label) {
      const label = kirDiagramNormalizeLabel(s.label);
      const last = pxPoints[pxPoints.length - 1];
      const off = label.offset ? [label.offset[0] * scale, -label.offset[1] * scale] : [8, -14];
      labelJobs.push({ anchor: last, offsetPx: off, text: label.text });
    }
  }

  function kirDiagramDrawShape(s, g, toPx, labelJobs, scale) {
    switch (s.type) {
      case 'point': return kirDiagramDrawPoint(s, g, toPx, labelJobs, scale);
      case 'line': return kirDiagramDrawLine(s, g, toPx, labelJobs, scale);
      case 'polygon': return kirDiagramDrawPolygon(s, g, toPx, labelJobs, scale);
      case 'circle': return kirDiagramDrawCircle(s, g, toPx, labelJobs, scale);
      case 'angle-marker': return kirDiagramDrawAngleMarker(s, g, toPx, labelJobs, scale);
      case 'axes': return kirDiagramDrawAxes(s, g, toPx, labelJobs, scale);
      case 'function-plot': return kirDiagramDrawFunctionPlot(s, g, toPx, labelJobs, scale);
    }
  }

  // Scene JSON -> <svg>. Assumes kirDiagramValidateScene() already
  // passed — this only throws for the one case validation can't
  // catch structurally (a scene with coordinates that somehow still
  // produce an empty/non-finite bounding box).
  function kirDiagramBuildSvg(scene) {
    const shapes = scene.shapes;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    shapes.forEach((s) => {
      kirDiagramCollectPoints(s).forEach(([x, y]) => {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      });
    });
    if (!Number.isFinite(minX) || !Number.isFinite(minY)) throw new Error('scene has no usable coordinates');

    // Padding in logical units, proportional to the scene's own
    // size (with a floor so a single short segment still gets
    // breathing room for its label).
    const spanX = Math.max(maxX - minX, 1e-6);
    const spanY = Math.max(maxY - minY, 1e-6);
    const pad = Math.max(spanX, spanY) * 0.18 + 0.6;
    minX -= pad; maxX += pad; minY -= pad; maxY += pad;

    const boundsSpanX = maxX - minX, boundsSpanY = maxY - minY;
    let scale = KIR_DIAGRAM_TARGET_SPAN / Math.max(boundsSpanX, boundsSpanY);
    const longestPx = Math.max(boundsSpanX, boundsSpanY) * scale;
    if (longestPx < KIR_DIAGRAM_MIN_SPAN) scale *= KIR_DIAGRAM_MIN_SPAN / longestPx;
    if (longestPx > KIR_DIAGRAM_MAX_SPAN) scale *= KIR_DIAGRAM_MAX_SPAN / longestPx;

    const width = boundsSpanX * scale, height = boundsSpanY * scale;
    // logical -> pixel, flipping Y so +y points up like a math
    // diagram (the JSON author's mental model), not down like the DOM.
    const toPx = ([x, y]) => [(x - minX) * scale, (maxY - y) * scale];

    const svg = kirDiagramEl('svg', {
      viewBox: `0 0 ${width.toFixed(1)} ${height.toFixed(1)}`,
      width: String(Math.round(width)),
      height: String(Math.round(height)),
      class: 'kir-diagram-svg',
      role: 'img',
    });
    kirDiagramEnsureDefs(svg);
    const shapesG = kirDiagramEl('g', { class: 'kir-diagram-shapes' });
    const labelsG = kirDiagramEl('g', { class: 'kir-diagram-labels' });
    svg.appendChild(shapesG);
    svg.appendChild(labelsG);

    const labelJobs = []; // collected while drawing shapes, rendered after so labels sit on top
    shapes.forEach((s) => kirDiagramDrawShape(s, shapesG, toPx, labelJobs, scale));
    labelJobs.forEach((job) => labelsG.appendChild(kirDiagramMakeLabel(job)));

    return svg;
  }

  // Entry point — call BEFORE kirTypesetCourseMath(el) at each of
  // its call sites (see the four sites below) so foreignObject-
  // embedded $...$ labels get picked up by that same MathJax sweep,
  // without a second typeset call.
  function kirRenderCourseDiagrams(el) {
    if (!el) return;
    el.querySelectorAll('code.language-diagram').forEach((code) => {
      const pre = code.closest('pre') || code;
      let svg;
      try {
        const scene = JSON.parse(code.textContent);
        kirDiagramValidateScene(scene);
        svg = kirDiagramBuildSvg(scene);
      } catch (e) {
        // Fail visibly but locally — one broken diagram becomes an
        // inline placeholder (with the actual reason, to make the
        // AI-generation prompt/pipeline easy to debug against),
        // never an uncaught exception that blanks the whole modal.
        const placeholder = document.createElement('div');
        placeholder.className = 'kir-diagram kir-diagram-error';
        placeholder.innerHTML = `<span class="kir-diagram-error-icon">⚠</span> Diagram tidak dapat ditampilkan: ${kirEscapeHtml(e.message)}`;
        pre.replaceWith(placeholder);
        return;
      }
      const wrap = document.createElement('div');
      wrap.className = 'kir-diagram';
      wrap.appendChild(svg);
      pre.replaceWith(wrap);
    });
  }

  // Toolbar markup for the essay answer's WYSIWYG editor — identical
  // to admin-shared.js's kirWceToolbarHtml. The buttons call into
  // js/wysiwyg-editor.js, which actually inserts a fillable
  // formula/code chip at the cursor.
  function kirWceToolbarHtml(inputId) {
    const mathButtons = KIR_MATH_SNIPPETS.map((s, i) =>
      `<button type="button" class="math-toolbar-btn" title="${kirEscapeHtml(s.title)}" onmousedown="event.preventDefault()" onclick="kirRichToolbarMathInsert('${inputId}', ${i})">${s.label}</button>`
    ).join('');
    return `
      <div class="math-editor-toolbar" role="toolbar" aria-label="Sisipkan notasi matematika dan kode">
        ${mathButtons}
        <button type="button" class="math-toolbar-btn math-toolbar-btn-wide" title="Sisipkan kode (satu baris)" onmousedown="event.preventDefault()" onclick="kirRichToolbarCodeInsert('${inputId}', 'inline')">&lt;/&gt;</button>
        <button type="button" class="math-toolbar-btn math-toolbar-btn-wide" title="Sisipkan blok kode" onmousedown="event.preventDefault()" onclick="kirRichToolbarCodeInsert('${inputId}', 'block')">{ }</button>
      </div>`;
  }

  /* ---------- Course graph data ---------- */
  const COURSE_GRAPH = { nodes: [], edges: [], mainOrder: [] };
  let COURSE_CURRENT_NODE_ID = null;
  const COURSE_COMPLETED_IDS = new Set();
  const COURSE_BRANCH_REQUIREMENTS = {};

  function applyCourseProgressState(graph, currentId, completedIds) {
    graph.nodes.forEach(n => {
      if (completedIds.has(n.id)) { n.state = 'completed'; return; }
      if (n.id === currentId) { n.state = 'current'; return; }
      const requirements = COURSE_BRANCH_REQUIREMENTS[n.id];
      n.state = requirements && requirements.every(id => completedIds.has(id)) ? 'available' : 'locked';
    });

    // Hub node's own progress bar (see courseCardFooterHtml) — fraction
    // of trackable steps (material/voyage_group/flag; modules are just
    // dividers, not steps in their own right) that are done. This used
    // to be hardcoded to 0.0 at node-creation time and never actually
    // recomputed, so the bar rendered empty no matter how far along the
    // member actually was. Recomputed here so every caller that changes
    // completedIds (courseAdvanceNode, courseToggleOptionalComplete,
    // the initial load) picks it up for free.
    const hub = graph.nodes.find(n => n.type === 'course');
    if (hub) {
      const trackable = graph.nodes.filter(n => n.type === 'material' || n.type === 'voyage_group' || n.type === 'flag');
      const doneCount = trackable.filter(n => completedIds.has(n.id)).length;
      hub.progress = trackable.length > 0 ? doneCount / trackable.length : 0;
    }

    return graph;
  }

  /* ---------- Progress state ----------
     Marks every node `completed` / `current` / `available` / `locked`
     relative to COURSE_CURRENT_NODE_ID (the node itself) plus
     COURSE_COMPLETED_IDS (everything already finished) — a persistent
     set, not something re-derived from currentId's ancestors on every
     call. That matters because each module's path branches directly
     off the course rather than chaining into the next module: if
     "completed" were recomputed as just "ancestors of currentId" each
     time, moving into module 2's path would make module 1's
     already-finished path (which isn't an ancestor of anything in
     module 2) flip back to locked.
     Branch nodes (optional side content hanging off a step) are a
     special case: they're not on the main chain at all, so they'd
     otherwise stay locked forever. Instead each one unlocks
     ("available", clickable, no blur) as soon as its anchor step is
     completed — that's the step it hangs off — and a converge node
     (fed by several branches at once) only unlocks once every one of
     those branches is completed.
     COURSE_CURRENT_NODE_ID / COURSE_COMPLETED_IDS are now real,
     per-user progress: they're loaded from (and saved back to) the
     member's course_enrollments row — see fetchCourseData() and
     courseSaveProgress() below — instead of being an in-memory
     placeholder that reset on every page load. */

  // Which course_enrollments row (if any) backs the course currently
  // on screen, and which course it's for — set by fetchCourseData(),
  // read by courseSaveProgress() whenever the member advances.
  let COURSE_ENROLLMENT_ID = null;
  let COURSE_ACTIVE_COURSE_ID = null;

  // Same-browser fallback only: written whenever a course is loaded so
  // an offline/replication-lag reload has something to fall back to.
  // The real source of truth is course_enrollments, keyed by account.
  const KIR_LAST_COURSE_KEY = 'kir_last_course_id';

  // course-empty-state and course-canvas-region are now both children
  // of the same #chart-viewport box (see the comment in workspace.html)
  // — #course-workspace itself just gates whether that box is mounted
  // at all (nothing to show until fetchCourseData() resolves either
  // way), while these two toggle which of its two children is visible.
  function courseShowEmptyState() {
    document.getElementById('course-workspace').classList.remove('hidden');
    document.getElementById('course-empty-state').classList.remove('hidden');
    document.getElementById('course-canvas-region').classList.add('hidden');
    // Nothing to drag/zoom when there's no graph mounted — .no-course
    // swaps the cursor back to default (see #chart-viewport.no-course
    // in workspace.html), and chartPointerDown/the wheel listener
    // below both bail out for real by checking this same
    // #course-canvas-region.hidden state directly.
    document.getElementById('chart-viewport').classList.add('no-course');
  }

  function courseShowWorkspace() {
    document.getElementById('course-workspace').classList.remove('hidden');
    document.getElementById('course-empty-state').classList.add('hidden');
    document.getElementById('course-canvas-region').classList.remove('hidden');
    document.getElementById('chart-viewport').classList.remove('no-course');
  }

  // Persists the member's current position (current_node_id) and
  // everything they've finished (completed_node_ids) back to their
  // course_enrollments row, so it's still there next time they open
  // course.html — on this device or any other. Fire-and-forget from
  // the caller's point of view; failures are logged, not surfaced,
  // since the UI has already updated optimistically.
  async function courseSaveProgress() {
    if (!COURSE_ENROLLMENT_ID) return;
    const { error } = await supabaseClient
      .from('course_enrollments')
      .update({
        current_node_id: COURSE_CURRENT_NODE_ID,
        completed_node_ids: Array.from(COURSE_COMPLETED_IDS),
        updated_at: new Date().toISOString()
      })
      .eq('id', COURSE_ENROLLMENT_ID);
    if (error) console.error('Error saving course progress:', error);
  }

  // The header deltas counter (#workspace-deltas-total) is driven by a
  // localStorage cache — see kirDeltasTotal/kirAddDeltas in auth.js —
  // that server-side deltas changes made from *this* page (completing a
  // voyage via check_voyage_answer(s)/grade-essay, dropping a course via
  // drop_course_enrollment) never touch directly, since none of those
  // RPCs go through kirAddDeltas. Pull the fresh total from profiles and
  // reflect it immediately instead of leaving the header stale until the
  // next login/full reload.
  async function courseSyncDeltasHeader() {
    const { data: userData } = await supabaseClient.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) return;
    const { data: profile, error } = await supabaseClient.from('profiles').select('deltas_total').eq('id', uid).single();
    if (error || !profile) return;
    localStorage.setItem('kir_deltas_total', String(profile.deltas_total || 0));
    if (typeof refreshWorkspaceDeltasHeader === 'function') refreshWorkspaceDeltasHeader();
  }

  // explicitCourseId is set when the member picks a specific course
  // out of the "Kursus Saya" picker (see pickEnrollmentFromPicker) —
  // in that case we load *that* enrollment instead of whichever one
  // was most recently touched, and touch it so it becomes the most
  // recently touched one, keeping future auto-loads consistent.
  async function fetchCourseData(explicitCourseId) {
    const { data: userData } = await supabaseClient.auth.getUser();
    const uid = userData && userData.user ? userData.user.id : null;

    // Find the course this member is actually taking: either the one
    // explicitly picked, or (course.html bumps updated_at on every
    // (re-)enrollment, and courseSaveProgress bumps it on every step
    // forward) their most recently touched enrollment.
    let enrollment = null;
    if (uid) {
      let query = supabaseClient.from('course_enrollments').select('*').eq('user_id', uid);
      query = explicitCourseId
        ? query.eq('course_id', explicitCourseId)
        : query.order('updated_at', { ascending: false });
      const { data: enrollments, error: errEnroll } = await query.limit(1);
      if (errEnroll) console.error('Error fetching course enrollment:', errEnroll);
      else if (enrollments && enrollments.length) enrollment = enrollments[0];
    }

    if (uid && enrollment && explicitCourseId) {
      // Fire-and-forget: don't block the switch on this.
      supabaseClient
        .from('course_enrollments')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', enrollment.id)
        .then(({ error }) => { if (error) console.error('Error touching course enrollment:', error); });
    }

    const courseId = explicitCourseId || (enrollment ? enrollment.course_id : localStorage.getItem(KIR_LAST_COURSE_KEY));
    if (!courseId) { courseShowEmptyState(); return; }

    const { data: courses, error: errCourse } = await supabaseClient.from('courses').select('*').eq('id', courseId).limit(1);
    if (errCourse || !courses || courses.length === 0) { courseShowEmptyState(); return; }
    const course = courses[0];

    const { data: nodes, error: errNodes } = await supabaseClient.from('course_nodes').select('*').eq('course_id', course.id);
    const { data: edges, error: errEdges } = await supabaseClient.from('course_edges').select('*').eq('course_id', course.id);
    if (errNodes || errEdges) { courseShowEmptyState(); return; }

    localStorage.setItem(KIR_LAST_COURSE_KEY, course.id);
    COURSE_ACTIVE_COURSE_ID = course.id;

    COURSE_GRAPH.nodes = [{
      id: course.id,
      type: 'course',
      title: course.title,
      description: course.description,
      progress: 0.0,
      image: ''
    }];

    // The card footer now shows a rating pill (difficulty) next to the
    // soal-count pill for every voyage_group/flag node, in place of the
    // subject/rating/type row that used to live inside the runner modal.
    // That means difficulty has to be known at card-render time, before
    // courseOpenVoyageRunner() ever fetches the full voyage rows — so
    // pull just {id, difficulty} for every voyage referenced by any node
    // in one batched query here, rather than one query per card.
    const allVoyageIds = Array.from(new Set(
      nodes.flatMap(n => n.voyage_id ? [n.voyage_id] : (n.voyage_ids || []))
    ));
    let difficultyByVoyageId = new Map();
    if (allVoyageIds.length) {
      const { data: voyageDifficulties, error: errDiff } = await supabaseClient
        .from('voyages').select('id, difficulty').in('id', allVoyageIds);
      if (errDiff) console.error('Error fetching voyage difficulties:', errDiff);
      else difficultyByVoyageId = new Map(voyageDifficulties.map(v => [v.id, v.difficulty]));
    }

    nodes.forEach(n => {
      const voyageIds = n.voyage_id ? [n.voyage_id] : (n.voyage_ids || []);
      const difficulties = voyageIds.map(id => difficultyByVoyageId.get(id)).filter(d => typeof d === 'number');
      // Average across the group's questions, rounded to 1 decimal so it
      // reads like a single rating (e.g. "4.3") instead of a jarring long
      // float — same idea as an average star rating. null when the node
      // has no voyages attached yet (or none of them resolved), so the
      // footer can skip the pill entirely rather than showing "0".
      const avgDifficulty = difficulties.length
        ? Math.round((difficulties.reduce((sum, d) => sum + d, 0) / difficulties.length) * 10) / 10
        : null;

      COURSE_GRAPH.nodes.push({
        id: n.id,
        type: n.node_type,
        title: n.title,
        description: n.description,
        optional: n.is_optional,
        duration: n.duration,
        questionInfo: n.question_info,
        examInfo: n.exam_info,
        materialId: n.material_id,
        voyageIds,
        avgDifficulty,
        image: ''
      });
    });

    COURSE_GRAPH.edges = edges.map(e => ({
      from: e.from_node,
      to: e.to_node,
      branch: e.branch_side
    }));

    // Reconstruct the linear progression sequence from the root using a tree traversal
    // This guarantees we start at the top and flow downward exactly as defined in the DB.
    const mainEdges = COURSE_GRAPH.edges.filter(e => !e.branch);
    const adj = {};
    mainEdges.forEach(e => {
      if (!adj[e.from]) adj[e.from] = [];
      adj[e.from].push(e.to);
    });

    const mainOrder = [];
    function traverse(nodeId) {
      mainOrder.push(nodeId);
      const children = adj[nodeId] || [];
      // Sort children so module-1 comes before module-2
      children.sort().forEach(childId => traverse(childId));
    }
    traverse(course.id);
    COURSE_GRAPH.mainOrder = mainOrder;

    // Map branch requirements
    for (const key in COURSE_BRANCH_REQUIREMENTS) delete COURSE_BRANCH_REQUIREMENTS[key];
    COURSE_GRAPH.edges.filter(e => e.branch).forEach(e => {
      (COURSE_BRANCH_REQUIREMENTS[e.to] = COURSE_BRANCH_REQUIREMENTS[e.to] || []).push(e.from);
    });

    // No signed-in user (shouldn't normally happen — kirRequireAuth
    // gates the page) — fall back to the old, unsaved local behavior
    // rather than crash.
    if (!uid) {
      COURSE_ENROLLMENT_ID = null;
      const firstActionable = mainOrder.find(id => {
        const n = COURSE_GRAPH.nodes.find(node => node.id === id);
        return n && n.type !== 'course' && n.type !== 'module';
      });
      COURSE_CURRENT_NODE_ID = firstActionable || mainOrder[0];
      COURSE_COMPLETED_IDS.clear();
      const parentOfFallback = {};
      mainEdges.forEach(e => { parentOfFallback[e.to] = e.from; });
      let cursor = parentOfFallback[COURSE_CURRENT_NODE_ID];
      while (cursor) { COURSE_COMPLETED_IDS.add(cursor); cursor = parentOfFallback[cursor]; }
    } else {
      // First time this member takes this course: no enrollment row
      // existed yet when we looked (can happen if they arrived here
      // directly, e.g. by bookmark, without going through Resources
      // first) — create one now so progress has somewhere to land.
      if (!enrollment) {
        const { data: created, error: errCreate } = await supabaseClient
          .from('course_enrollments')
          .insert({ user_id: uid, course_id: course.id })
          .select('*')
          .limit(1);
        if (errCreate) console.error('Error creating course enrollment:', errCreate);
        enrollment = created && created.length ? created[0] : null;
      }
      COURSE_ENROLLMENT_ID = enrollment ? enrollment.id : null;

      const storedCurrent = enrollment ? enrollment.current_node_id : null;
      const storedCompleted = enrollment && Array.isArray(enrollment.completed_node_ids) ? enrollment.completed_node_ids : null;

      if (storedCurrent && mainOrder.includes(storedCurrent)) {
        // Resume exactly where this member left off.
        COURSE_CURRENT_NODE_ID = storedCurrent;
        COURSE_COMPLETED_IDS.clear();
        (storedCompleted || []).forEach(id => COURSE_COMPLETED_IDS.add(id));

        // Self-healing: If the stored cursor is stuck on a structural node (e.g., from an old broken graph state),
        // fast-forward it to the next actual content node so the user isn't permanently locked out.
        const currentNodeObj = COURSE_GRAPH.nodes.find(n => n.id === COURSE_CURRENT_NODE_ID);
        if (currentNodeObj && (currentNodeObj.type === 'course' || currentNodeObj.type === 'module')) {
          let idx = mainOrder.indexOf(COURSE_CURRENT_NODE_ID);
          while (idx < mainOrder.length) {
            const currId = mainOrder[idx];
            const n = COURSE_GRAPH.nodes.find(node => node.id === currId);
            if (n && n.type !== 'course' && n.type !== 'module') {
              COURSE_CURRENT_NODE_ID = currId;
              break;
            }
            COURSE_COMPLETED_IDS.add(currId);
            idx++;
          }
          await courseSaveProgress();
        }
      } else {
        // Brand-new enrollment: start at the top, find the first
        // actionable node (not a structural course/module), and mark
        // its structural parents completed so it's actually accessible.
        const firstActionable = mainOrder.find(id => {
          const n = COURSE_GRAPH.nodes.find(node => node.id === id);
          return n && n.type !== 'course' && n.type !== 'module';
        });
        COURSE_CURRENT_NODE_ID = firstActionable || mainOrder[0];

        COURSE_COMPLETED_IDS.clear();
        const parentOf = {};
        mainEdges.forEach(e => { parentOf[e.to] = e.from; });
        let cursor = parentOf[COURSE_CURRENT_NODE_ID];
        while (cursor) {
          COURSE_COMPLETED_IDS.add(cursor);
          cursor = parentOf[cursor];
        }

        await courseSaveProgress();
      }
    }

    applyCourseProgressState(COURSE_GRAPH, COURSE_CURRENT_NODE_ID, COURSE_COMPLETED_IDS);
    courseShowWorkspace();

    // Draw the graph
    courseComputeTransitionAnimations({});
    courseRerenderWithAnimation();
    requestAnimationFrame(() => requestAnimationFrame(centerCanvas));
  }

  /* ---------- Course picker modal ----------
     Enrolling lives entirely in course.html now (it browses the
     `resources` catalog and writes course_enrollments rows). This
     modal only reads the member's own course_enrollments — each row
     already carries its own current_node_id/completed_node_ids — and
     lets them swap which enrolled course is loaded into the graph
     below. Nothing here inserts a course_enrollments row. */
  let COURSE_PICKER_ENROLLMENTS = [];
  // Total step count per course_id (course_nodes row count), so the
  // picker can show a real completed/total progress bar instead of
  // just the raw "N langkah selesai" count it had before. Batch-
  // fetched once per modal open alongside the enrollments themselves,
  // same approach as course.html's catalog snapshot fetch.
  let COURSE_PICKER_TOTALS = {};

  function openCoursePickerModal() {
    kirLocalModalShow(document.getElementById('course-picker-modal'));
    fetchCoursePickerEnrollments();
  }

  function closeCoursePickerModal() {
    kirLocalModalHide(document.getElementById('course-picker-modal'));
    closeAllCoursePickerMenus();
  }

  async function fetchCoursePickerEnrollments() {
    const grid = document.getElementById('course-picker-grid');
    grid.innerHTML = `<p class="col-span-2 text-center text-zinc-500 text-sm py-8">Memuat kursus…</p>`;

    const { data: userData } = await supabaseClient.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) { grid.innerHTML = `<p class="col-span-2 text-center text-zinc-500 text-sm py-8">Gagal memuat kursus.</p>`; return; }

    // Embed courses(*) via the course_enrollments_course_id_fkey FK so
    // title/description come back in one query instead of N+1.
    const { data, error } = await supabaseClient
      .from('course_enrollments')
      .select('*, courses(*)')
      .eq('user_id', uid)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching course enrollments:', error);
      grid.innerHTML = `<p class="col-span-2 text-center text-zinc-500 text-sm py-8">Gagal memuat kursus.</p>`;
      return;
    }

    COURSE_PICKER_ENROLLMENTS = data || [];
    await fetchCoursePickerNodeTotals();
    renderCoursePickerGrid();
  }

  // One batched query for every enrolled course's total step count,
  // instead of one round-trip per card. A course a card fails to find
  // a total for just shows 0/0 rather than breaking the whole grid.
  async function fetchCoursePickerNodeTotals() {
    COURSE_PICKER_TOTALS = {};
    const courseIds = Array.from(new Set(COURSE_PICKER_ENROLLMENTS.map(e => e.courses?.id).filter(Boolean)));
    if (!courseIds.length) return;

    const { data, error } = await supabaseClient
      .from('course_nodes')
      .select('id, course_id')
      .in('course_id', courseIds);

    if (error) { console.error('Error fetching course node totals:', error); return; }

    (data || []).forEach(n => {
      COURSE_PICKER_TOTALS[n.course_id] = (COURSE_PICKER_TOTALS[n.course_id] || 0) + 1;
    });
  }

  function renderCoursePickerGrid() {
    const grid = document.getElementById('course-picker-grid');
    const lang = localStorage.getItem(KIR_LANG_KEY) || 'id';

    if (!COURSE_PICKER_ENROLLMENTS.length) {
      grid.innerHTML = `
        <div class="col-span-1 sm:col-span-2 text-center py-10">
          <p class="text-zinc-300 font-medium mb-1">${kirEscapeHtml(I18N[lang].course_empty_title)}</p>
          <p class="text-zinc-500 text-sm mb-4">${kirEscapeHtml(I18N[lang].empty_resources_desc || 'Ambil kursus baru di halaman Kursus.')}</p>
          <a href="course.html" class="inline-block px-4 py-2 rounded-lg font-semibold text-sm text-white bg-accent-gradient hover:brightness-110 shadow-glow-sm transition">${kirEscapeHtml(I18N[lang].course_pick_btn || 'Ke Halaman Kursus')}</a>
        </div>`;
      return;
    }

    const openIcon = `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>`;
    const activeIcon = `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>`;
    const dotsIcon = `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.75"/><circle cx="12" cy="12" r="1.75"/><circle cx="12" cy="19" r="1.75"/></svg>`;
    const trashIcon = `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>`;

    grid.innerHTML = COURSE_PICKER_ENROLLMENTS.map(e => {
      const c = e.courses || {};
      const isActive = c.id === COURSE_ACTIVE_COURSE_ID;
      const completed = Array.isArray(e.completed_node_ids) ? e.completed_node_ids.length : 0;
      const total = COURSE_PICKER_TOTALS[c.id] || 0;
      const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
      // Card id/course id both feed into DOM ids below, so escape once
      // and reuse — course.id is a slug (text PK), not free text, but
      // it still flows into onclick string literals so it must be safe.
      const cid = kirEscapeHtml(c.id || '');

      return `
      <div class="glass course-picker-card border ${isActive ? 'border-accent' : 'border-accent-30'} transition">
        <div class="course-picker-menu-wrap">
          <button type="button" id="course-picker-menu-btn-${cid}" class="course-picker-menu-btn" title="${kirEscapeHtml(I18N[lang].course_card_menu)}" aria-label="${kirEscapeHtml(I18N[lang].course_card_menu)}" onclick="event.stopPropagation(); toggleCoursePickerMenu('${cid}')">
            ${dotsIcon}
          </button>
          <div id="course-picker-menu-${cid}" class="course-picker-menu" onclick="event.stopPropagation()">
            <button type="button" class="course-picker-drop-btn" onclick="dropCourseEnrollment('${cid}', '${kirEscapeHtml((c.title || '').replace(/'/g, "\\'"))}')">
              ${trashIcon}
              <span>${kirEscapeHtml(I18N[lang].course_drop_btn)}</span>
            </button>
          </div>
        </div>
        <h3 class="course-picker-card-title pr-6">${kirEscapeHtml(c.title || 'Kursus')}</h3>
        <p class="course-picker-card-desc">${kirEscapeHtml(c.description || '')}</p>
        <div class="course-picker-card-footer">
          <button type="button" onclick="pickEnrollmentFromPicker('${c.id}')" class="course-picker-open-btn" ${isActive ? 'disabled' : ''}>
            ${isActive ? activeIcon : openIcon}
            <span>${isActive ? kirEscapeHtml(I18N[lang].course_status_active) : kirEscapeHtml(I18N[lang].course_open_btn)}</span>
          </button>
          <div class="course-picker-progress">
            <div class="course-picker-progress-track"><div class="course-picker-progress-fill" style="width:${pct}%;"></div></div>
            <span class="course-picker-progress-label">${completed}/${total} ${kirEscapeHtml(I18N[lang].course_steps_done)} · ${pct}%</span>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  // Only one card menu open at a time. Closing on outside click (and on
  // Escape) is wired once, lazily, the first time a menu is opened —
  // see toggleCoursePickerMenu() below — same lazy-init pattern used
  // elsewhere in this file (kirInitSidebarShortcuts, etc.).
  let coursePickerMenuOutsideHandlerInit = false;

  function closeAllCoursePickerMenus() {
    document.querySelectorAll('.course-picker-menu.open').forEach(m => m.classList.remove('open'));
    document.querySelectorAll('.course-picker-menu-btn.menu-active').forEach(b => b.classList.remove('menu-active'));
  }

  function toggleCoursePickerMenu(courseId) {
    const menu = document.getElementById(`course-picker-menu-${courseId}`);
    const btn = document.getElementById(`course-picker-menu-btn-${courseId}`);
    if (!menu || !btn) return;
    const willOpen = !menu.classList.contains('open');
    closeAllCoursePickerMenus();
    if (willOpen) {
      menu.classList.add('open');
      btn.classList.add('menu-active');
    }

    if (!coursePickerMenuOutsideHandlerInit) {
      coursePickerMenuOutsideHandlerInit = true;
      document.addEventListener('click', closeAllCoursePickerMenus);
      document.addEventListener('keydown', ev => { if (ev.key === 'Escape') closeAllCoursePickerMenus(); });
    }
  }

  // Drops a single enrollment: removes the course_enrollments row *and*
  // forgets every voyage_completions/coding_submissions/telemetry row
  // tied to that course's nodes for this member — see the
  // drop_course_enrollment() RPC (SECURITY DEFINER, scoped to
  // auth.uid()) for the actual delete + deltas-deduction logic; the
  // deltas subtraction itself happens via the existing
  // trg_deduct_deltas_on_completion_delete trigger on voyage_completions,
  // fired once per deleted row, so weekly/lifetime buckets stay accurate
  // instead of just being zeroed out.
  async function dropCourseEnrollment(courseId, courseTitle) {
    closeAllCoursePickerMenus();
    const lang = localStorage.getItem(KIR_LANG_KEY) || 'id';
    if (!confirm(I18N[lang].course_drop_confirm)) return;

    const { error } = await supabaseClient.rpc('drop_course_enrollment', { p_course_id: courseId });
    if (error) {
      console.error('Error dropping course enrollment:', error);
      alert(I18N[lang].course_drop_error);
      return;
    }

    // If the dropped course was the one loaded in the graph below, clear
    // the stale pointers and let fetchCourseData() fall back to the next
    // most-recently-touched enrollment (or the empty state if none left).
    if (courseId === COURSE_ACTIVE_COURSE_ID) {
      if (localStorage.getItem(KIR_LAST_COURSE_KEY) === courseId) localStorage.removeItem(KIR_LAST_COURSE_KEY);
      COURSE_ACTIVE_COURSE_ID = null;
      COURSE_ENROLLMENT_ID = null;
      await fetchCourseData();
    }

    await fetchCoursePickerEnrollments();
    await courseSyncDeltasHeader();
  }

  // Just switches the graph below to an already-enrolled course —
  // see fetchCourseData(explicitCourseId), which also touches that
  // enrollment's updated_at so it stays "most recent" afterward.
  async function pickEnrollmentFromPicker(courseId) {
    closeCoursePickerModal();
    await fetchCourseData(courseId);
  }

  /* ---------- Temporary "finish this" progress control ----------
     Placeholder for real completion tracking. Two entry points:
     courseAdvanceNode moves the main-chain cursor forward (used by the
     required material/voyage/flag CTAs) — module nodes are pure
     dividers with no CTA of their own, so landing on one is skipped
     over automatically, and any module skipped this way is marked
     completed too. courseToggleOptionalComplete instead just flips one
     optional branch/converge node's own completion on or off (it
     isn't part of the main-chain cursor), so a converge node can be
     unlocked by finishing all of the branches ahead of it. */
  /* ---------- Finish animation ----------
     Two things should animate instead of snapping when progress
     changes: a node's lock overlay fading away as it unlocks, and the
     connector into it drawing itself in — rather than both just
     appearing instantly, which is what a full innerHTML re-render
     would otherwise produce (fresh elements have no "before" state to
     transition from). Both diff node state *before* vs *after* the
     change: COURSE_ANIM_UNLOCK_IDS is every node that was locked and
     no longer is, COURSE_ANIM_EDGE_KEYS is every edge index that was
     hidden (either end locked) and is now visible. Recomputed fresh
     on every call, so nothing lingers into later, unrelated renders. */
  let COURSE_ANIM_UNLOCK_IDS = new Set();
  let COURSE_ANIM_EDGE_KEYS = new Set();

  function courseCaptureStates() {
    const m = {};
    COURSE_GRAPH.nodes.forEach(n => { m[n.id] = n.state; });
    return m;
  }

  function courseComputeTransitionAnimations(prevStates) {
    COURSE_ANIM_UNLOCK_IDS = new Set();
    COURSE_ANIM_EDGE_KEYS = new Set();
    const byId = {};
    COURSE_GRAPH.nodes.forEach(n => { byId[n.id] = n; });

    COURSE_GRAPH.nodes.forEach(n => {
      if (prevStates[n.id] === 'locked' && n.state !== 'locked') COURSE_ANIM_UNLOCK_IDS.add(n.id);
    });

    COURSE_GRAPH.edges.forEach((edge, i) => {
      const wasHidden = prevStates[edge.from] === 'locked' || prevStates[edge.to] === 'locked';
      const fromNode = byId[edge.from], toNode = byId[edge.to];
      const isVisible = fromNode && toNode && fromNode.state !== 'locked' && toNode.state !== 'locked';
      if (wasHidden && isVisible) COURSE_ANIM_EDGE_KEYS.add(i);
    });
  }

  function courseRerenderWithAnimation() {
    courseCloseInspector();
    renderCourseGraph();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        sizeCourseCanvas();
        drawCourseConnectors();
      });
    });
  }

  function courseAdvanceNode(nodeId) {
    const order = COURSE_GRAPH.mainOrder || [];
    const idx = order.indexOf(nodeId);
    if (idx === -1) return; // unknown node

    const byId = {};
    COURSE_GRAPH.nodes.forEach(n => { byId[n.id] = n; });
    const prevStates = courseCaptureStates();
    COURSE_COMPLETED_IDS.add(order[idx]);

    if (idx >= order.length - 1) {
      // Last node in the course's main chain — nothing further to move
      // the cursor to. This used to bail out above before even marking
      // the node complete, so finishing the very last voyage/material/
      // flag in a course never actually recorded it as done. Keep the
      // cursor sitting on this node (applyCourseProgressState checks
      // completedIds before currentId, so it still renders as finished
      // rather than "current") instead of leaving it unset.
      COURSE_CURRENT_NODE_ID = order[idx];
    } else {
      let nextIdx = idx + 1;
      while (nextIdx < order.length - 1 && byId[order[nextIdx]] && byId[order[nextIdx]].type === 'module') {
        COURSE_COMPLETED_IDS.add(order[nextIdx]);
        nextIdx++;
      }
      COURSE_CURRENT_NODE_ID = order[nextIdx];
    }

    applyCourseProgressState(COURSE_GRAPH, COURSE_CURRENT_NODE_ID, COURSE_COMPLETED_IDS);
    courseComputeTransitionAnimations(prevStates);
    courseRerenderWithAnimation();
    courseSaveProgress();
  }

  function courseToggleOptionalComplete(nodeId) {
    const node = COURSE_GRAPH.nodes.find(n => n.id === nodeId);
    if (!node || node.state === 'locked') return; // not unlocked yet — its anchor isn't done

    const prevStates = courseCaptureStates();
    if (COURSE_COMPLETED_IDS.has(nodeId)) {
      COURSE_COMPLETED_IDS.delete(nodeId);
    } else {
      COURSE_COMPLETED_IDS.add(nodeId);
    }
    applyCourseProgressState(COURSE_GRAPH, COURSE_CURRENT_NODE_ID, COURSE_COMPLETED_IDS);
    courseComputeTransitionAnimations(prevStates);
    courseRerenderWithAnimation();
    courseSaveProgress();
  }

  /* ---------- Real voyage-taking, driven by course_nodes.voyage_ids ----------
     A voyage_group/flag node's questionInfo/examInfo text ("3 soal") used
     to be pure decoration — clicking "Mulai Voyage" just called
     courseAdvanceNode() directly with nothing actually done. Now the CTA
     opens this runner instead: it loads the voyages attached via
     node.voyageIds (course_nodes.voyage_ids), lets the member answer each
     one through the same check_voyage_answer / check_voyage_answers RPC /
     grade-essay edge function voyages.html uses, and only advances the
     course node once every voyage in the group has an actual
     voyage_completions row. A node can now hold multiple voyages —
     COURSE_VOYAGE_RUNNER.currentIndex tracks which one is on screen and
     .answers holds a slot per voyage so nothing is lost while navigating
     between them.
     Only mc/dropdown/essay are wired up end-to-end here; programming
     voyages link out to voyages.html until the code-editor/judge-submit
     pieces get ported over too. */

  // Same star glyph as voyages.html/admin-shared.js's diff-badge.
  // Duplicated here (rather than loading all of admin-shared.js just
  // for this) since that bundle is otherwise admin-only tooling this
  // member-facing page has no other reason to pull in. No longer feeds
  // a badge inside the modal itself (that whole subject/rating/type
  // row was removed) — now it sits inline in the plain gray rating
  // meta text on the node's card footer instead (see
  // courseVoyageNodeMetaHtml), computed once per node in
  // fetchCourseData() from the difficulty of its attached voyages
  // (see node.avgDifficulty).
  const COURSE_DIFF_STAR_SVG = '<svg class="w-3 h-3 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M10 1.5l2.59 5.25 5.79.84-4.19 4.08.99 5.77L10 14.77l-5.18 2.67.99-5.77L1.62 7.59l5.79-.84L10 1.5z"/></svg>';

  let COURSE_VOYAGE_RUNNER = null; // { nodeId, voyages: [], currentIndex, answers: [], selectedMcIndex, isDone, completion }

  // Same anti-cheat telemetry voyages.html tracks per open voyage (paste/
  // tab-switch/untrusted-input counts + time spent), now wired up here too
  // since the runner above lets members actually answer mc/dropdown/essay
  // voyages from course.html itself rather than only linking out.
  let courseVoyageOpenedAt = null;
  let courseTelemetryData = { paste_count: 0, tab_switch_count: 0, untrusted_input_count: 0, time_spent_ms: 0 };

  // Computed at send-time, same reasoning as voyages.html's kirTelemetrySnapshot.
  function courseKirTelemetrySnapshot() {
    return { ...courseTelemetryData, time_spent_ms: courseVoyageOpenedAt ? Math.max(0, Date.now() - courseVoyageOpenedAt) : 0 };
  }

  /* ----------------------------------------------------------
     Anti-cheat: stable per-(user, voyage) option shuffle.
     ----------------------------------------------------------
     Same implementation as voyages.html - two students on the same
     MC question would otherwise see "A/B/C/D" in the exact same DB
     order, so "jawabannya C" travels fine between them. Instead we
     derive a deterministic-but-unpredictable permutation from a hash
     of (user id + voyage id): the same user always sees the same order
     for the same question (so it doesn't reshuffle confusingly on
     every reopen), but two different users almost never see the same
     order, and nobody can predict their own order in advance without
     already being logged in as themselves.
     ---------------------------------------------------------- */
  function kirHashSeed(str) {
    let h = 2166136261 >>> 0; // FNV-1a
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function kirSeededRandom(seed) {
    let s = seed >>> 0;
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Returns an array `order` where order[displayPosition] = originalIndex.
  function kirShuffledOptionOrder(voyageId, optionCount) {
    const { data: userData } = supabaseClient.auth.getUser();
    const currentUserId = userData?.user?.id || null;
    const seed = kirHashSeed(`${currentUserId || 'anon'}:${voyageId}`);
    const rand = kirSeededRandom(seed);
    const order = Array.from({ length: optionCount }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
  }

  function courseVoyageIsDone(completion, type) {
    if (!completion) return false;
    // Essay completions get a row on first submit even before an AI/manual
    // grade lands — same "submitted = done" convention voyages.html uses.
    // mc/dropdown insert a row on wrong attempts too, so those only count
    // once an attempt actually earned deltas.
    return type === 'essay' ? true : (completion.deltas_earned || 0) > 0;
  }

  /* ----------------------------------------------------------
     Same Word-style WYSIWYG math editor voyages.html gives its
     essay answer box (see js/wysiwyg-editor.js's kirRichEditorInit
     and admin-shared.js's kirWceToolbarHtml — both mirrored locally
     above), reused here so course members insert LaTeX/code as real
     chips instead of ever seeing raw $...$ or `...` syntax. Rendered
     once into the empty #cvm-essay-wrap container since that markup
     is static HTML in this file. Paste/untrusted-input telemetry is
     wired up the same way voyages.html's kirRenderEssayMathEditor
     does it, now that this runner reports p_telemetry/telemetry
     alongside submissions too (see submitCourseVoyageAnswer).
     ---------------------------------------------------------- */
  function kirRenderCourseEssayMathEditor() {
    const wrap = document.getElementById('cvm-essay-wrap');
    if (!wrap || wrap.dataset.rendered) return;
    wrap.dataset.rendered = '1';
    wrap.innerHTML = `
      <label class="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-2 block">Jawabanmu</label>
      <div class="wce-editor">
        ${kirWceToolbarHtml('cvm-essay-textarea')}
        <textarea id="cvm-essay-textarea" rows="5" class="wce-source" placeholder="Tulis jawabanmu…"></textarea>
      </div>`;
    kirRichEditorInit('cvm-essay-textarea', { placeholder: 'Tulis jawabanmu…' });

    // Real typing/pasting happens on the visible contenteditable surface,
    // not the hidden canonical textarea (whose 'input' event is re-fired
    // programmatically by kirRichSync() on every keystroke, which would
    // make e.isTrusted false for legitimate typing) — same reasoning as
    // voyages.html.
    const surface = document.getElementById('cvm-essay-textarea-surface');
    surface.addEventListener('paste', () => {
      if (COURSE_VOYAGE_RUNNER) courseTelemetryData.paste_count++;
    });
    surface.addEventListener('input', (e) => {
      if (COURSE_VOYAGE_RUNNER && !e.isTrusted) courseTelemetryData.untrusted_input_count++;
    });
  }

  async function courseOpenVoyageRunner(nodeId) {
    const node = COURSE_GRAPH.nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (!node.voyageIds || !node.voyageIds.length) {
      // Nothing attached yet — fall back to the old instant-complete
      // behavior rather than opening an empty modal on a dead end.
      courseFinishNodeById(nodeId);
      return;
    }

    const { data: userData } = await supabaseClient.auth.getUser();
    if (!userData || !userData.user) return;

    const { data: voyagesRaw, error: errVoyage } = await supabaseClient
      .from('voyages').select('*').in('id', node.voyageIds);
    if (errVoyage || !voyagesRaw || !voyagesRaw.length) { console.error('Error fetching voyages:', errVoyage); return; }

    // Supabase's .in() doesn't preserve the requested order, so re-sort to
    // match node.voyageIds — this is also the order the nav grid renders in.
    const orderIndex = new Map(node.voyageIds.map((id, i) => [id, i]));
    const voyages = [...voyagesRaw].sort((a, b) => orderIndex.get(a.id) - orderIndex.get(b.id));

    const { data: completions, error: errComp } = await supabaseClient
      .from('voyage_completions').select('voyage_id, deltas_earned, essay_answer, essay_score')
      .eq('user_id', userData.user.id).in('voyage_id', node.voyageIds);
    if (errComp) console.error('Error fetching voyage completions:', errComp);

    const completionByVoyageId = new Map((completions || []).map(c => [c.voyage_id, c]));
    const isDone = voyages.every(v => courseVoyageIsDone(completionByVoyageId.get(v.id), v.type));

    if (isDone) {
      courseFinishNodeById(nodeId);
    }

    COURSE_VOYAGE_RUNNER = {
      nodeId,
      nodeType: node.type,
      voyages,
      currentIndex: 0,
      answers: new Array(voyages.length).fill(null),
      selectedMcIndex: null,
      isDone,
      completionByVoyageId,
      completion: completionByVoyageId.get(voyages[0].id) || null
    };
    // Exam-shell layout (see .cvm-flag rules in the stylesheet above) is a
    // flag-only look now, on regardless of fullscreen — a voyage_group node
    // always gets the plain windowed layout, fullscreen or not.
    document.getElementById('cvm-modal').classList.toggle('cvm-flag', node.type === 'flag');
    courseVoyageOpenedAt = Date.now();
    courseTelemetryData = { paste_count: 0, tab_switch_count: 0, untrusted_input_count: 0, time_spent_ms: 0 };
    kirRenderCourseEssayMathEditor();
    renderCourseVoyageModal();
    kirLocalModalShow(document.getElementById('cvm-modal'));
  }

  function closeCourseVoyageModal() {
    kirLocalModalHide(document.getElementById('cvm-modal'));
    COURSE_VOYAGE_RUNNER = null;
    courseVoyageOpenedAt = null;
  }

  function renderCourseVoyageModal() {
    const r = COURSE_VOYAGE_RUNNER;
    const v = r.voyages[r.currentIndex];
    // Restore whatever was already picked for this question (e.g. navigating
    // back to it), instead of always resetting the selection to nothing.
    r.selectedMcIndex = (v.type === 'mc' && typeof r.answers[r.currentIndex] === 'number')
      ? r.answers[r.currentIndex] : null;

    document.getElementById('cvm-title').innerHTML = kirRenderCourseMarkdown(v.title);
    document.getElementById('cvm-progress').textContent = `${r.currentIndex + 1} / ${r.voyages.length}`;
    document.getElementById('cvm-question').innerHTML = kirRenderCourseMarkdown(v.question);

    // Subject/difficulty/type badge row used to render here — moved out
    // of the modal entirely. Difficulty now shows as a rating pill on the
    // node's card footer instead (see courseCardFooterHtml), and subject/
    // type aren't shown anywhere in the runner anymore.

    ['mc', 'dropdown', 'essay', 'programming'].forEach(t => {
      document.getElementById(`cvm-${t}-wrap`).classList.toggle('hidden', v.type !== t);
    });
    document.getElementById('cvm-feedback').classList.add('hidden');
    // cvm-submit-btn's existence/visibility/label/disabled-state is now
    // fully owned by renderCourseVoyageFooter() below, since the button
    // itself is only ever rendered into the DOM on the last question.

    if (v.type === 'mc') {
      const order = kirShuffledOptionOrder(v.id, v.options.length);
      const wrap = document.getElementById('cvm-mc-options');
      wrap.innerHTML = order.map((origIdx, pos) => `
        <button type="button" class="voyage-option w-full text-left flex items-center gap-3" data-orig-idx="${origIdx}" onclick="selectCourseVoyageMcOption(${origIdx})">
          <span class="voyage-option-dot"></span>
          <span class="kir-markdown">${kirRenderCourseMarkdown(v.options[origIdx])}</span>
        </button>`).join('');
    } else if (v.type === 'dropdown') {
      const order = kirShuffledOptionOrder(v.id, v.options.length);
      const select = document.getElementById('cvm-dropdown-select');
      select.innerHTML = '<option value="" disabled selected>Pilih jawaban…</option>' +
        order.map(origIdx => `<option value="${origIdx}">${kirEscapeHtml(v.options[origIdx])}</option>`).join('');
      select.value = (typeof r.answers[r.currentIndex] === 'number') ? String(r.answers[r.currentIndex]) : '';
      select.onchange = () => {
        r.answers[r.currentIndex] = select.value === '' ? null : parseInt(select.value, 10);
        renderCourseVoyageNavGrid();
      };
    } else if (v.type === 'essay') {
      // kirRichEditorSetValue re-parses the raw stored value straight
      // into rendered chips on the surface, same as voyages.html.
      kirRichEditorSetValue('cvm-essay-textarea', (r.completion && r.completion.essay_answer) ? r.completion.essay_answer : '');
      // Lock the answer in only once a submission has actually scored a
      // perfect 100, same rule voyages.html uses — otherwise leave it
      // editable so the score can still be improved with another attempt.
      kirRichEditorSetDisabled('cvm-essay-textarea', !!(r.completion && r.completion.essay_score === 100));
    } else if (v.type === 'programming') {
      document.getElementById('cvm-programming-link').href = `voyages.html?voyage=${encodeURIComponent(v.id)}`;
    }

    renderCourseVoyageNavGrid();
    renderCourseVoyageFooter();
    kirRenderCourseDiagrams(document.getElementById('cvm-modal'));
    kirTypesetCourseMath(document.getElementById('cvm-modal'));
  }

  // Question-number navigator. Was a static single cell when a voyage
  // was always exactly one question; now one cell per voyage in the
  // group, clickable to jump directly to that question, with the
  // active one highlighted and answered-but-not-active ones marked so
  // progress through the set is visible at a glance.
  function renderCourseVoyageNavGrid() {
    const r = COURSE_VOYAGE_RUNNER;
    const grid = document.querySelector('.cvm-nav-grid');
    grid.innerHTML = r.voyages.map((_, i) => {
      const isActive = i === r.currentIndex;
      const isAnswered = r.answers[i] !== null && r.answers[i] !== undefined && r.answers[i] !== '';
      const cls = isActive
        ? 'cvm-nav-cell cvm-nav-cell-active bg-accent-gradient text-white'
        : isAnswered
          ? 'cvm-nav-cell cvm-nav-cell-answered'
          : 'cvm-nav-cell';
      return `<div class="${cls}" onclick="courseVoyageGoToIndex(${i})">${i + 1}</div>`;
    }).join('');
  }

  // "Sebelumnya"/"Selanjutnya" walk currentIndex back and forth; the
  // submit button only appears on the last question in the group, since
  // submission sends the whole answers[] array at once (see
  // submitCourseVoyageAnswer) rather than per-question.
  function renderCourseVoyageFooter() {
    const r = COURSE_VOYAGE_RUNNER;
    const isFirst = r.currentIndex === 0;
    const isLast = r.currentIndex === r.voyages.length - 1;
    const v = r.voyages[r.currentIndex];

    const footer = document.querySelector('.cvm-footer');
    const lang = localStorage.getItem(KIR_LANG_KEY) || 'id';
    footer.innerHTML = `
      <button type="button" class="min-w-[7rem] px-4 py-2.5 rounded-lg font-semibold text-sm text-center bg-white/5 hover:bg-white/10 transition disabled:opacity-40 disabled:cursor-not-allowed" ${isFirst ? 'disabled' : ''} onclick="courseVoyageGoToIndex(${r.currentIndex - 1})">${kirEscapeHtml(I18N[lang].voyages_prev || 'Sebelumnya')}</button>
      ${isLast
        ? (v.type === 'programming' ? '' : `<button id="cvm-submit-btn" onclick="submitCourseVoyageAnswer()" class="min-w-[9.5rem] px-5 py-2.5 rounded-lg font-semibold text-sm text-white text-center bg-accent-gradient hover:brightness-110 shadow-glow-sm transition">${kirEscapeHtml(I18N[lang].voyages_submit || 'Kirim Jawaban')}</button>`)
        : `<button type="button" class="min-w-[7rem] px-4 py-2.5 rounded-lg font-semibold text-sm text-white text-center bg-accent-gradient hover:brightness-110 shadow-glow-sm transition" onclick="courseVoyageGoToIndex(${r.currentIndex + 1})">${kirEscapeHtml(I18N[lang].voyages_next || 'Selanjutnya')}</button>`
      }`;
  }

  // Shared jump target for both nav-grid cells and the prev/next
  // buttons — just moves the cursor and re-renders.
  function courseVoyageGoToIndex(i) {
    const r = COURSE_VOYAGE_RUNNER;
    if (!r || i < 0 || i >= r.voyages.length) return;
    r.currentIndex = i;
    r.completion = r.completionByVoyageId.get(r.voyages[i].id) || null;
    renderCourseVoyageModal();
  }

  function selectCourseVoyageMcOption(i) {
    const r = COURSE_VOYAGE_RUNNER;
    r.selectedMcIndex = i;
    r.answers[r.currentIndex] = i;
    document.querySelectorAll('#cvm-mc-options .voyage-option').forEach(el => {
      el.classList.toggle('selected', parseInt(el.dataset.origIdx, 10) === i);
    });
    renderCourseVoyageNavGrid(); // reflect the newly-answered state in the palette
  }

  async function submitCourseVoyageAnswer() {
    const r = COURSE_VOYAGE_RUNNER;
    if (!r) return;

    // Submission only fires from the last question (see renderCourseVoyageFooter),
    // but guard here too in case of a stray call, and make sure every
    // question in the group actually has an answer before sending anything.
    // Essay questions don't live in r.answers (they're submitted individually,
    // as soon as the member hits "Kirim Jawaban" on that question — see the
    // essay branch below), so those are considered answered once a
    // voyage_completions row exists for them instead. Programming questions
    // are graded entirely on voyages.html and never block this modal's submit.
    const emptyIndex = r.voyages.findIndex((voyage, i) => {
      if (voyage.type === 'essay') return !courseVoyageIsDone(r.completionByVoyageId.get(voyage.id), 'essay');
      if (voyage.type === 'programming') return false;
      const a = r.answers[i];
      return a === null || a === undefined || a === '';
    });
    if (emptyIndex !== -1) {
      const lang = localStorage.getItem(KIR_LANG_KEY) || 'id';
      courseVoyageGoToIndex(emptyIndex);
      const feedback = document.getElementById('cvm-feedback');
      feedback.classList.remove('hidden');
      feedback.className = 'text-sm font-medium rounded-lg px-4 py-3 mb-4 bg-white/5 text-zinc-400';
      feedback.textContent = I18N[lang].course_feedback_incomplete || 'Jawab semua soal dulu sebelum mengirim.';
      return;
    }

    const v = r.voyages[r.currentIndex];
    const feedback = document.getElementById('cvm-feedback');
    const submitBtn = document.getElementById('cvm-submit-btn');

    if (v.type === 'essay') {
      const { data: telemetryUserData } = await supabaseClient.auth.getUser();
      if (telemetryUserData?.user) {
        await supabaseClient.from('voyage_telemetry').insert({
          user_id: telemetryUserData.user.id,
          voyage_id: v.id,
          paste_count: courseTelemetryData.paste_count,
          tab_switch_count: courseTelemetryData.tab_switch_count,
          untrusted_input_count: courseTelemetryData.untrusted_input_count
        });
      }

      const text = kirMathtextBreaksToNewlines(document.getElementById('cvm-essay-textarea').value).trim();
      if (!text) return;
      submitBtn.disabled = true;

      if (v.ai_grading_enabled === false) {
        const { error } = await supabaseClient.rpc('check_voyage_answer', {
          p_voyage_id: v.id, p_selected_index: null, p_telemetry: courseKirTelemetrySnapshot()
        });
        feedback.classList.remove('hidden');
        if (error) {
          console.error('Error submitting essay:', error);
          feedback.className = 'text-sm font-medium rounded-lg px-4 py-3 mb-4 bg-white/5 text-zinc-400';
          feedback.textContent = 'Terjadi kesalahan, coba lagi.';
          submitBtn.disabled = false;
          return;
        }
        feedback.className = 'text-sm font-medium rounded-lg px-4 py-3 mb-4 bg-accent-10 text-accent-200';
        feedback.textContent = 'Jawaban terkirim untuk ditinjau.';
        courseVoyageFinishAfterSubmit();
        return;
      }

      try {
        const { data, error } = await supabaseClient.functions.invoke('grade-essay', {
          body: { voyage_id: v.id, submission: text, lang: 'id', telemetry: courseKirTelemetrySnapshot() }
        });
        if (error) throw error;
        feedback.classList.remove('hidden');
        feedback.className = 'text-sm rounded-lg px-4 py-3 mb-4 ' + (data.is_correct ? 'bg-accent-10 text-accent-200' : 'bg-white/5 text-zinc-300');
        feedback.textContent = `Skor: ${data.score}/100${data.reward ? ` (+${data.reward} deltas)` : ''}`;
        // A perfect score is the ceiling, nothing left to improve, so lock
        // the answer in — same rule voyages.html uses. Any other score,
        // passing or not, stays open for another attempt.
        const isPerfect = data.score === 100;
        kirRichEditorSetDisabled('cvm-essay-textarea', isPerfect);
        submitBtn.disabled = isPerfect;
        courseVoyageFinishAfterSubmit();
      } catch (err) {
        console.error('Smart Grading failed:', err);
        feedback.classList.remove('hidden');
        feedback.className = 'text-sm font-medium rounded-lg px-4 py-3 mb-4 bg-white/5 text-red-400';
        feedback.textContent = 'Grading gagal, coba lagi.';
        submitBtn.disabled = false;
      }
      return;
    }

    if (v.type === 'programming') return; // nothing to submit here

    submitBtn.disabled = true;
    // Whole-group payload: every mc/dropdown voyage id in the node paired
    // with its stored answer, so the backend grades the set as one
    // submission rather than one RPC call per question. Essay/programming
    // voyages are excluded — essays already submitted individually above,
    // programming has nothing to submit from this modal at all.
    const payload = r.voyages
      .map((voyage, i) => ({ voyage, selected_index: r.answers[i] }))
      .filter(({ voyage }) => voyage.type === 'mc' || voyage.type === 'dropdown')
      .map(({ voyage, selected_index }) => ({ voyage_id: voyage.id, selected_index }));

    const { data, error } = await supabaseClient.rpc('check_voyage_answers', {
      p_answers: payload,
      p_telemetry: courseKirTelemetrySnapshot()
    });
    if (error) {
      console.error('Error checking voyage answers:', error);
      feedback.classList.remove('hidden');
      feedback.className = 'text-sm font-medium rounded-lg px-4 py-3 mb-4 bg-white/5 text-zinc-400';
      feedback.textContent = 'Terjadi kesalahan, coba lagi.';
      submitBtn.disabled = false;
      return;
    }

    // The RPC returns one row per submitted answer, each carrying its own
    // voyage_id — match results back to voyages.html by id rather than
    // trusting row order, since PostgREST doesn't guarantee a set-returning
    // function's output order is preserved end-to-end.
    const results = Array.isArray(data) ? data : [data];
    const resultByVoyageId = new Map(results.filter(Boolean).map(res => [res.voyage_id, res]));
    const allCorrect = payload.every(({ voyage_id }) => !!resultByVoyageId.get(voyage_id)?.is_correct);
    const totalReward = payload.reduce((sum, { voyage_id }) => sum + (resultByVoyageId.get(voyage_id)?.reward || 0), 0);

    const lang = localStorage.getItem(KIR_LANG_KEY) || 'id';
    feedback.classList.remove('hidden');
    if (allCorrect) {
      feedback.className = 'text-sm font-medium rounded-lg px-4 py-3 mb-4 bg-accent-10 text-accent-200';
      feedback.textContent = `${I18N[lang].voyages_correct || 'Benar!'}${totalReward > 0 ? ` +${totalReward} deltas` : ''}`;
      courseVoyageFinishAfterSubmit();
    } else {
      // At least one question in the set was wrong — leave the whole group
      // open for another attempt rather than partially advancing, and jump
      // to the first wrong one so it's obvious what to fix.
      const firstWrong = payload.find(({ voyage_id }) => !resultByVoyageId.get(voyage_id)?.is_correct);
      feedback.className = 'text-sm font-medium rounded-lg px-4 py-3 mb-4 bg-white/5 text-zinc-400';
      feedback.textContent = I18N[lang].course_feedback_incorrect || 'Ada jawaban yang belum tepat, coba lagi.';
      submitBtn.disabled = false;
      if (firstWrong) {
        const wrongIndex = r.voyages.findIndex(voyage => voyage.id === firstWrong.voyage_id);
        if (wrongIndex !== -1) courseVoyageGoToIndex(wrongIndex);
      }
    }
  }

  // A correct/submitted answer is the only voyage on this node, so the
  // node itself is done — close the modal and advance it after a short
  // beat so the feedback message is actually readable first.
  function courseVoyageFinishAfterSubmit() {
    // check_voyage_answer(s)/grade-essay already updated deltas_total
    // server-side by this point (see courseSyncDeltasHeader's comment) —
    // fire-and-forget so it doesn't hold up the modal's close/advance beat.
    courseSyncDeltasHeader();

    const nodeId = COURSE_VOYAGE_RUNNER ? COURSE_VOYAGE_RUNNER.nodeId : null;
    setTimeout(() => {
      closeCourseVoyageModal();
      if (nodeId) courseFinishNodeById(nodeId);
    }, 700);
  }

  // Shared completion path: required main-chain nodes advance the course
  // cursor, optional branch nodes just toggle themselves. Used directly by
  // both the voyage and material modals once their content is actually
  // done, rather than each modal duplicating the optional/required branch.
  function courseFinishNodeById(nodeId) {
    const node = COURSE_GRAPH.nodes.find(n => n.id === nodeId);
    if (!node) return;
    // Redoing an already-completed node ("Ulang Voyage") shouldn't touch
    // progress state at all — it's already in COURSE_COMPLETED_IDS.
    // courseAdvanceNode assumes it's always being called on the current
    // frontier node and blindly moves COURSE_CURRENT_NODE_ID to whatever
    // sits right after nodeId in the main chain; calling it again on an
    // earlier, already-done node would yank the cursor backward and
    // re-lock the member's real (further-along) current node, which in
    // turn corrupts the course hub's progress bar/graph. Nothing to do
    // here on a redo — the node stays completed and nothing regresses.
    if (COURSE_COMPLETED_IDS.has(nodeId)) return;
    if (node.optional) courseToggleOptionalComplete(node.id);
    else courseAdvanceNode(node.id);
  }

  /* ---------- Real material-viewing, driven by course_nodes.material_id ----------
     A material node's "Buka Materi" CTA used to just call courseFinishHandler
     directly — clicking it marked the node done without ever showing the
     member anything. This opens #cmm-modal instead: it loads the row from
     `materials` (id, content_type: 'document' | 'video' | 'text', and
     whichever of document_url / video_url / text_content applies to that
     type) and renders the matching viewer. "Tandai Selesai" inside the modal
     is the same courseFinishNodeById the old click used to fire directly —
     materials don't have a server-side completion record the way voyages
     do (no check_voyage_answer equivalent), so this only changes *when*
     that fires, not what it does underneath. */

  let COURSE_MATERIAL_RUNNER = null; // { nodeId, material }

  // Toolbar shows the material as a plain "file" chip — e.g. ".pdf",
  // ".mp4", ".txt" — instead of an icon+label pill. Prefers the real
  // extension off document_url/video_url when there is one (so an
  // uploaded .docx or .pptx shows correctly instead of always ".pdf"),
  // and falls back to a sensible default per content_type otherwise
  // (a YouTube/Vimeo link has no file extension to read).
  function courseMaterialFileExt(m) {
    function extFromUrl(url) {
      try {
        const path = new URL(url).pathname;
        const match = path.match(/\.([a-zA-Z0-9]{1,5})$/);
        return match ? `.${match[1].toLowerCase()}` : null;
      } catch (e) { return null; }
    }
    if (m.content_type === 'text') return '.txt';
    if (m.content_type === 'document') return (m.document_url && extFromUrl(m.document_url)) || '.pdf';
    if (m.content_type === 'video') return (m.video_url && extFromUrl(m.video_url)) || '.mp4';
    return null;
  }

  async function courseOpenMaterialModal(nodeId) {
    const node = COURSE_GRAPH.nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (!node.materialId) {
      // Nothing attached yet — same dead-end fallback the voyage runner
      // uses for a voyage_group with no voyageIds, rather than opening an
      // empty modal.
      courseFinishNodeById(nodeId);
      return;
    }

    const { data: material, error } = await supabaseClient
      .from('materials').select('*').eq('id', node.materialId).limit(1).maybeSingle();
    if (error || !material) { console.error('Error fetching material:', error); return; }

    COURSE_MATERIAL_RUNNER = { nodeId, material };
    renderCourseMaterialModal();
    kirLocalModalShow(document.getElementById('cmm-modal'));
  }

  // Body-level info tooltip for the material viewer's "i" button
  // (#cmm-info-btn in workspace.html). This is a local copy of just
  // the two pieces of admin-shared.js's tooltip system this page
  // needs (kirAdminTooltipRoot/kirAdminTooltipShowHtml/Hide there) —
  // course.html doesn't load admin-shared.js itself (see the comment
  // on that <link> in workspace.html's <head> for why: it top-level
  // redeclares consts, like KIR_MATH_SNIPPETS above, that this file
  // already declares on its own), so rather than pulling in that
  // whole bundle just for this, the tooltip is kept local too. Reuses
  // .admin-tooltip's CSS from admin-shared.css (already loaded) so it
  // looks identical to the admin "i" buttons elsewhere in the app.
  function kirAdminTooltipRoot() {
    let root = document.getElementById('admin-tooltip-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'admin-tooltip-root';
      root.className = 'admin-tooltip hidden';
      document.body.appendChild(root);
    }
    return root;
  }
  function kirAdminTooltipShowHtml(triggerEl, html) {
    const root = kirAdminTooltipRoot();
    root.innerHTML = html;
    root.classList.remove('hidden');

    const rect = triggerEl.getBoundingClientRect();
    const tw = root.offsetWidth || 240;
    const th = root.offsetHeight || 0;
    let left = rect.left + rect.width / 2 - tw / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));

    let top = rect.top - th - 10;
    let below = false;
    if (top < 8) { top = rect.bottom + 10; below = true; } // flip below if no room above the viewport

    root.style.left = `${left}px`;
    root.style.top = `${top}px`;
    root.classList.toggle('arrow-below', below);
    root.style.setProperty('--tt-arrow-left', `${rect.left + rect.width / 2 - left}px`);
  }
  function kirAdminTooltipHide() {
    const root = document.getElementById('admin-tooltip-root');
    if (root) root.classList.add('hidden');
  }

  // Content for the material viewer's "i" info button (see #cmm-info-btn
  // in workspace.html) — feeds the tooltip helpers just above.
  // #cmm-desc itself is kept hidden and only ever read from here, right
  // at hover/focus time, so it always reflects whichever material is
  // currently open. Wrapped in kir-markdown + muted text classes since
  // the raw markdown output (plain <p>/<ul>/etc.) has no sizing/color of
  // its own — .admin-tooltip only styles its own admin-tooltip-p/ul/li,
  // not arbitrary markdown tags.
  function courseMaterialShowDescTooltip(triggerEl) {
    const html = document.getElementById('cmm-desc').innerHTML;
    kirAdminTooltipShowHtml(triggerEl, `<div class="kir-markdown text-xs text-zinc-400">${html}</div>`);
  }

  function closeCourseMaterialModal() {
    kirLocalModalHide(document.getElementById('cmm-modal'));
    kirAdminTooltipHide();
    const frame = document.getElementById('cmm-video-frame');
    if (frame) frame.src = ''; // stop any playing embed once the modal's gone
    const nativeVideo = document.getElementById('cmm-video-native');
    if (nativeVideo) nativeVideo.pause();
    COURSE_MATERIAL_RUNNER = null;
  }

  // YouTube/Vimeo links need converting to their /embed form to work inside
  // an iframe; anything else (direct .mp4/.webm links, Supabase storage
  // URLs, etc.) falls back to a native <video> tag instead. Returns null if
  // the URL doesn't match a known iframe-embeddable host.
  function courseMaterialVideoEmbedUrl(url) {
    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./, '');
      if (host === 'youtube.com' || host === 'm.youtube.com') {
        const id = u.searchParams.get('v');
        if (id) return `https://www.youtube.com/embed/${id}`;
        const shortMatch = u.pathname.match(/^\/(shorts|embed)\/([^/]+)/);
        if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[2]}`;
      }
      if (host === 'youtu.be') {
        const id = u.pathname.slice(1);
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      if (host === 'vimeo.com') {
        const id = u.pathname.split('/').filter(Boolean)[0];
        if (id) return `https://player.vimeo.com/video/${id}`;
      }
    } catch (e) { /* not a valid absolute URL — treat as non-embeddable below */ }
    return null;
  }

  function renderCourseMaterialModal() {
    const r = COURSE_MATERIAL_RUNNER;
    const node = COURSE_GRAPH.nodes.find(n => n.id === r.nodeId);
    const m = r.material;

    document.getElementById('cmm-title').innerHTML = kirRenderCourseMarkdown((node && node.title) || 'Materi');
    document.getElementById('cmm-desc').innerHTML = kirRenderCourseMarkdown((node && node.description) || '');
    document.getElementById('cmm-info-btn').classList.toggle('hidden', !(node && node.description));
    kirAdminTooltipHide(); // in case a previous material's tooltip was left open mid-hover

    const ext = courseMaterialFileExt(m);
    const extEl = document.getElementById('cmm-type-pill');
    extEl.textContent = ext || '';
    extEl.classList.toggle('hidden', !ext);

    const durationBadge = document.getElementById('cmm-duration-badge');
    if (node && node.duration) {
      durationBadge.textContent = `(${node.duration})`;
      durationBadge.classList.remove('hidden');
    } else {
      durationBadge.classList.add('hidden');
    }

    ['text', 'document', 'video', 'empty'].forEach(t => {
      document.getElementById(`cmm-${t}-wrap`).classList.add('hidden');
    });

    const videoFrame = document.getElementById('cmm-video-frame');
    const videoNative = document.getElementById('cmm-video-native');
    videoFrame.classList.add('hidden'); videoFrame.src = '';
    videoNative.classList.add('hidden'); videoNative.removeAttribute('src');

    // Toolbar "open in new tab" icon button — replaces the old separate
    // text links under the document/video panes now that both live in
    // one toolbar. Hidden unless the current material actually has a
    // URL to open (text materials don't). Label text still comes from
    // the same two i18n strings the old links used, just applied as a
    // title/aria-label on the icon instead of visible link text.
    const openTabLink = document.getElementById('cmm-open-tab-link');
    const lang = localStorage.getItem(KIR_LANG_KEY) || 'id';
    openTabLink.classList.add('hidden');
    openTabLink.removeAttribute('title');

    const finishLabel = I18N[lang].course_mark_done || 'Tandai Selesai';
    const finishBtn = document.getElementById('cmm-finish-btn');
    finishBtn.title = finishLabel;
    finishBtn.setAttribute('aria-label', finishLabel);

    if (m.content_type === 'text' && m.text_content) {
      document.getElementById('cmm-text-body').innerHTML = kirRenderCourseMarkdown(m.text_content);
      document.getElementById('cmm-text-wrap').classList.remove('hidden');
    } else if (m.content_type === 'document' && m.document_url) {
      document.getElementById('cmm-document-frame').src = m.document_url;
      document.getElementById('cmm-document-wrap').classList.remove('hidden');
      const label = I18N[lang].course_material_new_tab || 'Buka dokumen di tab baru';
      openTabLink.href = m.document_url;
      openTabLink.title = label;
      openTabLink.setAttribute('aria-label', label);
      openTabLink.classList.remove('hidden');
    } else if (m.content_type === 'video' && m.video_url) {
      const embedUrl = courseMaterialVideoEmbedUrl(m.video_url);
      if (embedUrl) {
        videoFrame.src = embedUrl;
        videoFrame.classList.remove('hidden');
      } else {
        videoNative.src = m.video_url;
        videoNative.classList.remove('hidden');
      }
      document.getElementById('cmm-video-wrap').classList.remove('hidden');
      const label = I18N[lang].course_video_new_tab || 'Buka video di tab baru';
      openTabLink.href = m.video_url;
      openTabLink.title = label;
      openTabLink.setAttribute('aria-label', label);
      openTabLink.classList.remove('hidden');
    } else {
      document.getElementById('cmm-empty-wrap').classList.remove('hidden');
    }

    kirRenderCourseDiagrams(document.getElementById('cmm-modal'));
    kirTypesetCourseMath(document.getElementById('cmm-modal'));
  }

  function courseFinishMaterialModal() {
    const nodeId = COURSE_MATERIAL_RUNNER ? COURSE_MATERIAL_RUNNER.nodeId : null;
    closeCourseMaterialModal();
    if (nodeId) courseFinishNodeById(nodeId);
  }

  /* Small icon set for headers/footers/stats — same stroke style
     throughout. Declared before COURSE_NODE_TYPES (and reused inside
     it) so every node type and every stat/CTA that refers to a given
     concept — material or voyage — renders the exact same glyph.
     COURSE_ICON_ROCKET is copied from the "Voyages" taskbar link in
     auth.js so the voyage concept looks identical everywhere in the
     app, not just consistent within this graph. */
  const COURSE_ICON_CLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 7v5l3.5 2"/></svg>';
  const COURSE_ICON_QUESTION = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" stroke-linejoin="round" d="M9.5 9a2.5 2.5 0 014.9.8c0 1.7-2.4 2-2.4 3.7"/><circle cx="12" cy="16.3" r="0.6" fill="currentColor" stroke="none"/></svg>';
  const COURSE_ICON_BOOK_OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.5c-1.6-1.2-3.7-1.8-6-1.8v13c2.3 0 4.4.6 6 1.8m0-13c1.6-1.2 3.7-1.8 6-1.8v13c-2.3 0-4.4.6-6 1.8m0-13v13"/></svg>';
  const COURSE_ICON_ROCKET = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2.5c2.5 2.2 4 5.4 4 8.9 0 2.1-.6 4-1.6 5.6L12 21.5l-2.4-4.5A10.6 10.6 0 018 11.4c0-3.5 1.5-6.7 4-8.9z" /><circle cx="12" cy="11" r="2" stroke-linecap="round" stroke-linejoin="round" /><path stroke-linecap="round" stroke-linejoin="round" d="M8.5 15.5c-1.8.7-3 1.8-3 3 0 1.7 3 3 6.5 3s6.5-1.3 6.5-3c0-1.2-1.2-2.3-3-3" /></svg>';
  /* Flag — the course's final exam. Same pole+banner glyph used for
     the node type icon, the course footer's "N Flag" stat, and the
     card's own "Mulai Flag" CTA, so it reads identically everywhere
     (same convention as COURSE_ICON_ROCKET for voyage_group above). */
  const COURSE_ICON_FLAG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 21V4m0 1h13l-2.2 3.2L18 11.5H5"/></svg>';
  /* Lock — shown centered in a locked node's blur overlay, replacing
     its real content entirely until it's unlocked. */
  const COURSE_ICON_LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M8 11V7a4 4 0 018 0v4"/></svg>';
  /* Check — small "Selesai" status pill on completed nodes. */
  const COURSE_ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';
  /* Content-type glyphs for #cmm-modal's type pill (document/video/text)
     now live earlier, right above COURSE_MATERIAL_TYPE_META, since that
     const uses them immediately and needs them declared first. */

  /* ---------- Accent-derived palette ----------
     Node colors used to be fixed hex values unrelated to the app's
     --accent-rgb (indigo/purple/amber/green/red), so the graph clashed
     with whichever accent theme (data-cabang) was active. Instead we
     read the live accent color and build every node-type/gradient
     color as a shade of it — same hue family, spread across a modest
     arc + lightness/saturation range so types still read as distinct
     at a glance. Read fresh (not cached at parse time) since
     data-cabang can be set after this script runs (see auth.js). */
  function courseAccentRgb() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb') || '';
    const parts = raw.split(',').map(n => parseInt(n.trim(), 10));
    if (parts.length === 3 && parts.every(n => Number.isFinite(n))) {
      return { r: parts[0], g: parts[1], b: parts[2] };
    }
    return { r: 139, g: 92, b: 246 }; // fallback: violet, matches data-cabang="both"
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4;
      }
      h *= 60;
    }
    return { h, s: s * 100, l: l * 100 };
  }

  function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(100, s)) / 100;
    l = Math.max(0, Math.min(100, l)) / 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
  }

  /* One shade of the accent: hueOffset spreads node types out around
     the accent's own hue (analogous palette, not a random rainbow),
     lightness sets how pale/deep it reads. Saturation is floored so
     the near-grayscale default "Orbit" accent still separates node
     types visibly instead of rendering as flat gray-on-gray. */
  function courseAccentShade(hueOffset, lightness, satOverride) {
    const { r, g, b } = courseAccentRgb();
    const accent = rgbToHsl(r, g, b);
    const sat = satOverride != null ? satOverride : Math.max(accent.s, 32);
    return hslToHex(accent.h + hueOffset, sat, lightness);
  }

  /* Configurable per node type — add a new type here and it renders
     correctly without touching the layout/render/connector logic. */
  const COURSE_NODE_TYPES = {
    module: {
      label: 'Module',
      get color() { return courseAccentShade(-10, 62); },
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>'
    },
    /* Course is the hub node — kept closest to the true accent hue
       (no offset), just a touch lighter, so it visibly anchors the
       graph as "the accent color" while everything else fans out
       from it. */
    course: {
      label: 'Course',
      get color() { return courseAccentShade(0, 68); },
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/><path stroke-linecap="round" stroke-linejoin="round" d="M3 9v6l9 5 9-5V9"/></svg>'
    },
    material: {
      label: 'Material',
      get color() { return courseAccentShade(7, 60); },
      icon: COURSE_ICON_BOOK_OPEN
    },
    voyage_group: {
      label: 'Voyages',
      get color() { return courseAccentShade(15, 56); },
      icon: COURSE_ICON_ROCKET
    },
    /* Flag — the course's final exam. A reskin of voyage_group: same
       card shell/footer shape, just its own color/icon/copy so it
       reads as the "big one" at the end of a course. Sits on the
       opposite side of the accent hue from voyage_group so the two
       don't blur together. */
    flag: {
      label: 'Flag',
      get color() { return courseAccentShade(-15, 52); },
      icon: COURSE_ICON_FLAG
    },
    default: {
      label: 'Node',
      get color() { return courseAccentShade(0, 58, 12); },
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/></svg>'
    }
  };

  function courseTypeConfig(type) {
    return COURSE_NODE_TYPES[type] || COURSE_NODE_TYPES.default;
  }

  /* ---------- Node color ----------
     Most types just use their fixed type color. Materials are the
     exception: their color slowly shifts along a gradient the
     further along the course they sit, so a course with a handful
     of lessons visibly "heats up" from a pale amber toward a deep
     red as materials pile up — a rough at-a-glance read of how
     substantial the course has gotten. Purely cosmetic/dummy for
     now: driven by position in COURSE_GRAPH, not real progress. */
  /* Each gradient sweeps pale -> deep at the same hue offset used by
     that type's card color above (material +7, voyage +15, flag
     -40), so the "heats up" effect stays a shade of the accent
     instead of jumping to an unrelated amber/green/red. Computed via
     functions (not top-level consts) so they read the live accent
     each time they're used, same as courseAccentShade above. */
  function courseMaterialColorStart() { return courseAccentShade(7, 84); }
  function courseMaterialColorEnd() { return courseAccentShade(7, 38); }
  function courseVoyageColorStart() { return courseAccentShade(15, 82); }
  function courseVoyageColorEnd() { return courseAccentShade(15, 30); }
  function courseFlagColorStart() { return courseAccentShade(-15, 82); }
  function courseFlagColorEnd() { return courseAccentShade(-15, 32); }

  function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
    const int = parseInt(full, 16);
    return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b]
      .map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
      .join('');
  }

  function lerpColor(hexA, hexB, t) {
    const a = hexToRgb(hexA), b = hexToRgb(hexB);
    return rgbToHex(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
  }

  function courseNodeColor(node) {
    if (node.type === 'material') {
      const materials = COURSE_GRAPH.nodes.filter(n => n.type === 'material');
      const idx = materials.findIndex(n => n.id === node.id);
      // Enforce a minimum denominator so short curriculums don't instantly hit 100% red
      const t = materials.length > 1 ? idx / Math.max(materials.length - 1, 5) : 0;
      return lerpColor(courseMaterialColorStart(), courseMaterialColorEnd(), t);
    }
    if (node.type === 'voyage_group') {
      const voyages = COURSE_GRAPH.nodes.filter(n => n.type === 'voyage_group');
      const idx = voyages.findIndex(n => n.id === node.id);
      // Enforce a minimum denominator so 2 voyages only traverse 25% of the gradient
      const t = voyages.length > 1 ? idx / Math.max(voyages.length - 1, 4) : 0;
      return lerpColor(courseVoyageColorStart(), courseVoyageColorEnd(), t);
    }
    if (node.type === 'flag') {
      const flags = COURSE_GRAPH.nodes.filter(n => n.type === 'flag');
      const idx = flags.findIndex(n => n.id === node.id);
      const t = flags.length > 1 ? idx / (flags.length - 1) : 0;
      return lerpColor(courseFlagColorStart(), courseFlagColorEnd(), t);
    }
    return courseTypeConfig(node.type).color;
  }

  /* ---------- Node width ----------
     Course is the hub of the tree, so it gets a wider card to hold
     its stats/progress footer — everything else shares a common
     width. Layout math below reads widths from here rather than a
     single constant so spacing stays correct either way. */
  const COURSE_NODE_WIDTHS = { course: 300, module: 250, material: 240, voyage_group: 270, flag: 240, default: 240 };
  function courseNodeWidth(node) {
    return COURSE_NODE_WIDTHS[node.type] || COURSE_NODE_WIDTHS.default;
  }

  /* ---------- Layout ----------
     Pure function of COURSE_GRAPH: Calculates the longest path from 
     root for each node to determine its Y-layer, then centers each 
     layer horizontally (DAG-friendly layer layout). Output is a 
     plain {id: {x, y}} map in layout units — no DOM involved. */
  const COURSE_GAP_X = 56;
  /* Row spacing is no longer a flat multiple of one constant — a
     module's card (a slim chip) is much shorter than a material/
     voyage/flag card, so a fixed per-row height left a big dead gap
     under every module. Instead each row's Y is the previous row's
     tallest *estimated* card height plus one shared gap, so the
     module -> first-step gap actually matches its content instead of
     matching whatever the tallest row elsewhere happens to be. These
     are estimates only (real connector/canvas sizing already
     re-measures actual rendered rects — see drawCourseConnectors) so
     they just need to be in the right ballpark, not pixel-perfect. */
  const COURSE_NODE_EST_HEIGHT = { course: 300, module: 96, material: 234, voyage_group: 234, flag: 234, default: 234 };
  const COURSE_ROW_GAP = 88;
  /* Horizontal gap between a branch node and whatever it connects to
     (its anchor, or — for a converging node — the average position of
     its several sources). Kept clearly larger than COURSE_GAP_X (the
     tight side-by-side gap between main-tree siblings) so a branch
     stack doesn't read as cramped against it. */
  const COURSE_BRANCH_GAP_X = 100;
  const COURSE_BRANCH_GAP_Y = 280;

  function computeCourseLayout(graph) {
    const byId = {};
    graph.nodes.forEach(n => { byId[n.id] = n; });

    /* Branch edges (edge.branch === 'left' | 'right') are optional
       side paths — e.g. extra practice voyages hanging off the main
       voyage — and never take part in the primary top-down layering.
       Everything below keys off mainEdges/branchEdges instead of the
       raw edge list so the two layouts stay fully independent. */
    const mainEdges = graph.edges.filter(e => !e.branch);
    const branchEdges = graph.edges.filter(e => e.branch);
    const branchNodeIds = new Set(branchEdges.map(e => e.to));

    // 1. Assign depths (longest path from root) over the main
    //    progression only — branch nodes are excluded so they never
    //    get a row of their own. Capped to prevent cyclic lock.
    const depths = {};
    graph.nodes.forEach(n => { if (!branchNodeIds.has(n.id)) depths[n.id] = 0; });

    let changed = true;
    let iterations = 0;
    const maxIterations = graph.nodes.length;

    while (changed && iterations < maxIterations) {
      changed = false;
      mainEdges.forEach(e => {
        if (!byId[e.from] || !byId[e.to]) return;
        if (depths[e.to] === undefined) return; // e.to is a branch node — not part of this pass
        if (depths[e.to] < depths[e.from] + 1) {
          depths[e.to] = depths[e.from] + 1;
          changed = true;
        }
      });
      iterations++;
    }

    // 2. Group nodes into layers
    const layers = [];
    Object.keys(depths).forEach(id => {
      const d = depths[id];
      if (!layers[d]) layers[d] = [];
      layers[d].push(id);
    });

    // 2b. Row Y per depth: cumulative sum of each previous row's
    //     tallest estimated card height + a fixed gap, instead of a
    //     flat d * ROW_H — see COURSE_NODE_EST_HEIGHT/COURSE_ROW_GAP above.
    const rowY = [0];
    for (let d = 1; d < layers.length; d++) {
      const prevLayer = layers[d - 1] || [];
      const prevMaxH = prevLayer.reduce((max, id) => {
        const h = COURSE_NODE_EST_HEIGHT[byId[id].type] || COURSE_NODE_EST_HEIGHT.default;
        return Math.max(max, h);
      }, 0);
      rowY[d] = rowY[d - 1] + prevMaxH + COURSE_ROW_GAP;
    }

    // 3. Position main-tree nodes layer by layer. Every node except
    //    the root has exactly one main-edge parent (a path's steps
    //    are a straight chain; the only fan-out is course -> its
    //    modules), so instead of centering an entire row around
    //    X = 0 (which can offset a chain of same-width "stuff" away
    //    from its own, differently-wide module whenever other
    //    modules'/paths' nodes share that row), each node is grouped
    //    with its true siblings — nodes sharing the same parent — and
    //    that group alone is centered directly under the parent's own
    //    X. A lone child's "group" is just itself, which collapses to
    //    exactly the parent's X: no offset. Branch stacks are placed
    //    afterward (step 4) purely relative to their anchor's
    //    already-final position, same as before.
    const positions = {};
    layers.forEach((layer, d) => {
      if (d === 0) {
        // Root layer has no parent to center under — center the row around X = 0, as before.
        const totalW = layer.reduce((sum, id) => sum + courseNodeWidth(byId[id]), 0) + (layer.length - 1) * COURSE_GAP_X;
        let cursor = -totalW / 2;
        layer.forEach(id => {
          const w = courseNodeWidth(byId[id]);
          positions[id] = { x: cursor + w / 2, y: rowY[d] };
          cursor += w + COURSE_GAP_X;
        });
        return;
      }

      // Group this row's nodes by their single main-edge parent.
      const groups = {};
      const groupOrder = [];
      layer.forEach(id => {
        const parentEdge = mainEdges.find(e => e.to === id);
        const parentId = parentEdge ? parentEdge.from : '__root__';
        if (!groups[parentId]) { groups[parentId] = []; groupOrder.push(parentId); }
        groups[parentId].push(id);
      });

      // Visit parents left-to-right (by their own X) so sibling
      // groups still lay out in a sensible order, minimizing crossings.
      groupOrder
        .sort((a, b) => (positions[a] ? positions[a].x : 0) - (positions[b] ? positions[b].x : 0))
        .forEach(parentId => {
          const group = groups[parentId];
          const totalW = group.reduce((sum, id) => sum + courseNodeWidth(byId[id]), 0) + (group.length - 1) * COURSE_GAP_X;
          const parentX = positions[parentId] ? positions[parentId].x : 0;
          let cursor = parentX - totalW / 2;
          group.forEach(id => {
            const w = courseNodeWidth(byId[id]);
            positions[id] = { x: cursor + w / 2, y: rowY[d] };
            cursor += w + COURSE_GAP_X;
          });
        });
    });

    // 4. Place branch nodes. A branch node can have one source (the
    //    common case: a single anchor fanning out into several
    //    optional siblings, e.g. voyage-1's 3 practice voyages) or
    //    several sources (fan-in: those same siblings converging back
    //    into one further node, e.g. an optional exam gating them) —
    //    and a branch node can itself be the source of a further
    //    branch level. Handled generically by resolving iteratively:
    //    a node is placed once every one of its sources already has a
    //    position, using the average of those sources' positions as
    //    its anchor point. Nodes that share an identical source-set +
    //    side are treated as siblings and stacked vertically around
    //    that shared anchor point, same as a single anchor's fan-out.
    const branchTargets = {};
    branchEdges.forEach(e => {
      const t = (branchTargets[e.to] = branchTargets[e.to] || { sources: [], side: e.branch });
      t.sources.push(e.from);
    });
    const siblingKey = (sources, side) => side + '|' + [...sources].sort().join(',');

    const pending = new Set(Object.keys(branchTargets));
    let progress = true;
    while (pending.size && progress) {
      progress = false;

      // Group everything that's ready to place (all its sources
      // already have a position) by shared source-set + side, so
      // true siblings still stack together in one pass.
      const readyGroups = {};
      pending.forEach(id => {
        const t = branchTargets[id];
        if (t.sources.every(s => positions[s])) {
          const key = siblingKey(t.sources, t.side);
          (readyGroups[key] = readyGroups[key] || []).push(id);
        }
      });

      Object.values(readyGroups).forEach(ids => {
        const t = branchTargets[ids[0]];
        const srcPositions = t.sources.map(s => positions[s]);
        const anchorX = srcPositions.reduce((sum, p) => sum + p.x, 0) / srcPositions.length;
        const anchorY = srcPositions.reduce((sum, p) => sum + p.y, 0) / srcPositions.length;
        const anchorHalfW = Math.max(...t.sources.map(s => courseNodeWidth(byId[s]))) / 2;
        const mid = (ids.length - 1) / 2;
        ids.forEach((id, idx) => {
          const w = courseNodeWidth(byId[id]);
          const x = t.side === 'right'
            ? anchorX + anchorHalfW + COURSE_BRANCH_GAP_X + w / 2
            : anchorX - anchorHalfW - COURSE_BRANCH_GAP_X - w / 2;
          positions[id] = { x, y: anchorY + (idx - mid) * COURSE_BRANCH_GAP_Y };
          pending.delete(id);
          progress = true;
        });
      });
    }
    // Any branch node whose source(s) never got positioned (e.g. an
    // anchor that isn't actually in the graph) is silently skipped —
    // renderCourseGraph already filters nodes without a position.

    // 5. Shift everything — main tree and branch nodes alike, now
    //    that both have their final positions — so the left-most
    //    card edge sits at a comfortable padding.
    const PAD = 60;
    let minX = Infinity;
    Object.keys(positions).forEach(id => {
      const leftEdge = positions[id].x - courseNodeWidth(byId[id]) / 2;
      if (leftEdge < minX) minX = leftEdge;
    });

    const shift = PAD - minX;
    Object.values(positions).forEach(p => { p.x += shift; });

    return positions;
  }

  /* ---------- Rendering ---------- */

  /* Type-specific footer: course shows aggregate stats + an overall
     progress bar (it's the hub, not a single action); material and
     voyage each get one clear CTA plus a bit of meta context. No
     click handlers do anything real yet — layout/visual pass only.
     The "Materi"/"Voyage" stat icons and the voyage CTA icon reuse
     COURSE_ICON_BOOK_OPEN / COURSE_ICON_ROCKET — the same glyphs as the
     material/voyage node types themselves — so a course's summary
     always matches what its children actually look like. */
  function courseCardFooterHtml(node, color, childCounts) {
    const lang = localStorage.getItem(KIR_LANG_KEY) || 'id';
    if (node.type === 'course') {
      const allCounts = { material: 0, voyage_group: 0, flag: 0 };
      COURSE_GRAPH.nodes.forEach(n => {
        if (allCounts[n.type] !== undefined) {
          allCounts[n.type]++;
        }
      });
      const pct = Math.round((node.progress || 0) * 100);
      return `
        <div class="course-course-stats">
          <span class="course-course-stat">${COURSE_ICON_BOOK_OPEN} ${allCounts.material} ${kirEscapeHtml(I18N[lang].course_category || 'Materi')}</span>
          <span class="course-course-stat">${COURSE_ICON_ROCKET} ${allCounts.voyage_group} Voyages</span>
          <span class="course-course-stat">${COURSE_ICON_FLAG} ${allCounts.flag} Flag</span>
        </div>
        <div class="course-progress-track"><div class="course-progress-fill" style="width:${pct}%; background:${color};"></div></div>`;
    }
    if (node.type === 'material') {
      return `
        <div class="course-node-footer">
          <span class="course-node-meta">${COURSE_ICON_CLOCK} ${kirEscapeHtml(node.duration || '')}</span>
          <button type="button" class="course-node-action-btn" style="background:${color}26; color:${color}; border-color:${color}4d;" onclick="event.stopPropagation(); courseOpenMaterialModal('${kirEscapeHtml(node.id)}');">
            ${COURSE_ICON_BOOK_OPEN} ${kirEscapeHtml(I18N[lang].course_open_material || 'Buka Materi')}
          </button>
        </div>`;
    }
    if (node.type === 'voyage_group') {
      const voyageDone = node.state === 'completed';
      const voyageLabel = voyageDone
        ? (I18N[lang].course_redo_voyage || 'Ulang Voyage')
        : (I18N[lang].course_start_voyage || 'Mulai Voyage');
      return `
        <div class="course-node-footer">
          ${courseVoyageNodeMetaHtml(node)}
          <button type="button" class="course-node-action-btn" style="background:${color}26; color:${color}; border-color:${color}4d;" onclick="event.stopPropagation(); courseOpenVoyageRunner('${kirEscapeHtml(node.id)}');">
            ${COURSE_ICON_ROCKET} ${kirEscapeHtml(voyageLabel)}
          </button>
        </div>`;
    }
    /* Flag — deliberately a straight reskin of voyage_group's footer:
       identical markup/classes, just swapped CTA icon+label. Same real
       voyage runner underneath — a flag is just a voyage_group node
       whose attached voyages happen to be the final exam set, so it
       gets the same rating/soal-count meta text instead of its old
       exam-duration meta text. */
    if (node.type === 'flag') {
      const flagDone = node.state === 'completed';
      const flagLabel = flagDone
        ? (I18N[lang].course_redo_flag || 'Ulang Flag')
        : (I18N[lang].course_start_flag || 'Mulai Flag');
      return `
        <div class="course-node-footer">
          ${courseVoyageNodeMetaHtml(node)}
          <button type="button" class="course-node-action-btn" style="background:${color}26; color:${color}; border-color:${color}4d;" onclick="event.stopPropagation(); courseOpenVoyageRunner('${kirEscapeHtml(node.id)}');">
            ${COURSE_ICON_FLAG} ${kirEscapeHtml(flagLabel)}
          </button>
        </div>`;
    }
    return '';
  }

  // Rating meta (avg. difficulty across the node's attached voyages,
  // same star glyph the old pill badge used) followed by a soal-count
  // meta (node.voyageIds.length — the real number of questions in the
  // group, not admin-typed free text), separated by a small gray
  // divider bar. Shared by voyage_group and flag footers since both
  // are driven by the same voyage runner. Plain gray text now, same
  // treatment as material's .course-node-meta duration text, instead
  // of the old accent-colored pill badges. Rating meta is omitted if
  // the node has no voyages with a known difficulty yet (avgDifficulty
  // is null), e.g. a freshly-created node with nothing attached — in
  // that case the divider is skipped too, so soal-count doesn't end up
  // with a dangling separator in front of it.
  function courseVoyageNodeMetaHtml(node) {
    const lang = localStorage.getItem(KIR_LANG_KEY) || 'id';
    const soalCount = (node.voyageIds || []).length;
    let ratingMeta = '';
    if (node.avgDifficulty !== null && node.avgDifficulty !== undefined) {
      ratingMeta = `<span class="course-node-meta">${COURSE_DIFF_STAR_SVG}${node.avgDifficulty}</span><span class="course-node-meta-sep"></span>`;
    }
    const soalMeta = `<span class="course-node-meta">${COURSE_ICON_QUESTION} ${soalCount} ${kirEscapeHtml(I18N[lang].course_questions_count || 'Soal')}</span>`;
    return `<div class="course-node-meta-group">${ratingMeta}${soalMeta}</div>`;
  }

  function courseNodeCardHtml(node, pos, hasParent, hasChildren, childCounts, branchInfo) {
    const cfg = courseTypeConfig(node.type);
    const color = courseNodeColor(node); // materials use a per-node gradient shade; other types fall back to their fixed type color
    const w = courseNodeWidth(node);
    branchInfo = branchInfo || {};
    // Anchors get a port facing each side that has a branch stack;
    // branch nodes themselves get one port facing back toward their
    // anchor (branchInfo.branchSide) — on top of the usual in/out
    // ports above, never replacing them.
    const sidePorts = `
      ${branchInfo.left ? `<div class="course-port course-port-left" style="background:${color};"></div>` : ''}
      ${branchInfo.right ? `<div class="course-port course-port-right" style="background:${color};"></div>` : ''}
      ${branchInfo.branchSide === 'left' ? `<div class="course-port course-port-left" style="background:${color};"></div>` : ''}
      ${branchInfo.branchSide === 'right' ? `<div class="course-port course-port-right" style="background:${color};"></div>` : ''}`;

    const isLocked = node.state === 'locked';
    const isCurrent = node.state === 'current';
    const isCompleted = node.state === 'completed';
    const stateClass = isLocked ? ' is-locked' : isCurrent ? ' is-current' : '';
    // Ports/thumb/CTA colors still use the node's real type color even
    // when locked — only the overlay on top hides the content itself,
    // so the underlying card doesn't need a separate "locked palette".
    const statusBadge = isCurrent
      ? `<span class="course-node-status-icon" style="background:${color}26; color:${color};" title="Sedang Berjalan">${COURSE_ICON_CLOCK}</span>`
      : isCompleted
        ? `<span class="course-node-status-icon" style="background:rgba(148,163,184,0.14); color:rgba(203,213,225,0.85);" title="Selesai">${COURSE_ICON_CHECK}</span>`
        : '';
    // Locked nodes get a full opaque-blur overlay instead of their
    // real header/thumb/body/footer — title, description, duration,
    // team info, all of it stays hidden until the node unlocks. The
    // real content still renders underneath (so layout/measurement —
    // sizeCourseCanvas, drawCourseConnectors — sees a normal card), the
    // overlay just visually replaces it.
    // A node that just unlocked (this render only) still gets the
    // overlay markup, but with a one-shot fade-out animation class —
    // the real unlocked content is already sitting underneath (see
    // above), so this purely animates the censor melting away instead
    // of it just vanishing between one render and the next.
    const justUnlocked = !isLocked && COURSE_ANIM_UNLOCK_IDS.has(node.id);
    const lang = localStorage.getItem(KIR_LANG_KEY) || 'id';
    const lockOverlay = isLocked
      ? `<div class="course-node-lock-overlay">${COURSE_ICON_LOCK}<span class="course-node-lock-label">${kirEscapeHtml(I18N[lang].course_locked_badge || 'Terkunci')}</span></div>`
      : justUnlocked
        ? `<div class="course-node-lock-overlay course-lock-fading">${COURSE_ICON_LOCK}<span class="course-node-lock-label">${kirEscapeHtml(I18N[lang].course_locked_badge || 'Terkunci')}</span></div>`
        : '';

    // Module — a chapter divider, not a piece of content: skips the
    // header/thumb/body/footer shell entirely in favor of one slim,
    // dashed-border chip (chapter number + title), so it visually
    // reads as organizing structure rather than a lesson to open.
    if (node.type === 'module') {
      // The chip's number used to be parsed out of the node id itself
      // (e.g. hoping for a trailing digit), but ids like "mod-1-trigo"
      // don't end in a digit — the number sits in the middle — so that
      // never matched and the square rendered empty. Count this
      // module's position among module-type nodes in the course's main
      // chain instead: robust regardless of how the id is named, and
      // matches the natural "Modul 1", "Modul 2" reading order the
      // titles already use.
      const moduleOrder = (COURSE_GRAPH.mainOrder || []).filter(id => {
        const n = COURSE_GRAPH.nodes.find(candidate => candidate.id === id);
        return n && n.type === 'module';
      });
      const chapterNum = moduleOrder.indexOf(node.id) + 1;
      return `
        <div class="course-node course-card-module${stateClass}" data-node-id="${kirEscapeHtml(node.id)}" style="left:${pos.x - w / 2}px; top:${pos.y}px; width:${w}px; --course-current-glow:${color}55;" onclick="courseSelectNode('${kirEscapeHtml(node.id)}')">
          <div class="course-node-inner overflow-hidden" style="border-color:${color}55;">
            ${hasParent ? `<div class="course-port course-port-in" style="background:${color};"></div>` : ''}
            ${sidePorts}
            <div class="course-module-chip">
              <span class="course-module-number" style="color:${color}; background:${color}26; border-color:${color}4d;">${kirEscapeHtml(chapterNum)}</span>
              <div class="course-module-text">
                <div class="course-node-title font-medium text-sm text-zinc-100 leading-snug line-clamp-2 kir-markdown kir-markdown-clamp">${kirRenderCourseMarkdown(node.title)}</div>
                <div class="course-node-desc text-zinc-500 text-[11px] mt-0.5 leading-snug line-clamp-2 kir-markdown kir-markdown-clamp">${kirRenderCourseMarkdown(node.description || '')}</div>
              </div>
              ${statusBadge}
            </div>
            ${hasChildren ? `<div class="course-port course-port-out" style="background:${color};"></div>` : ''}
            ${lockOverlay}
          </div>
        </div>`;
    }

    const thumbStyle = node.image ? ` style="background-image:url('${kirEscapeHtml(node.image)}')"` : '';

    // Every node type gets its icon in a small accent-tinted badge —
    // same bg-15/border-30 treatment the dashboard widgets use for
    // their icon tiles — rather than washing the whole header in
    // color. Course gets the circular medallion variant since it's
    // the hub; everything else gets the square version.
    const headerIcon = node.type === 'course'
      ? `<span class="course-course-icon-badge" style="background:${color}26; border:1px solid ${color}4d; color:${color};">${cfg.icon}</span>`
      : `<span class="course-node-icon-badge" style="background:${color}26; border:1px solid ${color}4d; color:${color};">${cfg.icon}</span>`;

    // Material — folded-corner triangle in the thumb, echoing a
    // printed page. Flag — thin checkered ribbon under the header,
    // echoing a finish-line flag (its pennant-notch card shape comes
    // purely from CSS).
    const materialFold = node.type === 'material'
      ? `<span class="course-material-foldcorner" style="color:${color};"></span>`
      : '';
    const flagRibbon = node.type === 'flag'
      ? `<div class="course-flag-ribbon" style="color:${color};"></div>`
      : '';

    return `
      <div class="course-node course-card-${kirEscapeHtml(node.type)}${stateClass}" data-node-id="${kirEscapeHtml(node.id)}" style="left:${pos.x - w / 2}px; top:${pos.y}px; width:${w}px; --course-current-glow:${color}55;" onclick="courseSelectNode('${kirEscapeHtml(node.id)}')">
        <div class="course-node-inner overflow-hidden">
          ${hasParent ? `<div class="course-port course-port-in" style="background:${color};"></div>` : ''}
          ${sidePorts}
          <div class="course-node-header">
            ${headerIcon}
            <span class="course-node-header-label">${kirEscapeHtml(cfg.label)}</span>
            ${node.optional ? `<span class="course-node-optional-badge" style="border-color:${color}4d; color:${color};">${kirEscapeHtml(I18N[lang].course_optional_badge || 'Opsional')}</span>` : ''}
            ${statusBadge}
            <span class="course-node-header-id text-zinc-300">#${kirEscapeHtml(node.id)}</span>
          </div>
          ${flagRibbon}
          <div class="course-node-thumb" style="color:${color};"${thumbStyle}>
            ${node.image ? '' : cfg.icon}
            ${materialFold}
          </div>
          <div class="course-node-body">
            <div class="course-node-title font-medium text-sm text-zinc-100 leading-snug line-clamp-2 kir-markdown kir-markdown-clamp">${kirRenderCourseMarkdown(node.title)}</div>
            <div class="course-node-desc text-zinc-500 text-[11px] mt-1.5 leading-snug line-clamp-2 kir-markdown kir-markdown-clamp">${kirRenderCourseMarkdown(node.description || '')}</div>
          </div>
          ${courseCardFooterHtml(node, color, childCounts)}
          ${hasChildren ? `<div class="course-port course-port-out" style="background:${color};"></div>` : ''}
          ${lockOverlay}
        </div>
      </div>`;
  }


  function renderCourseGraph() {
    const positions = computeCourseLayout(COURSE_GRAPH);
    const byId = {};
    COURSE_GRAPH.nodes.forEach(n => { byId[n.id] = n; });

    const mainEdges = COURSE_GRAPH.edges.filter(e => !e.branch);
    const branchEdges = COURSE_GRAPH.edges.filter(e => e.branch);
    const parents = new Set(mainEdges.map(e => e.to));
    const children = new Set(mainEdges.map(e => e.from));

    // Per-node branch info: which side(s) a node fans branches out to
    // (as an anchor), and which side a node itself sits on relative to
    // its anchor (as a branch node) — both drive which side port(s)
    // courseNodeCardHtml renders, in addition to the normal top/bottom
    // ports above.
    const branchInfoById = {};
    branchEdges.forEach(e => {
      const anchorInfo = (branchInfoById[e.from] = branchInfoById[e.from] || {});
      anchorInfo[e.branch] = true; // anchor gets a port facing its branch stack
      const nodeInfo = (branchInfoById[e.to] = branchInfoById[e.to] || {});
      nodeInfo.branchSide = e.branch === 'right' ? 'left' : 'right'; // branch node's port faces back toward the anchor
    });

    // Per-node counts of direct children by type, for the course
    // footer's "N Materi / N Voyage" stats — derived from the main
    // edge list so it stays correct as the dummy data grows, and
    // ignores optional branch nodes (those aren't required progress).
    const childCountsById = {};
    mainEdges.forEach(e => {
      const childType = byId[e.to] && byId[e.to].type;
      if (!childType) return;
      const counts = (childCountsById[e.from] = childCountsById[e.from] || {});
      counts[childType] = (counts[childType] || 0) + 1;
    });

    const html = COURSE_GRAPH.nodes
      .filter(n => positions[n.id])
      .map(n => courseNodeCardHtml(n, positions[n.id], parents.has(n.id), children.has(n.id), childCountsById[n.id] || {}, branchInfoById[n.id] || {}))
      .join('');
    const graphEl = document.getElementById('course-graph');
    graphEl.innerHTML = html;
    kirRenderCourseDiagrams(graphEl);
    kirTypesetCourseMath(graphEl);
  }

  /* #chart-canvas has no normal-flow content (every node is
     position:absolute), so it never picks up a natural size on its
     own — without this it collapses to 0×0 and centerCanvas() /
     the connector SVG have nothing to measure against. Sized from
     the actual rendered card rects, same source of truth the
     connectors use. */
  function sizeCourseCanvas() {
    const canvas = document.getElementById('chart-canvas');
    let maxRight = 0, maxBottom = 0;
    document.querySelectorAll('#course-graph .course-node').forEach(el => {
      maxRight = Math.max(maxRight, el.offsetLeft + el.offsetWidth);
      maxBottom = Math.max(maxBottom, el.offsetTop + el.offsetHeight);
    });
    canvas.style.width = (maxRight + 60) + 'px';
    canvas.style.height = (maxBottom + 60) + 'px';
  }

  /* ---------- Connectors ----------
     Same technique as members.html: measure real rendered card
     rects (offsetLeft/offsetTop relative to #chart-canvas) rather
     than trusting the layout math's pixel values directly, so
     connectors stay correct even if card height varies with
     content. Curves are generated per-edge from the edge list —
     nothing here is a hardcoded coordinate. */
  function courseCardRect(el) {
    return {
      left: el.offsetLeft,
      right: el.offsetLeft + el.offsetWidth,
      top: el.offsetTop,
      bottom: el.offsetTop + el.offsetHeight,
      centerX: el.offsetLeft + el.offsetWidth / 2,
      centerY: el.offsetTop + el.offsetHeight / 2,
    };
  }

  function drawCourseConnectors() {
    const canvas = document.getElementById('chart-canvas');
    const svg = document.getElementById('course-lines');
    const nodeEls = {};
    document.querySelectorAll('#course-graph .course-node').forEach(el => {
      nodeEls[el.dataset.nodeId] = el;
    });
    const nodesById = {};
    COURSE_GRAPH.nodes.forEach(n => { nodesById[n.id] = n; });

    let defs = '';
    let paths = '';
    COURSE_GRAPH.edges.forEach((edge, i) => {
      const fromEl = nodeEls[edge.from];
      const toEl = nodeEls[edge.to];
      if (!fromEl || !toEl) return;

      // Locked territory gets no connector at all — a line shouldn't
      // visually promise more than the censored card(s) it would
      // connect to. (Previously this dimmed the line instead; now it
      // simply isn't drawn.)
      const fromLocked = nodesById[edge.from] && nodesById[edge.from].state === 'locked';
      const toLocked = nodesById[edge.to] && nodesById[edge.to].state === 'locked';
      if (fromLocked || toLocked) return;

      const p = courseCardRect(fromEl);
      const c = courseCardRect(toEl);

      const getBorderOffsets = (type) => {
        if (type === 'course') return { t: 1.5, b: 1.5, l: 1.5, r: 1.5 };
        if (type === 'material') return { t: 1, b: 1, l: 3, r: 1 };
        return { t: 1, b: 1, l: 1, r: 1 };
      };

      const fromType = nodesById[edge.from] ? nodesById[edge.from].type : 'default';
      const toType = nodesById[edge.to] ? nodesById[edge.to].type : 'default';
      
      const fromOffsets = getBorderOffsets(fromType);
      const toOffsets = getBorderOffsets(toType);

      const fromCenterX = p.centerX + (fromOffsets.l - fromOffsets.r) / 2;
      const toCenterX = c.centerX + (toOffsets.l - toOffsets.r) / 2;
      const fromCenterY = p.centerY + (fromOffsets.t - fromOffsets.b) / 2;
      const toCenterY = c.centerY + (toOffsets.t - toOffsets.b) / 2;

      let startX, startY, endX, endY, bend, isBranch = false;
      if (edge.branch === 'right') {
        isBranch = true;
        startX = p.right - fromOffsets.r; startY = fromCenterY;
        endX = c.left + toOffsets.l; endY = toCenterY;
        bend = Math.max(24, (endX - startX) * 0.5);
      } else if (edge.branch === 'left') {
        isBranch = true;
        startX = p.left + fromOffsets.l; startY = fromCenterY;
        endX = c.right - toOffsets.r; endY = toCenterY;
        bend = Math.max(24, (startX - endX) * 0.5);
      } else {
        startX = fromCenterX; startY = p.bottom - fromOffsets.b;
        endX = toCenterX; endY = c.top + toOffsets.t;
        // Unity-style S-curve: control points pulled straight down/up
        // from each endpoint by a fraction of the vertical gap.
        bend = Math.max(40, (endY - startY) * 0.55);
      }

      const fromColor = nodesById[edge.from] ? courseNodeColor(nodesById[edge.from]) : courseTypeConfig().color;
      const toColor = nodesById[edge.to] ? courseNodeColor(nodesById[edge.to]) : courseTypeConfig().color;
      const gradId = `course-edge-grad-${i}`;

      const d = isBranch
        ? `M ${startX} ${startY} C ${startX + (edge.branch === 'right' ? bend : -bend)} ${startY}, ${endX + (edge.branch === 'right' ? -bend : bend)} ${endY}, ${endX} ${endY}`
        : `M ${startX} ${startY} C ${startX} ${startY + bend}, ${endX} ${endY - bend}, ${endX} ${endY}`;

      defs += `<linearGradient id="${gradId}" x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="${fromColor}" stop-opacity="0.9" />
        <stop offset="100%" stop-color="${toColor}" stop-opacity="0.9" />
      </linearGradient>`;

      // A connector that just became visible this render (its source
      // just finished, or its far end just unlocked) draws itself in
      // and pops its endpoint dots in, rather than snapping straight
      // to fully drawn.
      const justVisible = COURSE_ANIM_EDGE_KEYS.has(i);
      const edgeClass = `course-edge${isBranch ? ' course-edge-branch' : ''}${justVisible ? ' course-edge-animate' : ''}`;
      const dotClass = `course-edge-dot${justVisible ? ' course-edge-dot-animate' : ''}`;

      paths += `<path class="${edgeClass}" d="${d}" stroke="url(#${gradId})" pathLength="1" />`;
      paths += `<circle class="${dotClass}" cx="${startX}" cy="${startY}" r="4" stroke="${fromColor}" />`;
      paths += `<circle class="${dotClass}" cx="${endX}" cy="${endY}" r="4" stroke="${toColor}" />`;
    });

    svg.innerHTML = `<defs>${defs}</defs>${paths}`;
    svg.setAttribute('width', canvas.offsetWidth);
    svg.setAttribute('height', canvas.offsetHeight);
  }

  /* ---------- Inspector (inline panel, NOT the site's .modal-overlay —
     graph stays visible and interactive behind it) ---------- */
  let courseSelectedId = null;

  function courseRelationChip(node) {
    const cfg = courseTypeConfig(node.type);
    const color = courseNodeColor(node);
    return `
      <button type="button" class="course-relation-chip" onclick="courseSelectNode('${kirEscapeHtml(node.id)}')">
        <span style="color:${color};" class="course-node-type">${cfg.icon}</span>
        <span class="text-xs text-zinc-300 truncate kir-markdown kir-markdown-clamp">${kirRenderCourseMarkdown(node.title)}</span>
      </button>`;
  }

  function courseSelectNode(nodeId) {
    const node = COURSE_GRAPH.nodes.find(n => n.id === nodeId);
    if (!node) return;
    // Locked nodes have their real content hidden behind a blur
    // overlay on the card itself — opening the inspector would leak
    // the title/description the overlay is meant to hide, so clicking
    // a locked card is a no-op instead.
    if (node.state === 'locked') return;
    courseSelectedId = nodeId;

    document.querySelectorAll('#course-graph .course-node').forEach(el => {
      el.classList.toggle('is-selected', el.dataset.nodeId === nodeId);
    });

    const cfg = courseTypeConfig(node.type);
    const color = courseNodeColor(node);
    const parents = COURSE_GRAPH.edges
      .filter(e => e.to === nodeId)
      .map(e => COURSE_GRAPH.nodes.find(n => n.id === e.from))
      .filter(Boolean);
    const children = COURSE_GRAPH.edges
      .filter(e => e.from === nodeId)
      .map(e => COURSE_GRAPH.nodes.find(n => n.id === e.to))
      .filter(Boolean);

    const thumbStyle = node.image ? ` style="background-image:url('${kirEscapeHtml(node.image)}')"` : '';
    document.getElementById('course-inspector-body').innerHTML = `
      <div class="flex items-start justify-between gap-3 mb-4">
        <span class="text-[10px] uppercase tracking-wide font-semibold px-2 py-1 rounded-full border" style="color:${color}; background:${color}26; border-color:${color}4d;">${kirEscapeHtml(cfg.label)}</span>
        <button onclick="courseCloseInspector()" class="chart-ctrl-btn" title="Tutup" style="width:1.75rem;height:1.75rem;">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div class="course-inspector-thumb mb-4" style="color:${color};"${thumbStyle}>${node.image ? '' : cfg.icon}</div>
      <h2 class="font-display text-lg font-semibold text-zinc-100 mb-2 kir-markdown">${kirRenderCourseMarkdown(node.title)}</h2>
      <div class="text-sm text-zinc-400 leading-relaxed mb-5 kir-markdown">${kirRenderCourseMarkdown(node.description || 'Belum ada deskripsi.')}</div>
      ${parents.length || children.length ? `
        <div class="pt-4" style="border-top: 1px solid var(--glass-border);">
          ${parents.length ? `
            <p class="text-[11px] uppercase tracking-wide text-zinc-500 mb-2">Induk</p>
            <div class="flex flex-col gap-1.5 mb-4">${parents.map(courseRelationChip).join('')}</div>
          ` : ''}
          ${children.length ? `
            <p class="text-[11px] uppercase tracking-wide text-zinc-500 mb-2">Turunan</p>
            <div class="flex flex-col gap-1.5">${children.map(courseRelationChip).join('')}</div>
          ` : ''}
        </div>
      ` : ''}
    `;
    kirRenderCourseDiagrams(document.getElementById('course-inspector-body'));
    kirTypesetCourseMath(document.getElementById('course-inspector-body'));

    document.getElementById('course-inspector').classList.add('open');
    coursePositionInspector();
  }

  function courseCloseInspector() {
    courseSelectedId = null;
    const inspector = document.getElementById('course-inspector');
    inspector.classList.remove('open');
    document.querySelectorAll('#course-graph .course-node').forEach(el => el.classList.remove('is-selected'));
  }

  /* Places the inspector beside the selected node — checks both
     sides for overlapping node cards and picks whichever is more
     free (right wins ties). Runs once at selection time, in graph/
     canvas coordinate space (not screen space): from then on the
     inspector is just another child of #chart-canvas, so panning/
     zooming moves it exactly like a node — including offscreen. */
  function coursePositionInspector() {
    const inspector = document.getElementById('course-inspector');
    const nodeEl = courseSelectedId
      ? document.querySelector(`#course-graph .course-node[data-node-id="${CSS.escape(courseSelectedId)}"]`)
      : null;
    if (!nodeEl) return;

    const rect = courseCardRect(nodeEl); // graph/canvas-space
    const gap = 20, width = 280;
    const inspectorBody = document.getElementById('course-inspector-body');
    const height = Math.min(Math.max(inspectorBody.scrollHeight, 160), 420);

    const rightBox = { left: rect.right + gap, right: rect.right + gap + width, top: rect.top, bottom: rect.top + height };
    const leftBox = { left: rect.left - gap - width, right: rect.left - gap, top: rect.top, bottom: rect.top + height };

    function overlapCount(box) {
      let count = 0;
      document.querySelectorAll('#course-graph .course-node').forEach(el => {
        if (el === nodeEl) return;
        const r = courseCardRect(el);
        const overlaps = r.right > box.left && r.left < box.right && r.bottom > box.top && r.top < box.bottom;
        if (overlaps) count++;
      });
      return count;
    }

    const side = overlapCount(rightBox) <= overlapCount(leftBox) ? 'right' : 'left';
    const box = side === 'right' ? rightBox : leftBox;

    inspector.classList.remove('is-beside-left', 'is-beside-right');
    inspector.style.left = box.left + 'px';
    inspector.style.top = rect.top + 'px';
    inspector.classList.add(side === 'right' ? 'is-beside-right' : 'is-beside-left');
  }

  /* ---------- Pan & zoom ---------- */
  let panX = 0, panY = 0, scale = 1;
  let isDragging = false, dragStartX = 0, dragStartY = 0, panStartX = 0, panStartY = 0;
  let didDrag = false;

  function applyTransform() {
    document.getElementById('chart-canvas').style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    const viewport = document.getElementById('chart-viewport');
    viewport.style.backgroundPosition = `${panX}px ${panY}px`;
    viewport.style.backgroundSize = `${26 * scale}px ${26 * scale}px`;
  }

  function chartZoom(factor) {
    scale = Math.min(1.6, Math.max(0.45, scale * factor));
    applyTransform();
  }

  function centerCanvas() {
    const viewport = document.getElementById('chart-viewport');
    const canvas = document.getElementById('chart-canvas');
    scale = 1;
    const vw = viewport.clientWidth, vh = viewport.clientHeight;
    const cw = canvas.offsetWidth, ch = canvas.offsetHeight;
    panX = Math.max(16, (vw - cw) / 2);
    panY = Math.max(16, (vh - ch) / 2);
    applyTransform();
  }

  function chartResetView() {
    centerCanvas();
  }

  /* ---------- Fullscreen ---------- */
  function chartToggleFullscreen() {
    const viewport = document.getElementById('chart-viewport');
    if (!document.fullscreenElement) {
      (viewport.requestFullscreen || viewport.webkitRequestFullscreen)?.call(viewport);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    }
  }

  /* The Fullscreen API only paints the fullscreen element and its own
     descendants — everything else in the document (including our
     .modal-overlay dialogs, which normally live as siblings later in
     <body>) simply stops rendering while #chart-viewport is
     fullscreen, no matter what z-index/position they use. So while
     fullscreen is active we temporarily reparent every modal-overlay
     into the fullscreen element itself, and put each one back exactly
     where it came from (same parent, same position among siblings)
     as soon as fullscreen ends. Their open/close logic (kirLocalModal
     Show/Hide) doesn't care where in the DOM they live, so this is
     purely a paint-order fix — no behavior changes. */
  function kirMoveModalsIntoFullscreen(fullscreenEl) {
    document.querySelectorAll('.modal-overlay').forEach((modal) => {
      if (modal._kirFsOriginalParent) return; // already moved
      modal._kirFsOriginalParent = modal.parentNode;
      modal._kirFsOriginalNextSibling = modal.nextSibling;
      fullscreenEl.appendChild(modal);
    });
  }

  function kirRestoreModalsFromFullscreen() {
    document.querySelectorAll('.modal-overlay').forEach((modal) => {
      const parent = modal._kirFsOriginalParent;
      if (!parent) return;
      parent.insertBefore(modal, modal._kirFsOriginalNextSibling);
      modal._kirFsOriginalParent = null;
      modal._kirFsOriginalNextSibling = null;
    });
  }

  function onFullscreenChange() {
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    const isFullscreen = !!fsEl;
    document.getElementById('fullscreen-icon-expand').classList.toggle('hidden', isFullscreen);
    document.getElementById('fullscreen-icon-collapse').classList.toggle('hidden', !isFullscreen);
    document.getElementById('fullscreen-btn').title = isFullscreen ? 'Keluar layar penuh' : 'Layar penuh';
    if (isFullscreen) {
      kirMoveModalsIntoFullscreen(fsEl);
    } else {
      kirRestoreModalsFromFullscreen();
    }
    // Viewport size just changed drastically; re-fit the canvas the
    // same way a window resize does.
    sizeCourseCanvas();
    drawCourseConnectors();
    centerCanvas();
  }
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);

  function pointFromEvent(e) {
    return e.touches && e.touches.length ? e.touches[0] : e;
  }

  function chartPointerDown(e) {
    if (e.target.closest('.chart-ctrl-btn') || e.target.closest('.course-node') || e.target.closest('#course-inspector') || e.target.closest('.modal-overlay')) return;
    // #chart-viewport still exists (and is still listening) while
    // #course-empty-state is showing — see courseShowEmptyState() —
    // there's just no graph in it yet to pan around.
    if (document.getElementById('course-canvas-region').classList.contains('hidden')) return;
    isDragging = true;
    didDrag = false;
    const p = pointFromEvent(e);
    dragStartX = p.clientX;
    dragStartY = p.clientY;
    panStartX = panX;
    panStartY = panY;
    document.getElementById('chart-viewport').classList.add('dragging');
  }

  function chartPointerMove(e) {
    if (!isDragging) return;
    const p = pointFromEvent(e);
    const dx = p.clientX - dragStartX;
    const dy = p.clientY - dragStartY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag = true;
    panX = panStartX + dx;
    panY = panStartY + dy;
    applyTransform();
    if (e.cancelable) e.preventDefault();
  }

  function chartPointerUp() {
    isDragging = false;
    document.getElementById('chart-viewport').classList.remove('dragging');
  }

  function initChartInteractions() {
    const viewport = document.getElementById('chart-viewport');
    viewport.addEventListener('mousedown', chartPointerDown);
    window.addEventListener('mousemove', chartPointerMove);
    window.addEventListener('mouseup', chartPointerUp);

    viewport.addEventListener('touchstart', chartPointerDown, { passive: true });
    viewport.addEventListener('touchmove', chartPointerMove, { passive: false });
    viewport.addEventListener('touchend', chartPointerUp);

    viewport.addEventListener('wheel', (e) => {
      if (e.target.closest('#course-inspector') || e.target.closest('.modal-overlay')) {
        // Deliberately NOT calling chartZoom here — you're reading node
        // details (or scrolling a modal), not looking at the graph, so
        // a normal scroll should scroll that content, not zoom the
        // chart behind it. But a trackpad pinch (or ctrl+wheel) fires
        // as a wheel event with ctrlKey set, and without a
        // preventDefault of our own here that gesture falls through to
        // the browser's native page zoom instead — so still swallow
        // just that one case.
        if (e.ctrlKey) e.preventDefault();
        return;
      }
      if (document.getElementById('course-canvas-region').classList.contains('hidden')) return; // nothing loaded to zoom
      e.preventDefault();
      chartZoom(e.deltaY < 0 ? 1.08 : 1 / 1.08);
    }, { passive: false });

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        sizeCourseCanvas();
        drawCourseConnectors();
        centerCanvas();
      }, 150);
    });
  }

  renderCourseGraph();
  initChartInteractions();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      sizeCourseCanvas();
      drawCourseConnectors();
      centerCanvas();
    });
  });

  // fetchCourseData() itself used to be called right here, but — same
  // issue this file's header comment (and the kirInjectSidebar note a
  // few lines up) already describes for other per-visit state — this
  // whole file only runs ONCE per session. Calling it here meant the
  // graph container only ever loaded the member's course on the FIRST
  // visit to workspace.html each session: navigating away and back via
  // the SPA router left #course-workspace showing whatever it last
  // rendered (or #course-empty-state if that's what the first visit
  // happened to land on), never re-fetching enrollment/progress or
  // re-running courseShowWorkspace()/courseShowEmptyState() to reflect
  // it — stale in a way a hard refresh would immediately have fixed,
  // which is what made it read as the container just not "reloading".
  // It now lives in the small inline <script> right after this file's
  // <script src> tag in workspace.html, alongside refreshWorkspaceDeltasHeader()
  // etc. — inline scripts aren't deduped, so that call genuinely re-runs
  // on every visit and the container reloads fresh data each time.

  // Node/edge colors are computed from --accent-rgb in JS and baked
  // into inline styles at render time (see courseAccentRgb/
  // courseAccentShade above), so — unlike the plain-CSS parts of the
  // page — they won't update on their own when the variable changes.
  // Re-render on the shared toggle event (js/auth.js
  // kirSetDisableBranchColor) so nodes actually go neutral instead of
  // only the chrome around them.
  window.addEventListener('kir:branch-color-change', () => {
    renderCourseGraph();
    requestAnimationFrame(() => requestAnimationFrame(drawCourseConnectors));
    if (courseSelectedId) courseSelectNode(courseSelectedId);
  });

  // kirInjectSidebar('workspace') / kirApplyTranslations() used to be
  // called right here, but this whole file only runs ONCE per session
  // now (router.js's loadExternalAsset() dedupes external <script src>
  // by URL — see the file header above) whereas course.html, which
  // still has this logic as a plain inline <script>, gets it re-run by
  // eval() on every single visit. Leaving the two calls here meant the
  // sidebar's active-tab highlight / nav-active-pill only ever synced
  // to "workspace" on the FIRST visit each session — every subsequent
  // SPA navigation back to this page left the pill sitting wherever the
  // previously-visited page had left it, then (since existingSidebar's
  // lightweight path in kirInjectSidebar is what normally slides it
  // smoothly into place) it never got told to move at all, which is
  // what read as the sidebar "lagging/twitching" on repeat visits —
  // stale until something ELSE unrelated (a resize, a collapse toggle,
  // ResizeObserver firing) forced kirPositionNavPill() to run and the
  // pill visibly jumped/corrected itself late instead of arriving
  // already right. Both calls are cheap and idempotent, so they now
  // live in a small inline <script> right after this file's <script
  // src> tag in workspace.html — inline scripts aren't deduped, so
  // that one line genuinely re-runs on every visit, same as
  // course.html's equivalent trailing calls.

  // Extra deterrent alongside the CSS user-select:none on #cvm-modal
  // .modal-card. Same scope voyages.html uses: blocks copy and
  // right-click-to-copy on the voyage_group/flag runner's soal/options/
  // essay side of things, leaves the member's own answer fields (mc
  // buttons don't hold text to copy anyway, but inputs/textarea/select
  // are excluded regardless) untouched. Not a real security boundary
  // (view-source still works), just enough friction to stop casual
  // copy-paste into an AI chat.
  function courseIsProtectedTarget(el) {
    if (el.closest('input, textarea, select')) return false;
    return !!el.closest('#cvm-modal .modal-card');
  }
  document.addEventListener('copy', (e) => {
    if (courseIsProtectedTarget(e.target)) e.preventDefault();
  });
  document.addEventListener('contextmenu', (e) => {
    if (courseIsProtectedTarget(e.target)) e.preventDefault();
  });

  window.addEventListener('blur', () => {
    if (COURSE_VOYAGE_RUNNER && document.getElementById('cvm-modal').classList.contains('modal-open')) {
      courseTelemetryData.tab_switch_count++;
    }
  });
