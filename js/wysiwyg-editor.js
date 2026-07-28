/* ==========================================================
   KIR "Word-style" WYSIWYG editor for mathtext fields
   --------------------------------------------------------
   Replaces the old textarea + syntax-dim backdrop + separate
   MathJax preview pane (see the removed kirMathEditorBind /
   kirMathPreviewUpdate in admin-shared.js) with a single
   contenteditable surface that IS the preview: formulas render
   as real MathJax output in place, code renders as real
   monospace blocks in place, and there is nothing left to
   "preview" separately.

   WHY A HIDDEN TEXTAREA STILL EXISTS:
   Every read site in the app (admin field collection, essay
   submit, essay reset/lock) reads/writes a plain element's
   `.value` / `.disabled` by id — e.g. `admin-field-question`,
   `vm-essay-textarea`. Rather than touching every call site,
   each rich editor keeps a real (but visually hidden) <textarea>
   with that id as the single source of truth for the STORED
   text (same "\n"-marker convention as before, same thing
   kirRenderMarkdownWithMath / marked already expect). The
   contenteditable surface is a second, visual-only element that
   is parsed from that value on load and re-serialized back into
   it on every edit, so nothing downstream has to change.

   HOW FORMULAS/CODE STAY "NEVER UGLY":
   - Math and code are stored as $..$/$$..$$/`..`/```..``` exactly
     like before, but the person never sees those characters: the
     surface renders each span as an atomic, non-editable chip
     (contenteditable="false") showing the real MathJax/code
     output. Browsers already treat a contenteditable="false"
     island inside a contenteditable region as a single unit for
     Backspace/Delete, so removing a formula is one keystroke,
     never a slow mangling of raw TeX.
   - Typing "$" or "`" directly is intercepted and turns into
     "insert an empty formula/code chip" instead of a literal
     character, so a stray unmatched delimiter can never exist as
     visible text.
   - Inserting a formula from the toolbar (x², a/b, √, Σ, …) opens
     the chip pre-expanded into its template with each blank
     argument shown as an actual empty box you click into and
     type over — Tab/Enter moves to the next box, like Word's
     equation builder — instead of a literal "‹a›" placeholder
     letter sitting in raw text.
   - Clicking an existing chip (freshly inserted or loaded from a
     saved/imported answer) re-opens it as one boxed, monospace
     LaTeX/code field — still atomic, still clearly delimited,
     never loose characters mixed into the surrounding sentence.
   ========================================================== */

const KIR_RICH_STATE = {};

/* ----------------------------------------------------------
   Setup / teardown
   ---------------------------------------------------------- */

function kirRichEditorInit(inputId, opts = {}) {
  const ta = document.getElementById(inputId);
  if (!ta || ta.dataset.wceBound) return;
  ta.dataset.wceBound = '1';
  ta.classList.add('wce-source');

  const surface = document.createElement('div');
  surface.className = 'wce-surface';
  surface.id = `${inputId}-surface`;
  surface.contentEditable = 'true';
  surface.spellcheck = false;
  surface.setAttribute('data-placeholder', opts.placeholder || ta.getAttribute('placeholder') || '');
  ta.insertAdjacentElement('afterend', surface);

  KIR_RICH_STATE[inputId] = { ta, surface, lastRange: null };

  kirRichParseIntoSurface(inputId, ta.value);
  kirRichBindSurfaceEvents(inputId);
  if (ta.disabled) kirRichEditorSetDisabled(inputId, true);
}

function kirRichEditorSetValue(inputId, rawValue) {
  const state = KIR_RICH_STATE[inputId];
  if (!state) return;
  state.ta.value = rawValue == null ? '' : rawValue;
  kirRichParseIntoSurface(inputId, state.ta.value);
}

function kirRichEditorSetDisabled(inputId, disabled) {
  const state = KIR_RICH_STATE[inputId];
  if (!state) return;
  state.ta.disabled = disabled;
  state.surface.contentEditable = disabled ? 'false' : 'true';
  state.surface.classList.toggle('wce-disabled', !!disabled);
  const editor = state.surface.closest('.wce-editor');
  if (editor) editor.querySelectorAll('.math-toolbar-btn').forEach(b => { b.disabled = !!disabled; });
}

/* ----------------------------------------------------------
   Serialization: surface DOM  ->  stored raw text (textarea.value)
   ---------------------------------------------------------- */

function kirRichSerialize(surface) {
  let out = '';
  surface.childNodes.forEach(node => { out += kirRichSerializeNode(node); });
  return out;
}

function kirRichSerializeNode(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  if (node.tagName === 'BR') return '\\n';

  if (node.classList.contains('wce-chip')) {
    // Mid-edit chips still carry their last-committed value in the
    // dataset, so a save mid-edit (e.g. clicking "Simpan" without
    // blurring the chip first) never loses or corrupts anything.
    if (node.classList.contains('wce-math')) {
      const tex = node.dataset.tex || '';
      return node.dataset.display === 'block' ? `$$${tex}$$` : `$${tex}$`;
    }
    if (node.classList.contains('wce-code-inline')) {
      return '`' + (node.dataset.code || '') + '`';
    }
    if (node.classList.contains('wce-code-block')) {
      const lang = node.dataset.lang || '';
      const code = node.dataset.code || '';
      return '\\n```' + lang + '\\n' + code.replace(/\r\n|\r|\n/g, '\\n') + '\\n```\\n';
    }
    return '';
  }

  // Some browsers wrap wrapped lines in <div>/<p> on Enter instead of
  // using <br>; we intercept Enter ourselves (see kirRichBindSurfaceEvents)
  // so this is just a safety net for pasted block markup.
  let inner = '';
  node.childNodes.forEach(child => { inner += kirRichSerializeNode(child); });
  if (node.tagName === 'DIV' || node.tagName === 'P') return '\\n' + inner;
  return inner;
}

function kirRichSync(inputId) {
  const state = KIR_RICH_STATE[inputId];
  if (!state) return;
  state.ta.value = kirRichSerialize(state.surface);
  state.ta.dispatchEvent(new Event('input', { bubbles: true }));
}

/* ----------------------------------------------------------
   Parsing: stored raw text  ->  surface DOM
   ---------------------------------------------------------- */

const KIR_RICH_TOKEN_RE = /```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```|\$\$([\s\S]+?)\$\$|\$([^\$\n]+?)\$|`([^`\n]+?)`|\\n/g;

function kirRichParseIntoSurface(inputId, rawStored) {
  const state = KIR_RICH_STATE[inputId];
  if (!state) return;
  const surface = state.surface;
  surface.innerHTML = '';

  const norm = kirMathtextEscapeBreaksForEditor(rawStored || '');
  let last = 0, m;
  KIR_RICH_TOKEN_RE.lastIndex = 0;
  while ((m = KIR_RICH_TOKEN_RE.exec(norm)) !== null) {
    if (m.index > last) surface.appendChild(document.createTextNode(norm.slice(last, m.index)));
    if (m[0].startsWith('```')) {
      surface.appendChild(kirRichBuildCodeChip('block', m[1] || '', (m[2] || '').replace(/\n$/, '')));
    } else if (m[3] !== undefined) {
      surface.appendChild(kirRichBuildMathChip(m[3], true));
    } else if (m[4] !== undefined) {
      surface.appendChild(kirRichBuildMathChip(m[4], false));
    } else if (m[5] !== undefined) {
      surface.appendChild(kirRichBuildCodeChip('inline', '', m[5]));
    } else if (m[0] === '\\n') {
      surface.appendChild(document.createElement('br'));
    }
    last = KIR_RICH_TOKEN_RE.lastIndex;
  }
  if (last < norm.length) surface.appendChild(document.createTextNode(norm.slice(last)));

  kirRichTypesetAll(surface);
}

/* ----------------------------------------------------------
   Math chips
   ---------------------------------------------------------- */

// Browsers already delete an adjacent contenteditable="false" chip as one
// unit when Backspace/Delete lands right next to it in the surrounding
// text flow. This covers the other case — the chip itself holding
// keyboard focus (e.g. after Tab-ing to it) — so a formula/code block is
// always removable as a single atomic action, never char-by-char.
function kirRichAttachChipDeleteHandler(chip) {
  chip.addEventListener('keydown', (e) => {
    if (chip.classList.contains('wce-editing')) return;
    if (e.key !== 'Backspace' && e.key !== 'Delete') return;
    e.preventDefault();
    const surface = chip.closest('.wce-surface');
    const inputId = surface && surface.id.replace(/-surface$/, '');
    chip.remove();
    if (inputId) kirRichSync(inputId);
  });
}

function kirRichBuildMathChip(tex, isDisplay) {
  const chip = document.createElement('span');
  chip.className = 'wce-chip wce-math';
  chip.contentEditable = 'false';
  chip.tabIndex = 0;
  chip.dataset.tex = tex;
  chip.dataset.display = isDisplay ? 'block' : 'inline';
  kirRichRenderMathView(chip);
  kirRichAttachChipDeleteHandler(chip);
  return chip;
}

function kirRichRenderMathView(chip) {
  chip.classList.remove('wce-editing');
  chip.innerHTML = '';
  const render = document.createElement('span');
  render.className = 'wce-math-render';
  const tex = chip.dataset.tex || '';
  render.textContent = tex.trim()
    ? (chip.dataset.display === 'block' ? `\\[${tex}\\]` : `\\(${tex}\\)`)
    : '\u00A0□\u00A0'; // empty formula placeholder box, never blank/invisible
  chip.appendChild(render);
  kirRichTypesetAll(chip);
}

function kirRichTypesetAll(root) {
  if (window.MathJax && window.MathJax.typesetPromise) {
    if (window.MathJax.typesetClear) { try { window.MathJax.typesetClear([root]); } catch (e) {} }
    window.MathJax.typesetPromise([root]).catch(() => {});
  }
}

// Splits a KIR_MATH_SNIPPETS template like "\frac{‹a›}{‹b›}" into
// alternating static/slot parts, same ‹a›,‹b› markers the old plain-
// text insert used — reused here to drive real fillable boxes.
function kirRichSplitTemplate(tex) {
  const parts = [];
  const re = /‹([a-z])›/g;
  let last = 0, m;
  while ((m = re.exec(tex)) !== null) {
    if (m.index > last) parts.push({ type: 'static', text: tex.slice(last, m.index) });
    parts.push({ type: 'slot', id: m[1] });
    last = re.lastIndex;
  }
  if (last < tex.length) parts.push({ type: 'static', text: tex.slice(last) });
  return parts;
}

// Turns a KIR_MATH_SNIPPETS template's ‹a›,‹b› slot markers into
// MathLive's own \placeholder{} command, so the mathfield itself draws
// and Tab-navigates the fillable boxes — no separate <input> elements
// laid out beside static text needed anymore. First slot gets the
// user's pre-toolbar-click text selection (if any) inserted as real
// content instead of a placeholder.
function kirRichBuildPlaceholderLatex(parts, prefill) {
  let latex = '';
  let sawSlot = false;
  parts.forEach(part => {
    if (part.type === 'static') {
      latex += part.text;
    } else if (!sawSlot && prefill) {
      latex += prefill;
      sawSlot = true;
    } else {
      latex += '\\placeholder{}';
      sawSlot = true;
    }
  });
  return latex;
}

// The actual "Word equation builder" surface: a MathLive <math-field>
// swapped in for the chip's rendered view. Unlike a plain <input>
// holding raw "\frac{a}{a}" text, this typesets live — the caret is a
// real position *inside* the rendered structure (on top of the
// fraction bar while editing the numerator, inside the radical for a
// √, etc.), and Tab already walks through any \placeholder{} boxes
// with no wiring needed on our end.
function kirRichEnterMathEdit(chip, inputId, initialLatex, opts = {}) {
  chip.classList.add('wce-editing');
  chip.innerHTML = '';

  const mf = document.createElement('math-field');
  mf.className = 'wce-math-field';
  // We already have our own toolbar and chip-based editing UI, so the
  // on-screen math keyboard and right-click menu MathLive normally
  // offers are just noise here — keep this a single boxed field.
  mf.setAttribute('math-virtual-keyboard-policy', 'manual');
  mf.setAttribute('smart-mode', 'false');
  mf.setAttribute('default-mode', chip.dataset.display === 'block' ? 'math' : 'inline-math');
  chip.appendChild(mf);
  mf.value = initialLatex || '';

  const commit = () => {
    chip.dataset.tex = mf.value;
    kirRichRenderMathView(chip);
    kirRichSync(inputId);
  };
  const cancel = () => {
    if (chip.dataset.tex) kirRichRenderMathView(chip);
    else chip.remove();
    kirRichSync(inputId);
  };
  const removeIfEmpty = () => {
    if (!mf.value.trim()) {
      chip.remove();
      kirRichSync(inputId);
      return true;
    }
    return false;
  };

  // capture:true so we see Escape/Enter before MathLive's own handling
  // does — by default Escape switches the field into raw-LaTeX entry
  // mode rather than closing it (see MathLive's customizing guide), so
  // it has to be intercepted rather than left to fall through.
  mf.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); }
    else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); commit(); }
    else if (e.key === 'Backspace' && !mf.value) {
      // Backspacing an empty formula removes the whole chip in one
      // press instead of leaving an empty "$$" behind.
      e.preventDefault(); e.stopPropagation();
      chip.remove();
      kirRichSync(inputId);
    }
  }, { capture: true });

  mf.addEventListener('blur', () => {
    // Tabbing out of the last placeholder (or clicking away) fires this;
    // give focus a beat to land elsewhere in the chip first, though for
    // a mathfield there's nothing else in it, so this mostly just
    // avoids double-committing before its internal state settles.
    setTimeout(() => {
      if (chip.contains(document.activeElement)) return;
      if (removeIfEmpty()) return;
      commit();
    }, 0);
  });

  const focusField = () => {
    mf.focus();
    if (opts.selectAll) mf.executeCommand('selectAll');
    else if (/\\placeholder\{\}/.test(initialLatex || '')) mf.executeCommand('moveToNextPlaceholder');
  };
  if (customElements.get('math-field')) {
    requestAnimationFrame(focusField);
  } else {
    customElements.whenDefined('math-field').then(() => requestAnimationFrame(focusField));
  }
}

function kirRichEnterMathRawEdit(chip, inputId) {
  kirRichEnterMathEdit(chip, inputId, chip.dataset.tex || '', { selectAll: true });
}

function kirRichToolbarMathInsert(inputId, snippetIndex) {
  const state = KIR_RICH_STATE[inputId];
  // KIR_MATH_SNIPPETS is a top-level `const` in admin-shared.js — that
  // never becomes a `window` property (only `var`/function declarations
  // do), it only lives in the page's shared script-lexical scope. Read
  // it as a bare identifier, not off `window`, or this is always
  // undefined and every toolbar click silently no-ops here.
  const snippet = (typeof KIR_MATH_SNIPPETS !== 'undefined') && KIR_MATH_SNIPPETS[snippetIndex];
  if (!state || !snippet) return;
  const isBareDollar = snippet.tex.startsWith('$') && snippet.tex.endsWith('$');
  const inner = isBareDollar ? snippet.tex.slice(1, -1) : snippet.tex;

  const selectedText = kirRichConsumeSelection(state);
  const chip = kirRichBuildMathChip('', false);
  kirRichInsertNodeAtCursor(state, chip);

  const parts = kirRichSplitTemplate(inner);
  const latex = kirRichBuildPlaceholderLatex(parts, selectedText);
  kirRichEnterMathEdit(chip, inputId, latex);
}

/* ----------------------------------------------------------
   Code chips
   ---------------------------------------------------------- */

function kirRichBuildCodeChip(kind, lang, code) {
  const chip = document.createElement(kind === 'block' ? 'div' : 'span');
  chip.className = kind === 'block' ? 'wce-chip wce-code-block' : 'wce-chip wce-code-inline';
  chip.contentEditable = 'false';
  chip.tabIndex = 0;
  chip.dataset.lang = lang || '';
  chip.dataset.code = code || '';
  kirRichRenderCodeView(chip);
  kirRichAttachChipDeleteHandler(chip);
  return chip;
}

function kirRichRenderCodeView(chip) {
  chip.classList.remove('wce-editing');
  chip.innerHTML = '';
  const isBlock = chip.classList.contains('wce-code-block');
  const code = chip.dataset.code || '';
  if (isBlock) {
    if (chip.dataset.lang) {
      const badge = document.createElement('div');
      badge.className = 'wce-code-lang-badge';
      badge.textContent = chip.dataset.lang;
      chip.appendChild(badge);
    }
    const pre = document.createElement('pre');
    const codeEl = document.createElement('code');
    codeEl.textContent = code || '\u00A0';
    pre.appendChild(codeEl);
    chip.appendChild(pre);
  } else {
    chip.textContent = code || '\u00A0□\u00A0';
  }
}

function kirRichEnterCodeEdit(chip, inputId) {
  chip.classList.add('wce-editing');
  chip.innerHTML = '';
  const isBlock = chip.classList.contains('wce-code-block');

  let langInput = null;
  if (isBlock) {
    langInput = document.createElement('input');
    langInput.type = 'text';
    langInput.className = 'wce-code-lang-input';
    langInput.placeholder = 'bahasa (opsional)';
    langInput.autocomplete = 'off';
    langInput.spellcheck = false;
    langInput.value = chip.dataset.lang || '';
    chip.appendChild(langInput);
  }

  const box = document.createElement('textarea');
  box.className = isBlock ? 'wce-code-block-raw' : 'wce-slot-input wce-slot-input-raw';
  box.rows = isBlock ? Math.min(10, Math.max(2, (chip.dataset.code || '').split('\n').length + 1)) : 1;
  box.spellcheck = false;
  box.value = chip.dataset.code || '';
  chip.appendChild(box);

  const commit = () => {
    chip.dataset.code = box.value;
    if (langInput) chip.dataset.lang = langInput.value.trim();
    kirRichRenderCodeView(chip);
    kirRichSync(inputId);
  };
  const cancelIfEmpty = () => {
    if (!box.value.trim() && !(langInput && langInput.value.trim())) {
      chip.remove();
      kirRichSync(inputId);
      return true;
    }
    return false;
  };

  [box, langInput].filter(Boolean).forEach(el => {
    el.addEventListener('focusout', () => {
      setTimeout(() => {
        if (chip.contains(document.activeElement)) return;
        if (cancelIfEmpty()) return;
        commit();
      }, 0);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); if (!cancelIfEmpty()) { kirRichRenderCodeView(chip); kirRichSync(inputId); } }
      else if (e.key === 'Enter' && !isBlock) { e.preventDefault(); commit(); }
      else if (e.key === 'Enter' && el === langInput) { e.preventDefault(); box.focus(); }
    });
  });

  box.focus();
  box.select();
}

function kirRichToolbarCodeInsert(inputId, kind) {
  const state = KIR_RICH_STATE[inputId];
  if (!state) return;
  const selectedText = kirRichConsumeSelection(state);
  const chip = kirRichBuildCodeChip(kind, '', '');
  kirRichInsertNodeAtCursor(state, chip);
  kirRichEnterCodeEdit(chip, inputId);
  if (selectedText) {
    const box = chip.querySelector('textarea');
    if (box) box.value = selectedText;
  }
}

/* ----------------------------------------------------------
   Cursor / selection helpers
   ---------------------------------------------------------- */

function kirRichConsumeSelection(state) {
  const range = state.lastRange;
  if (!range || range.collapsed) return '';
  return range.toString();
}

function kirRichInsertNodeAtCursor(state, node) {
  const surface = state.surface;
  surface.focus();
  let range = state.lastRange;
  if (!range || !surface.contains(range.commonAncestorContainer)) {
    range = document.createRange();
    range.selectNodeContents(surface);
    range.collapse(false);
  }
  range.deleteContents();
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  state.lastRange = range.cloneRange();
}

/* ----------------------------------------------------------
   Surface-level events
   ---------------------------------------------------------- */

function kirRichBindSurfaceEvents(inputId) {
  const state = KIR_RICH_STATE[inputId];
  const surface = state.surface;

  const trackSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && surface.contains(sel.anchorNode)) {
      state.lastRange = sel.getRangeAt(0).cloneRange();
    }
  };
  surface.addEventListener('keyup', trackSelection);
  surface.addEventListener('mouseup', trackSelection);
  surface.addEventListener('focus', trackSelection);

  // Click an existing chip to edit it in place.
  surface.addEventListener('click', (e) => {
    const chip = e.target.closest('.wce-chip');
    if (!chip || !surface.contains(chip) || chip.classList.contains('wce-editing')) return;
    if (surface.contentEditable === 'false') return;
    if (chip.classList.contains('wce-math')) {
      kirRichEnterMathRawEdit(chip, inputId);
    } else {
      kirRichEnterCodeEdit(chip, inputId);
    }
  });

  surface.addEventListener('keydown', (e) => {
    if (e.target !== surface) return; // a chip's own inputs handle their own keys
    if (e.key === 'Enter') {
      e.preventDefault();
      document.execCommand('insertHTML', false, '<br>');
      kirRichSync(inputId);
      return;
    }
    if (e.key === '$' ) {
      e.preventDefault();
      const chip = kirRichBuildMathChip('', false);
      kirRichInsertNodeAtCursor(state, chip);
      kirRichEnterMathRawEdit(chip, inputId);
      return;
    }
    if (e.key === '`') {
      e.preventDefault();
      const chip = kirRichBuildCodeChip('inline', '', '');
      kirRichInsertNodeAtCursor(state, chip);
      kirRichEnterCodeEdit(chip, inputId);
      return;
    }
  });

  surface.addEventListener('paste', (e) => {
    e.preventDefault();
    const clip = e.clipboardData || window.clipboardData;
    const text = clip ? clip.getData('text') : '';
    if (!text) return;
    document.execCommand('insertText', false, text.replace(/\r\n|\r/g, '\n'));
    kirRichSync(inputId);
  });

  surface.addEventListener('input', () => kirRichSync(inputId));
}
