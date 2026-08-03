/* ==========================================================
   Shared inline admin system. JS
   --------------------------------------------------------
   Generic, reusable building blocks so every page (Tasks,
   Schedule, Materials, Voyages, Members, ...) can bolt on
   "add, edit, or delete" without re-inventing a modal or a
   confirm dialog each time. Nothing here is page-specific.
   Pages plug in a config object describing their fields and
   a save or delete callback.

   Load order. After js/auth.js (uses supabaseClient, kirIsAdmin,
   kirEscapeHtml, I18N or lang) and after css/admin-shared.css.

   NOT wired into any page yet. This file only defines the
   building blocks below, it doesn't call any of them on load.

   --------------------------------------------------------
   PUBLIC API
   --------------------------------------------------------
   Floating action button:
     kirRenderAdminFab({ onClick, show, raised, variant, label })
     kirRemoveAdminFab()

   Per-item buttons (return HTML strings to drop into card markup):
     kirAdminActionsHtml({ onEdit, onDelete, show })
     kirAdminWrapQuickActions(cardHtml, { onEdit, onDelete, show })
     kirAdminEditButtonHtml(onClickExpr)
     kirAdminDeleteButtonHtml(onClickExpr)

   Create/edit modal:
     kirOpenAdminModal({
       title, fields, values, saveLabel, onSave, deleteConfig
     })
     kirCloseAdminModal()

   JSON editing (built into the create or edit modal above. Adds a
   "</>" header button that swaps the form for a raw JSON textarea
   the caller can hand-edit, then "Terapkan" re-populates the form):
     kirAdminToggleJsonMode()   // wired to the header button automatically

   JSON bulk import (separate, standalone modal. Upload one or many
   .json files, each a single object or an array of objects, and
   mass-insert them into a table):
     kirOpenJsonImportModal({ title, table, transform, itemLabel, onDone })
     kirCloseJsonImportModal()

   Confirm dialog:
     kirConfirmDialog({ title, message, confirmLabel, cancelLabel, danger, onConfirm, onCancel })
     kirCloseAdminConfirm()

   Toast:
     kirAdminToast(message, type)   // type: 'success' | 'error'

   Generic Supabase CRUD:
     await kirAdminCreate(table, payload)
     await kirAdminUpdate(table, id, payload, idColumn)
     await kirAdminDelete(table, id, idColumn)
   ========================================================== */

/* ----------------------------------------------------------
   Modal show or hide helpers. Every modal-overlay in the app
   (voyage, material, schedule, or task detail modals, the admin
   create or edit modal, the confirm dialog, the JSON import
   modal) should open and close through these instead of
   toggling `hidden` directly, so they all fade in/out the
   same way instead of popping instantly.

   Also tracks how many modals are currently open so the page
   behind can be scroll-locked while at least one is up.
   otherwise a scrollable page behind a fullscreen/fixed overlay
   can still show its native scrollbar, which renders on top of
   even fixed-position content.

   Locking works by pinning <body> with position:fixed at its
   current scroll offset (see .kir-scroll-locked in style.css).
   just setting overflow:hidden on its own resets scrollTop to 0,
   which is what was yanking the page (and anything sticky, like
   the sidebar) up to the top the instant a modal opened. Fixing
   body in place at -scrollY and restoring window.scrollTo on
   unlock keeps the page exactly where it was underneath.
   ---------------------------------------------------------- */
/* #sidebar is lg:sticky lg:top-0, and taller than the viewport, so at
   any given moment it could genuinely be anywhere: stuck flush at the
   top, or (near the bottom of the page) partway scrolled up within
   itself so its own bottom, the "Keluar" tab, is in view. Sticky's
   math breaks once the scroll-lock below freezes the real scroll
   offset, so instead of guessing we read the sidebar's actual
   getBoundingClientRect() the instant before locking and pin it there
   with position:fixed. Same spot, no snap. #sidebar-root (its flex
   parent) gets a matching inline width so removing the sidebar from
   flex flow doesn't collapse the space it was holding out from under
   <main>. */
/* __kirFreezeSidebar and __kirModalLock are now defined in js/auth.js
   to be available site-wide for all modals and the mobile nav. */


const KIR_MODAL_FADE_MS = 200;

function kirModalShow(el) {
  if (!el) return;
  const wasHidden = el.classList.contains('hidden');
  el.classList.remove('hidden', 'modal-closing');
  if (wasHidden) __kirModalLock(1);
  // Force a reflow between removing `hidden` and adding `modal-open`.
  // otherwise the browser coalesces both class changes into a single
  // paint and the opacity/transform transition never actually plays.
  void el.offsetWidth;
  el.classList.add('modal-open');
}

function kirModalHide(el, afterHide, durationMs = KIR_MODAL_FADE_MS) {
  if (!el) { if (typeof afterHide === 'function') afterHide(); return; }
  const wasVisible = !el.classList.contains('hidden');
  el.classList.remove('modal-open');
  el.classList.add('modal-closing');
  setTimeout(() => {
    el.classList.add('hidden');
    el.classList.remove('modal-closing');
    if (wasVisible) __kirModalLock(-1);
    if (typeof afterHide === 'function') afterHide();
  }, durationMs);
}

/* ----------------------------------------------------------
   DOM roots — created lazily on first use so including this
   script has zero effect on the page until something calls it.
   ---------------------------------------------------------- */
function kirEnsureAdminRoots() {
  if (!document.getElementById('admin-fab-root')) {
    const fabRoot = document.createElement('div');
    fabRoot.id = 'admin-fab-root';
    document.body.appendChild(fabRoot);
  }
  if (!document.getElementById('admin-modal-root')) {
    const modalRoot = document.createElement('div');
    modalRoot.id = 'admin-modal-root';
    modalRoot.className = 'modal-overlay hidden';
    modalRoot.onclick = (e) => { if (e.target === modalRoot) kirCloseAdminModal(); };
    modalRoot.innerHTML = '<div class="modal-card p-0"></div>';
    document.body.appendChild(modalRoot);
  }
  if (!document.getElementById('admin-confirm-root')) {
    const confirmRoot = document.createElement('div');
    confirmRoot.id = 'admin-confirm-root';
    confirmRoot.className = 'modal-overlay hidden';
    confirmRoot.onclick = (e) => { if (e.target === confirmRoot) kirCloseAdminConfirm(); };
    confirmRoot.innerHTML = '<div class="modal-card"></div>';
    document.body.appendChild(confirmRoot);
  }
  if (!document.getElementById('admin-toast-root')) {
    const toastRoot = document.createElement('div');
    toastRoot.id = 'admin-toast-root';
    toastRoot.className = 'admin-toast';
    document.body.appendChild(toastRoot);
  }
}

/* ----------------------------------------------------------
   Floating "+" action button
   --------------------------------------------------------
   `show` defaults to kirIsAdmin() when omitted, so pages don't
   have to remember to gate it themselves. Calling this again
   (e.g. after a permission refresh) just updates the existing
   button in place.
   ---------------------------------------------------------- */
function kirRenderAdminFab({ onClick, show, raised = false, variant = 'primary', label = 'Tambah' } = {}) {
  kirEnsureAdminRoots();
  const shouldShow = typeof show === 'boolean' ? show : (typeof kirIsAdmin === 'function' && kirIsAdmin());
  const root = document.getElementById('admin-fab-root');
  if (!shouldShow || typeof onClick !== 'function') {
    root.innerHTML = '';
    return;
  }
  const variantClass = variant === 'secondary' ? 'admin-fab-secondary glass'
    : variant === 'tertiary' ? 'admin-fab-tertiary glass'
    : `admin-fab bg-accent-gradient shadow-glow${raised ? ' admin-fab-raised' : ''}`;
  root.innerHTML = `
    <button type="button" class="${variantClass}" aria-label="${kirEscapeHtml(label)}" title="${kirEscapeHtml(label)}">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
    </button>`;
  root.querySelector('button').onclick = onClick;
}

function kirRemoveAdminFab() {
  const root = document.getElementById('admin-fab-root');
  if (root) root.innerHTML = '';
}

/* ----------------------------------------------------------
   Per-item edit / delete buttons
   --------------------------------------------------------
   These return raw HTML strings. Pages splice them into the
   template literals they already build for each card/row. Pass
   an inline onclick EXPRESSION (a string of JS), same as the
   rest of the site's inline handlers, e.g.:

     kirAdminEditButtonHtml(`openEditModalFor('${m.id}')`)

   `kirAdminActionsHtml` is the usual entry point: it wraps both
   buttons in the positioning wrapper and returns '' entirely
   when `show` is false, so callers can inline it unconditionally
   inside a card template without their own if/else.
   ---------------------------------------------------------- */
function kirAdminEditButtonHtml(onClickExpr, extraAttrs = '') {
  return `<button type="button" class="admin-icon-btn admin-edit-btn" onclick="event.stopPropagation(); ${onClickExpr}" aria-label="Edit" title="Edit" ${extraAttrs}>
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828z" /></svg>
  </button>`;
}

function kirAdminDeleteButtonHtml(onClickExpr, extraAttrs = '') {
  return `<button type="button" class="admin-icon-btn admin-delete-btn" onclick="event.stopPropagation(); ${onClickExpr}" aria-label="Hapus" title="Hapus" ${extraAttrs}>
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M4 7h16M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" /></svg>
  </button>`;
}

function kirAdminActionsHtml({ onEdit, onDelete, show, closeExpr } = {}) {
  const shouldShow = typeof show === 'boolean' ? show : (typeof kirIsAdmin === 'function' && kirIsAdmin());
  const editBtn = (shouldShow && onEdit) ? kirAdminEditButtonHtml(onEdit) : '';
  const deleteBtn = (shouldShow && onDelete) ? kirAdminDeleteButtonHtml(onDelete) : '';
  const closeBtn = closeExpr
    ? `<button type="button" onclick="${closeExpr}" class="admin-modal-close-mobile md:hidden text-zinc-500 hover:text-zinc-300 p-1 transition" aria-label="Tutup" title="Tutup">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>`
    : '';

  if (!editBtn && !deleteBtn && !closeBtn) return '';
  return `<div class="admin-item-actions flex items-center gap-1">${editBtn}${deleteBtn}${closeBtn}</div>`;
}

/* ----------------------------------------------------------
   kirAdminWrapQuickActions(cardHtml, { onEdit, onDelete, show })
   --------------------------------------------------------
   Wraps an already-built card's HTML string so that, on hover
   (admin only), the card shrinks in slightly from the right and
   a stacked edit/delete pair slides in from just outside that
   edge. Inside the SAME footprint the card occupied before the
   shrink, so nothing around it in the grid/list reflows.

   `cardHtml` should be the full card element (the thing that
   already has the onclick-to-open-modal behavior on it). This
   function does not alter that markup, it only wraps it.

   Returns cardHtml unchanged if the viewer isn't an admin, or if
   neither onEdit nor onDelete is supplied. So call sites can use
   it unconditionally instead of branching themselves.
   ---------------------------------------------------------- */
function kirAdminWrapQuickActions(cardHtml, { onEdit, onDelete, show } = {}) {
  const shouldShow = typeof show === 'boolean' ? show : (typeof kirIsAdmin === 'function' && kirIsAdmin());
  if (!shouldShow) return cardHtml;
  const editBtn = onEdit ? kirAdminEditButtonHtml(onEdit, 'data-quick="edit"') : '';
  const deleteBtn = onDelete ? kirAdminDeleteButtonHtml(onDelete, 'data-quick="delete"') : '';
  if (!editBtn && !deleteBtn) return cardHtml;
  return `<div class="admin-quick-wrap">
    <div class="admin-quick-card">${cardHtml}</div>
    <div class="admin-quick-actions">${editBtn}${deleteBtn}</div>
  </div>`;
}

/* ----------------------------------------------------------
   Shared create/edit modal
   --------------------------------------------------------
   `fields` describes the form generically:
     {
       id: 'title',              // used as the input's element id + payload key
       label: 'Judul',
       type: 'text' | 'textarea' | 'number' | 'date' | 'datetime-local'
             | 'url' | 'select' | 'checkbox',
       placeholder, hint, required, rows (textarea),
       options: [{ value, label }]   // for type 'select'
       default: initial value when creating (no `values` entry)
     }

   `values` (optional). Existing record when editing, keyed by
   field id. Presence of `values` is what callers use to decide
   edit vs create, but this modal itself doesn't care; it just
   pre-fills whatever's given.

   `onSave(payload)` is called with the collected field values
   (already validated against `required`) and may be async; the
   modal shows a saving state and stays open on thrown errors so
   the page's own try/catch can surface a message, then closes
   automatically on success.
   ---------------------------------------------------------- */
let kirAdminModalConfig = null;

function kirAdminFieldValue(field) {
  if (kirAdminModalConfig && kirAdminModalConfig.values && field.id in kirAdminModalConfig.values) {
    return kirAdminModalConfig.values[field.id];
  }
  if (field.default !== undefined) return field.default;
  if (field.type === 'checkbox') return false;
  if (field.type === 'range') return field.min !== undefined ? field.min : 0;
  if (field.type === 'options') return [];
  if (field.type === 'checkboxes') return [];
  if (field.type === 'testcases') return [];
  return '';
}

/* ----------------------------------------------------------
   Conditional visibility ("showIf")
   --------------------------------------------------------
   A field can declare `showIf: { field: 'otherId', equals: v }`
   or `showIf: { field: 'otherId', in: [v1, v2] }`. Visibility is
   recomputed against the CURRENT live values in the form (not
   just the initial ones) so pages get "select a type -> reveal
   the right sub-fields" for free, without page-specific glue.
   ---------------------------------------------------------- */
function kirAdminReadLiveFieldValue(field) {
  const input = document.getElementById(`admin-field-${field.id}`);
  if (field.type === 'options') {
    const state = kirAdminModalConfig && kirAdminModalConfig.optionState && kirAdminModalConfig.optionState[field.id];
    return state ? state.items.map(i => i.text) : [];
  }
  if (field.type === 'checkboxes') {
    const state = kirAdminModalConfig && kirAdminModalConfig.checkboxState && kirAdminModalConfig.checkboxState[field.id];
    return state ? state.selected.slice() : [];
  }
  if (field.type === 'testcases') {
    const state = kirAdminModalConfig && kirAdminModalConfig.testCaseState && kirAdminModalConfig.testCaseState[field.id];
    return state ? state.rows.slice() : [];
  }
  if (!input) return kirAdminFieldValue(field);
  if (field.type === 'checkbox') return input.checked;
  if (field.type === 'number' || field.type === 'range') return input.value === '' ? null : Number(input.value);
  return input.value;
}

function kirAdminShowIfMatches(showIf) {
  if (!showIf) return true;
  const { fields } = kirAdminModalConfig;
  const controllingField = fields.find(f => f.id === showIf.field);
  const liveValue = controllingField ? kirAdminReadLiveFieldValue(controllingField) : undefined;
  if ('in' in showIf) return showIf.in.includes(liveValue);
  if ('equals' in showIf) return liveValue === showIf.equals;
  if ('notEquals' in showIf) return liveValue !== showIf.notEquals;
  return true;
}

function kirAdminIsFieldVisible(field) {
  return kirAdminShowIfMatches(field.showIf);
}

function kirAdminRefreshVisibility() {
  if (!kirAdminModalConfig) return;
  kirAdminModalConfig.fields.forEach(f => {
    if (!f.showIf) return;
    const group = document.querySelector(`#admin-modal-fields [data-field-id="${f.id}"]`);
    if (!group) return;
    const visible = kirAdminIsFieldVisible(f);
    group.classList.toggle('admin-field-hidden', !visible);
  });
  document.querySelectorAll('#admin-modal-fields .admin-field-row').forEach(row => {
    const fields = row.querySelectorAll('.admin-field-group');
    const hidden = row.querySelectorAll('.admin-field-group.admin-field-hidden');
    row.classList.toggle('admin-field-row-hidden', fields.length > 0 && fields.length === hidden.length);
  });
  kirAdminRefreshOptionDisabling();
}

/* ----------------------------------------------------------
   Per-option disabling ("disabledIf") for `select` fields
   --------------------------------------------------------
   A `select` field's individual `options` entries can declare
   `disabledIf: { field: 'otherId', equals/in/notEquals: v }` —
   same shape as a field's `showIf`, so it's evaluated with the
   exact same matcher (kirAdminShowIfMatches), just read as
   "disabled when this matches" instead of "visible when this
   matches". The option stays in the list (grayed out via the
   native `disabled` attribute) rather than disappearing, unlike
   showIf which removes whole fields from view.

   If the option that's currently selected becomes disabled (e.g.
   admin had "Kompetitif (Programming)" selected, then changed Subjek
   away from Informatika), the select is reset to the first
   still-enabled option so the form never sits on an invalid
   combination silently.
   ---------------------------------------------------------- */
function kirAdminRefreshOptionDisabling() {
  if (!kirAdminModalConfig) return;
  kirAdminModalConfig.fields
    .filter(f => f.type === 'select' && (f.options || []).some(o => o.disabledIf))
    .forEach(f => {
      const select = document.getElementById(`admin-field-${f.id}`);
      if (!select) return;

      let anyChanged = false;
      let selectedGotDisabled = false;
      Array.from(select.options).forEach(optEl => {
        const optDef = (f.options || []).find(o => String(o.value) === optEl.value);
        const shouldDisable = !!(optDef && optDef.disabledIf && kirAdminShowIfMatches(optDef.disabledIf));
        if (optEl.disabled !== shouldDisable) {
          optEl.disabled = shouldDisable;
          anyChanged = true;
        }
        if (optEl.value === select.value && shouldDisable) selectedGotDisabled = true;
      });

      if (selectedGotDisabled) {
        const fallback = Array.from(select.options).find(o => !o.disabled);
        if (fallback) {
          select.value = fallback.value;
          anyChanged = true;
        }
      }

      if (anyChanged && typeof kirRefreshCustomSelect === 'function') kirRefreshCustomSelect(`admin-field-${f.id}`);
    });
}

function kirAdminBandFor(field, v) {
  const bands = field.bands || [];
  return bands.find(b => v <= b.max) || bands[bands.length - 1] || { color: '148,163,184', label: '' };
}

/* Canonical difficulty → color gradient. Used for the admin rating
   editor's live badge AND the voyage list/modal badges (voyages.html
   calls this same function — it no longer keeps its own copy), so a
   voyage always shows the identical color while being created as it
   does once saved and displayed. Previously the admin editor derived
   its color from field.bands' own thresholds (3/6/8/10) instead of
   these stops (1/4/7/10), which is why the two views could disagree.
   Continuous (not band-snapped) so Alt-precision decimal values (e.g.
   5.98 vs 6.02) blend smoothly instead of jumping between colors. */
function getDifficultyRgb(d) {
  const stops = [
    { v: 1, r: 34, g: 197, b: 94 },
    { v: 4, r: 234, g: 179, b: 8 },
    { v: 7, r: 249, g: 115, b: 22 },
    { v: 10, r: 217, g: 70, b: 239 }
  ];
  let lower = stops[0], upper = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (d >= stops[i].v && d <= stops[i + 1].v) {
      lower = stops[i]; upper = stops[i + 1]; break;
    }
  }
  if (lower.v === upper.v) return lower;
  const ratio = (d - lower.v) / (upper.v - lower.v);
  return {
    r: Math.round(lower.r + (upper.r - lower.r) * ratio),
    g: Math.round(lower.g + (upper.g - lower.g) * ratio),
    b: Math.round(lower.b + (upper.b - lower.b) * ratio)
  };
}


/* Generic info-button trigger, shared by any field that declares
   either `legend` (range's scale breakdown) or `tooltip` (a plain
   title/body/model blurb — see kirAdminTooltipShow). */
function kirAdminFieldInfoBtnHtml(field, title) {
  if (!(field.legend && field.legend.length) && !field.tooltip) return '';
  return `<button type="button" class="admin-range-info-btn"
      onmouseenter="kirAdminTooltipShow(this, '${field.id}')" onmouseleave="kirAdminTooltipHide()"
      onfocus="kirAdminTooltipShow(this, '${field.id}')" onblur="kirAdminTooltipHide()"
      title="${kirEscapeHtml(title || 'Info')}">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    </button>`;
}

function kirAdminRangeLabelHtml(field) {
  const reqStar = field.required ? ' <span class="text-accent-300 ml-0.5">*</span>' : '';
  return `<div class="flex items-center gap-1.5">
      <label for="admin-field-${field.id}" class="admin-field-label">${kirEscapeHtml(field.label || '')}${reqStar}</label>
      ${kirAdminFieldInfoBtnHtml(field, 'Lihat skala')}
    </div>`;
}

/* ----------------------------------------------------------
   Range legend tooltip — rendered into a single body-level root
   instead of `position:absolute` next to its trigger. The modal
   card scrolls (`overflow-y:auto`), so anything absolutely
   positioned inside it gets clipped the moment it would pop
   outside the scrollable box — a `position:fixed` element parked
   directly on <body> and positioned via getBoundingClientRect()
   sidesteps that entirely and can never be "stuck in frame".
   ---------------------------------------------------------- */
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

function kirAdminTooltipShow(triggerEl, fieldId) {
  const field = kirAdminModalConfig && kirAdminModalConfig.fields.find(f => f.id === fieldId);
  if (!field) return;

  let html;
  if (field.legend && field.legend.length) {
    html = `
      ${field.legendTitle ? `<p class="admin-range-tooltip-title">${kirEscapeHtml(field.legendTitle)}</p>` : ''}
      <ul>${field.legend.map(l => `<li><span style="color:rgb(${l.color})">${kirEscapeHtml(l.label)}</span> ${kirEscapeHtml(l.desc || '')}</li>`).join('')}</ul>`;
  } else if (field.tooltip) {
    const t = field.tooltip;
    const bodyParas = (Array.isArray(t.body) ? t.body : [t.body]).filter(Boolean);
    html = `
      ${t.title ? `<p class="admin-range-tooltip-title">${kirEscapeHtml(t.title)}</p>` : ''}
      ${bodyParas.map(p => `<p class="admin-tooltip-p">${kirEscapeHtml(p)}</p>`).join('')}
      ${t.model ? `<p class="admin-tooltip-model">${kirEscapeHtml(t.modelLabel || 'Model saat ini')}: <code>${kirEscapeHtml(t.model)}</code></p>` : ''}`;
  } else {
    return;
  }

  kirAdminTooltipShowHtml(triggerEl, html);
}

/* Generic version of the above — positions the same body-level
   tooltip root next to any trigger element, given ready-made HTML.
   Used for one-off tooltips that aren't backed by a field in
   kirAdminModalConfig, like the Alt-precision hint on the voyages
   filter slider. */
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

/* Content for the "hold Alt to drag precisely" hint on the voyages
   filter slider (see kirAdminTooltipShowHtml). */
function kirAltPreciseTooltipHtml() {
  const lang = localStorage.getItem('kir_lang') || 'id';
  const t = I18N[lang];
  return `
    <p class="admin-range-tooltip-title">${kirEscapeHtml(t.voyages_alt_precise_title)}</p>
    <p class="admin-tooltip-p">${kirEscapeHtml(t.voyages_alt_precise_body)}</p>`;
}

function kirAdminTooltipHide() {
  const root = document.getElementById('admin-tooltip-root');
  if (root) root.classList.add('hidden');
}

/* ----------------------------------------------------------
   Math snippets — the "Word-style" toolbar template list for
   fields that need LaTeX (rendered by MathJax on voyages.html)
   without asking anyone to memorize TeX syntax. Placeholders are
   marked ‹a›, ‹b›, … in the template.

   The actual insertion behavior lives in js/wysiwyg-editor.js
   (kirRichToolbarMathInsert), which turns each ‹x› placeholder
   into a real fillable box in the editor — Word's equation-builder
   affordance — rather than a plain visible letter sitting in raw
   text. Kept here, separate from that file, since it's also
   reused as a plain lookup table for snippet titles/labels when
   rendering the toolbar HTML below.
   ---------------------------------------------------------- */
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

/* ----------------------------------------------------------
   Shared markdown+math rendering. This is the single source of
   truth for turning a mathtext field's raw value into displayable
   HTML — used both for the WYSIWYG editor's in-place chip
   rendering (indirectly, via MathJax typesetting the same $...$
   the editor stores) AND (via delegation — see
   kirRenderVoyageMarkdown in voyages.html) for the actual
   voyage/material cards members see, so the editor is never lying
   about how the text will really render.

   The stored value shows every line break as a literal "\n"
   marker rather than an actual newline character (see
   kirRichEditorInit in wysiwyg-editor.js) so that pasted/typed
   content stays unambiguous. That's what ends up in the DB, so
   this is also the one place that turns those markers back into
   real newlines before handing text to `marked`. Any *actual*
   newline characters already present (rows saved before this
   existed, or pasted/imported JSON) pass through untouched — this
   is purely additive.
   ---------------------------------------------------------- */
function kirMathtextBreaksToNewlines(raw) {
  return String(raw == null ? '' : raw).replace(/\\n/g, '\n');
}

function kirMathtextEscapeBreaksForEditor(raw) {
  // Inverse of the above, applied once when a value is first loaded
  // into the editor textarea, so a legacy row with real newlines
  // renders identically to one already saved in marker form.
  return String(raw == null ? '' : raw).replace(/\r\n|\r|\n/g, '\\n');
}

function kirRenderMarkdownWithMath(raw) {
  if (raw === null || raw === undefined) return '';
  const text = kirMathtextBreaksToNewlines(String(raw));
  if (!window.marked) return kirEscapeHtml(text);

  // Math delimiters ($...$ and $$...$$) are protected from marked
  // first, since Markdown's rules for underscores/asterisks would
  // otherwise mangle LaTeX like "$x_1$" or "$a*b$". The raw math
  // text is swapped back in after marked runs, then MathJax picks
  // it up on the typesetPromise() call that follows.
  const mathBlocks = [];
  const stash = (m) => {
    mathBlocks.push(m);
    return `\u0000MATH${mathBlocks.length - 1}\u0000`;
  };
  let protectedText = text
    .replace(/\$\$[\s\S]+?\$\$/g, stash)
    .replace(/\$[^\$\n]+?\$/g, stash);

  let html = marked.parse(protectedText);
  html = html.replace(/\u0000MATH(\d+)\u0000/g, (_, i) => mathBlocks[Number(i)]);

  return window.DOMPurify ? DOMPurify.sanitize(html) : html;
}

/* ----------------------------------------------------------
   Toolbar markup shared by every WYSIWYG mathtext editor instance
   (admin "Teks Soal" / "Jawaban Referensi" fields here, and the
   member-facing essay answer in voyages.html). The buttons call
   into js/wysiwyg-editor.js, which is what actually inserts a
   fillable formula/code chip at the cursor.
   ---------------------------------------------------------- */
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

function kirAdminFieldHtml(field) {
  const value = kirAdminFieldValue(field);
  const inputId = `admin-field-${field.id}`;
  const reqStar = field.required ? ' <span class="text-accent-300 ml-0.5">*</span>' : '';
  const labelHtml = field.type === 'checkbox' || field.type === 'range' ? '' : `<label for="${inputId}" class="admin-field-label">${kirEscapeHtml(field.label || '')}${reqStar}</label>`;
  const hintHtml = field.hint ? `<p class="admin-field-hint">${kirEscapeHtml(field.hint)}</p>` : '';
  const errorHtml = `<p class="admin-field-error">${kirEscapeHtml(field.requiredMessage || 'Wajib diisi.')}</p>`;

  let controlHtml;
  switch (field.type) {
    case 'mathtext': {
      controlHtml = `
        <div class="wce-editor">
          ${kirWceToolbarHtml(inputId)}
          <textarea id="${inputId}" rows="${field.rows || 4}" class="wce-source" placeholder="${kirEscapeHtml(field.placeholder || '')}">${kirEscapeHtml(kirMathtextEscapeBreaksForEditor(value))}</textarea>
        </div>`;
      break;
    }
    case 'textarea':
      controlHtml = `<textarea id="${inputId}" rows="${field.rows || 3}" class="glass-input w-full rounded-lg px-3.5 py-2.5 text-sm" placeholder="${kirEscapeHtml(field.placeholder || '')}">${kirEscapeHtml(value || '')}</textarea>`;
      break;
    case 'select': {
      // disabledIf is evaluated with kirAdminShowIfMatches, which falls
      // back to the field's initial value when the controlling input
      // isn't mounted yet (true here, since the whole form renders in
      // one pass) — kirAdminRefreshOptionDisabling() re-checks against
      // live values right after mount, so this is just the first paint.
      const opts = (field.options || []).map(o => {
        const disabled = o.disabledIf && kirAdminShowIfMatches(o.disabledIf);
        return `<option value="${kirEscapeHtml(o.value)}" ${String(o.value) === String(value) ? 'selected' : ''}${disabled ? ' disabled' : ''}>${kirEscapeHtml(o.label)}</option>`;
      }).join('');
      controlHtml = `<select id="${inputId}" class="glass-input w-full rounded-lg px-3.5 py-2.5 text-sm" onchange="kirAdminRefreshVisibility()">${opts}</select>`;
      break;
    }
    case 'date':
    case 'datetime-local': {
      const withTime = field.type === 'datetime-local';
      controlHtml = `
        <div class="kir-datepicker" id="${inputId}-wrap">
          <button type="button" class="glass-input w-full rounded-lg px-3.5 py-2.5 text-sm text-left kir-date-trigger" onclick="kirAdminDpToggle('${field.id}')">
            <svg class="w-4 h-4 shrink-0 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
            <span id="${inputId}-display" class="kir-date-display${value ? '' : ' placeholder'}">${kirAdminDpFormatDisplay(value, withTime)}</span>
          </button>
          <input type="hidden" id="${inputId}" value="${kirEscapeHtml(value || '')}" />
          <div id="${inputId}-panel" class="kir-calendar-panel hidden"></div>
        </div>`;
      break;
    }
    case 'checkbox':
      controlHtml = `
        <div class="admin-checkbox-row">
          <div class="flex items-center gap-1.5">
            <label for="${inputId}" class="admin-field-label">${kirEscapeHtml(field.label || '')}${reqStar}</label>
            ${kirAdminFieldInfoBtnHtml(field, 'Info')}
          </div>
          <div class="toggle-track${value ? ' on' : ''}" id="${inputId}-track" onclick="kirAdminToggleCheckbox('${inputId}')">
            <div class="toggle-thumb"></div>
          </div>
          <input type="checkbox" id="${inputId}" class="hidden" ${value ? 'checked' : ''} />
        </div>`;
      break;
    case 'range': {
      const min = field.min !== undefined ? field.min : 0;
      const max = field.max !== undefined ? field.max : 100;
      const step = field.step !== undefined ? field.step : 1;
      const v = value === '' || value === null || value === undefined ? min : Number(value);
      const pct = ((v - min) / (max - min)) * 100;
      const grad = getDifficultyRgb(v);
      controlHtml = `
        <div class="admin-range-header">
          ${kirAdminRangeLabelHtml(field)}
          <span id="${inputId}-badge" class="diff-badge" style="--diff-r:${grad.r};--diff-g:${grad.g};--diff-b:${grad.b}">${KIR_RANGE_STAR_SVG}<span id="${inputId}-badge-value">${v}</span></span>
        </div>
        <div class="relative h-9 flex items-center w-full kir-range-wrap">
          ${kirAdminRangeTicksHtml(field)}
          <div class="absolute left-0 right-0 h-1 bg-white/10 rounded-full"></div>
          <div id="${inputId}-fill" class="absolute left-0 h-1 diff-track-fill rounded-full" style="width:${pct}%"></div>
          <input type="range" id="${inputId}" min="${min}" max="${max}" step="${step}" value="${v}" oninput="kirAdminRangeInput('${field.id}')"
            class="kir-range absolute left-0 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full" />
        </div>`;
      break;
    }
    case 'options': {
      controlHtml = `
        <div id="${inputId}-list" class="space-y-2.5"></div>
        <button type="button" onclick="kirAdminOptionAdd('${field.id}')" class="mt-2.5 flex items-center gap-1.5 text-sm font-medium text-accent-300 hover:brightness-110 transition">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
          <span>${kirEscapeHtml(field.addLabel || 'Tambah Opsi')}</span>
        </button>`;
      break;
    }
    case 'checkboxes': {
      controlHtml = `<div id="${inputId}-list" class="admin-checkboxes-list"></div>`;
      break;
    }
    case 'testcases': {
      controlHtml = `
        <div id="${inputId}-list" class="space-y-2.5"></div>
        <button type="button" onclick="kirAdminTestCaseAdd('${field.id}')" class="mt-2.5 flex items-center gap-1.5 text-sm font-medium text-accent-300 hover:brightness-110 transition">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
          <span>${kirEscapeHtml(field.addLabel || 'Tambah Test Case')}</span>
        </button>`;
      break;
    }
    case 'image': {
      const url = value || '';
      controlHtml = `
        <div class="admin-image-input-row">
          <input type="url" id="${inputId}" class="glass-input w-full rounded-lg px-3.5 py-2.5 text-sm" placeholder="${kirEscapeHtml(field.placeholder || 'https://...')}" value="${kirEscapeHtml(url)}" oninput="kirAdminImagePreviewUpdate('${field.id}')" />
          <button type="button" class="admin-image-upload-btn" onclick="document.getElementById('${inputId}-file').click()" title="Unggah gambar" aria-label="Unggah gambar">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 8.25L12 3.75m0 0L7.5 8.25M12 3.75v12" /></svg>
          </button>
          <input type="file" id="${inputId}-file" accept="image/*" class="hidden" onchange="kirAdminImageFileSelected('${field.id}', event)" />
        </div>
        <div id="${inputId}-preview-wrap" class="admin-image-preview-wrap${url ? '' : ' hidden'}">
          <img id="${inputId}-preview" class="admin-image-preview" src="${kirEscapeHtml(url)}" alt=""
            onerror="this.closest('.admin-image-preview-wrap').classList.add('admin-image-preview-broken')"
            onload="this.closest('.admin-image-preview-wrap').classList.remove('admin-image-preview-broken')" />
          <span class="admin-image-preview-broken-label">Gambar tidak dapat dimuat</span>
        </div>`;
      break;
    }
    default: // text, number, date, datetime-local, url, ...
      controlHtml = `<input type="${field.type || 'text'}" id="${inputId}" class="glass-input w-full rounded-lg px-3.5 py-2.5 text-sm" placeholder="${kirEscapeHtml(field.placeholder || '')}" value="${kirEscapeHtml(value !== undefined && value !== null ? value : '')}" />`;
  }

  return `<div class="admin-field-group admin-field-group-${field.type || 'text'}${field.showIf ? ' admin-field-hidden' : ''}" data-field-id="${field.id}" data-required="${field.required ? '1' : '0'}">
    ${labelHtml}
    ${controlHtml}
    ${hintHtml}
    ${errorHtml}
  </div>`;
}

/* ----------------------------------------------------------
   Row grouping — fields sharing the same `row` key render side
   by side (desktop) / stacked (mobile) inside a .admin-field-row
   wrapper. Fields without a `row` render standalone, unchanged.
   ---------------------------------------------------------- */
function kirAdminRenderFieldsHtml(fields) {
  const renderedRows = new Set();
  return fields.map(field => {
    if (!field.row) return kirAdminFieldHtml(field);
    if (renderedRows.has(field.row)) return '';
    renderedRows.add(field.row);
    const rowFields = fields.filter(f => f.row === field.row);
    return `<div class="admin-field-row">${rowFields.map(kirAdminFieldHtml).join('')}</div>`;
  }).join('');
}

/* Same star used on the voyages page's own difficulty badge/particles
   (see DIFF_STAR_SVG in voyages.html) — kept as its own copy here so
   the admin range field doesn't depend on a page-specific global. */
const KIR_RANGE_STAR_SVG = '<svg class="w-3 h-3 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M10 1.5l2.59 5.25 5.79.84-4.19 4.08.99 5.77L10 14.77l-5.18 2.67.99-5.77L1.62 7.59l5.79-.84L10 1.5z"/></svg>';

/* Snap-position ticks for a range field — one per step, matching the
   voyages filter slider's look. Skipped for fields fine-grained
   enough that individual ticks would just be visual noise. */
function kirAdminRangeTicksHtml(field) {
  const min = field.min !== undefined ? field.min : 0;
  const max = field.max !== undefined ? field.max : 100;
  const step = field.step !== undefined && field.step > 0 ? field.step : 1;
  const count = Math.round((max - min) / step) + 1;
  if (!Number.isFinite(count) || count < 2 || count > 21) return '';
  const ticks = Array.from({ length: count }, () => '<div class="w-px h-2 bg-zinc-600"></div>').join('');
  return `<div class="kir-range-ticks absolute inset-0 flex justify-between items-center px-1 pointer-events-none">${ticks}</div>`;
}

/* ----------------------------------------------------------
   Range slider — live badge + gradient fill preview
   ---------------------------------------------------------- */
function kirAdminRangeInput(fieldId) {
  const field = kirAdminModalConfig.fields.find(f => f.id === fieldId);
  const input = document.getElementById(`admin-field-${fieldId}`);
  if (!field || !input) return;
  const min = field.min !== undefined ? field.min : 0;
  const max = field.max !== undefined ? field.max : 100;
  const v = Number(input.value);
  const pct = ((v - min) / (max - min)) * 100;
  document.getElementById(`admin-field-${fieldId}-fill`).style.width = pct + '%';
  const grad = getDifficultyRgb(v);
  const badge = document.getElementById(`admin-field-${fieldId}-badge`);
  badge.style.setProperty('--diff-r', grad.r);
  badge.style.setProperty('--diff-g', grad.g);
  badge.style.setProperty('--diff-b', grad.b);
  const badgeValue = document.getElementById(`admin-field-${fieldId}-badge-value`);
  if (badgeValue) badgeValue.textContent = v;
  kirAdminRefreshVisibility();
}

/* ----------------------------------------------------------
   Precise range dragging — hold Alt while dragging any
   .kir-range thumb (the voyage rating filter's two handles, the
   admin create/edit "Rating" field, or any other range field
   built through kirAdminFieldHtml) to move in 0.01 increments
   instead of snapping to the field's normal `step`.

   Native <input type="range"> dragging always snaps to `step`,
   and there's no built-in way to change that mid-drag — so we
   take over pointer handling for every drag on a .kir-range input
   and compute the value ourselves from cursor position: snapped
   to the input's own step normally, rounded to 2 decimals
   whenever Alt is held *at that instant* (checked on every
   pointermove, so toggling Alt mid-drag switches modes live,
   same drag). Alt rather than Ctrl — on Mac, Ctrl+click is often
   intercepted as a right-click/context-menu gesture before it
   ever reaches JS as a normal pointerdown, so Ctrl-drag silently
   never engages there. Delegated on document so it applies to
   sliders rendered after page load too (e.g. the admin field
   builder's range field, injected when a create/edit modal opens).
   ---------------------------------------------------------- */
let __kirRangeDragEl = null;

/* Body-level "Alt is currently held" flag, purely for the tick-fade
   affordance below — lets a slider hint "you can precise-drag this"
   just from hovering + Alt, before the person has even clicked. The
   actual precision logic only ever reads e.altKey off the live
   pointer event (see __kirRangeApplyDrag), never this flag. */
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Alt') return;
  document.body.classList.add('kir-alt-held');
  // Some browsers (notably Firefox) treat a bare Alt press/release as
  // "focus the menu bar" — harmless normally, but it steals focus out
  // of the page mid-drag here, so swallow it while we're using Alt
  // for precise dragging instead.
  e.preventDefault();
});
document.addEventListener('keyup', (e) => {
  if (e.key !== 'Alt') return;
  document.body.classList.remove('kir-alt-held');
  e.preventDefault();
});
window.addEventListener('blur', () => document.body.classList.remove('kir-alt-held'));

/* Toggles the fade on a specific slider's ticks for the duration of
   an actual drag, independent of :hover (pointer capture can carry
   the cursor slightly outside the wrap while dragging fast). */
function __kirRangeSetPreciseHint(input, active) {
  if (!input) return;
  const wrap = input.closest('.kir-range-wrap');
  if (wrap) wrap.classList.toggle('kir-range-precise', !!active);
}

function __kirRangeValueFromClientX(input, clientX) {
  const rect = input.getBoundingClientRect();
  const min = parseFloat(input.min) || 0;
  const max = parseFloat(input.max) || 100;
  const percent = rect.width ? Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) : 0;
  return min + percent * (max - min);
}

function __kirRangeApplyDrag(input, e) {
  const min = parseFloat(input.min) || 0;
  const max = parseFloat(input.max) || 100;
  let value = __kirRangeValueFromClientX(input, e.clientX);
  // Range inputs re-run their value sanitization algorithm on every
  // `.value` assignment (not just native dragging), which snaps to
  // `step` even when we set the value from JS. That silently rounds
  // away the decimals below, so Alt-precision would appear to do
  // nothing. Work around it by loosening `step` to "any" while Alt
  // is held, and restoring the real step as soon as it's released.
  if (input.dataset.kirOrigStep === undefined) {
    input.dataset.kirOrigStep = input.getAttribute('step') || '1';
  }
  if (e.altKey) {
    value = Math.round(value * 100) / 100; // precise: 2 decimals
    if (input.step !== 'any') input.step = 'any';
  } else {
    if (input.step !== input.dataset.kirOrigStep) input.step = input.dataset.kirOrigStep;
    const step = parseFloat(input.step);
    const stepSize = Number.isFinite(step) && step > 0 ? step : 1;
    value = Math.round((value - min) / stepSize) * stepSize + min; // normal: snap to step
  }
  value = Math.max(min, Math.min(max, value));
  if (String(value) !== input.value) {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  __kirRangeSetPreciseHint(input, e.altKey);
}

document.addEventListener('pointerdown', (e) => {
  const input = e.target.closest && e.target.closest('input.kir-range[type="range"]');
  if (!input || input.disabled) return;
  __kirRangeDragEl = input;
  if (input.setPointerCapture) {
    try { input.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  }
  input.focus({ preventScroll: true });
  e.preventDefault();
  __kirRangeApplyDrag(input, e);
});

document.addEventListener('pointermove', (e) => {
  if (!__kirRangeDragEl) return;
  __kirRangeApplyDrag(__kirRangeDragEl, e);
});

document.addEventListener('pointerup', () => {
  __kirRangeSetPreciseHint(__kirRangeDragEl, false);
  __kirRangeDragEl = null;
});
document.addEventListener('pointercancel', () => {
  __kirRangeSetPreciseHint(__kirRangeDragEl, false);
  __kirRangeDragEl = null;
});


function kirAdminImagePreviewUpdate(fieldId) {
  const input = document.getElementById(`admin-field-${fieldId}`);
  const wrap = document.getElementById(`admin-field-${fieldId}-preview-wrap`);
  const img = document.getElementById(`admin-field-${fieldId}-preview`);
  if (!input || !wrap || !img) return;
  const url = input.value.trim();
  wrap.classList.toggle('hidden', !url);
  wrap.classList.remove('admin-image-preview-broken');
  img.src = url;
}

/* ----------------------------------------------------------
   Image field — integrated upload button. Reads the picked file
   as a dataURL (same pattern as the old admin page) and fills it
   straight into the URL input, so manual URL editing keeps working
   side by side with uploads.
   ---------------------------------------------------------- */
const KIR_ADMIN_IMAGE_MAX_BYTES = 1.5 * 1024 * 1024;

function kirAdminImageFileSelected(fieldId, event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > KIR_ADMIN_IMAGE_MAX_BYTES) {
    kirAdminToast('Pilih gambar di bawah 1.5MB.', 'error');
    event.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const input = document.getElementById(`admin-field-${fieldId}`);
    if (input) input.value = reader.result;
    kirAdminImagePreviewUpdate(fieldId);
  };
  reader.readAsDataURL(file);
}

/* ----------------------------------------------------------
   Custom date / datetime picker — replaces the native browser
   control everywhere admin-shared handles a 'date' or
   'datetime-local' field. State lives per-field in
   kirAdminModalConfig.dpState, keyed by field id.
   ---------------------------------------------------------- */
const KIR_DP_WEEKDAYS_ID = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
const KIR_DP_MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const KIR_DP_MONTHS_SHORT_ID = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];

function kirAdminDpFormatDisplay(rawValue, withTime) {
  if (!rawValue) return 'Pilih tanggal...';
  const d = new Date(withTime ? rawValue : rawValue + 'T00:00:00');
  if (isNaN(d.getTime())) return 'Pilih tanggal...';
  
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    });
    const parts = {};
    fmt.formatToParts(d).forEach(p => { if (p.type !== 'literal') parts[p.type] = p.value; });
    const monthIdx = parseInt(parts.month, 10) - 1;
    const dayNum = parseInt(parts.day, 10);
    const dateLabel = `${dayNum} ${KIR_DP_MONTHS_ID[monthIdx].slice(0,3)} ${parts.year}`;
    if (!withTime) return dateLabel;
    return `${dateLabel}, ${parts.hour}:${parts.minute}`;
  } catch (e) {
    const dateLabel = `${d.getDate()} ${KIR_DP_MONTHS_ID[d.getMonth()].slice(0,3)} ${d.getFullYear()}`;
    if (!withTime) return dateLabel;
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${dateLabel}, ${hh}:${mm}`;
  }
}

function kirAdminDpInit(fieldId, withTime) {
  const input = document.getElementById(`admin-field-${fieldId}`);
  const raw = input ? input.value : '';
  let selected = null;
  if (raw) {
    const d = new Date(withTime ? raw : raw + 'T00:00:00');
    if (!isNaN(d.getTime())) selected = d;
  }
  const base = selected || new Date();
  if (!kirAdminModalConfig) kirAdminModalConfig = {};
  if (!kirAdminModalConfig.dpState) kirAdminModalConfig.dpState = {};
  kirAdminModalConfig.dpState[fieldId] = {
    withTime,
    viewYear: base.getFullYear(),
    viewMonth: base.getMonth(),
    viewMode: 'days',
    yearPageStart: Math.floor(base.getFullYear() / 12) * 12,
    selected,
    hour: selected ? selected.getHours() : 9,
    minute: selected ? selected.getMinutes() : 0,
  };
}

function kirAdminDpCloseAll() {
  document.querySelectorAll('.kir-calendar-panel').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.kir-datepicker').forEach(dp => dp.classList.remove('is-open'));
  document.querySelectorAll('.admin-field-group').forEach(fg => fg.classList.remove('kir-dp-active'));
  document.querySelectorAll('.admin-field-row').forEach(fr => fr.classList.remove('kir-dp-active'));
  if (typeof kirCloseAllCustomSelects === 'function') kirCloseAllCustomSelects();
}

function kirAdminDpToggle(fieldId) {
  const panel = document.getElementById(`admin-field-${fieldId}-panel`);
  if (!panel) return;
  const willOpen = panel.classList.contains('hidden');
  kirAdminDpCloseAll();
  if (willOpen) {
    kirAdminDpRender(fieldId);
    panel.classList.remove('hidden');
    const wrap = panel.closest('.kir-datepicker');
    if (wrap) {
      wrap.classList.add('is-open');
      const fg = wrap.closest('.admin-field-group');
      if (fg) fg.classList.add('kir-dp-active');
      const fr = wrap.closest('.admin-field-row');
      if (fr) fr.classList.add('kir-dp-active');
    }
  }
}

document.addEventListener('click', (e) => {
  if (!e.target.isConnected || !document.body.contains(e.target)) return;
  if (e.target.closest('.kir-select-panel')) return;
  if (!e.target.closest('.kir-datepicker')) kirAdminDpCloseAll();
});

function kirAdminDpSetViewMode(fieldId, mode) {
  const state = kirAdminModalConfig && kirAdminModalConfig.dpState ? kirAdminModalConfig.dpState[fieldId] : null;
  if (!state) return;
  state.viewMode = state.viewMode === mode ? 'days' : mode;
  if (state.viewMode === 'years') {
    state.yearPageStart = Math.floor(state.viewYear / 12) * 12;
  }
  kirAdminDpRender(fieldId);
}

function kirAdminDpMonthChange(fieldId, val) {
  const state = kirAdminModalConfig && kirAdminModalConfig.dpState ? kirAdminModalConfig.dpState[fieldId] : null;
  if (!state) return;
  state.viewMonth = parseInt(val, 10);
  state.viewMode = 'days';
  kirAdminDpRender(fieldId);
}

function kirAdminDpYearChange(fieldId, val) {
  const state = kirAdminModalConfig && kirAdminModalConfig.dpState ? kirAdminModalConfig.dpState[fieldId] : null;
  if (!state) return;
  state.viewYear = parseInt(val, 10);
  state.viewMode = 'days';
  kirAdminDpRender(fieldId);
}

function kirAdminDpSelectMonth(fieldId, monthIdx) {
  const state = kirAdminModalConfig && kirAdminModalConfig.dpState ? kirAdminModalConfig.dpState[fieldId] : null;
  if (!state) return;
  state.viewMonth = monthIdx;
  state.viewMode = 'days';
  kirAdminDpRender(fieldId);
}

function kirAdminDpSelectYear(fieldId, year) {
  const state = kirAdminModalConfig && kirAdminModalConfig.dpState ? kirAdminModalConfig.dpState[fieldId] : null;
  if (!state) return;
  state.viewYear = year;
  state.viewMode = 'days';
  kirAdminDpRender(fieldId);
}

function kirAdminDpDecadeNav(fieldId, delta) {
  const state = kirAdminModalConfig && kirAdminModalConfig.dpState ? kirAdminModalConfig.dpState[fieldId] : null;
  if (!state) return;
  if (state.yearPageStart === undefined) state.yearPageStart = Math.floor(state.viewYear / 12) * 12;
  state.yearPageStart += delta * 12;
  kirAdminDpRender(fieldId);
}

function kirAdminDpRender(fieldId) {
  if (!kirAdminModalConfig) kirAdminModalConfig = {};
  if (!kirAdminModalConfig.dpState) kirAdminModalConfig.dpState = {};
  let state = kirAdminModalConfig.dpState[fieldId];
  if (!state) {
    kirAdminDpInit(fieldId, false);
    state = kirAdminModalConfig.dpState[fieldId];
  }
  const panel = document.getElementById(`admin-field-${fieldId}-panel`);
  if (!state || !panel) return;

  const viewMode = state.viewMode || 'days';

  let headerHtml = '';
  let bodyHtml = '';

  if (viewMode === 'days') {
    headerHtml = `
      <button type="button" class="kir-cal-nav-btn" onclick="kirAdminDpNav('${fieldId}', -1)" title="Bulan sebelumnya">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
      </button>
      <div class="kir-cal-title-selects">
        <button type="button" class="kir-cal-title-btn" onclick="kirAdminDpSetViewMode('${fieldId}', 'months')" title="Pilih Bulan">
          <span>${KIR_DP_MONTHS_ID[state.viewMonth]}</span>
          <svg class="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
        </button>
        <button type="button" class="kir-cal-title-btn" onclick="kirAdminDpSetViewMode('${fieldId}', 'years')" title="Pilih Tahun">
          <span>${state.viewYear}</span>
          <svg class="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
        </button>
      </div>
      <button type="button" class="kir-cal-nav-btn" onclick="kirAdminDpNav('${fieldId}', 1)" title="Bulan berikutnya">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
      </button>`;

    const firstOfMonth = new Date(state.viewYear, state.viewMonth, 1);
    const startOffset = firstOfMonth.getDay();
    const daysInMonth = new Date(state.viewYear, state.viewMonth + 1, 0).getDate();
    const today = new Date();

    let cells = '';
    for (let i = 0; i < startOffset; i++) cells += `<div class="kir-cal-day empty"></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = today.getFullYear() === state.viewYear && today.getMonth() === state.viewMonth && today.getDate() === d;
      const isSelected = state.selected && state.selected.getFullYear() === state.viewYear && state.selected.getMonth() === state.viewMonth && state.selected.getDate() === d;
      cells += `<div class="kir-cal-day${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}" onclick="kirAdminDpSelect('${fieldId}', ${state.viewYear}, ${state.viewMonth}, ${d})">${d}</div>`;
    }

    bodyHtml = `
      <div class="kir-cal-grid">
        ${KIR_DP_WEEKDAYS_ID.map(w => `<div class="kir-cal-weekday">${w}</div>`).join('')}
        ${cells}
      </div>`;
  } else if (viewMode === 'months') {
    headerHtml = `
      <button type="button" class="kir-cal-nav-btn" onclick="kirAdminDpNav('${fieldId}', -12)" title="Tahun sebelumnya">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
      </button>
      <div class="kir-cal-title-selects">
        <button type="button" class="kir-cal-title-btn active" onclick="kirAdminDpSetViewMode('${fieldId}', 'months')" title="Kembali ke kalender">
          <span>${KIR_DP_MONTHS_ID[state.viewMonth]}</span>
          <svg class="w-3 h-3 text-zinc-400 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
        </button>
        <button type="button" class="kir-cal-title-btn" onclick="kirAdminDpSetViewMode('${fieldId}', 'years')" title="Pilih Tahun">
          <span>${state.viewYear}</span>
          <svg class="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
        </button>
      </div>
      <button type="button" class="kir-cal-nav-btn" onclick="kirAdminDpNav('${fieldId}', 12)" title="Tahun berikutnya">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
      </button>`;

    const monthItems = KIR_DP_MONTHS_SHORT_ID.map((m, idx) => {
      const isSelected = state.viewMonth === idx;
      return `<div class="kir-cal-month-item${isSelected ? ' selected' : ''}" onclick="kirAdminDpSelectMonth('${fieldId}', ${idx})">${m}</div>`;
    }).join('');

    bodyHtml = `<div class="kir-cal-grid-months">${monthItems}</div>`;
  } else if (viewMode === 'years') {
    const startYear = state.yearPageStart !== undefined ? state.yearPageStart : (Math.floor(state.viewYear / 12) * 12);
    const endYear = startYear + 11;

    headerHtml = `
      <button type="button" class="kir-cal-nav-btn" onclick="kirAdminDpDecadeNav('${fieldId}', -1)" title="Dekade sebelumnya">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
      </button>
      <div class="kir-cal-title-selects">
        <button type="button" class="kir-cal-title-btn" onclick="kirAdminDpSetViewMode('${fieldId}', 'months')" title="Pilih Bulan">
          <span>${KIR_DP_MONTHS_ID[state.viewMonth]}</span>
          <svg class="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
        </button>
        <button type="button" class="kir-cal-title-btn active" onclick="kirAdminDpSetViewMode('${fieldId}', 'years')" title="Kembali ke kalender">
          <span>${state.viewYear}</span>
          <svg class="w-3 h-3 text-zinc-400 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
        </button>
      </div>
      <button type="button" class="kir-cal-nav-btn" onclick="kirAdminDpDecadeNav('${fieldId}', 1)" title="Dekade berikutnya">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
      </button>`;

    const yearItems = [];
    for (let y = startYear; y <= endYear; y++) {
      const isSelected = state.viewYear === y;
      yearItems.push(`<div class="kir-cal-year-item${isSelected ? ' selected' : ''}" onclick="kirAdminDpSelectYear('${fieldId}', ${y})">${y}</div>`);
    }

    bodyHtml = `<div class="kir-cal-grid-years">${yearItems.join('')}</div>`;
  }

  const timeHtml = state.withTime ? `
    <div class="kir-cal-time-row">
      <input type="time" class="glass-input rounded-lg px-2.5 py-1.5 text-sm" value="${String(state.hour).padStart(2,'0')}:${String(state.minute).padStart(2,'0')}" onchange="kirAdminDpTimeChange('${fieldId}', this.value)" />
    </div>` : '';

  panel.innerHTML = `
    <div class="kir-cal-header">
      ${headerHtml}
    </div>
    ${bodyHtml}
    ${timeHtml}
    <div class="kir-cal-footer">
      <button type="button" class="kir-cal-quick-btn" onclick="kirAdminDpSelectToday('${fieldId}')">Hari ini</button>
      <button type="button" class="kir-cal-quick-btn" onclick="kirAdminDpClear('${fieldId}')">Hapus</button>
    </div>`;
}

function kirAdminDpNav(fieldId, delta) {
  const state = kirAdminModalConfig && kirAdminModalConfig.dpState ? kirAdminModalConfig.dpState[fieldId] : null;
  if (!state) return;
  if (state.viewMode === 'months') {
    state.viewYear += delta > 0 ? 1 : -1;
  } else {
    state.viewMonth += delta;
    while (state.viewMonth < 0) { state.viewMonth += 12; state.viewYear--; }
    while (state.viewMonth > 11) { state.viewMonth -= 12; state.viewYear++; }
  }
  kirAdminDpRender(fieldId);
}

function kirAdminDpApply(fieldId) {
  const state = kirAdminModalConfig && kirAdminModalConfig.dpState ? kirAdminModalConfig.dpState[fieldId] : null;
  const input = document.getElementById(`admin-field-${fieldId}`);
  const display = document.getElementById(`admin-field-${fieldId}-display`);
  if (!state || !input || !display) return;

  if (!state.selected) {
    input.value = '';
    display.textContent = 'Pilih tanggal...';
    display.classList.add('placeholder');
  } else {
    const y = state.selected.getFullYear();
    const m = String(state.selected.getMonth() + 1).padStart(2, '0');
    const d = String(state.selected.getDate()).padStart(2, '0');
    if (state.withTime) {
      const hh = String(state.hour).padStart(2, '0');
      const mm = String(state.minute).padStart(2, '0');
      input.value = `${y}-${m}-${d}T${hh}:${mm}`;
    } else {
      input.value = `${y}-${m}-${d}`;
    }
    display.textContent = kirAdminDpFormatDisplay(input.value, state.withTime);
    display.classList.remove('placeholder');
  }
  kirAdminRefreshVisibility();
}

function kirAdminDpSelect(fieldId, y, m, d) {
  const state = kirAdminModalConfig && kirAdminModalConfig.dpState ? kirAdminModalConfig.dpState[fieldId] : null;
  if (!state) return;
  state.selected = new Date(y, m, d, state.hour, state.minute);
  kirAdminDpApply(fieldId);
  if (!state.withTime) kirAdminDpCloseAll();
  else kirAdminDpRender(fieldId);
}

function kirAdminDpSelectToday(fieldId) {
  const now = new Date();
  const state = kirAdminModalConfig && kirAdminModalConfig.dpState ? kirAdminModalConfig.dpState[fieldId] : null;
  if (state) {
    state.viewYear = now.getFullYear();
    state.viewMonth = now.getMonth();
    state.viewMode = 'days';
    state.selected = new Date(now.getFullYear(), now.getMonth(), now.getDate(), state.hour, state.minute);
  }
  kirAdminDpApply(fieldId);
  kirAdminDpCloseAll();
}

function kirAdminDpClear(fieldId) {
  const state = kirAdminModalConfig && kirAdminModalConfig.dpState ? kirAdminModalConfig.dpState[fieldId] : null;
  if (state) {
    state.viewMode = 'days';
    state.selected = null;
  }
  kirAdminDpApply(fieldId);
  kirAdminDpCloseAll();
}

function kirAdminDpTimeChange(fieldId, val) {
  const [hh, mm] = val.split(':').map(Number);
  const state = kirAdminModalConfig && kirAdminModalConfig.dpState ? kirAdminModalConfig.dpState[fieldId] : null;
  if (!state) return;
  state.hour = hh || 0;
  state.minute = mm || 0;
  if (state.selected) state.selected.setHours(state.hour, state.minute);
  kirAdminDpApply(fieldId);
}

/* ----------------------------------------------------------
   Options builder — Google-Forms-style dynamic list with a
   "mark correct" dot per row. Generic across pages: each field
   keeps its own live state in kirAdminModalConfig.optionState,
   keyed by field id, so a modal can host more than one of these
   if a page ever needs it.
   ---------------------------------------------------------- */
let kirAdminOptionIdSeq = 0;
function kirAdminGenOptionId() {
  kirAdminOptionIdSeq += 1;
  return 'opt_' + Date.now() + '_' + kirAdminOptionIdSeq;
}

function kirAdminInitOptionState(field) {
  const initialTexts = kirAdminFieldValue(field) || [];
  const correctKey = field.correctField || `${field.id}_correct`;
  const correctIndex = kirAdminModalConfig.values ? kirAdminModalConfig.values[correctKey] : null;
  const items = (initialTexts.length ? initialTexts : ['', '']).map(t => ({ id: kirAdminGenOptionId(), text: t || '' }));
  const correctId = (correctIndex !== null && correctIndex !== undefined && items[correctIndex]) ? items[correctIndex].id : null;
  if (!kirAdminModalConfig.optionState) kirAdminModalConfig.optionState = {};
  kirAdminModalConfig.optionState[field.id] = { items, correctId };
}

function kirAdminRenderOptionList(fieldId) {
  const field = kirAdminModalConfig.fields.find(f => f.id === fieldId);
  const state = kirAdminModalConfig.optionState[fieldId];
  const list = document.getElementById(`admin-field-${fieldId}-list`);
  if (!list) return;
  list.innerHTML = state.items.map((o, i) => `
    <div class="voyage-option-row animate-stagger-in" style="animation-delay: ${i * 40}ms" data-id="${o.id}">
      <button type="button" class="voyage-option-dot-btn${state.correctId === o.id ? ' selected' : ''}" onclick="kirAdminOptionSetCorrect('${fieldId}','${o.id}')" aria-label="Tandai benar">
        <span class="voyage-option-dot"></span>
      </button>
      <input type="text" class="glass-input w-full rounded-lg px-3.5 py-2.5 text-sm" placeholder="${kirEscapeHtml(field.optionPlaceholder || `Opsi ${i + 1}`)}" value="${kirEscapeHtml(o.text)}" oninput="kirAdminOptionTextChange('${fieldId}','${o.id}', this.value)" />
      <button type="button" onclick="kirAdminOptionRemove('${fieldId}','${o.id}')" class="text-zinc-500 hover:text-red-400 p-1.5 shrink-0 transition"${state.items.length <= 2 ? ' disabled style="opacity:.3;cursor:not-allowed;"' : ''} aria-label="Hapus opsi">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M4 7h16M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" /></svg>
      </button>
    </div>`).join('');
}

function kirAdminOptionAdd(fieldId) {
  const state = kirAdminModalConfig.optionState[fieldId];
  state.items.push({ id: kirAdminGenOptionId(), text: '' });
  kirAdminRenderOptionList(fieldId);
}

function kirAdminOptionRemove(fieldId, optId) {
  const state = kirAdminModalConfig.optionState[fieldId];
  if (state.items.length <= 2) return;
  state.items = state.items.filter(o => o.id !== optId);
  if (state.correctId === optId) state.correctId = null;
  kirAdminRenderOptionList(fieldId);
}

function kirAdminOptionSetCorrect(fieldId, optId) {
  kirAdminModalConfig.optionState[fieldId].correctId = optId;
  kirAdminRenderOptionList(fieldId);
}

function kirAdminOptionTextChange(fieldId, optId, val) {
  const o = kirAdminModalConfig.optionState[fieldId].items.find(x => x.id === optId);
  if (o) o.text = val;
}

/* ----------------------------------------------------------
   Checkbox-group field ("checkboxes") — a multi-select of plain
   checkbox rows, for cases like a programming voyage's allowed
   languages. Supports one option acting as "exclusive" (e.g. an
   "All languages" convenience choice): picking it clears every
   other selection, and picking anything else clears it, so the
   stored value is never a nonsensical mix of "all" plus specific
   languages.
   ---------------------------------------------------------- */
function kirAdminInitCheckboxState(field) {
  const initial = kirAdminFieldValue(field) || [];
  if (!kirAdminModalConfig.checkboxState) kirAdminModalConfig.checkboxState = {};
  kirAdminModalConfig.checkboxState[field.id] = { selected: Array.isArray(initial) ? initial.slice() : [] };
}

function kirAdminRenderCheckboxList(fieldId) {
  const field = kirAdminModalConfig.fields.find(f => f.id === fieldId);
  const state = kirAdminModalConfig.checkboxState[fieldId];
  const list = document.getElementById(`admin-field-${fieldId}-list`);
  if (!list) return;
  list.innerHTML = (field.options || []).map(o => {
    const checked = state.selected.includes(o.value);
    return `
      <label class="admin-checkboxes-row${checked ? ' selected' : ''}">
        <input type="checkbox" class="hidden" ${checked ? 'checked' : ''} onchange="kirAdminCheckboxToggle('${fieldId}','${o.value}')" />
        <span class="admin-checkboxes-box"></span>
        <span class="admin-checkboxes-label">${kirEscapeHtml(o.label)}</span>
      </label>`;
  }).join('');
}

function kirAdminCheckboxToggle(fieldId, value) {
  const field = kirAdminModalConfig.fields.find(f => f.id === fieldId);
  const state = kirAdminModalConfig.checkboxState[fieldId];
  const exclusiveValues = (field.options || []).filter(o => o.exclusive).map(o => o.value);

  if (exclusiveValues.includes(value)) {
    // Picking the exclusive option (e.g. "All languages") replaces
    // whatever else was selected.
    state.selected = state.selected.includes(value) ? [] : [value];
  } else if (state.selected.includes(value)) {
    state.selected = state.selected.filter(v => v !== value);
  } else {
    // Picking a specific option clears any exclusive selection.
    state.selected = state.selected.filter(v => !exclusiveValues.includes(v)).concat(value);
  }
  kirAdminRenderCheckboxList(fieldId);
}

/* ----------------------------------------------------------
   Test-case editor field ("testcases") — repeatable rows of
   { input, expected_output, is_hidden }, used by programming voyages.
   Mirrors the 'options' field's add/remove/edit pattern. At least
   one non-hidden row is enforced at collection time by the page
   (see the required check in kirAdminCollectFieldValues), not
   here, since "at least one sample" is a cross-row rule rather
   than a per-row one.
   ---------------------------------------------------------- */
function kirAdminGenTestCaseId() {
  kirAdminOptionIdSeq += 1;
  return 'tc_' + Date.now() + '_' + kirAdminOptionIdSeq;
}

function kirAdminInitTestCaseState(field) {
  const initialRows = kirAdminFieldValue(field) || [];
  const rows = (initialRows.length ? initialRows : [{ input: '', expected_output: '', is_hidden: false }])
    .map(r => ({ id: kirAdminGenTestCaseId(), input: r.input || '', expected_output: r.expected_output || '', is_hidden: !!r.is_hidden }));
  if (!kirAdminModalConfig.testCaseState) kirAdminModalConfig.testCaseState = {};
  kirAdminModalConfig.testCaseState[field.id] = { rows };
}

function kirAdminRenderTestCaseList(fieldId) {
  const state = kirAdminModalConfig.testCaseState[fieldId];
  const list = document.getElementById(`admin-field-${fieldId}-list`);
  if (!list) return;
  list.innerHTML = state.rows.map((r, i) => `
    <div class="admin-testcase-row" data-id="${r.id}">
      <div class="admin-testcase-row-header">
        <span class="admin-testcase-row-index">Test Case ${i + 1}</span>
        <label class="admin-testcase-hidden-toggle">
          <input type="checkbox" class="hidden" ${r.is_hidden ? 'checked' : ''} onchange="kirAdminTestCaseSetHidden('${fieldId}','${r.id}', this.checked)" />
          <span class="admin-checkboxes-box"></span>
          <span>Tersembunyi</span>
        </label>
        <button type="button" onclick="kirAdminTestCaseRemove('${fieldId}','${r.id}')" class="text-zinc-500 hover:text-red-400 p-1 shrink-0 transition" aria-label="Hapus test case">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M4 7h16M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" /></svg>
        </button>
      </div>
      <div class="admin-testcase-row-grid">
        <div>
          <label class="admin-testcase-subfield-label">Input (stdin)</label>
          <textarea rows="2" class="glass-input w-full rounded-lg px-3 py-2 text-sm font-mono" placeholder="(kosongkan jika soal tidak butuh input)" oninput="kirAdminTestCaseFieldChange('${fieldId}','${r.id}','input', this.value)">${kirEscapeHtml(r.input)}</textarea>
        </div>
        <div>
          <label class="admin-testcase-subfield-label">Output yang Diharapkan</label>
          <textarea rows="2" class="glass-input w-full rounded-lg px-3 py-2 text-sm font-mono" oninput="kirAdminTestCaseFieldChange('${fieldId}','${r.id}','expected_output', this.value)">${kirEscapeHtml(r.expected_output)}</textarea>
        </div>
      </div>
    </div>`).join('');
}

function kirAdminTestCaseAdd(fieldId) {
  const state = kirAdminModalConfig.testCaseState[fieldId];
  state.rows.push({ id: kirAdminGenTestCaseId(), input: '', expected_output: '', is_hidden: false });
  kirAdminRenderTestCaseList(fieldId);
}

function kirAdminTestCaseRemove(fieldId, rowId) {
  const state = kirAdminModalConfig.testCaseState[fieldId];
  if (state.rows.length <= 1) return;
  state.rows = state.rows.filter(r => r.id !== rowId);
  kirAdminRenderTestCaseList(fieldId);
}

function kirAdminTestCaseFieldChange(fieldId, rowId, key, val) {
  const row = kirAdminModalConfig.testCaseState[fieldId].rows.find(r => r.id === rowId);
  if (row) row[key] = val;
}

function kirAdminTestCaseSetHidden(fieldId, rowId, checked) {
  const row = kirAdminModalConfig.testCaseState[fieldId].rows.find(r => r.id === rowId);
  if (row) row.is_hidden = checked;
}

function kirAdminToggleCheckbox(inputId) {
  const input = document.getElementById(inputId);
  const track = document.getElementById(`${inputId}-track`);
  if (!input || !track) return;
  input.checked = !input.checked;
  track.classList.toggle('on', input.checked);
}

function kirOpenAdminModal({ title, fields = [], values = null, saveLabel = 'Simpan', cancelLabel = 'Batal', onSave, size = 'normal' } = {}) {
  kirEnsureAdminRoots();
  kirAdminModalConfig = { title, fields, values, saveLabel, onSave, optionState: {}, checkboxState: {}, testCaseState: {}, dpState: {}, jsonMode: false };

  const root = document.getElementById('admin-modal-root');
  const card = root.querySelector('.modal-card');
  card.className = `modal-card p-0${size === 'wide' ? ' admin-modal-wide' : ''}`;
  card.innerHTML = `
    <div class="admin-modal-header">
      <h2 class="font-display text-lg font-semibold">${kirEscapeHtml(title || '')}</h2>
      <div class="admin-modal-header-actions">
        <button type="button" id="admin-modal-json-toggle" class="admin-modal-json-btn" onclick="kirAdminToggleJsonMode()" title="Edit sebagai JSON" aria-label="Edit sebagai JSON">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>
        </button>
        <button type="button" class="admin-modal-close" onclick="kirCloseAdminModal()" aria-label="Tutup">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
    <div class="admin-modal-body" id="admin-modal-fields">
      ${kirAdminRenderFieldsHtml(fields)}
    </div>
    <div class="admin-modal-footer">
      <button type="button" class="admin-btn-secondary" onclick="kirCloseAdminModal()">${kirEscapeHtml(cancelLabel)}</button>
      <button type="button" id="admin-modal-save-btn" class="admin-btn-primary bg-accent-gradient" onclick="kirAdminModalSubmit()">${kirEscapeHtml(saveLabel)}</button>
    </div>`;

  // Wire up any select fields to the site's custom-select styling,
  // if that helper happens to be loaded on this page.
  fields.filter(f => f.type === 'select').forEach(f => {
    if (typeof kirRefreshCustomSelect === 'function') kirRefreshCustomSelect(`admin-field-${f.id}`);
  });

  // Init the options builder's live state for any 'options' fields.
  fields.filter(f => f.type === 'options').forEach(f => {
    kirAdminInitOptionState(f);
    kirAdminRenderOptionList(f.id);
  });

  // Init the checkbox-group and test-case editor live state.
  fields.filter(f => f.type === 'checkboxes').forEach(f => {
    kirAdminInitCheckboxState(f);
    kirAdminRenderCheckboxList(f.id);
  });
  fields.filter(f => f.type === 'testcases').forEach(f => {
    kirAdminInitTestCaseState(f);
    kirAdminRenderTestCaseList(f.id);
  });

  // Init the custom date picker's live state for any date fields.
  fields.filter(f => f.type === 'date' || f.type === 'datetime-local').forEach(f => {
    kirAdminDpInit(f.id, f.type === 'datetime-local');
  });

  // Wire up each 'mathtext' field's WYSIWYG editor behavior and parse
  // its initial value into chips (matters most when editing — the
  // hidden textarea is prefilled but the visible surface starts empty
  // until something builds it).
  fields.filter(f => f.type === 'mathtext').forEach(f => {
    kirRichEditorInit(`admin-field-${f.id}`, { placeholder: f.placeholder || '' });
  });

  kirAdminRefreshVisibility();
  kirModalShow(root);
}

function kirCloseAdminModal() {
  const root = document.getElementById('admin-modal-root');
  kirModalHide(root);
  kirAdminModalConfig = null;
  kirAdminTooltipHide();
}

function kirAdminCollectFieldValues(fields) {
  const payload = {};
  let firstInvalid = null;

  fields.forEach(field => {
    if (!kirAdminIsFieldVisible(field)) return; // hidden fields aren't collected/validated

    const group = document.querySelector(`#admin-modal-fields [data-field-id="${field.id}"]`);
    if (!group) return;

    if (field.type === 'options') {
      const state = kirAdminModalConfig.optionState[field.id] || { items: [], correctId: null };
      const texts = state.items.map(i => i.text);
      const correctIndex = state.items.findIndex(i => i.id === state.correctId);
      const isEmpty = texts.some(t => !t || !t.trim());
      if (field.required && isEmpty) {
        group.classList.add('has-error');
        if (!firstInvalid) firstInvalid = document.querySelector(`#admin-field-${field.id}-list input`);
      } else {
        group.classList.remove('has-error');
      }
      payload[field.id] = texts;
      payload[field.correctField || `${field.id}_correct`] = correctIndex >= 0 ? correctIndex : null;
      return;
    }

    if (field.type === 'checkboxes') {
      const state = kirAdminModalConfig.checkboxState[field.id] || { selected: [] };
      if (field.required && state.selected.length === 0) {
        group.classList.add('has-error');
        if (!firstInvalid) firstInvalid = document.querySelector(`#admin-field-${field.id}-list`);
      } else {
        group.classList.remove('has-error');
      }
      payload[field.id] = state.selected.slice();
      return;
    }

    if (field.type === 'testcases') {
      const state = kirAdminModalConfig.testCaseState[field.id] || { rows: [] };
      const rows = state.rows.map(r => ({ input: r.input, expected_output: r.expected_output, is_hidden: r.is_hidden }));
      // Cross-row rule (not per-row), so it's checked here rather than
      // in the editor itself: at least one non-hidden sample case with
      // a real expected output, so students have something to debug
      // against. `input` is allowed to be blank (problems with no stdin).
      const hasSample = rows.some(r => !r.is_hidden && r.expected_output && r.expected_output.trim());
      const anyMissingOutput = rows.some(r => !r.expected_output || !r.expected_output.trim());
      if (field.required && (!hasSample || anyMissingOutput)) {
        group.classList.add('has-error');
        if (!firstInvalid) firstInvalid = document.querySelector(`#admin-field-${field.id}-list textarea`);
      } else {
        group.classList.remove('has-error');
      }
      payload[field.id] = rows;
      return;
    }

    const input = document.getElementById(`admin-field-${field.id}`);
    if (!input) return;

    let value;
    if (field.type === 'checkbox') value = input.checked;
    else if (field.type === 'number') value = input.value === '' ? null : Number(input.value);
    else if (field.type === 'range') value = Number(input.value);
    else value = input.value;

    const isEmpty = field.type !== 'checkbox' && (value === '' || value === null || value === undefined);
    if (field.required && isEmpty) {
      group.classList.add('has-error');
      if (!firstInvalid) firstInvalid = input;
    } else {
      group.classList.remove('has-error');
    }

    payload[field.id] = value;
  });

  if (firstInvalid) {
    // A 'mathtext' field's real <textarea> is visually hidden (see
    // .wce-source in css/admin-shared.css) — focusing it directly
    // wouldn't show the person anything, so send focus to its visible
    // WYSIWYG surface instead when there is one.
    const surface = firstInvalid.dataset && firstInvalid.dataset.wceBound
      ? document.getElementById(`${firstInvalid.id}-surface`)
      : null;
    (surface || firstInvalid).focus();
    return null;
  }
  return payload;
}

/* ----------------------------------------------------------
   In-modal "Edit as JSON" mode
   --------------------------------------------------------
   Lets a person edit the record currently open in the create/edit
   modal as raw JSON instead of through the generated form fields —
   useful for pasting in a fully-formed record, tweaking several
   values at once, or just working faster than clicking through
   individual inputs. Toggled by the "</>" button next to the modal's
   close button (added in kirOpenAdminModal).

   Entering JSON mode serializes the CURRENT live field values (not
   just the original `values` the modal opened with) into a textarea.
   "Terapkan JSON" parses that textarea, merges it into
   kirAdminModalConfig.values, and re-renders the normal form fields
   from it — reusing the exact same values-driven rendering path the
   modal already uses for `values` on open, so options/date/range
   fields all pick the new data up for free. The regular Save button
   underneath is untouched by any of this; it only ever reads from
   the form.
   ---------------------------------------------------------- */
function kirAdminBuildJsonFromFields(fields) {
  const obj = {};
  fields.forEach(field => {
    if (field.type === 'options') {
      const state = kirAdminModalConfig.optionState[field.id];
      const items = state ? state.items : [];
      obj[field.id] = items.map(i => i.text);
      const correctIdx = state ? items.findIndex(i => i.id === state.correctId) : -1;
      obj[field.correctField || `${field.id}_correct`] = correctIdx >= 0 ? correctIdx : null;
      return;
    }
    if (field.type === 'testcases') {
      const state = kirAdminModalConfig.testCaseState[field.id];
      obj[field.id] = (state ? state.rows : []).map(r => ({ input: r.input, expected_output: r.expected_output, is_hidden: r.is_hidden }));
      return;
    }
    obj[field.id] = kirAdminReadLiveFieldValue(field);
  });
  return obj;
}

function kirAdminToggleJsonMode() {
  if (!kirAdminModalConfig) return;
  if (kirAdminModalConfig.jsonMode) {
    kirAdminExitJsonMode();
  } else {
    kirAdminEnterJsonMode();
  }
}

function kirAdminEnterJsonMode() {
  const fieldsRoot = document.getElementById('admin-modal-fields');
  const toggleBtn = document.getElementById('admin-modal-json-toggle');
  if (!fieldsRoot) return;

  const obj = kirAdminBuildJsonFromFields(kirAdminModalConfig.fields);
  kirAdminModalConfig.jsonMode = true;

  fieldsRoot.innerHTML = `
    <p class="admin-field-hint">Edit data ini sebagai JSON, lalu klik &ldquo;Terapkan JSON&rdquo; untuk kembali ke form (perubahan belum tersimpan sampai kamu klik Simpan).</p>
    <textarea id="admin-json-textarea" class="glass-input w-full rounded-lg px-3.5 py-2.5 text-sm admin-json-textarea" spellcheck="false" rows="16">${kirEscapeHtml(JSON.stringify(obj, null, 2))}</textarea>
    <p id="admin-json-error" class="admin-json-error hidden"></p>`;

  if (toggleBtn) { toggleBtn.classList.add('active'); toggleBtn.title = 'Kembali ke form'; toggleBtn.setAttribute('aria-label', 'Kembali ke form'); }

  const saveBtn = document.getElementById('admin-modal-save-btn');
  if (saveBtn) { saveBtn.textContent = 'Terapkan JSON'; saveBtn.onclick = kirAdminApplyJsonMode; }
}

function kirAdminApplyJsonMode() {
  const textarea = document.getElementById('admin-json-textarea');
  const errEl = document.getElementById('admin-json-error');
  if (!textarea) return;

  let obj;
  try {
    obj = JSON.parse(textarea.value);
  } catch (e) {
    if (errEl) { errEl.textContent = 'JSON tidak valid: ' + e.message; errEl.classList.remove('hidden'); }
    return;
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    if (errEl) { errEl.textContent = 'JSON harus berupa satu objek (bukan array atau nilai tunggal).'; errEl.classList.remove('hidden'); }
    return;
  }
  if (errEl) errEl.classList.add('hidden');

  kirAdminModalConfig.values = Object.assign({}, kirAdminModalConfig.values, obj);
  kirAdminExitJsonMode();
}

function kirAdminExitJsonMode() {
  if (!kirAdminModalConfig) return;
  kirAdminModalConfig.jsonMode = false;
  const fields = kirAdminModalConfig.fields;

  document.getElementById('admin-modal-fields').innerHTML = kirAdminRenderFieldsHtml(fields);

  fields.filter(f => f.type === 'select').forEach(f => {
    if (typeof kirRefreshCustomSelect === 'function') kirRefreshCustomSelect(`admin-field-${f.id}`);
  });
  fields.filter(f => f.type === 'options').forEach(f => {
    kirAdminInitOptionState(f);
    kirAdminRenderOptionList(f.id);
  });
  fields.filter(f => f.type === 'checkboxes').forEach(f => {
    kirAdminInitCheckboxState(f);
    kirAdminRenderCheckboxList(f.id);
  });
  fields.filter(f => f.type === 'testcases').forEach(f => {
    kirAdminInitTestCaseState(f);
    kirAdminRenderTestCaseList(f.id);
  });
  fields.filter(f => f.type === 'date' || f.type === 'datetime-local').forEach(f => {
    kirAdminDpInit(f.id, f.type === 'datetime-local');
  });
  fields.filter(f => f.type === 'mathtext').forEach(f => {
    kirRichEditorInit(`admin-field-${f.id}`, { placeholder: f.placeholder || '' });
  });
  kirAdminRefreshVisibility();

  const toggleBtn = document.getElementById('admin-modal-json-toggle');
  if (toggleBtn) { toggleBtn.classList.remove('active'); toggleBtn.title = 'Edit sebagai JSON'; toggleBtn.setAttribute('aria-label', 'Edit sebagai JSON'); }

  const saveBtn = document.getElementById('admin-modal-save-btn');
  if (saveBtn) { saveBtn.textContent = kirAdminModalConfig.saveLabel; saveBtn.onclick = kirAdminModalSubmit; }
}

async function kirAdminModalSubmit() {
  if (!kirAdminModalConfig) return;
  const { fields, onSave } = kirAdminModalConfig;
  const payload = kirAdminCollectFieldValues(fields);
  if (!payload) return;

  const btn = document.getElementById('admin-modal-save-btn');
  const originalLabel = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = '...'; }

  try {
    if (typeof onSave === 'function') await onSave(payload);
    kirCloseAdminModal();
    kirAdminToast('Berhasil disimpan.', 'success');
  } catch (err) {
    console.error('Admin save failed:', err);
    kirAdminToast((err && err.message) || 'Gagal menyimpan.', 'error');
    if (btn) { btn.disabled = false; btn.textContent = originalLabel; }
  }
}

/* ----------------------------------------------------------
   Shared confirmation dialog
   --------------------------------------------------------
   Generic yes/no dialog, used for delete confirmations (and
   anything else that wants a confirm step). `danger` styles the
   confirm button red, which is the common case for delete.
   ---------------------------------------------------------- */
let kirAdminConfirmCallback = null;
let kirAdminConfirmCancelCallback = null;
let kirAdminConfirmSuccessMessage = 'Berhasil dihapus.';

function kirConfirmDialog({ title = 'Konfirmasi', message = '', confirmLabel = 'Hapus', cancelLabel = 'Batal', danger = true, successMessage = 'Berhasil dihapus.', onConfirm, onCancel } = {}) {
  kirEnsureAdminRoots();
  kirAdminConfirmCallback = onConfirm;
  kirAdminConfirmCancelCallback = onCancel || null;
  kirAdminConfirmSuccessMessage = successMessage;

  const root = document.getElementById('admin-confirm-root');
  root.querySelector('.modal-card').innerHTML = `
    <p class="admin-confirm-title">${kirEscapeHtml(title)}</p>
    <p class="admin-confirm-message">${kirEscapeHtml(message)}</p>
    <div class="admin-confirm-actions">
      <button type="button" class="admin-btn-secondary" onclick="kirCloseAdminConfirm()">${kirEscapeHtml(cancelLabel)}</button>
      <button type="button" id="admin-confirm-btn" class="admin-btn-primary${danger ? ' admin-btn-danger' : ' bg-accent-gradient'}">${kirEscapeHtml(confirmLabel)}</button>
    </div>`;

  document.getElementById('admin-confirm-btn').onclick = kirAdminConfirmSubmit;
  kirModalShow(root);
}

function kirCloseAdminConfirm() {
  const cancelCallback = kirAdminConfirmCancelCallback;
  kirAdminConfirmCallback = null;
  kirAdminConfirmCancelCallback = null;
  const root = document.getElementById('admin-confirm-root');
  kirModalHide(root);
  if (typeof cancelCallback === 'function') cancelCallback();
}

async function kirAdminConfirmSubmit() {
  const callback = kirAdminConfirmCallback;
  const btn = document.getElementById('admin-confirm-btn');
  const originalLabel = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = '...'; }

  try {
    if (typeof callback === 'function') await callback();
    // Successful confirm isn't a cancel — clear it so kirModalHide
    // (called below directly, not through kirCloseAdminConfirm) never
    // fires the "no, keep going" callback for a completed action.
    kirAdminConfirmCallback = null;
    kirAdminConfirmCancelCallback = null;
    kirModalHide(document.getElementById('admin-confirm-root'));
    if (kirAdminConfirmSuccessMessage) kirAdminToast(kirAdminConfirmSuccessMessage, 'success');
  } catch (err) {
    console.error('Admin delete failed:', err);
    kirAdminToast((err && err.message) || 'Gagal menghapus.', 'error');
    if (btn) { btn.disabled = false; btn.textContent = originalLabel; }
  }
}

/* ----------------------------------------------------------
   Toast
   ---------------------------------------------------------- */
let kirAdminToastTimer = null;

function kirAdminToast(message, type = 'success') {
  kirEnsureAdminRoots();
  const toast = document.getElementById('admin-toast-root');
  const icon = type === 'error'
    ? `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0 3.75h.008M10.29 3.86L1.82 18a1.5 1.5 0 001.29 2.25h17.78A1.5 1.5 0 0022.18 18L13.71 3.86a1.5 1.5 0 00-2.42 0z" /></svg>`
    : `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;

  toast.className = `admin-toast admin-toast-${type === 'error' ? 'error' : 'success'}`;
  toast.innerHTML = `${icon}<span>${kirEscapeHtml(message)}</span>`;

  // Restart the show transition even if a toast is already visible.
  requestAnimationFrame(() => toast.classList.add('show'));
  clearTimeout(kirAdminToastTimer);
  kirAdminToastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

/* ----------------------------------------------------------
   Generic Supabase CRUD helpers
   --------------------------------------------------------
   Thin wrappers so every page talks to Supabase the same way
   instead of re-writing .insert()/.update()/.delete() calls with
   slightly different error handling each time. These deliberately
   stay data-shape-agnostic: pages pass a plain payload object and
   get back a consistent { success, data, error } result.
   ---------------------------------------------------------- */
async function kirAdminCreate(table, payload, returning = '*') {
  if (!window.supabaseClient) return { success: false, data: null, error: 'Supabase belum siap.' };
  const { data, error } = await supabaseClient.from(table).insert(payload).select(returning);
  if (error) {
    console.error(`kirAdminCreate(${table}) failed:`, error);
    return { success: false, data: null, error: error.message };
  }
  return { success: true, data: data && data[0], error: null };
}

async function kirAdminUpdate(table, id, payload, idColumn = 'id', returning = '*') {
  if (!window.supabaseClient) return { success: false, data: null, error: 'Supabase belum siap.' };
  const { data, error } = await supabaseClient.from(table).update(payload).eq(idColumn, id).select(returning);
  if (error) {
    console.error(`kirAdminUpdate(${table}) failed:`, error);
    return { success: false, data: null, error: error.message };
  }
  return { success: true, data: data && data[0], error: null };
}

async function kirAdminDelete(table, id, idColumn = 'id') {
  if (!window.supabaseClient) return { success: false, error: 'Supabase belum siap.' };
  const { error } = await supabaseClient.from(table).delete().eq(idColumn, id);
  if (error) {
    console.error(`kirAdminDelete(${table}) failed:`, error);
    return { success: false, error: error.message };
  }
  return { success: true, error: null };
}

/* ----------------------------------------------------------
   JSON bulk import modal
   --------------------------------------------------------
   Standalone modal (own root, own z-index; can be opened
   independently of the create/edit modal) for pasting or uploading
   JSON and mass-inserting the records it describes in one click.

   The textarea is the source of truth: paste a single JSON object,
   or an array of many, directly into it and hit "Simpan". Loading
   a file (one is fine, multiple also works) just fills that same
   textarea for you, since every file's contents get merged into
   one combined array so it's still one box, one click either way.

   Every object found is run through the caller's `transform(rawItem)`,
   which must:
     - return the exact payload to insert into `table`, OR
     - throw an Error with a human-readable reason to reject just
       that one item (the rest of the batch still proceeds).

   kirOpenJsonImportModal({
     title,       // modal title, e.g. 'Impor Voyage dari JSON'
     table,       // Supabase table name to insert into
     transform,   // (rawItem) => payload | throws Error
     itemLabel,   // e.g. 'voyage', used in helper copy/counts
     placeholderExample, // optional single example object, shown
                          // pretty-printed (wrapped in []) as the
                          // textarea placeholder
     aiContext,   // optional string (or () => string): a self-contained
                  // prompt/spec describing the exact JSON shape, columns,
                  // enums, etc. this importer expects. When provided, a
                  // "Salin Context" button appears so the admin can
                  // paste it straight into an LLM to have it generate
                  // valid import JSON. Kept separate from the in-modal
                  // placeholderExample because the AI needs the full
                  // rules (enums, ranges, conditional fields) and not
                  // just one sample object.
     onDone,      // async (insertedCount) => void, called after a
                  // successful import (e.g. to refetch + re-render)
   })
   ---------------------------------------------------------- */
let kirJsonImportConfig = null;
let kirJsonImportParsed = [];  // valid payload objects, ready to insert
let kirJsonImportErrors = [];  // [{ source, message }]
let kirJsonImportDebounce = null;

function kirEnsureJsonImportRoot() {
  if (!document.getElementById('admin-json-import-root')) {
    const root = document.createElement('div');
    root.id = 'admin-json-import-root';
    root.className = 'modal-overlay hidden';
    root.onclick = (e) => { if (e.target === root) kirCloseJsonImportModal(); };
    root.innerHTML = '<div class="modal-card p-0"></div>';
    document.body.appendChild(root);
  }
}

function kirOpenJsonImportModal({ title = 'Impor JSON', table, transform, itemLabel = 'item', placeholderExample, aiContext, onDone, beforeInsert, returning = '*' } = {}) {
  kirEnsureAdminRoots();
  kirEnsureJsonImportRoot();
  kirJsonImportConfig = { table, transform, itemLabel, aiContext, onDone, beforeInsert, returning };
  kirJsonImportParsed = [];
  kirJsonImportErrors = [];

  const placeholder = JSON.stringify(placeholderExample ? [placeholderExample, placeholderExample] : [{ title: '...' }, { title: '...' }], null, 2);

  const root = document.getElementById('admin-json-import-root');
  const card = root.querySelector('.modal-card');
  card.innerHTML = `
    <div class="admin-modal-header">
      <h2 class="font-display text-lg font-semibold">${kirEscapeHtml(title)}</h2>
      <button type="button" class="admin-modal-close" onclick="kirCloseJsonImportModal()" aria-label="Tutup">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
    <div class="admin-modal-body">
      <p class="text-sm text-zinc-400">Tempel JSON di bawah, satu objek ${kirEscapeHtml(itemLabel)} atau array berisi banyak ${kirEscapeHtml(itemLabel)} sekaligus, lalu klik &ldquo;Simpan&rdquo; untuk memasukkan semuanya dalam satu klik.</p>
      <textarea id="admin-json-import-textarea" class="glass-input w-full rounded-lg px-3.5 py-2.5 text-sm admin-json-textarea" spellcheck="false" rows="16" placeholder="${kirEscapeHtml(placeholder)}" oninput="kirJsonImportTextChanged()"></textarea>
      <div class="admin-json-import-filerow">
        <button type="button" class="admin-json-file-btn" onclick="document.getElementById('admin-json-import-file').click()">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 8.25L12 3.75m0 0L7.5 8.25M12 3.75v12" /></svg>
          <span>Muat dari file .json&hellip;</span>
        </button>
        ${aiContext ? `
        <button type="button" class="admin-json-ai-context-btn" onclick="kirJsonImportCopyAiContext()">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" /></svg>
          <span>Salin Context</span>
        </button>
        ` : ''}
        <span class="text-xs text-zinc-500">Boleh pilih lebih dari satu file, isinya akan digabung otomatis</span>
      </div>
      <input type="file" id="admin-json-import-file" class="hidden" accept="application/json,.json" multiple onchange="kirJsonImportFilesSelected(event)" />
      <div id="admin-json-import-summary" class="admin-json-import-summary hidden"></div>
    </div>
    <div class="admin-modal-footer">
      <button type="button" class="admin-btn-secondary" onclick="kirCloseJsonImportModal()">Batal</button>
      <button type="button" id="admin-json-import-btn" class="admin-btn-primary bg-accent-gradient" onclick="kirJsonImportSubmit()" disabled>Simpan</button>
    </div>`;
  kirModalShow(root);
  document.getElementById('admin-json-import-textarea').focus();
}

function kirCloseJsonImportModal() {
  const root = document.getElementById('admin-json-import-root');
  kirModalHide(root);
  clearTimeout(kirJsonImportDebounce);
  kirJsonImportConfig = null;
  kirJsonImportParsed = [];
  kirJsonImportErrors = [];
}

/* ----------------------------------------------------------
   "Salin Context" button. Copies a self-contained spec
   (columns, enums, JSON shape, difficulty scale, etc.) to the
   clipboard so the admin can paste it into an LLM and get back
   JSON that's guaranteed to match what `transform` expects.
   aiContext can be a plain string, a () => string, or a
   () => Promise<string> (e.g. voyageJsonAiContext, which does a DB
   round-trip to pull real calibration examples first) — `await`
   works unchanged on a non-Promise value, so all three shapes are
   handled by the same line below.
   ---------------------------------------------------------- */
async function kirJsonImportCopyAiContext() {
  if (!kirJsonImportConfig || !kirJsonImportConfig.aiContext) return;

  const btn = document.querySelector('.admin-json-ai-context-btn');
  const restoreLabel = btn ? btn.querySelector('span').textContent : '';
  const setLabel = (label) => { if (btn) btn.querySelector('span').textContent = label; };
  const flashCopied = () => {
    if (!btn) return;
    btn.classList.add('is-copied');
    setLabel('Tersalin!');
    setTimeout(() => {
      btn.classList.remove('is-copied');
      setLabel(restoreLabel);
    }, 1600);
  };

  if (btn) { btn.disabled = true; setLabel('Menyiapkan…'); }
  try {
    const text = typeof kirJsonImportConfig.aiContext === 'function'
      ? await kirJsonImportConfig.aiContext()
      : kirJsonImportConfig.aiContext;

    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for non-secure contexts / older browsers where
      // navigator.clipboard is unavailable.
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    flashCopied();
  } catch (e) {
    console.error('Gagal menyalin context AI:', e);
    kirAdminToast('Gagal menyalin ke clipboard.', 'error');
    setLabel(restoreLabel);
  } finally {
    if (btn) btn.disabled = false;
  }
}

/* ----------------------------------------------------------
   Textarea is the single source of truth. Typing re-validates
   (debounced) so the "N ready / M failed" preview and the Simpan
   button stay live as the person edits or pastes.
   ---------------------------------------------------------- */
function kirJsonImportTextChanged() {
  clearTimeout(kirJsonImportDebounce);
  kirJsonImportDebounce = setTimeout(kirJsonImportParseTextarea, 250);
}

function kirJsonImportParseTextarea() {
  const textarea = document.getElementById('admin-json-import-textarea');
  if (!textarea || !kirJsonImportConfig) return;
  const raw = textarea.value.trim();
  kirJsonImportParsed = [];
  kirJsonImportErrors = [];

  if (!raw) {
    kirJsonImportRenderSummary();
    return;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    kirJsonImportErrors.push({ source: 'JSON', message: 'JSON tidak valid: ' + e.message });
    kirJsonImportRenderSummary();
    return;
  }

  const items = Array.isArray(data) ? data : [data];
  if (items.length === 0) {
    kirJsonImportErrors.push({ source: 'JSON', message: 'Array kosong.' });
    kirJsonImportRenderSummary();
    return;
  }

  items.forEach((rawItem, i) => {
    const label = items.length > 1 ? `#${i + 1}${rawItem && rawItem.title ? ', ' + rawItem.title : ''}` : ((rawItem && rawItem.title) || 'JSON');
    try {
      const payload = kirJsonImportConfig.transform(rawItem);
      if (!payload) throw new Error('Data tidak lengkap.');
      kirJsonImportParsed.push(payload);
    } catch (e) {
      kirJsonImportErrors.push({ source: label, message: (e && e.message) || 'Tidak valid.' });
    }
  });

  kirJsonImportRenderSummary();
}

/* ----------------------------------------------------------
   Loading file(s) is just a convenience for filling the textarea.
   Every selected file's object/array gets merged into one combined
   array and dropped straight into the box, so the rest of the flow
   (preview, edit, Simpan) is identical either way.
   ---------------------------------------------------------- */
async function kirJsonImportFilesSelected(event) {
  const files = Array.from(event.target.files || []);
  if (files.length === 0) return;

  let merged = [];
  const fileErrors = [];

  for (const file of files) {
    let text;
    try {
      text = await file.text();
    } catch (e) {
      fileErrors.push(`${file.name}: gagal dibaca.`);
      continue;
    }
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      fileErrors.push(`${file.name}: JSON tidak valid (${e.message}).`);
      continue;
    }
    merged = merged.concat(Array.isArray(data) ? data : [data]);
  }

  const textarea = document.getElementById('admin-json-import-textarea');
  if (textarea && merged.length) {
    textarea.value = JSON.stringify(merged, null, 2);
  }
  event.target.value = ''; // allow re-selecting the same file(s) again later

  if (fileErrors.length) kirAdminToast(fileErrors.join(' '), 'error');

  kirJsonImportParseTextarea();
}

function kirJsonImportRenderSummary() {
  const box = document.getElementById('admin-json-import-summary');
  const btn = document.getElementById('admin-json-import-btn');
  if (!box || !btn) return;

  const validCount = kirJsonImportParsed.length;
  const errCount = kirJsonImportErrors.length;

  if (validCount === 0 && errCount === 0) {
    box.classList.add('hidden');
    btn.disabled = true;
    return;
  }

  box.classList.remove('hidden');
  box.innerHTML = `
    <p class="admin-json-import-count">
      <span class="text-accent-300 font-semibold">${validCount}</span> ${kirEscapeHtml(kirJsonImportConfig.itemLabel)} siap disimpan
      ${errCount ? `&middot; <span class="text-red-400 font-semibold">${errCount}</span> gagal` : ''}
    </p>
    ${errCount ? `<ul class="admin-json-import-errors">${kirJsonImportErrors.map(e => `<li><strong>${kirEscapeHtml(e.source)}:</strong> ${kirEscapeHtml(e.message)}</li>`).join('')}</ul>` : ''}`;
  btn.disabled = validCount === 0;
}

async function kirJsonImportSubmit() {
  if (!kirJsonImportConfig || kirJsonImportParsed.length === 0) return;
  const { table, onDone, beforeInsert, returning } = kirJsonImportConfig;
  const btn = document.getElementById('admin-json-import-btn');
  const originalLabel = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = '...'; }

  let payloads = kirJsonImportParsed;
  if (typeof beforeInsert === 'function') {
    try {
      payloads = await beforeInsert(payloads);
    } catch (e) {
      kirAdminToast(e.message || 'Gagal memproses data sebelum insert.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = originalLabel; }
      return;
    }
  }

  const result = await kirAdminCreate(table, payloads, returning);
  if (!result.success) {
    kirAdminToast(result.error || 'Gagal menyimpan.', 'error');
    if (btn) { btn.disabled = false; btn.textContent = originalLabel; }
    return;
  }

  const count = payloads.length;
  kirCloseJsonImportModal();
  kirAdminToast(`${count} berhasil disimpan.`, 'success');
  if (typeof onDone === 'function') await onDone(count);
}