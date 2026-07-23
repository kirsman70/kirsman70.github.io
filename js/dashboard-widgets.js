/* ==========================================================
   Beranda — editable widget dashboard
   --------------------------------------------------------
   Widgets live on a square-cell CSS grid (--dash-cols / --dash-cell,
   computed below so cells stay square across breakpoints). Layout
   is a simple ordered array of {type, w, h} persisted to
   localStorage — one instance per widget type keeps everything
   (element ids, chart bindings, etc.) simple. Row-gap and
   column-gap are always equal (see .widget-grid in style.css).

   Every widget's render function branches on (w, h) in grid cells
   and returns a DIFFERENT composition per size band — not just a
   scaled-down version of the same layout. See each render function
   below for its size tiers.
   ========================================================== */

const DASH_LAYOUT_KEY = 'kir_dashboard_layout_v1';
const DASH_GAP_PX = 20; // matches `gap: 20px` on .widget-grid in style.css

let ACTIVITIES = [];

// --- Deltas + Streak — populated from profiles.deltas_week /
// deltas_lifetime / streak_days / streak_pattern by
// fetchDashboardWidgetsData(). These defaults are just the
// pre-fetch placeholder state (fresh account / not loaded yet). ---
let DELTAS_HISTORY_WEEK = [0, 0, 0, 0, 0, 0, 0]; // last 7 days
let DELTAS_HISTORY_LIFETIME = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // last 12 months
let STREAK_DAYS = 0;
const STREAK_FILL_GOAL = 10; // days for a visually "full" flame — cosmetic only
let STREAK_WEEK_PATTERN = [false, false, false, false, false, false, false]; // last 7 days, Mon..Sun — cosmetic mini-calendar
let deltasRange = 'week'; // 'week' | 'lifetime'

// Everyone else on the leaderboard (i.e. not "you") — fetched from
// the profiles table by fetchDashboardWidgetsData(). Empty until
// then, so "you" just ranks #1 of 1 for a moment on first paint.
let DASH_LEADERBOARD_ROSTER = [];

let DASH_TASKS_PREVIEW = [];
let DASH_TASKS_TOTAL = 0;
let DASH_TASKS_DUE_WEEK = 0;
let DASH_TASKS_LATE = 0;

const TASK_STATUS_CLS = {
  progress: 'bg-accent-15 text-accent-300 border border-accent-30',
  review:   'bg-accent-gradient text-white',
  late:     'bg-white/5 text-zinc-500 border border-white/10',
  todo:     'bg-zinc-800/60 text-zinc-400 border border-white/10',
  done:     'bg-accent-10 text-accent-200 border border-accent-20',
};

let DASH_EVENTS_PREVIEW = [];
let DASH_EVENTS_TOTAL = 0;

async function fetchDashboardWidgetsData() {
  if (!window.supabaseClient) return;
  const types = new Set(dashLayout.map(w => w.type));

  if (types.has('tasks')) {
    const { data: tasksData } = await supabaseClient.from('tasks').select('*');
    if (tasksData) {
      const pending = tasksData.filter(t => t.status !== 'done');
      DASH_TASKS_TOTAL = pending.length;
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      DASH_TASKS_DUE_WEEK = pending.filter(t => new Date(t.due_date) <= nextWeek && new Date(t.due_date) >= now).length;
      DASH_TASKS_LATE = pending.filter(t => new Date(t.due_date) < now).length;
      DASH_TASKS_PREVIEW = pending.sort((a, b) => new Date(a.due_date) - new Date(b.due_date)).slice(0, 4).map(t => ({
        title: t.title,
        due: t.due_date ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(t.due_date)) : 'Tanpa Tenggat',
        status: t.status || 'todo'
      }));
    }
  }

  if (types.has('events')) {
    const nowIso = new Date().toISOString();
    const { data: eventsData } = await supabaseClient.from('schedule').select('*').gte('event_date', nowIso).order('event_date', { ascending: true });
    if (eventsData) {
      DASH_EVENTS_TOTAL = eventsData.length;
      DASH_EVENTS_PREVIEW = eventsData.slice(0, 3).map((ev, i) => {
        const d = new Date(ev.event_date);
        return {
          dateLabel: new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }).format(d),
          time: new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(d),
          title: ev.title,
          isNext: i === 0
        };
      });
    }
  }

  if (types.has('leaderboard')) {
    const { data: profilesData } = await supabaseClient.from('profiles').select('name, deltas_total');
    if (profilesData) {
      const youName = kirCurrentUserName();
      DASH_LEADERBOARD_ROSTER = profilesData
        .filter(p => p.name !== youName)
        .map(p => ({ name: p.name, deltas: p.deltas_total || 0 }));
    }
  }

  if (types.has('deltas') || types.has('streak')) {
    const { data: userData } = await supabaseClient.auth.getUser();
    if (userData?.user) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('deltas_week, deltas_lifetime, streak_days, streak_pattern')
        .eq('id', userData.user.id)
        .single();
      if (profile) {
        if (profile.deltas_week) DELTAS_HISTORY_WEEK = profile.deltas_week;
        if (profile.deltas_lifetime) DELTAS_HISTORY_LIFETIME = profile.deltas_lifetime;
        STREAK_DAYS = profile.streak_days || 0;
        if (profile.streak_pattern) STREAK_WEEK_PATTERN = profile.streak_pattern;
      }
    }
  }

  if (types.has('activity')) {
    const { data: activityData } = await supabaseClient.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(10);
    if (activityData) {
      ACTIVITIES = activityData.map(a => ({
        msAgo: Date.now() - new Date(a.created_at).getTime(),
        dot: a.dot_color || 'bg-accent',
        author: a.author_name,
        html: a.html_content
      }));
    }
  }

  dashLayout.forEach(item => {
    if (['tasks', 'events', 'activity', 'leaderboard', 'deltas', 'streak'].includes(item.type)) {
      const el = document.querySelector(`.widget-wrap[data-type="${item.type}"] .widget-inner`);
      if (el) {
        el.innerHTML = renderWidgetContent(item.type, item.w, item.h);
        if (item.type === 'deltas') renderDeltasData();
        if (item.type === 'streak') renderStreakData();
        if (typeof kirApplyTranslations === 'function') kirApplyTranslations();
      }
    }
  });
}
const DASH_QUOTES = [
  { text: 'Konsistensi kecil setiap hari mengalahkan usaha besar sesekali.', author: 'Tim Orbit' },
  { text: 'Karya ilmiah terbaik dimulai dari pertanyaan yang paling sederhana.', author: 'Tim Orbit' },
  { text: 'Robot yang hebat lahir dari banyak percobaan yang gagal duluan.', author: 'Tim Orbit' },
  { text: 'Kerja tim membuat tenggat waktu terasa lebih ringan.', author: 'Tim Orbit' },
  { text: 'Catat idemu sekarang — versi terbaikmu nanti akan berterima kasih.', author: 'Tim Orbit' },
];
let quoteIndex = new Date().getDate() % DASH_QUOTES.length;

// --- Roster (compact table widget) — small snapshot of who's
// around, distinct from the leaderboard (this is presence/branch,
// not points). ---
const DASH_ROSTER = [
  { name: 'Alex Pratama',    cabang: 'both',    online: true  },
  { name: 'Priya Anand',     cabang: 'sains',   online: true  },
  { name: 'Marcus Wijaya',   cabang: 'robotik', online: false },
  { name: 'Kayla Amelia',    cabang: 'both',    online: true  },
  { name: 'Dinda Larasati',  cabang: 'sains',   online: false },
  { name: 'Reza Firmansyah', cabang: 'robotik', online: false },
];

// --- Heatmap (contribution-style grid) — cosmetic intensity per
// day for the last 10 weeks, seeded deterministically so it looks
// the same every load instead of flickering randomly. ---
const HEATMAP_WEEKS = 10;
const HEATMAP_DATA = (() => {
  const days = HEATMAP_WEEKS * 7;
  const out = [];
  let seed = 42;
  for (let i = 0; i < days; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const rand = seed / 233280;
    // Bias toward livelier recent days, like a real activity trail
    const recencyBoost = i > days - 14 ? 0.25 : 0;
    const level = Math.min(4, Math.floor((rand + recencyBoost) * 5));
    out.push(level);
  }
  return out;
})();
const HEATMAP_LEVEL_OPACITY = [0.06, 0.25, 0.45, 0.7, 1];

/* ----------------------------------------------------------
   Widget catalog — label/description/icon for the "add widget"
   picker, plus which sizes (in grid cells, w × h) each widget
   supports. Sizes are intentionally granular: most widgets offer
   a 1-row compact form at several widths, a 1-column tall form,
   a square/medium form, and one or more larger forms that reveal
   lists, charts, or secondary stats.
   ---------------------------------------------------------- */
const WIDGET_CATALOG = {
  profile: {
    label: 'Profil Pengguna', desc: 'Kartu ID keanggotaan kamu.', labelKey: 'widget_cat_profile_label', descKey: 'widget_cat_profile_desc',
    icon: `<svg class="w-4 h-4 text-accent-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>`,
    sizes: [[1,1],[2,1],[3,1],[4,1],[1,2],[2,2],[3,2],[4,2]], default: [2,1],
  },
  quote: {
    label: 'Kutipan Harian', desc: 'Motivasi acak untuk hari ini.', labelKey: 'widget_cat_quote_label', descKey: 'widget_cat_quote_desc',
    icon: `<svg class="w-4 h-4 text-accent-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>`,
    sizes: [[1,1],[1,2],[2,1],[3,1],[4,1],[2,2],[3,2],[4,2]], default: [2,1],
  },
  tasks: {
    label: 'Tugas Aktif', desc: 'Ringkasan tugas yang sedang berjalan.', labelKey: 'widget_cat_tasks_label', descKey: 'widget_cat_tasks_desc',
    icon: `<svg class="w-4 h-4 text-accent-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>`,
    sizes: [[1,1],[1,2],[1,3],[2,1],[2,2],[2,3],[3,2],[4,2],[3,3],[4,3],[4,4]], default: [2,2],
  },
  events: {
    label: 'Acara Mendatang', desc: 'Acara klub berikutnya, sekilas.', labelKey: 'widget_cat_events_label', descKey: 'widget_cat_events_desc',
    icon: `<svg class="w-4 h-4 text-accent-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>`,
    sizes: [[1,1],[1,2],[1,3],[2,1],[2,2],[2,3],[3,2],[4,2],[3,3],[4,3],[4,4]], default: [2,2],
  },
  deltas: {
    label: 'Deltas', desc: 'Grafik perolehan poin kamu dari waktu ke waktu.', labelKey: 'widget_cat_deltas_label', descKey: 'widget_cat_deltas_desc',
    icon: `<svg class="w-4 h-4 text-accent-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 012-2h2a2 2 0 012 2v6m4 0V9a2 2 0 00-2-2h-2m-8 12h12" /></svg>`,
    sizes: [[1,1],[1,2],[2,1],[3,1],[4,1],[2,2],[3,2],[4,2],[3,3],[4,3]], default: [3,2],
  },
  streak: {
    label: 'Beruntun', desc: 'Nyala si api streak harian kamu.', labelKey: 'widget_cat_streak_label', descKey: 'widget_cat_streak_desc',
    icon: `<svg class="w-4 h-4 text-accent-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.5 6.5 16.5 9c0 1-.5 2-1 2.5 2.5.5 3.157 3.157 2.157 7.157z" /></svg>`,
    sizes: [[1,1],[1,2],[1,3],[2,1],[2,2],[2,3],[3,1],[4,1],[3,2],[4,2]], default: [1,2],
  },
  activity: {
    label: 'Aktivitas Terbaru', desc: 'Update terbaru dari tim kamu.', labelKey: 'widget_cat_activity_label', descKey: 'widget_cat_activity_desc',
    icon: `<svg class="w-4 h-4 text-accent-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h7" /></svg>`,
    sizes: [[1,1],[1,2],[1,3],[2,1],[3,1],[4,1],[2,2],[3,2],[4,2],[3,3],[4,3],[4,4]], default: [2,2],
  },
  clock: {
    label: 'Jam', desc: 'Jam analog yang mengikuti warna cabang kamu.', labelKey: 'widget_cat_clock_label', descKey: 'widget_cat_clock_desc',
    icon: `<svg class="w-4 h-4 text-accent-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 7v5l3 3"/></svg>`,
    sizes: [[1,1],[1,2],[1,3],[2,1],[3,1],[4,1],[2,2],[3,2],[4,2],[4,3]], default: [2,1],
  },
  leaderboard: {
    label: 'Peringkat', desc: 'Peringkat deltas kamu di klub.', labelKey: 'widget_cat_leaderboard_label', descKey: 'widget_cat_leaderboard_desc',
    icon: `<svg class="w-4 h-4 text-accent-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 21h8m-4-4v4M6 4h12v3a6 6 0 01-6 6 6 6 0 01-6-6V4zM6 4H4a2 2 0 000 4h1.5M18 4h2a2 2 0 010 4h-1.5" /></svg>`,
    sizes: [[1,1],[1,2],[2,1],[3,1],[4,1],[2,2],[3,2],[4,2],[4,3],[4,4]], default: [2,2],
  },
  quicklinks: {
    label: 'Tautan Cepat', desc: 'Jalan pintas ke halaman lain di Orbit.', labelKey: 'widget_cat_quicklinks_label', descKey: 'widget_cat_quicklinks_desc',
    icon: `<svg class="w-4 h-4 text-accent-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>`,
    sizes: [[1,1],[1,2],[2,1],[3,1],[4,1],[2,2],[3,2],[4,2],[2,3],[4,3]], default: [4,1],
  },
  notes: {
    label: 'Catatan', desc: 'Tulis catatan atau pengingat cepat.', labelKey: 'widget_cat_notes_label', descKey: 'widget_cat_notes_desc',
    icon: `<svg class="w-4 h-4 text-accent-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828z" /></svg>`,
    sizes: [[1,1],[1,2],[1,3],[2,1],[3,1],[2,2],[3,2],[4,2],[4,3],[4,4]], default: [2,2],
  },
  heatmap: {
    label: 'Peta Kontribusi', desc: 'Sekilas seberapa aktif kamu tiap hari.', labelKey: 'widget_cat_heatmap_label', descKey: 'widget_cat_heatmap_desc',
    icon: `<svg class="w-4 h-4 text-accent-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 5h4v4H4V5zm6 0h4v4h-4V5zm6 0h4v4h-4V5zM4 11h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 17h4v4H4v-4zm6 0h4v4h-4v-4z" /></svg>`,
    sizes: [[1,1],[1,2],[2,1],[2,2],[3,2],[4,2],[3,3],[4,3]], default: [3,2],
  },
  roster: {
    label: 'Anggota Aktif', desc: 'Siapa saja yang lagi aktif di klub.', labelKey: 'widget_cat_roster_label', descKey: 'widget_cat_roster_desc',
    icon: `<svg class="w-4 h-4 text-accent-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4" /></svg>`,
    sizes: [[1,1],[2,1],[1,2],[2,2],[3,2],[4,2],[3,3],[4,3]], default: [2,2],
  },
};

// Dense default layout: 10 widgets tiling a 4-col grid with zero
const DEFAULT_LAYOUT = [
  { type: 'profile',     w: 2, h: 1, x: 1, y: 1 },
  { type: 'quicklinks',  w: 1, h: 2, x: 3, y: 1 },
  { type: 'streak',      w: 1, h: 2, x: 4, y: 1 },
  { type: 'tasks',       w: 1, h: 1, x: 1, y: 2 },
  { type: 'events',      w: 1, h: 1, x: 2, y: 2 },
  { type: 'deltas',      w: 3, h: 1, x: 1, y: 3 },
  { type: 'leaderboard', w: 1, h: 1, x: 4, y: 3 },
  { type: 'activity',    w: 2, h: 1, x: 1, y: 4 },
  { type: 'quote',       w: 1, h: 1, x: 3, y: 4 },
  { type: 'clock',       w: 1, h: 1, x: 4, y: 4 },
];

let dashLayout = loadDashLayout();
let editMode = false;
let draggedType = null;
let clockIntervalId = null;

let layoutHistory = [];
let historyIndex = -1;

function pushHistory() {
  if (!editMode) return;
  if (historyIndex < layoutHistory.length - 1) {
    layoutHistory = layoutHistory.slice(0, historyIndex + 1);
  }
  layoutHistory.push(JSON.stringify(dashLayout));
  historyIndex++;
  updateUndoRedoUI();
}

function undoLayout() {
  if (!editMode || historyIndex <= 0) return;
  historyIndex--;
  dashLayout = JSON.parse(layoutHistory[historyIndex]);
  saveDashLayout();
  renderWidgetGrid();
  updateUndoRedoUI();
}

function redoLayout() {
  if (!editMode || historyIndex >= layoutHistory.length - 1) return;
  historyIndex++;
  dashLayout = JSON.parse(layoutHistory[historyIndex]);
  saveDashLayout();
  renderWidgetGrid();
  updateUndoRedoUI();
}

function updateUndoRedoUI() {
  const undoBtn = document.getElementById('undo-btn');
  const redoBtn = document.getElementById('redo-btn');
  const addBtn = document.getElementById('add-widget-btn');

  if (addBtn) {
    addBtn.classList.toggle('hidden', !editMode);
    addBtn.classList.toggle('flex', editMode);
  }

  if (!undoBtn || !redoBtn) return;
  
  if (editMode) {
    undoBtn.classList.remove('hidden');
    redoBtn.classList.remove('hidden');
    
    undoBtn.disabled = historyIndex <= 0;
    undoBtn.style.opacity = historyIndex <= 0 ? '0.4' : '1';
    undoBtn.style.cursor = historyIndex <= 0 ? 'not-allowed' : 'pointer';
    
    redoBtn.disabled = historyIndex >= layoutHistory.length - 1;
    redoBtn.style.opacity = historyIndex >= layoutHistory.length - 1 ? '0.4' : '1';
    redoBtn.style.cursor = historyIndex >= layoutHistory.length - 1 ? 'not-allowed' : 'pointer';
  } else {
    undoBtn.classList.add('hidden');
    redoBtn.classList.add('hidden');
  }
}

function loadDashLayout() {
  try {
    const raw = localStorage.getItem(DASH_LAYOUT_KEY);
    let parsed = JSON.parse(raw);
    if (!raw || !Array.isArray(parsed) || parsed.length === 0) {
      parsed = DEFAULT_LAYOUT.map(w => ({ ...w }));
    }

    parsed = parsed.filter(w => WIDGET_CATALOG[w.type] && Number.isFinite(w.w) && Number.isFinite(w.h));

    // Migration: If legacy layouts lack explicit coordinates, assign them sequentially
    let currentY = 1;
    parsed.forEach(w => {
      if (typeof w.x !== 'number' || typeof w.y !== 'number') {
        w.x = 1; w.y = currentY;
        currentY += w.h;
      }
    });
    return parsed;
  } catch (e) {
    return DEFAULT_LAYOUT.map(w => ({ ...w }));
  }
}

function saveDashLayout() {
  localStorage.setItem(DASH_LAYOUT_KEY, JSON.stringify(dashLayout));
  if (window.supabaseClient) {
    supabaseClient.auth.getUser().then(({ data: userData }) => {
      if (userData?.user) {
        supabaseClient.from('profiles').update({ dashboard_layout: dashLayout }).eq('id', userData.user.id).then();
      }
    });
  }
}

/* ----------------------------------------------------------
   Grid sizing — square cells across breakpoints
   ---------------------------------------------------------- */
function currentCols() {
  return window.matchMedia('(min-width: 640px)').matches ? 4 : 2;
}

function updateCellSize() {
  const grid = document.getElementById('widget-grid');
  if (!grid) return;
  const cols = currentCols();
  const totalWidth = grid.clientWidth;
  const cell = Math.max(64, (totalWidth - DASH_GAP_PX * (cols - 1)) / cols);
  grid.style.setProperty('--dash-cols', cols);
  grid.style.setProperty('--dash-cell', cell + 'px');
}

/* ----------------------------------------------------------
   Edit mode
   ---------------------------------------------------------- */
function toggleDashboardEdit() {
  editMode = !editMode;
  document.getElementById('edit-dashboard-label').textContent = editMode
    ? (I18N[localStorage.getItem('kir_lang') || 'id'].dash_done || 'Selesai')
    : (I18N[localStorage.getItem('kir_lang') || 'id'].dash_edit || 'Edit');
  document.getElementById('edit-dashboard-btn').classList.toggle('shadow-glow-sm', editMode);
  const footer = document.getElementById('edit-mode-footer');
  footer.classList.toggle('hidden', !editMode);
  footer.classList.toggle('flex', editMode);
  closeSizePicker();

  if (editMode) {
    layoutHistory = [JSON.stringify(dashLayout)];
    historyIndex = 0;
  } else {
    layoutHistory = [];
    historyIndex = -1;
  }
  
  updateUndoRedoUI();
  renderWidgetGrid();
}

function resetDashboardLayout() {
  dashLayout = DEFAULT_LAYOUT.map(w => ({ ...w }));
  saveDashLayout();
  pushHistory();
  renderWidgetGrid();
}

/* ----------------------------------------------------------
   Drag to reorder (native HTML5 DnD, edit mode only)
   ---------------------------------------------------------- */
let draggedEl = null;
let phantomEl = null;

function getGridCell(e) {
  const grid = document.getElementById('widget-grid');
  const rect = grid.getBoundingClientRect();
  const cols = currentCols();
  const cellW = (rect.width - DASH_GAP_PX * (cols - 1)) / cols;
  const cellH = parseInt(getComputedStyle(grid).getPropertyValue('--dash-cell')) || 96;

  let col = Math.floor((e.clientX - rect.left) / (cellW + DASH_GAP_PX)) + 1;
  let row = Math.floor((e.clientY - rect.top) / (cellH + DASH_GAP_PX)) + 1;

  return { col: Math.max(1, Math.min(col, cols)), row: Math.max(1, row) };
}

function handleWidgetDragStart(e, type) {
  draggedType = type;
  draggedEl = e.currentTarget;
  e.dataTransfer.effectAllowed = 'move';
  try { e.dataTransfer.setData('text/plain', type); } catch (err) {}

  phantomEl = document.createElement('div');
  phantomEl.className = 'widget-phantom';
  phantomEl.style.gridColumn = draggedEl.style.gridColumn;
  phantomEl.style.gridRow = draggedEl.style.gridRow;

  setTimeout(() => {
    draggedEl.style.display = 'none';
    document.getElementById('widget-grid').appendChild(phantomEl);
  }, 0);
}

function handleGridDragOver(e) {
  e.preventDefault();
  if (!draggedEl || !phantomEl || !draggedType) return;
  
  const { col, row } = getGridCell(e);
  const item = dashLayout.find(w => w.type === draggedType);
  if (!item) return;

  const safeCol = Math.min(col, currentCols() - item.w + 1);
  const safeRow = Math.min(row, 8 - item.h + 1);
  
  phantomEl.style.gridColumn = `${safeCol} / span ${item.w}`;
  phantomEl.style.gridRow = `${safeRow} / span ${item.h}`;
  phantomEl.dataset.x = safeCol;
  phantomEl.dataset.y = safeRow;
}

function handleGridDrop(e) { e.preventDefault(); }

function syncWidgetDOM() {
  dashLayout.forEach(item => {
    const el = document.querySelector(`.widget-wrap[data-type="${item.type}"]`);
    if (el) {
      el.style.gridColumn = `${item.x} / span ${item.w}`;
      el.style.gridRow = `${item.y} / span ${item.h}`;
    }
  });
}

function resolveCollisions(movedItem) {
  dashLayout.forEach(w => {
    if (w.type !== movedItem.type) {
      const overlapX = movedItem.x < w.x + w.w && movedItem.x + movedItem.w > w.x;
      const overlapY = movedItem.y < w.y + w.h && movedItem.y + movedItem.h > w.y;
      // Push the conflicting widget directly below the dropped widget and cascade
      if (overlapX && overlapY) {
        w.y = Math.min(movedItem.y + movedItem.h, 8 - w.h + 1);
        resolveCollisions(w); // Recursively resolve if we pushed it onto another widget
      }
    }
  });
}

function handleWidgetDragEnd(e) {
  if (draggedType && phantomEl && phantomEl.dataset.x) {
    const item = dashLayout.find(w => w.type === draggedType);
    if (item) {
      item.x = parseInt(phantomEl.dataset.x, 10);
      item.y = parseInt(phantomEl.dataset.y, 10);
      resolveCollisions(item);
      saveDashLayout();
      pushHistory();
    }
  }

  draggedType = null;
  if (draggedEl) draggedEl.style.display = ''; // Restore visibility of the dropped widget
  draggedEl = null;
  if (phantomEl) { phantomEl.remove(); phantomEl = null; }

  // Optimised DOM sync instead of a hard re-render
  syncWidgetDOM();
}

/* ----------------------------------------------------------
   Edge Resize System
   ---------------------------------------------------------- */
let resizingWidget = null;
let resizeDir = null;
let resizeStart = null;
let initialW = 1, initialH = 1;
let lastRenderedW = 1, lastRenderedH = 1;
let initialX = 1, initialY = 1;
let resizeStartRect = null;
let resizeInnerEl = null;

function closeSizePicker() { /* Kept for legacy removeWidget call compat */ }

function startResize(e, type, dir) {
  e.preventDefault();
  e.stopPropagation();
  resizingWidget = type;
  resizeDir = dir;

  const item = dashLayout.find(w => w.type === type);
  initialW = item.w; initialH = item.h;
  initialX = item.x; initialY = item.y;
  lastRenderedW = item.w; lastRenderedH = item.h;
  resizeStart = { x: e.clientX, y: e.clientY };

  const el = document.querySelector(`.widget-wrap[data-type="${type}"]`);
  resizeInnerEl = el.querySelector('.widget-inner');
  resizeStartRect = el.getBoundingClientRect();

  // Detach inner visual container from grid to follow pointer fluidly
  resizeInnerEl.style.position = 'absolute';
  resizeInnerEl.style.top = '0';
  resizeInnerEl.style.left = '0';
  resizeInnerEl.style.width = resizeStartRect.width + 'px';
  resizeInnerEl.style.height = resizeStartRect.height + 'px';
  resizeInnerEl.style.zIndex = '60';
  resizeInnerEl.style.transition = 'none';

  phantomEl = document.createElement('div');
  phantomEl.className = 'widget-phantom';
  phantomEl.style.gridColumn = el.style.gridColumn;
  phantomEl.style.gridRow = el.style.gridRow;
  document.getElementById('widget-grid').appendChild(phantomEl);

  document.addEventListener('pointermove', handleResizeMove);
  document.addEventListener('pointerup', stopResize);

  let cursor = 'nwse-resize';
  if (dir === 'n' || dir === 's') cursor = 'ns-resize';
  if (dir === 'e' || dir === 'w') cursor = 'ew-resize';
  if (dir === 'ne' || dir === 'sw') cursor = 'nesw-resize';
  document.body.style.cursor = cursor;
}

function handleResizeMove(e) {
  if (!resizingWidget || !resizeInnerEl) return;
  const cols = currentCols();
  const grid = document.getElementById('widget-grid');
  const rect = grid.getBoundingClientRect();
  const cellW = (rect.width - DASH_GAP_PX * (cols - 1)) / cols;
  const cellH = parseInt(getComputedStyle(grid).getPropertyValue('--dash-cell')) || 96;

  const dx = e.clientX - resizeStart.x;
  const dy = e.clientY - resizeStart.y;

  // 1. Determine absolute physical boundaries allowed for this specific widget
  const validSizes = WIDGET_CATALOG[resizingWidget].sizes;
  let allowedSizes = validSizes.filter(([vw, vh]) => {
    if (!resizeDir.includes('e') && !resizeDir.includes('w') && vw !== initialW) return false;
    if (!resizeDir.includes('s') && !resizeDir.includes('n') && vh !== initialH) return false;
    if (resizeDir.includes('w') && !resizeDir.includes('e') && vw > cols - initialX + 1) return false;
    if (resizeDir.includes('e') && !resizeDir.includes('w') && vw > cols - initialX + 1) return false;
    if (resizeDir.includes('n') && !resizeDir.includes('s') && vh > 8 - initialY + 1) return false;
    if (resizeDir.includes('s') && !resizeDir.includes('n') && vh > 8 - initialY + 1) return false;
    return true;
  });
  if (allowedSizes.length === 0) allowedSizes = [[initialW, initialH]];

  const minCellsW = Math.min(...allowedSizes.map(s => s[0]));
  const minCellsH = Math.min(...allowedSizes.map(s => s[1]));
  const maxCellsW = Math.max(...allowedSizes.map(s => s[0]));
  const maxCellsH = Math.max(...allowedSizes.map(s => s[1]));

  const minPxW = minCellsW * cellW + (minCellsW - 1) * DASH_GAP_PX;
  const minPxH = minCellsH * cellH + (minCellsH - 1) * DASH_GAP_PX;
  const maxPxW = maxCellsW * cellW + (maxCellsW - 1) * DASH_GAP_PX;
  const maxPxH = maxCellsH * cellH + (maxCellsH - 1) * DASH_GAP_PX;

  // 2. Calculate the target bounding box size and clamp it strictly to valid pixel boundaries
  let targetW = resizeStartRect.width;
  let targetH = resizeStartRect.height;
  let targetX = 0, targetY = 0;

  if (resizeDir.includes('e')) {
    targetW = Math.max(minPxW, Math.min(maxPxW, targetW + dx));
  }
  if (resizeDir.includes('s')) {
    targetH = Math.max(minPxH, Math.min(maxPxH, targetH + dy));
  }
  if (resizeDir.includes('w')) {
    const proposedW = targetW - dx;
    const clampedW = Math.max(minPxW, Math.min(maxPxW, proposedW));
    targetX = targetW - clampedW;
    targetW = clampedW;
  }
  if (resizeDir.includes('n')) {
    const proposedH = targetH - dy;
    const clampedH = Math.max(minPxH, Math.min(maxPxH, proposedH));
    targetY = targetH - clampedH;
    targetH = clampedH;
  }

  // 3. Apply smooth fluid stretch to the detached inner container
  resizeInnerEl.style.width = targetW + 'px';
  resizeInnerEl.style.height = targetH + 'px';
  resizeInnerEl.style.transform = `translate(${targetX}px, ${targetY}px)`;

  // 4. Calculate Grid Logic for the snapping Phantom Block
  // (reuses rect/cellW/cellH computed above — grid hasn't changed)
  const deltaCols = Math.round(dx / (cellW + DASH_GAP_PX));
  const deltaRows = Math.round(dy / (cellH + DASH_GAP_PX));

  let newW = initialW, newH = initialH;
  let newX = initialX, newY = initialY;

  if (resizeDir.includes('e')) newW = initialW + deltaCols;
  if (resizeDir.includes('s')) newH = initialH + deltaRows;
  if (resizeDir.includes('w')) { newW = initialW - deltaCols; newX = initialX + deltaCols; }
  if (resizeDir.includes('n')) { newH = initialH - deltaRows; newY = initialY + deltaRows; }

  newW = Math.max(1, newW); newH = Math.max(1, newH);
  newX = Math.max(1, newX); newY = Math.max(1, newY);

  let bestSize = [initialW, initialH];
  let minDistance = Infinity;

  allowedSizes.forEach(([vw, vh]) => {
    const dist = Math.abs(vw - newW) + Math.abs(vh - newH);
    if (dist < minDistance) { minDistance = dist; bestSize = [vw, vh]; }
  });

  if (resizeDir.includes('w')) newX = initialX + (initialW - bestSize[0]);
  if (resizeDir.includes('n')) newY = initialY + (initialH - bestSize[1]);
  if (newX + bestSize[0] - 1 > cols) newX = cols - bestSize[0] + 1;
  newX = Math.max(1, newX); newY = Math.max(1, newY);

  if (phantomEl) {
    phantomEl.style.gridColumn = `${newX} / span ${bestSize[0]}`;
    phantomEl.style.gridRow = `${newY} / span ${bestSize[1]}`;
  }

  // Crossfade widget content exactly once when grid dimension boundaries cross
  if (bestSize[0] !== lastRenderedW || bestSize[1] !== lastRenderedH) {
    lastRenderedW = bestSize[0]; lastRenderedH = bestSize[1];

    if (resizingWidget === 'notes') {
      const editor = resizeInnerEl.querySelector('[contenteditable]');
      if (editor) localStorage.setItem('kir_dashboard_note', editor.innerHTML);
    }
    resizeInnerEl.innerHTML = renderWidgetContent(resizingWidget, bestSize[0], bestSize[1]);

    resizeInnerEl.classList.remove('fade-resize');
    void resizeInnerEl.offsetWidth;
    resizeInnerEl.classList.add('fade-resize');

    if (resizingWidget === 'deltas') renderDeltasData();
    if (resizingWidget === 'streak') renderStreakData();
  }

  resizeStart.bestW = bestSize[0]; resizeStart.bestH = bestSize[1];
  resizeStart.bestX = newX; resizeStart.bestY = newY;
}

function stopResize(e) {
  document.removeEventListener('pointermove', handleResizeMove);
  document.removeEventListener('pointerup', stopResize);
  document.body.style.cursor = '';
  const el = document.querySelector(`.widget-wrap[data-type="${resizingWidget}"]`);
  
  if (resizingWidget && resizeStart.bestW) {
    const item = dashLayout.find(w => w.type === resizingWidget);
    if (item) {
      item.w = resizeStart.bestW; item.h = resizeStart.bestH;
      item.x = resizeStart.bestX; item.y = resizeStart.bestY;
      resolveCollisions(item);
      saveDashLayout();
      pushHistory();
    }
  }
  
  if (phantomEl) { phantomEl.remove(); phantomEl = null; }
  
  if (resizeInnerEl && el) {
    const currentRect = resizeInnerEl.getBoundingClientRect();
    
    syncWidgetDOM();
    
    const targetRect = el.getBoundingClientRect();
    const dx = currentRect.left - targetRect.left;
    const dy = currentRect.top - targetRect.top;
    
    resizeInnerEl.style.transition = 'none';
    resizeInnerEl.style.transform = `translate(${dx}px, ${dy}px)`;
    resizeInnerEl.style.width = currentRect.width + 'px';
    resizeInnerEl.style.height = currentRect.height + 'px';
    
    void resizeInnerEl.offsetWidth;
    
    resizeInnerEl.style.transition = 'width 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), height 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)';
    resizeInnerEl.style.width = targetRect.width + 'px';
    resizeInnerEl.style.height = targetRect.height + 'px';
    resizeInnerEl.style.transform = 'translate(0px, 0px)';
    
    const localInner = resizeInnerEl;
    setTimeout(() => {
      if (localInner) {
        localInner.style.position = '';
        localInner.style.zIndex = '';
        localInner.style.width = '';
        localInner.style.height = '';
        localInner.style.transition = '';
        localInner.style.transform = '';
      }
    }, 300);
  }
  
  resizingWidget = null;
  resizeInnerEl = null;
}

/* ----------------------------------------------------------
   Add / remove widgets
   ---------------------------------------------------------- */
function removeWidget(type) {
  closeSizePicker();
  dashLayout = dashLayout.filter(w => w.type !== type);
  saveDashLayout();
  pushHistory();
  renderWidgetGrid();
}

function openAddWidgetModal() {
  const list = document.getElementById('add-widget-list');
  const existing = new Set(dashLayout.map(w => w.type));
  const available = Object.keys(WIDGET_CATALOG).filter(t => !existing.has(t));

  list.innerHTML = available.length === 0
    ? `<p class="text-zinc-500 text-sm text-center py-6 sm:col-span-2" data-i18n="dash_no_more_widgets">Semua widget sudah ada di dasbor kamu.</p>`
    : available.map(t => {
        const def = WIDGET_CATALOG[t];
        return `
          <button onclick="addWidget('${t}')" class="widget-catalog-tile glass rounded-xl p-4 text-left hover:bg-white/5 transition flex items-start gap-3">
            <div class="w-9 h-9 shrink-0 rounded-lg bg-accent-15 border border-accent-30 flex items-center justify-center">${def.icon}</div>
            <div class="min-w-0">
              <p class="font-medium text-sm" data-i18n="${def.labelKey}">${def.label}</p>
              <p class="text-zinc-500 text-xs mt-0.5" data-i18n="${def.descKey}">${def.desc}</p>
            </div>
          </button>`;
      }).join('');

  kirLocalModalShow(document.getElementById('add-widget-modal'));
  kirApplyTranslations();
}
function closeAddWidgetModal() {
  kirLocalModalHide(document.getElementById('add-widget-modal'));
}
async function addWidget(type) {
  const def = WIDGET_CATALOG[type];
  const maxRow = dashLayout.reduce((max, w) => Math.max(max, w.y + w.h), 1);
  dashLayout.push({ type, w: def.default[0], h: def.default[1], x: 1, y: maxRow });
  saveDashLayout();
  pushHistory();
  closeAddWidgetModal();
  renderWidgetGrid();
  // The widget above renders with placeholder content first (same as
  // on page load) — fetch its real data now so it doesn't sit on
  // placeholder/stale numbers until the next full reload.
  await fetchDashboardWidgetsData();
}

/* ----------------------------------------------------------
   Main render — builds the grid, then delegates each widget's
   inner HTML to its own render function below.
   ---------------------------------------------------------- */
function handleGridHover(e) {
  if (!editMode || draggedType || resizingWidget) {
    hideAddTile();
    return;
  }
  const { col, row } = getGridCell(e);
  
  if (row > 8) {
    hideAddTile();
    return;
  }

  const isOccupied = dashLayout.some(w => {
    return col >= w.x && col < w.x + w.w && row >= w.y && row < w.y + w.h;
  });

  const addTile = document.querySelector('.widget-add-tile');
  if (!addTile) return;

  if (isOccupied) {
    addTile.style.opacity = '0';
    addTile.style.pointerEvents = 'none';
  } else {
    addTile.style.gridColumn = `${col} / span 1`;
    addTile.style.gridRow = `${row} / span 1`;
    addTile.style.opacity = '1';
    addTile.style.pointerEvents = 'auto';
  }
}

function hideAddTile() {
  const addTile = document.querySelector('.widget-add-tile');
  if (addTile) {
    addTile.style.opacity = '0';
    addTile.style.pointerEvents = 'none';
  }
}

function renderWidgetGrid() {
  const grid = document.getElementById('widget-grid');
  const cols = currentCols();
  grid.classList.toggle('edit-mode', editMode);

  grid.onmousemove = editMode ? handleGridHover : null;
  grid.onmouseleave = editMode ? hideAddTile : null;

  let html = dashLayout.map((item, idx) => {
    const w = Math.min(item.w, cols);
    const h = item.h;
    // Constrain X so widgets don't overflow the viewport width
    const x = Math.min(item.x || 1, cols - w + 1);
    const y = item.y || 1;

    const dnd = editMode
      ? `draggable="true"
         ondragstart="handleWidgetDragStart(event,'${item.type}')"
         ondragend="handleWidgetDragEnd(event)"`
      : '';

    return `
      <div class="widget-wrap" data-type="${item.type}" style="grid-column: ${x} / span ${w}; grid-row: ${y} / span ${h};" ${dnd}>
        <div class="widget-inner glass rounded-2xl p-5 relative overflow-hidden animate-stagger-in ${editMode ? 'pointer-events-none' : ''}" style="animation-delay:${idx * 40}ms">
          ${renderWidgetContent(item.type, w, h)}
        </div>
        ${editMode ? `
          <button class="widget-remove-btn" onclick="removeWidget('${item.type}')" title="${(I18N[localStorage.getItem('kir_lang') || 'id'] || {}).dash_remove_widget || 'Hapus widget'}" aria-label="${(I18N[localStorage.getItem('kir_lang') || 'id'] || {}).dash_remove_widget || 'Hapus widget'}">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div class="resize-handle resize-n" onpointerdown="startResize(event, '${item.type}', 'n')"></div>
          <div class="resize-handle resize-s" onpointerdown="startResize(event, '${item.type}', 's')"></div>
          <div class="resize-handle resize-w" onpointerdown="startResize(event, '${item.type}', 'w')"></div>
          <div class="resize-handle resize-e" onpointerdown="startResize(event, '${item.type}', 'e')"></div>
          <div class="resize-handle resize-nw" onpointerdown="startResize(event, '${item.type}', 'nw')"></div>
          <div class="resize-handle resize-ne" onpointerdown="startResize(event, '${item.type}', 'ne')"></div>
          <div class="resize-handle resize-sw" onpointerdown="startResize(event, '${item.type}', 'sw')"></div>
          <div class="resize-handle resize-se" onpointerdown="startResize(event, '${item.type}', 'se')"></div>
        ` : ''}
      </div>`;
  }).join('');

  if (editMode) {
    const maxRow = dashLayout.reduce((max, w) => Math.max(max, w.y + w.h), 1);
    if (maxRow <= 8) {
      html += `
        <!-- Invisible spacer to guarantee an empty drop/hover row at the bottom -->
        <div style="grid-column: 1; grid-row: ${maxRow}; height: 100%; pointer-events: none;"></div>
        
        <!-- Dynamic hover 1x1 tile -->
        <div class="widget-add-tile opacity-0 transition-opacity duration-150" style="grid-column: 1 / span 1; grid-row: 1 / span 1; pointer-events: none; backdrop-filter: blur(8px);" onclick="openAddWidgetModal()">
          <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
        </div>`;
    }
  }

  grid.innerHTML = html;
  requestAnimationFrame(updateCellSize);
  initAllWidgetBehaviors();
  kirApplyTranslations();
}

function renderWidgetContent(type, w, h) {
  switch (type) {
    case 'tasks': return renderTasksWidget(w, h);
    case 'events': return renderEventsWidget(w, h);
    case 'deltas': return renderDeltasWidget(w, h);
    case 'streak': return renderStreakWidget(w, h);
    case 'activity': return renderActivityWidget(w, h);
    case 'clock': return renderClockWidget(w, h);
    case 'leaderboard': return renderLeaderboardWidget(w, h);
    case 'quicklinks': return renderQuicklinksWidget(w, h);
    case 'notes': return renderNotesWidget(w, h);
    case 'profile': return renderProfileWidget(w, h);
    case 'quote': return renderQuoteWidget(w, h);
    case 'heatmap': return renderHeatmapWidget(w, h);
    case 'roster': return renderRosterWidget(w, h);
    default: return '';
  }
}

function changeNoteFontSize() {
  let size = parseInt(document.queryCommandValue('fontSize')) || 3;
  size = size >= 6 ? 3 : size + 1;
  document.execCommand('fontSize', false, size);
}

function saveDashboardNote(content) {
  localStorage.setItem('kir_dashboard_note', content);
  if (window.supabaseClient) {
    supabaseClient.auth.getUser().then(({ data: userData }) => {
      if (userData?.user) {
        supabaseClient.from('profiles').update({ dashboard_note: content }).eq('id', userData.user.id).then();
      }
    });
  }
}

function renderNotesWidget(w, h) {
  const lang = localStorage.getItem('kir_lang') || 'id';
  const hasSavedNote = !!localStorage.getItem('kir_dashboard_note');
  const savedNote = hasSavedNote ? localStorage.getItem('kir_dashboard_note') : I18N[lang].dash_notes_placeholder;
  const compact = w === 1 || h === 1;
  return `
    <div class="relative h-full flex flex-col">
      <div class="flex items-center justify-between mb-2 shrink-0">
        <p class="text-zinc-400 ${w === 1 ? 'text-xs' : 'text-sm'} font-medium" data-i18n="dash_notes_title">Catatan</p>
        ${!compact ? `
        <div class="flex items-center gap-1 bg-black/20 p-1 rounded-lg border border-white/5 pointer-events-auto">
          <button onclick="changeNoteFontSize()" class="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-zinc-300 transition" title="Ubah Ukuran Teks">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7V4h16v3M9 20h6M12 4v16" /></svg>
          </button>
          <button onclick="document.execCommand('bold', false, null)" class="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-zinc-300 transition" title="Bold">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5h6.5c2.5 0 4.5 1.5 4.5 3.5S17 12 14.5 12H8V5zm0 9h7.5c2.5 0 4.5 1.5 4.5 3.5S18 21 15.5 21H8v-7z" stroke="currentColor" stroke-width="2" fill="none"/></svg>
          </button>
          <button onclick="document.execCommand('italic', false, null)" class="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-zinc-300 transition" title="Italic">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M10 5h10M4 19h10M15 5L9 19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
          <button onclick="document.execCommand('underline', false, null)" class="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-zinc-300 transition" title="Underline">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21a6 6 0 01-6-6V3h2v12a4 4 0 008 0V3h2v12a6 6 0 01-6 6z" stroke="currentColor" stroke-width="1.5"/></svg>
          </button>
          <div class="relative w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-zinc-300 transition cursor-pointer" title="Warna Teks">
            <input type="color" class="opacity-0 absolute inset-0 w-full h-full cursor-pointer" onchange="document.execCommand('foreColor', false, this.value)">
            <svg class="w-3.5 h-3.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
          </div>
        </div>` : ''}
      </div>
      <div class="flex-1 w-full bg-black/10 border border-white/10 rounded-xl p-3 text-sm text-zinc-200 overflow-y-auto focus:outline-none focus:border-accent-300/50 transition pointer-events-auto" contenteditable="true" onblur="saveDashboardNote(this.innerHTML)">
        ${savedNote}
      </div>
    </div>`;
}

function initAllWidgetBehaviors() {
  if (clockIntervalId) { clearInterval(clockIntervalId); clockIntervalId = null; }
  const types = new Set(dashLayout.map(w => w.type));
  if (types.has('deltas')) renderDeltasData();
  if (types.has('streak')) renderStreakData();
  if (types.has('clock')) { updateClock(); clockIntervalId = setInterval(updateClock, 1000); }
}

/* ----------------------------------------------------------
   Widget: Profil Pengguna (hero / ID card)
   --------------------------------------------------------
   1x1  — avatar-only tile
   2x1  — avatar + name + cabang badge (default, row)
   1x2  — avatar-first vertical card
   2x2  — vertical card with a secondary stat line
   3x1  — row + deltas number appended
   4x1  — hero strip: avatar, name, cabang, deltas, streak
   4x2  — split layout: identity on the left, stat grid on the right
   ---------------------------------------------------------- */
function profileAvatarHtml(sizeCls) {
  const avatar = kirCurrentUserAvatar();
  const initial = kirCurrentUserName().charAt(0).toUpperCase();
  if (avatar) {
    return `<div class="${sizeCls} rounded-full shrink-0 bg-cover bg-center border border-white/10" style="background-image:url('${avatar}')"></div>`;
  }
  return `<div class="${sizeCls} rounded-full shrink-0 bg-accent-gradient flex items-center justify-center font-display font-semibold shadow-glow-sm">${initial}</div>`;
}
function profileCabangBadge() {
  const label = kirCabangLabel(kirCurrentUserCabang());
  return `<span class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent-15 text-accent-300 border border-accent-30">${label}</span>`;
}
function renderProfileWidget(w, h) {
  const name = kirCurrentUserName();

  if (w === 1 && h === 1) {
    return `
      <div class="relative h-full flex items-center justify-center">
        ${profileAvatarHtml('w-10 h-10 text-sm')}
      </div>`;
  }

  if (w >= 1 && h >= 2 && w <= 2) {
    // Vertical card — 1x2 or 2x2
    return `
      <div class="glow-blob w-28 h-28 bg-accent-20 -top-8 -right-8"></div>
      <div class="relative h-full flex flex-col items-center justify-center text-center gap-2 cursor-pointer" onclick="toggleSettingsModal()">
        ${profileAvatarHtml('w-12 h-12 text-base')}
        <p class="font-display font-semibold text-sm truncate max-w-full">${name}</p>
        ${profileCabangBadge()}
        ${h >= 2 && w === 2 ? `<p class="text-zinc-500 text-[11px] mt-1">${kirDeltasTotal().toLocaleString('id-ID')} <span data-i18n="deltas_points">deltas</span></p>` : ''}
      </div>`;
  }

  if (w === 4 && h >= 2) {
    // Split layout: identity left, stat grid right
    return `
      <div class="glow-blob w-40 h-40 bg-accent-20 -top-10 -right-10"></div>
      <div class="relative h-full flex items-center gap-5 cursor-pointer" onclick="toggleSettingsModal()">
        <div class="flex flex-col items-center text-center gap-2 shrink-0">
          ${profileAvatarHtml('w-14 h-14 text-lg')}
          <p class="font-display font-semibold text-sm truncate max-w-[7rem]">${name}</p>
          ${profileCabangBadge()}
        </div>
        <div class="w-px self-stretch bg-white/10 shrink-0"></div>
        <div class="grid grid-cols-3 gap-3 flex-1 min-w-0">
          <div class="min-w-0">
            <p class="font-display text-xl font-semibold leading-none truncate">${kirDeltasTotal().toLocaleString('id-ID')}</p>
            <p class="text-zinc-500 text-[11px] mt-1" data-i18n="deltas_points">deltas</p>
          </div>
          <div class="min-w-0">
            <p class="font-display text-xl font-semibold leading-none">${STREAK_DAYS}</p>
            <p class="text-zinc-500 text-[11px] mt-1" data-i18n="streak_days">hari beruntun</p>
          </div>
          <div class="min-w-0">
            <p class="font-display text-xl font-semibold leading-none text-accent-300">#${dashLeaderboardRoster().findIndex(m => m.isYou) + 1}</p>
            <p class="text-zinc-500 text-[11px] mt-1" data-i18n="leaderboard_your_rank">Peringkat kamu</p>
          </div>
        </div>
      </div>`;
  }

  if (w === 3 && h === 1) {
    return `
      <div class="glow-blob w-32 h-32 bg-accent-20 -top-10 -right-10"></div>
      <div class="relative h-full flex items-center justify-between gap-3 cursor-pointer" onclick="toggleSettingsModal()">
        <div class="flex items-center gap-3 min-w-0">
          ${profileAvatarHtml('w-9 h-9 text-sm')}
          <div class="min-w-0">
            <p class="font-medium text-sm truncate">${name}</p>
            ${profileCabangBadge()}
          </div>
        </div>
        <div class="text-right shrink-0">
          <p class="font-display text-lg font-semibold leading-none">${kirDeltasTotal().toLocaleString('id-ID')}</p>
          <p class="text-zinc-500 text-[10px] mt-0.5" data-i18n="deltas_points">deltas</p>
        </div>
      </div>`;
  }

  if (h === 1) {
    // 2x1 default and 4x1 hero strip
    const wide = w >= 4;
    return `
      <div class="glow-blob w-32 h-32 bg-accent-20 -top-10 -right-10"></div>
      <div class="relative h-full flex items-center justify-between gap-3 cursor-pointer" onclick="toggleSettingsModal()">
        <div class="flex items-center gap-3 min-w-0">
          ${profileAvatarHtml('w-9 h-9 text-sm')}
          <div class="min-w-0">
            <p class="font-medium text-sm truncate">${name}</p>
            ${profileCabangBadge()}
          </div>
        </div>
        ${wide ? `
        <div class="flex items-center gap-4 shrink-0">
          <div class="text-right">
            <p class="font-display text-base font-semibold leading-none">${kirDeltasTotal().toLocaleString('id-ID')}</p>
            <p class="text-zinc-500 text-[10px] mt-0.5" data-i18n="deltas_points">deltas</p>
          </div>
          <div class="flex items-center gap-1.5 text-accent-300">
            ${streakFlameSvg('w-5 h-5')}
            <span class="font-display text-sm font-semibold">${STREAK_DAYS}</span>
          </div>
        </div>` : ''}
      </div>`;
  }

  // Fallback (shouldn't normally hit)
  return `
    <div class="relative h-full flex flex-col items-center justify-center text-center gap-2">
      ${profileAvatarHtml('w-12 h-12 text-base')}
      <p class="font-display font-semibold text-sm">${name}</p>
      ${profileCabangBadge()}
    </div>`;
}

/* ----------------------------------------------------------
   Widget: Kutipan Harian (accent quote section)
   --------------------------------------------------------
   2x1 — icon + one-line truncated quote
   3x1/4x1 — full one-line quote + author
   2x2 — quote glyph, 2-3 line quote, author
   4x2 — large quote + refresh action
   ---------------------------------------------------------- */
function quoteGlyphSvg(cls) {
  return `<svg class="${cls} text-accent-300/70 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M7.17 6C4.87 6 3 7.87 3 10.17c0 2.06 1.5 3.75 3.46 4.08L5.3 18h2.4l1.36-4.66c.14-.5.24-1.03.24-1.58V10.5C9.3 8.02 8.36 6 7.17 6zm9.66 0c-2.3 0-4.17 1.87-4.17 4.17 0 2.06 1.5 3.75 3.46 4.08L14.96 18h2.4l1.36-4.66c.14-.5.24-1.03.24-1.58V10.5c0-2.48-.94-4.5-2.13-4.5z"/></svg>`;
}
function refreshDashQuote() {
  quoteIndex = (quoteIndex + 1) % DASH_QUOTES.length;
  const el = document.querySelector('.widget-wrap[data-type="quote"] .widget-inner');
  if (!el) return;
  const item = dashLayout.find(w => w.type === 'quote');
  el.classList.remove('fade-resize');
  void el.offsetWidth;
  el.innerHTML = renderQuoteWidget(item.w, item.h);
  el.classList.add('fade-resize');
}
function renderQuoteWidget(w, h) {
  const q = DASH_QUOTES[quoteIndex];
  const lang = localStorage.getItem('kir_lang') || 'id';

  if (w === 1 && h === 1) {
    return `
      <div class="relative h-full flex flex-col items-center justify-center text-center gap-2">
        ${quoteGlyphSvg('w-6 h-6')}
        <p class="text-zinc-300 text-[10px] line-clamp-3">${q.text}</p>
      </div>`;
  }

  if (h === 1 && w === 2) {
    return `
      <div class="relative h-full flex items-center gap-3">
        ${quoteGlyphSvg('w-5 h-5')}
        <p class="text-zinc-300 text-xs truncate flex-1 min-w-0">${q.text}</p>
      </div>`;
  }

  if (h === 1) {
    return `
      <div class="relative h-full flex items-center gap-3">
        ${quoteGlyphSvg('w-5 h-5')}
        <p class="text-zinc-300 text-sm truncate flex-1 min-w-0">${q.text}</p>
        <span class="text-zinc-500 text-xs shrink-0">${I18N[lang].quote_by} ${q.author}</span>
      </div>`;
  }

  const big = w >= 4;
  return `
    <div class="glow-blob w-32 h-32 bg-accent-20 -bottom-10 -right-10"></div>
    <div class="relative h-full flex flex-col ${big ? 'justify-center' : ''}">
      ${quoteGlyphSvg(big ? 'w-8 h-8 mb-3' : 'w-6 h-6 mb-2')}
      <p class="${big ? 'text-lg' : 'text-sm'} text-zinc-200 leading-relaxed flex-1">${q.text}</p>
      <div class="flex items-center justify-between mt-3 shrink-0">
        <span class="text-zinc-500 text-xs">${I18N[lang].quote_by} ${q.author}</span>
        ${big ? `
        <button onclick="refreshDashQuote()" class="pointer-events-auto flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition text-zinc-300">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          ${I18N[lang].quote_refresh}
        </button>` : ''}
      </div>
    </div>`;
}

/* ----------------------------------------------------------
   Widget: Tugas Aktif
   --------------------------------------------------------
   1x1 — count only
   1x2 — vertical stat + mini progress bar
   w>=2,h=1 — row (count + due-this-week)
   2x2 — count + breakdown text (default)
   w>=3,h=2 — stat + mini 2-row task preview list
   w>=3,h>=3 — full scrollable task list with status badges
   ---------------------------------------------------------- */
function renderTasksWidget(w, h) {
  const lang = localStorage.getItem('kir_lang') || 'id';
  const statusLabel = (status) => (I18N[lang] && I18N[lang]['status_' + status]) || status;
  const icon = `<svg class="w-4 h-4 text-accent-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>`;

  if (DASH_TASKS_TOTAL === 0) {
    return `
      <div class="glow-blob w-32 h-32 bg-accent-20 -top-10 -right-10"></div>
      <div class="relative h-full flex flex-col items-center justify-center text-center px-2">
        <div class="w-8 h-8 rounded-lg bg-accent-15 border border-accent-30 flex items-center justify-center mb-2">${icon}</div>
        <p class="font-display font-semibold text-sm" data-i18n="empty_dash_tasks_title">Bebas tugas!</p>
        ${h >= 2 ? '<p class="text-zinc-500 text-[10px] mt-1" data-i18n="empty_dash_tasks_desc">Semua tugas sudah selesai atau belum ada tugas baru.</p>' : ''}
      </div>`;
  }

  if (w === 1 && h === 1) {
    return `
      <div class="glow-blob w-24 h-24 bg-accent-20 -top-6 -right-6"></div>
      <div class="relative h-full flex flex-col justify-between">
        <div class="w-7 h-7 rounded-lg bg-accent-15 border border-accent-30 flex items-center justify-center">${icon}</div>
        <div>
          <p class="font-display text-2xl font-semibold leading-none">${DASH_TASKS_TOTAL}</p>
          <p class="text-zinc-500 text-[11px] mt-1" data-i18n="active_tasks">Tugas Aktif</p>
        </div>
      </div>`;
  }

  if (w === 1 && h >= 2) {
    return `
      <div class="glow-blob w-24 h-24 bg-accent-20 -top-6 -right-6"></div>
      <div class="relative h-full flex flex-col items-center justify-center text-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-accent-15 border border-accent-30 flex items-center justify-center">${icon}</div>
        <p class="font-display text-3xl font-semibold leading-none">${DASH_TASKS_TOTAL}</p>
        <p class="text-zinc-500 text-[10px]" data-i18n="active_tasks">Tugas Aktif</p>
        <div class="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
          <div class="h-full bg-accent-gradient" style="width:66%"></div>
        </div>
      </div>`;
  }

  if (h === 1) {
    const showList = w >= 3;
    return `
      <div class="glow-blob w-32 h-32 bg-accent-20 -top-10 -right-10"></div>
      <div class="relative h-full flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0 shrink-0">
          <div class="w-9 h-9 shrink-0 rounded-lg bg-accent-15 border border-accent-30 flex items-center justify-center">${icon}</div>
          <div class="min-w-0">
            <p class="text-zinc-400 text-xs font-medium truncate" data-i18n="active_tasks">Tugas Aktif</p>
            <p class="text-zinc-500 text-[11px] truncate">${DASH_TASKS_DUE_WEEK} <span data-i18n="due_this_week">jatuh tempo minggu ini</span></p>
          </div>
        </div>
        ${showList ? `
        <div class="flex-1 px-4 hidden sm:flex items-center gap-4 border-l border-white/10 ml-2 min-w-0">
          ${DASH_TASKS_PREVIEW.slice(0, 2).map(t => `
            <div class="flex-1 min-w-0">
              <p class="text-zinc-200 text-xs font-medium truncate">${t.title}</p>
              <p class="text-[10px] text-zinc-500 truncate mt-0.5">${t.due} &middot; <span class="${TASK_STATUS_CLS[t.status].split(' ')[1]}">${statusLabel(t.status)}</span></p>
            </div>`).join('')}
        </div>` : ''}
        <p class="font-display text-3xl font-semibold shrink-0">${DASH_TASKS_TOTAL}</p>
      </div>`;
  }

  if (w >= 3 && h === 2) {
    return `
      <div class="glow-blob w-40 h-40 bg-accent-20 -top-10 -right-10"></div>
      <div class="relative h-full flex flex-col">
        <div class="flex items-center justify-between mb-2 shrink-0">
          <p class="text-zinc-400 text-sm font-medium" data-i18n="active_tasks">Tugas Aktif</p>
          <div class="w-8 h-8 rounded-lg bg-accent-15 border border-accent-30 flex items-center justify-center">${icon}</div>
        </div>
        <div class="flex items-end gap-2 mb-3 shrink-0">
          <p class="font-display text-3xl font-semibold leading-none">${DASH_TASKS_TOTAL}</p>
          <p class="text-zinc-500 text-xs mb-0.5">${DASH_TASKS_DUE_WEEK} <span data-i18n="due_this_week">jatuh tempo minggu ini</span></p>
        </div>
        <ul class="space-y-1.5 mt-auto min-h-0 overflow-hidden">
          ${DASH_TASKS_PREVIEW.slice(0, 2).map(t => `
            <li class="flex items-center justify-between gap-2 text-xs">
              <span class="text-zinc-300 truncate min-w-0">${t.title}</span>
              <span class="shrink-0 text-[10px] px-2 py-0.5 rounded-full ${TASK_STATUS_CLS[t.status]}">${t.due}</span>
            </li>`).join('')}
        </ul>
      </div>`;
  }

  if (h >= 3) {
    return `
      <div class="relative h-full flex flex-col">
        <div class="flex items-center justify-between mb-3 shrink-0">
          <p class="text-zinc-400 text-sm font-medium" data-i18n="active_tasks">Tugas Aktif</p>
          <div class="w-8 h-8 rounded-lg bg-accent-15 border border-accent-30 flex items-center justify-center">${icon}</div>
        </div>
        <ul class="space-y-2 flex-1 min-h-0 overflow-y-auto pointer-events-auto">
          ${DASH_TASKS_PREVIEW.map(t => `
            <li onclick="location.href='tasks.html'" class="flex items-center justify-between gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs cursor-pointer hover:bg-white/10 transition">
              <span class="text-zinc-200 truncate min-w-0">${t.title}</span>
              <span class="shrink-0 text-[10px] px-2 py-0.5 rounded-full ${TASK_STATUS_CLS[t.status]}">${t.due}</span>
            </li>`).join('')}
        </ul>
      </div>`;
  }

  return `
    <div class="glow-blob w-40 h-40 bg-accent-20 -top-10 -right-10"></div>
    <div class="relative h-full flex flex-col">
      <div class="flex items-center justify-between mb-4">
        <p class="text-zinc-400 text-sm font-medium" data-i18n="active_tasks">Tugas Aktif</p>
        <div class="w-8 h-8 rounded-lg bg-accent-15 border border-accent-30 flex items-center justify-center">${icon}</div>
      </div>
      <p class="font-display text-4xl font-semibold">${DASH_TASKS_TOTAL}</p>
      <p class="text-zinc-500 text-xs mt-2">${DASH_TASKS_DUE_WEEK} <span data-i18n="due_this_week">minggu ini</span> ${DASH_TASKS_LATE > 0 ? `&middot; <span class="text-accent-300">${DASH_TASKS_LATE} <span data-i18n="late">terlambat</span></span>` : ''}</p>
    </div>`;
}

/* ----------------------------------------------------------
   Widget: Acara Mendatang
   --------------------------------------------------------
   1x1 — count only
   1x2 — vertical "next event" countdown card
   w>=2,h=1 — row (count + next event title)
   2x2 — count + next event name (default)
   w>=3,h=2 — mini two-stop timeline strip
   w>=3,h>=3 — full vertical timeline (dots + line)
   ---------------------------------------------------------- */
function renderEventsWidget(w, h) {
  const lang = localStorage.getItem('kir_lang') || 'id';
  const icon = `<svg class="w-4 h-4 text-accent-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>`;

  if (DASH_EVENTS_TOTAL === 0) {
    return `
      <div class="glow-blob w-32 h-32 bg-accent-20 -bottom-10 -left-10"></div>
      <div class="relative h-full flex flex-col items-center justify-center text-center px-2">
        <div class="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-2 text-zinc-500">${icon}</div>
        <p class="text-zinc-300 text-xs font-medium" data-i18n="empty_dash_events_title">Belum ada acara</p>
        ${h >= 2 ? '<p class="text-zinc-500 text-[10px] mt-1" data-i18n="empty_dash_events_desc">Harap sabar, pengurus akan segera mengatur jadwal baru.</p>' : ''}
      </div>`;
  }

  const next = DASH_EVENTS_PREVIEW[0] || {};

  if (w === 1 && h === 1) {
    return `
      <div class="glow-blob w-24 h-24 bg-accent-20 -bottom-6 -left-6"></div>
      <div class="relative h-full flex flex-col justify-between">
        <div class="w-7 h-7 rounded-lg bg-accent-15 border border-accent-30 flex items-center justify-center">${icon}</div>
        <div>
          <p class="font-display text-2xl font-semibold leading-none">${DASH_EVENTS_TOTAL}</p>
          <p class="text-zinc-500 text-[11px] mt-1" data-i18n="upcoming_events">Acara Mendatang</p>
        </div>
      </div>`;
  }

  if (w === 1 && h >= 2) {
    return `
      <div class="glow-blob w-24 h-24 bg-accent-20 -bottom-6 -left-6"></div>
      <div class="relative h-full flex flex-col items-center justify-center text-center gap-1.5">
        <div class="w-8 h-8 rounded-lg bg-accent-15 border border-accent-30 flex items-center justify-center">${icon}</div>
        <p class="font-display text-lg font-semibold leading-tight">${(next.dateLabel || '').split(', ')[1] || next.dateLabel || I18N[lang].events_soon}</p>
        <p class="text-zinc-500 text-[10px] truncate max-w-full px-1">${next.title || I18N[lang].events_new_default}</p>
      </div>`;
  }

  if (h === 1) {
    const showNext = w >= 3;
    return `
      <div class="glow-blob w-32 h-32 bg-accent-20 -bottom-10 -left-10"></div>
      <div class="relative h-full flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0 shrink-0">
          <div class="w-9 h-9 shrink-0 rounded-lg bg-accent-15 border border-accent-30 flex items-center justify-center">${icon}</div>
          <div class="min-w-0">
            <p class="text-zinc-400 text-xs font-medium truncate" data-i18n="upcoming_events">Acara Mendatang</p>
            <p class="font-display text-2xl font-semibold mt-0.5">${DASH_EVENTS_TOTAL}</p>
          </div>
        </div>
        ${showNext ? `
        <div class="flex-1 px-4 hidden sm:block border-l border-white/10 ml-2 min-w-0">
          <p class="text-[10px] text-accent-300 uppercase tracking-wide mb-0.5" data-i18n="up_next">Selanjutnya</p>
          <p class="text-zinc-200 text-xs font-medium truncate">${next.title || '-'}</p>
          <p class="text-zinc-500 text-[11px] truncate mt-0.5">${next.dateLabel || ''} &middot; ${next.time || ''}</p>
        </div>` : `
        <div class="text-right min-w-0">
          <p class="text-[10px] text-zinc-500 uppercase tracking-wide mb-0.5" data-i18n="up_next">Selanjutnya</p>
          <p class="text-zinc-300 text-xs font-medium truncate max-w-[120px]">${next.title || '-'}</p>
        </div>
        `}
      </div>`;
  }

  if (w >= 3 && h === 2) {
    return `
      <div class="glow-blob w-40 h-40 bg-accent-20 -bottom-10 -left-10"></div>
      <div class="relative h-full flex flex-col">
        <div class="flex items-center justify-between mb-3 shrink-0">
          <p class="text-zinc-400 text-sm font-medium" data-i18n="upcoming_events">Acara Mendatang</p>
          <div class="w-8 h-8 rounded-lg bg-accent-15 border border-accent-30 flex items-center justify-center">${icon}</div>
        </div>
        <div class="flex items-stretch gap-0 flex-1 min-h-0">
          ${DASH_EVENTS_PREVIEW.slice(0, 2).map((ev, i) => `
            <div class="flex-1 min-w-0 relative pl-4 ${i > 0 ? 'ml-4 border-l border-dashed border-white/10' : ''}">
              <span class="absolute left-[-4.5px] top-1 w-2 h-2 rounded-full ${ev.isNext ? 'bg-accent' : 'bg-zinc-600'}"></span>
              <p class="text-[10px] uppercase tracking-wide ${ev.isNext ? 'text-accent-300' : 'text-zinc-500'}">${ev.dateLabel}</p>
              <p class="text-zinc-200 text-xs font-medium truncate mt-0.5">${ev.title}</p>
            </div>`).join('')}
        </div>
      </div>`;
  }

  if (h >= 3) {
    return `
      <div class="relative h-full flex flex-col">
        <div class="flex items-center justify-between mb-3 shrink-0">
          <p class="text-zinc-400 text-sm font-medium" data-i18n="upcoming_events">Acara Mendatang</p>
          <div class="w-8 h-8 rounded-lg bg-accent-15 border border-accent-30 flex items-center justify-center">${icon}</div>
        </div>
        <div class="relative pl-5 flex-1 min-h-0 overflow-y-auto">
          <div class="absolute top-1 bottom-1 left-[7px] w-px bg-white/10"></div>
          <div class="space-y-3">
            ${DASH_EVENTS_PREVIEW.map(ev => `
              <div onclick="location.href='schedule.html'" class="relative cursor-pointer">
                <span class="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full ${ev.isNext ? 'bg-accent' : 'bg-zinc-600 border-2 border-[var(--bg-color)]'}"></span>
                <p class="text-[10px] uppercase tracking-wide ${ev.isNext ? 'text-accent-300' : 'text-zinc-500'}">${ev.dateLabel} &middot; ${ev.time}</p>
                <p class="text-zinc-200 text-sm font-medium truncate">${ev.title}</p>
              </div>`).join('')}
          </div>
        </div>
      </div>`;
  }

  return `
    <div class="glow-blob w-40 h-40 bg-accent-20 -bottom-10 -left-10"></div>
    <div class="relative h-full flex flex-col">
      <div class="flex items-center justify-between mb-4">
        <p class="text-zinc-400 text-sm font-medium" data-i18n="upcoming_events">Acara Mendatang</p>
        <div class="w-8 h-8 rounded-lg bg-accent-15 border border-accent-30 flex items-center justify-center">${icon}</div>
      </div>
      <p class="font-display text-4xl font-semibold">${DASH_EVENTS_TOTAL}</p>
      <p class="text-zinc-500 text-xs mt-2"><span data-i18n="up_next">Selanjutnya:</span> <span class="text-zinc-300">${next.title || '-'}</span></p>
    </div>`;
}

/* ----------------------------------------------------------
   Widget: Deltas chart
   --------------------------------------------------------
   2x1 — number + gain badge, no chart
   1x2 — vertical stat + tiny 5-bar chart
   2x2 — number + compact sparkline, no toggle
   w>=3 — full sparkline with week/lifetime toggle
   h>=3 — chart + secondary stat row (avg/day, best day)
   ---------------------------------------------------------- */
function renderDeltasWidget(w, h) {
  const showToggle = w >= 3;

  if (w === 1 && h === 1) {
    return `
      <div class="glow-blob w-20 h-20 bg-accent-20 -top-6 -right-6"></div>
      <div class="relative h-full flex flex-col items-center justify-center text-center gap-1">
        <p class="text-zinc-400 text-[10px] font-medium uppercase tracking-wide" data-i18n="deltas_label">Deltas</p>
        <p class="font-display text-2xl font-semibold leading-none" id="deltas-total">1.240</p>
        <p class="text-zinc-500 text-[10px] font-medium cursor-help" title="Minggu ini" id="deltas-gain-container">+<span id="deltas-gain">128</span></p>
      </div>`;
  }

  if (h === 1) {
    const showChart = w >= 3;
    return `
      <div class="glow-blob w-32 h-32 bg-accent-20 -top-10 -right-10"></div>
      <div class="relative h-full flex items-center justify-between gap-3">
        <div class="flex flex-col justify-center min-w-0 shrink-0">
          <p class="text-zinc-400 text-xs font-medium truncate" data-i18n="deltas_label">Deltas</p>
          <p class="font-display text-2xl font-semibold leading-none mt-1" id="deltas-total">1.240</p>
          <p class="text-zinc-500 text-[10px] font-medium cursor-help mt-1" title="Minggu ini" id="deltas-gain-container">+<span id="deltas-gain">128</span></p>
        </div>
        ${showChart ? `<div class="flex-1 h-full py-2 min-w-0"><svg id="deltas-sparkline" viewBox="0 0 280 60" class="w-full h-full" preserveAspectRatio="none"></svg></div>` : ''}
      </div>`;
  }

  if (w === 1 && h >= 2) {
    return `
      <div class="glow-blob w-24 h-24 bg-accent-20 -top-8 -right-8"></div>
      <div class="relative h-full flex flex-col justify-between">
        <p class="text-zinc-400 text-[11px] font-medium" data-i18n="deltas_label">Deltas</p>
        <div>
          <p class="font-display text-2xl font-semibold leading-none" id="deltas-total">1.240</p>
          <div class="flex items-end gap-0.5 h-6 mt-2">
            ${DELTAS_HISTORY_WEEK.map(v => {
              const max = Math.max(...DELTAS_HISTORY_WEEK);
              const pct = Math.max(8, Math.round((v / max) * 100));
              return `<span class="flex-1 rounded-sm bg-accent-gradient opacity-70" style="height:${pct}%"></span>`;
            }).join('')}
          </div>
        </div>
      </div>`;
  }

  if (w === 2 && h === 2) {
    return `
      <div class="glow-blob w-32 h-32 bg-accent-20 -top-10 -right-10"></div>
      <div class="relative h-full flex flex-col">
        <p class="text-zinc-400 text-sm font-medium mb-1" data-i18n="deltas_label">Deltas</p>
        <div class="flex items-end gap-2 mb-1">
          <p class="font-display text-2xl font-semibold leading-none" id="deltas-total">1.240</p>
          <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-accent-15 text-accent-300 border border-accent-30 mb-0.5">+<span id="deltas-gain">128</span></span>
        </div>
        <svg id="deltas-sparkline" viewBox="0 0 280 60" class="w-full flex-1 min-h-0" preserveAspectRatio="none"></svg>
      </div>`;
  }

  return `
    <div class="glow-blob w-48 h-48 bg-accent-20 -top-16 -right-16"></div>
    <div class="relative h-full flex flex-col">
      <div class="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <p class="text-zinc-400 text-sm font-medium" data-i18n="deltas_label">Deltas</p>
        ${showToggle ? `
        <div class="flex items-center gap-0.5 bg-white/5 border border-white/10 rounded-lg p-0.5 text-[11px]">
          <button id="deltas-toggle-week" onclick="setDeltasRange('week')" class="px-2.5 py-1 rounded-md font-medium transition" data-i18n="deltas_range_week">Minggu ini</button>
          <button id="deltas-toggle-lifetime" onclick="setDeltasRange('lifetime')" class="px-2.5 py-1 rounded-md font-medium transition" data-i18n="deltas_range_lifetime">Sepanjang waktu</button>
        </div>` : ''}
      </div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-1">
        <div class="flex items-end gap-2">
          <p class="font-display text-3xl sm:text-4xl font-semibold" id="deltas-total">1.240</p>
          <span class="text-zinc-500 text-xs mb-1.5" data-i18n="deltas_points">deltas</span>
        </div>
        <span class="text-xs font-medium px-2.5 py-1 rounded-full bg-accent-15 text-accent-300 border border-accent-30">
          +<span id="deltas-gain">128</span> <span id="deltas-gain-label" data-i18n="this_week">minggu ini</span>
        </span>
      </div>
      <svg id="deltas-sparkline" viewBox="0 0 280 60" class="w-full flex-1 min-h-0" preserveAspectRatio="none"></svg>
      ${h >= 2 ? `<div id="deltas-date-labels" class="flex justify-between text-[10px] text-zinc-600 mt-1 px-0.5"></div>` : ''}
      ${h >= 3 ? `
      <div class="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-white/10 shrink-0">
        <div>
          <p class="font-display text-lg font-semibold leading-none">${Math.round((currentDeltasHistory()[currentDeltasHistory().length - 1] - currentDeltasHistory()[0]) / currentDeltasHistory().length)}</p>
          <p class="text-zinc-500 text-[11px] mt-1" data-i18n="dash_avg_per_day">rata-rata / hari</p>
        </div>
        <div>
          <p class="font-display text-lg font-semibold leading-none">${Math.max(...currentDeltasHistory())}</p>
          <p class="text-zinc-500 text-[11px] mt-1" data-i18n="dash_highest_point">titik tertinggi</p>
        </div>
      </div>` : ''}
    </div>`;
}

function currentDeltasHistory() {
  return deltasRange === 'week' ? DELTAS_HISTORY_WEEK : DELTAS_HISTORY_LIFETIME;
}
function setDeltasRange(range) {
  deltasRange = range;
  renderDeltasData();
}
function updateDeltasToggleUI() {
  const weekBtn = document.getElementById('deltas-toggle-week');
  const lifeBtn = document.getElementById('deltas-toggle-lifetime');
  if (!weekBtn || !lifeBtn) return;
  const activeCls = 'bg-accent-gradient text-white shadow-glow-sm';
  const inactiveCls = 'text-zinc-400 hover:text-white';
  weekBtn.className = 'px-2.5 py-1 rounded-md font-medium transition ' + (deltasRange === 'week' ? activeCls : inactiveCls);
  lifeBtn.className = 'px-2.5 py-1 rounded-md font-medium transition ' + (deltasRange === 'lifetime' ? activeCls : inactiveCls);
}
function deltasDateLabels(lang) {
  if (deltasRange === 'week') {
    const fmt = new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', { weekday: 'short', timeZone: 'Asia/Jakarta' });
    const labels = [];
    for (let i = 6; i >= 0; i--) labels.push(fmt.format(new Date(Date.now() - i * 86400000)));
    return labels;
  }
  const fmt = new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', { month: 'short', timeZone: 'Asia/Jakarta' });
  const labels = [];
  const now = new Date();
  const count = DELTAS_HISTORY_LIFETIME.length;
  for (let i = count - 1; i >= 0; i--) {
    labels.push(fmt.format(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }
  return labels;
}
function renderDeltasSparkline() {
  const svg = document.getElementById('deltas-sparkline');
  if (!svg) return;
  const w = 280, h = 60, pad = 4;
  const data = currentDeltasHistory();
  const max = Math.max(...data), min = Math.min(...data);
  const range = (max - min) || 1;
  const stepX = (w - pad * 2) / (data.length - 1);
  const points = data.map((v, i) => [
    pad + i * stepX,
    h - pad - ((v - min) / range) * (h - pad * 2)
  ]);
  const line = points.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const area = line + ` L${points[points.length - 1][0].toFixed(1)},${h} L${points[0][0].toFixed(1)},${h} Z`;

  const gridRows = 3;
  let gridlines = '';
  for (let i = 1; i < gridRows; i++) {
    const y = pad + ((h - pad * 2) / gridRows) * i;
    gridlines += `<line x1="${pad}" y1="${y.toFixed(1)}" x2="${w - pad}" y2="${y.toFixed(1)}" stroke="var(--glass-border)" stroke-width="1" stroke-opacity="0.5" />`;
  }
  for (let i = 0; i < data.length; i++) {
    const x = pad + i * stepX;
    gridlines += `<line x1="${x.toFixed(1)}" y1="${pad}" x2="${x.toFixed(1)}" y2="${h - pad}" stroke="var(--glass-border)" stroke-width="1" stroke-opacity="0.5" />`;
  }

  svg.innerHTML = `
    <defs>
      <linearGradient id="deltas-area-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" style="stop-color: rgb(var(--accent-rgb)); stop-opacity: 0.35" />
        <stop offset="100%" style="stop-color: rgb(var(--accent-rgb)); stop-opacity: 0" />
      </linearGradient>
    </defs>
    ${gridlines}
    <path d="${area}" fill="url(#deltas-area-grad)" stroke="none" />
    <path d="${line}" fill="none" stroke="rgb(var(--accent-rgb))" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  `;

  const lang = localStorage.getItem('kir_lang') || 'id';
  const labelsEl = document.getElementById('deltas-date-labels');
  if (labelsEl) labelsEl.innerHTML = deltasDateLabels(lang).map(d => `<span>${d}</span>`).join('');
}
function renderDeltasData() {
  const totalEl = document.getElementById('deltas-total');
  if (!totalEl) return;
  const lang = localStorage.getItem('kir_lang') || 'id';
  const data = currentDeltasHistory();
  const total = data[data.length - 1];
  const gain = total - data[0];

  totalEl.textContent = total.toLocaleString(lang === 'id' ? 'id-ID' : 'en-US');
  const gainEl = document.getElementById('deltas-gain');
  if (gainEl) gainEl.textContent = gain;
  const gainLabelEl = document.getElementById('deltas-gain-label');
  if (gainLabelEl) gainLabelEl.textContent = I18N[lang][deltasRange === 'week' ? 'this_week' : 'all_time'];
  const gainContainerEl = document.getElementById('deltas-gain-container');
  if (gainContainerEl) gainContainerEl.title = I18N[lang][deltasRange === 'week' ? 'this_week' : 'all_time'];

  updateDeltasToggleUI();
  renderDeltasSparkline();
}

/* ----------------------------------------------------------
   Widget: Streak
   --------------------------------------------------------
   1x1 — flame + count only
   2x1 — flame + count + label (default row)
   1x2 — vertical flame card (default)
   2x2 — vertical flame card, larger
   w>=3 — flame + count + 7-day mini calendar dot row
   ---------------------------------------------------------- */
function renderStreakWidget(w, h) {
  if (w >= 3) {
    return `
      <div class="glow-blob w-32 h-32 bg-accent-20 -bottom-10 -left-10"></div>
      <div class="relative h-full flex items-center gap-4">
        ${streakFlameSvg('w-10 h-10 shrink-0')}
        <div class="min-w-0 flex-1">
          <div class="flex items-baseline gap-2">
            <p class="font-display text-2xl font-semibold leading-none" id="streak-count">6</p>
            <p class="text-zinc-500 text-[11px]" data-i18n="streak_days">hari beruntun</p>
          </div>
          <div class="flex items-center gap-1.5 mt-2.5">
            ${STREAK_WEEK_PATTERN.map(active => `
              <span class="w-4 h-4 rounded-md ${active ? 'bg-accent-gradient' : 'bg-white/5 border border-white/10'}"></span>`).join('')}
          </div>
        </div>
      </div>`;
  }

  if (w === 2 && h === 1) {
    return `
      <div class="glow-blob w-28 h-28 bg-accent-20 -bottom-8 -left-8"></div>
      <div class="relative h-full flex items-center">
        <div class="flex items-center gap-3">
          ${streakFlameSvg('w-9 h-9')}
          <div>
            <p class="font-display text-2xl font-semibold leading-none" id="streak-count">6</p>
            <p class="text-zinc-500 text-[11px]" data-i18n="streak_days">hari beruntun</p>
          </div>
        </div>
      </div>`;
  }
  if (w === 1 && h === 1) {
    return `
      <div class="glow-blob w-24 h-24 bg-accent-20 -bottom-6 -left-6"></div>
      <div class="relative h-full flex flex-col items-center justify-center text-center gap-1">
        ${streakFlameSvg('w-8 h-8')}
        <p class="font-display text-lg font-semibold leading-none" id="streak-count">6</p>
      </div>`;
  }
  return `
    <div class="glow-blob w-32 h-32 bg-accent-20 -bottom-10 -left-10"></div>
    <div class="relative h-full flex flex-col items-center justify-center text-center">
      <p class="text-zinc-400 text-xs font-medium mb-2 uppercase tracking-wide" data-i18n="streak_label">Streak</p>
      ${streakFlameSvg('w-12 h-12 sm:w-14 sm:h-14')}
      <p class="font-display text-2xl font-semibold mt-2" id="streak-count">6</p>
      <p class="text-zinc-500 text-[11px]" data-i18n="streak_days">hari beruntun</p>
    </div>`;
}
function streakFlameSvg(sizeClass) {
  return `
    <svg id="streak-flame" viewBox="0 0 24 24" class="${sizeClass} shrink-0" style="filter: drop-shadow(0 0 10px rgba(var(--accent-rgb), 0.55));">
      <defs>
        <clipPath id="flame-clip"><path d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z"/></clipPath>
        <linearGradient id="flame-gradient" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" style="stop-color: rgb(var(--accent-2-rgb))" />
          <stop offset="100%" style="stop-color: rgb(var(--accent-light-rgb))" />
        </linearGradient>
      </defs>
      <path d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" fill="none" style="stroke: var(--glass-border);" stroke-width="0.75"/>
      <g clip-path="url(#flame-clip)"><g id="flame-fill-group" transform="translate(0, 21)" class="flame-fill-group">
        <path d="M 0,0 Q 3,-1.5 6,0 T 12,0 T 18,0 T 24,0 T 30,0 T 36,0 L 36,24 L 0,24 Z" fill="url(#flame-gradient)" class="flame-wave" />
      </g></g>
    </svg>`;
}
function renderStreakData() {
  const countEl = document.getElementById('streak-count');
  if (!countEl) return;
  countEl.textContent = STREAK_DAYS;
  const pct = Math.min(STREAK_DAYS / STREAK_FILL_GOAL, 1);
  const flameTop = 2, flameBottom = 21;
  const currentY = flameBottom - ((flameBottom - flameTop) * pct);
  const group = document.getElementById('flame-fill-group');
  if (group) group.setAttribute('transform', `translate(0, ${currentY})`);
}

/* ----------------------------------------------------------
   Widget: Aktivitas Terbaru
   --------------------------------------------------------
   Any 1-row size (2x1/3x1/4x1) uses a COMPLETELY different
   compact "ticker" layout: latest activity on one line, with
   an avatar stack (at w>=3) and an overflow badge (at w=4) —
   not a shrunk version of the list.

   2x2/3x2/4x2 — short list (2-3 items)
   4x3 — longer list
   4x4 — full list, all items
   ---------------------------------------------------------- */
function renderActivityWidget(w, h) {
  const now = Date.now();

  if (ACTIVITIES.length === 0) {
    return `
      <div class="relative h-full flex flex-col items-center justify-center text-center p-4">
        <svg class="w-6 h-6 text-zinc-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <p class="text-zinc-300 text-xs font-medium" data-i18n="empty_dash_activity_title">Belum ada aktivitas</p>
        ${w > 1 && h >= 2 ? '<p class="text-zinc-500 text-[10px] mt-1" data-i18n="empty_dash_activity_desc">Kegiatan terbaru dari anggota akan muncul di sini.</p>' : ''}
      </div>`;
  }

  if (w === 1 && h === 1) {
    const latest = ACTIVITIES[0];
    return `
      <div class="relative h-full flex flex-col items-center justify-center text-center gap-1.5">
        <div class="w-7 h-7 rounded-full bg-accent-gradient flex items-center justify-center text-[10px] font-semibold">${(latest.author || '?').charAt(0).toUpperCase()}</div>
        <p class="text-zinc-400 text-[10px] line-clamp-2">${latest.html}</p>
      </div>`;
  }

  if (w === 1 && h >= 2) {
    const items = ACTIVITIES.slice(0, h === 2 ? 4 : 6);
    const listHtml = items.map(item => `
      <li class="flex items-start gap-2">
        <span class="w-1 h-1 rounded-full ${item.dot} mt-1 shrink-0"></span>
        <p class="text-zinc-400 text-[10px] line-clamp-2">${item.html}</p>
      </li>`).join('');
    return `
      <div class="relative h-full flex flex-col">
        <h2 class="font-display text-xs font-semibold mb-2 shrink-0" data-i18n="recent_activity">Aktivitas</h2>
        <ul class="space-y-2 flex-1 min-h-0 overflow-y-auto">${listHtml}</ul>
      </div>`;
  }

  if (h === 1) {
    const count = w >= 3 ? 3 : 2;
    const items = ACTIVITIES.slice(0, count);
    const listHtml = items.map(item => `
      <li class="flex items-center gap-2">
        <span class="w-1 h-1 rounded-full ${item.dot} shrink-0"></span>
        <p class="text-zinc-400 text-[11px] truncate flex-1 min-w-0">${item.html}</p>
        <span class="text-zinc-600 text-[10px] shrink-0">${kirFormatActivityTime(new Date(now - item.msAgo)).split(' ')[0]}</span>
      </li>`).join('');
    return `
      <div class="relative h-full flex flex-col justify-center">
        <ul class="space-y-1.5 w-full">${listHtml}</ul>
      </div>`;
  }

  const count = h >= 4 ? ACTIVITIES.length : (h >= 3 ? Math.min(5, ACTIVITIES.length) : (w >= 3 ? 4 : 3));
  const items = ACTIVITIES.slice(0, count);
  const listHtml = items.map(item => {
    const when = kirFormatActivityTime(new Date(now - item.msAgo));
    return `
      <li class="flex items-start gap-2.5">
        <span class="w-1.5 h-1.5 rounded-full ${item.dot} mt-1.5 shrink-0"></span>
        <div class="flex-1 min-w-0 flex items-baseline gap-2 flex-wrap">
          <p class="text-zinc-300 text-xs sm:text-sm">${item.html}</p>
          <span class="flex-1 min-w-[16px] border-b border-dotted border-[var(--glass-border)] mb-1 hidden sm:block"></span>
          <span class="text-zinc-500 text-[10px] sm:text-xs shrink-0 whitespace-nowrap">${when}</span>
        </div>
      </li>`;
  }).join('');
  return `
    <div class="relative h-full flex flex-col">
      <h2 class="font-display text-sm font-semibold mb-3 shrink-0" data-i18n="recent_activity">Aktivitas terbaru</h2>
      <ul class="space-y-2.5 flex-1 min-h-0 overflow-y-auto">${listHtml}</ul>
    </div>`;
}

/* ----------------------------------------------------------
   Widget: Jam (fancy clock)
   --------------------------------------------------------
   1x1 — digital only
   any h==1 (2x1/3x1/4x1) — digital + date row
   2x2/3x2/4x2 — analog clock face
   ---------------------------------------------------------- */
function renderClockWidget(w, h) {
  if (w === 1 && h === 1) {
    return `
      <div class="relative h-full flex flex-col items-center justify-center text-center">
        <p id="clock-digital-sm" class="font-display text-xl font-semibold tabular-nums">--:--</p>
        <p class="text-zinc-500 text-[10px] mt-0.5" data-i18n="clock_label">Jam</p>
      </div>`;
  }
  if (h === 1) {
    return `
      <div class="glow-blob w-28 h-28 bg-accent-20 -top-8 -right-8"></div>
      <div class="relative h-full flex items-center justify-between gap-3">
        <div class="min-w-0">
          <p id="clock-digital-md" class="font-display text-2xl font-semibold tabular-nums leading-none">--:--</p>
          <p id="clock-date-md" class="text-zinc-500 text-[11px] mt-1 truncate"></p>
        </div>
        <div class="w-10 h-10 rounded-full bg-accent-15 border border-accent-30 flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 text-accent-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 7v5l3 3"/></svg>
        </div>
      </div>`;
  }
  return `
    <div class="glow-blob w-32 h-32 bg-accent-20 -top-10 -right-10"></div>
    <div class="relative h-full flex flex-col items-center justify-center gap-2.5">
      <div class="clock-face" id="clock-face" style="width:60%; max-width:80px; aspect-ratio:1;">
        <div class="clock-tick" style="left:50%; top:6%; width:2px; height:8%; transform:translateX(-50%);"></div>
        <div class="clock-tick" style="left:50%; bottom:6%; width:2px; height:8%; transform:translateX(-50%);"></div>
        <div class="clock-tick" style="top:50%; left:6%; width:8%; height:2px; transform:translateY(-50%);"></div>
        <div class="clock-tick" style="top:50%; right:6%; width:8%; height:2px; transform:translateY(-50%);"></div>
        <div class="clock-hand clock-hand-hour" id="clock-hand-hour" style="height:26%;"></div>
        <div class="clock-hand clock-hand-min" id="clock-hand-min" style="height:36%;"></div>
        <div class="clock-hand clock-hand-sec" id="clock-hand-sec" style="height:40%;"></div>
        <div class="clock-center-dot"></div>
      </div>
      <p id="clock-digital-lg" class="text-zinc-500 text-xs tabular-nums">--:--:--</p>
    </div>`;
}
function updateClock() {
  const now = new Date();
  let h, m, s;
  try {
    const p = kirJakartaDateParts(now);
    h = parseInt(p.hour, 10); m = parseInt(p.minute, 10); s = parseInt(p.second, 10);
  } catch (e) {
    h = now.getHours(); m = now.getMinutes(); s = now.getSeconds();
  }
  const digital = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const lang = localStorage.getItem('kir_lang') || 'id';
  const dateFmt = new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Jakarta' });
  const dateStr = dateFmt.format(now);

  const smEl = document.getElementById('clock-digital-sm'); if (smEl) smEl.textContent = digital;
  const mdEl = document.getElementById('clock-digital-md'); if (mdEl) mdEl.textContent = digital;
  const dateMdEl = document.getElementById('clock-date-md'); if (dateMdEl) dateMdEl.textContent = dateStr;
  const lgEl = document.getElementById('clock-digital-lg'); if (lgEl) lgEl.textContent = digital + ':' + String(s).padStart(2, '0');

  const hourHand = document.getElementById('clock-hand-hour');
  if (hourHand) {
    const hourDeg = ((h % 12) + m / 60) * 30;
    const minDeg = (m + s / 60) * 6;
    const secDeg = s * 6;
    hourHand.style.transform = `translateX(-50%) rotate(${hourDeg}deg)`;
    document.getElementById('clock-hand-min').style.transform = `translateX(-50%) rotate(${minDeg}deg)`;
    document.getElementById('clock-hand-sec').style.transform = `translateX(-50%) rotate(${secDeg}deg)`;
  }
}

/* ----------------------------------------------------------
   Widget: Peringkat (leaderboard preview)
   --------------------------------------------------------
   1x1 — rank number only
   1x2 — vertical rank stat
   2x1 — row (rank + deltas total)
   2x2 — rank + top-3 list (default)
   w>=3 — rank + top-3 mini bar chart (podium-style bars)
   4x3 — rank + top-5 list with avatars
   ---------------------------------------------------------- */
function dashLeaderboardRoster() {
  const you = { name: kirCurrentUserName(), deltas: kirDeltasTotal(), isYou: true };
  return [you, ...DASH_LEADERBOARD_ROSTER].sort((a, b) => b.deltas - a.deltas);
}
function renderLeaderboardWidget(w, h) {
  const roster = dashLeaderboardRoster();
  const yourRank = roster.findIndex(m => m.isYou) + 1;
  const trophyIcon = `<svg class="w-4 h-4 text-accent-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 21h8m-4-4v4M6 4h12v3a6 6 0 01-6 6 6 6 0 01-6-6V4zM6 4H4a2 2 0 000 4h1.5M18 4h2a2 2 0 010 4h-1.5" /></svg>`;

  if (w === 1 && h === 1) {
    return `
      <div class="relative h-full flex flex-col items-center justify-center text-center gap-0.5">
        ${trophyIcon}
        <p class="font-display text-xl font-semibold text-accent-300 leading-none">#${yourRank}</p>
      </div>`;
  }

  if (w === 1 && h >= 2) {
    return `
      <div class="glow-blob w-24 h-24 bg-accent-20 -top-8 -right-8"></div>
      <div class="relative h-full flex flex-col items-center justify-center text-center gap-1.5">
        <div class="w-8 h-8 rounded-lg bg-accent-15 border border-accent-30 flex items-center justify-center">${trophyIcon}</div>
        <p class="font-display text-2xl font-semibold text-accent-300 leading-none">#${yourRank}</p>
        <p class="text-zinc-500 text-[10px]" data-i18n="leaderboard_your_rank">Peringkat kamu</p>
      </div>`;
  }

  if (h < 2) {
    return `
      <div class="glow-blob w-32 h-32 bg-accent-20 -top-10 -right-10"></div>
      <div class="relative h-full flex items-center justify-between gap-3 cursor-pointer" onclick="location.href='leaderboard.html'">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-9 h-9 shrink-0 rounded-lg bg-accent-15 border border-accent-30 flex items-center justify-center">${trophyIcon}</div>
          <div class="min-w-0">
            <p class="text-zinc-400 text-xs font-medium truncate" data-i18n="leaderboard_title">Peringkat</p>
            <p class="text-zinc-500 text-[11px] truncate">${kirDeltasTotal().toLocaleString('id-ID')} <span data-i18n="deltas_points">deltas</span></p>
          </div>
        </div>
        <p class="font-display text-2xl font-semibold text-accent-300 shrink-0">#${yourRank}</p>
      </div>`;
  }

  const top3 = roster.slice(0, 3);

  if (w >= 3 && h === 2) {
    // Podium-style mini bar chart — same data, very different visual composition
    const maxDeltas = Math.max(...top3.map(m => m.deltas));
    return `
      <div class="glow-blob w-40 h-40 bg-accent-20 -top-10 -right-10"></div>
      <div class="relative h-full flex flex-col cursor-pointer" onclick="location.href='leaderboard.html'">
        <div class="flex items-center justify-between mb-3">
          <p class="text-zinc-400 text-sm font-medium" data-i18n="leaderboard_title">Peringkat</p>
          <span class="font-display text-lg font-semibold text-accent-300">#${yourRank}</span>
        </div>
        <div class="flex items-end justify-around gap-3 flex-1 min-h-0">
          ${top3.map((m, i) => {
            const pct = Math.max(18, Math.round((m.deltas / maxDeltas) * 100));
            return `
            <div class="flex flex-col items-center gap-1.5 flex-1 min-w-0">
              <span class="text-[10px] text-zinc-500 truncate max-w-full">${m.name.split(' ')[0]}${m.isYou ? ` <span class="text-accent-300">(${I18N[localStorage.getItem('kir_lang') || 'id'].leaderboard_you})</span>` : ''}</span>
              <div class="w-full rounded-t-md ${i === 0 ? 'bg-accent-gradient' : 'bg-white/10'}" style="height:${pct}%"></div>
              <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full ${i === 0 ? 'bg-accent-15 text-accent-300 border border-accent-30' : 'bg-white/5 text-zinc-500 border border-white/10'}">#${i + 1}</span>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  const listCount = h >= 3 ? 5 : 3;
  const listItems = roster.slice(0, listCount);
  return `
    <div class="glow-blob w-40 h-40 bg-accent-20 -top-10 -right-10"></div>
    <div class="relative h-full flex flex-col cursor-pointer" onclick="location.href='leaderboard.html'">
      <div class="flex items-center justify-between mb-3">
        <p class="text-zinc-400 text-sm font-medium" data-i18n="leaderboard_title">Peringkat</p>
        <div class="w-8 h-8 rounded-lg bg-accent-15 border border-accent-30 flex items-center justify-center">${trophyIcon}</div>
      </div>
      <div class="flex items-baseline gap-2 mb-2">
        <p class="font-display text-3xl font-semibold text-accent-300 leading-none">#${yourRank}</p>
        <span class="text-zinc-500 text-xs" data-i18n="leaderboard_your_rank">Peringkat kamu</span>
      </div>
      <div class="mt-auto space-y-1.5 pt-2">
        ${listItems.map((m, i) => `
          <div class="flex items-center gap-2 text-xs">
            <span class="w-4 text-zinc-500 font-medium shrink-0">${i + 1}</span>
            <div class="w-5 h-5 rounded-full bg-accent-gradient flex items-center justify-center text-[10px] font-semibold shrink-0">${m.name.charAt(0).toUpperCase()}</div>
            <span class="text-zinc-300 truncate flex-1">${m.name}${m.isYou ? ` <span class="text-accent-300">(${I18N[localStorage.getItem('kir_lang') || 'id'].leaderboard_you})</span>` : ''}</span>
            <span class="text-zinc-500 shrink-0">${m.deltas.toLocaleString('id-ID')}</span>
          </div>`).join('')}
      </div>
    </div>`;
}

/* ----------------------------------------------------------
   Widget: Peta Kontribusi (heatmap)
   --------------------------------------------------------
   2x1 — last ~2 weeks as a single compact row
   2x2/3x2 — grid of weeks x days (more weeks the wider it is)
   4x2 — full 10-week grid + legend
   3x3/4x3 — grid + a small summary stat row underneath
   ---------------------------------------------------------- */
function heatmapCell(level, big) {
  const size = big ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5';
  return `<span class="${size} rounded-[3px] bg-accent-gradient shrink-0" style="opacity:${HEATMAP_LEVEL_OPACITY[level]}"></span>`;
}
function renderHeatmapWidget(w, h) {
  const totalActiveDays = HEATMAP_DATA.filter(l => l > 0).length;

  if (w === 1 && h === 1) {
    const recent = HEATMAP_DATA.slice(-9);
    return `
      <div class="relative h-full flex flex-col items-center justify-center gap-1.5">
        <p class="text-zinc-400 text-[10px] font-medium tracking-wide uppercase" data-i18n="dash_heatmap">Kontribusi</p>
        <div class="grid grid-cols-3 gap-[3px]">
          ${recent.map(l => heatmapCell(l, false)).join('')}
        </div>
      </div>`;
  }

  if (h === 1) {
    // Single-row strip: most recent ~ (w * 7) days, capped to data length
    const days = Math.min(HEATMAP_DATA.length, w === 2 ? 14 : w === 3 ? 21 : 28);
    const slice = HEATMAP_DATA.slice(-days);
    return `
      <div class="relative h-full flex items-center gap-3">
        <p class="text-zinc-400 text-xs font-medium shrink-0" data-i18n="dash_heatmap">Kontribusi</p>
        <div class="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
          ${slice.map(l => heatmapCell(l, false)).join('')}
        </div>
      </div>`;
  }

  const weeksToShow = w >= 4 ? HEATMAP_WEEKS : (w === 3 ? 8 : 6);
  const daysToShow = weeksToShow * 7;
  const slice = HEATMAP_DATA.slice(-daysToShow);
  const weeks = [];
  for (let i = 0; i < slice.length; i += 7) weeks.push(slice.slice(i, i + 7));

  const showStats = h >= 3;
  const showLegend = w >= 4;

  return `
    <div class="glow-blob w-32 h-32 bg-accent-15 -top-8 -right-8"></div>
    <div class="relative h-full flex flex-col">
      <div class="flex items-center justify-between mb-3 shrink-0">
        <p class="text-zinc-400 text-sm font-medium" data-i18n="dash_heatmap">Kontribusi</p>
        ${showLegend ? `
        <div class="flex items-center gap-1 text-[10px] text-zinc-600">
          <span data-i18n="dash_heatmap_less">Sedikit</span>
          ${HEATMAP_LEVEL_OPACITY.map(o => `<span class="w-2.5 h-2.5 rounded-[3px] bg-accent-gradient" style="opacity:${o}"></span>`).join('')}
          <span data-i18n="dash_heatmap_more">Banyak</span>
        </div>` : ''}
      </div>
      <div class="flex-1 min-h-0 flex items-center justify-center">
        <div class="flex gap-[3px]">
          ${weeks.map(week => `
            <div class="flex flex-col gap-[3px]">
              ${week.map(l => heatmapCell(l, true)).join('')}
            </div>`).join('')}
        </div>
      </div>
      ${showStats ? `
      <div class="shrink-0 pt-3 mt-2 border-t border-white/10 flex items-center justify-between text-xs">
        <span class="text-zinc-500" data-i18n="dash_heatmap_active_days">Hari aktif</span>
        <span class="font-display font-semibold text-accent-300">${totalActiveDays} / ${HEATMAP_DATA.length}</span>
      </div>` : ''}
    </div>`;
}

/* ----------------------------------------------------------
   Widget: Anggota Aktif (roster)
   --------------------------------------------------------
   1x1 — online count only
   2x1 — online count + stacked avatars
   1x2 — vertical online summary
   2x2/3x2/4x2 — member list, columns grow with width
   3x3/4x3 — taller list, all members
   ---------------------------------------------------------- */
function rosterCabangDot(cabang) {
  if (cabang === 'robotik') return `<span class="w-2 h-2 rounded-full shrink-0" style="background: rgba(224,70,95,0.85);"></span>`;
  if (cabang === 'sains') return `<span class="w-2 h-2 rounded-full shrink-0" style="background: rgba(56,130,246,0.85);"></span>`;
  return `<span class="w-2 h-2 rounded-full shrink-0" style="background: rgba(139,92,246,0.85);"></span>`;
}
function renderRosterWidget(w, h) {
  const onlineCount = DASH_ROSTER.filter(m => m.online).length;
  const usersIcon = `<svg class="w-4 h-4 text-accent-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4" /></svg>`;

  if (w === 1 && h === 1) {
    return `
      <div class="relative h-full flex flex-col items-center justify-center text-center gap-0.5">
        <span class="relative flex h-2 w-2 -mb-0.5">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-300 opacity-60"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-accent-300"></span>
        </span>
        <p class="font-display text-xl font-semibold leading-none">${onlineCount}</p>
      </div>`;
  }

  if (w === 1 && h >= 2) {
    return `
      <div class="glow-blob w-24 h-24 bg-accent-20 -top-8 -right-8"></div>
      <div class="relative h-full flex flex-col items-center justify-center text-center gap-1.5">
        <div class="w-8 h-8 rounded-lg bg-accent-15 border border-accent-30 flex items-center justify-center">${usersIcon}</div>
        <p class="font-display text-2xl font-semibold leading-none">${onlineCount}</p>
        <p class="text-zinc-500 text-[10px]" data-i18n="dash_roster_online">Sedang aktif</p>
      </div>`;
  }

  if (h === 1) {
    return `
      <div class="glow-blob w-32 h-32 bg-accent-20 -top-10 -right-10"></div>
      <div class="relative h-full flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-9 h-9 shrink-0 rounded-lg bg-accent-15 border border-accent-30 flex items-center justify-center">${usersIcon}</div>
          <div class="min-w-0">
            <p class="text-zinc-400 text-xs font-medium truncate" data-i18n="dash_roster_title">Anggota Aktif</p>
            <p class="text-zinc-500 text-[11px] truncate">${onlineCount} <span data-i18n="dash_roster_online">sedang aktif</span></p>
          </div>
        </div>
        <div class="flex -space-x-2 shrink-0">
          ${DASH_ROSTER.filter(m => m.online).slice(0, 4).map(m => `<div class="w-7 h-7 rounded-full bg-accent-gradient flex items-center justify-center text-[10px] font-semibold" style="box-shadow: 0 0 0 2px var(--bg-color);">${m.name.charAt(0).toUpperCase()}</div>`).join('')}
        </div>
      </div>`;
  }

  const listCount = h >= 3 ? DASH_ROSTER.length : (w >= 3 ? 5 : 4);
  const members = DASH_ROSTER.slice(0, listCount);
  return `
    <div class="glow-blob w-32 h-32 bg-accent-20 -top-10 -right-10"></div>
    <div class="relative h-full flex flex-col">
      <div class="flex items-center justify-between mb-3 shrink-0">
        <p class="text-zinc-400 text-sm font-medium" data-i18n="dash_roster_title">Anggota Aktif</p>
        <span class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent-15 text-accent-300 border border-accent-30">${onlineCount} <span data-i18n="dash_roster_online">aktif</span></span>
      </div>
      <div class="flex-1 min-h-0 overflow-y-auto ${w >= 3 ? 'grid grid-cols-2 gap-x-3 gap-y-2 content-start' : 'space-y-2'}">
        ${members.map(m => `
          <div class="flex items-center gap-2 min-w-0">
            <div class="relative shrink-0">
              <div class="w-7 h-7 rounded-full bg-accent-gradient flex items-center justify-center text-[10px] font-semibold">${m.name.charAt(0).toUpperCase()}</div>
              <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-color)] ${m.online ? 'bg-emerald-400' : 'bg-zinc-600'}"></span>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-zinc-300 text-xs font-medium truncate">${m.name}</p>
              <div class="flex items-center gap-1">${rosterCabangDot(m.cabang)}<span class="text-zinc-600 text-[10px] truncate">${kirCabangLabel(m.cabang)}</span></div>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}

/* ----------------------------------------------------------
   Widget: Tautan Cepat (icon grid)
   ---------------------------------------------------------- */
function renderQuicklinksWidget(w, h) {
  const lang = localStorage.getItem('kir_lang') || 'id';
  const links = [
    { href: 'tasks.html', key: 'tugas', icon: `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>` },
    { href: 'schedule.html', key: 'jadwal', icon: `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>` },
    { href: 'materials.html', key: 'materials', icon: `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>` },
    { href: 'leaderboard.html', key: 'leaderboard_title', icon: `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 21h8m-4-4v4M6 4h12v3a6 6 0 01-6 6 6 6 0 01-6-6V4zM6 4H4a2 2 0 000 4h1.5M18 4h2a2 2 0 010 4h-1.5" /></svg>` },
  ];
  const linkLabel = (l) => (I18N[lang] && I18N[lang][l.key]) || l.key;

  if (w === 1 && h === 1) {
    return `
      <div class="relative h-full flex flex-col items-center justify-center gap-2">
        <div class="grid grid-cols-2 gap-2 w-full h-full">
          ${links.map(l => `<a href="${l.href}" class="rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-accent-300 hover:bg-white/10 transition" title="${linkLabel(l)}">${l.icon}</a>`).join('')}
        </div>
      </div>`;
  }

  const gridCls = w >= 4 ? 'grid-cols-4' : 'grid-cols-2';
  const compact = h === 1;
  return `
    <div class="relative h-full flex flex-col">
      ${!compact ? `<p class="text-zinc-400 text-xs font-medium mb-3 shrink-0" data-i18n="dash_quicklinks">Tautan Cepat</p>` : ''}
      <div class="grid ${gridCls} gap-2 flex-1 min-h-0">
        ${links.map(l => `
          <a href="${l.href}" class="flex ${compact ? 'flex-row justify-center' : 'flex-col justify-center'} items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-accent-30 transition text-center p-2">
            <div class="w-8 h-8 rounded-lg bg-accent-15 border border-accent-30 flex items-center justify-center text-accent-300 shrink-0">${l.icon}</div>
            <span class="text-[11px] text-zinc-400 ${compact ? 'hidden sm:inline' : ''}" data-i18n="${l.key}">${linkLabel(l)}</span>
          </a>`).join('')}
      </div>
    </div>`;
}

/* ----------------------------------------------------------
   Keyboard Shortcuts
   ---------------------------------------------------------- */
document.addEventListener('keydown', (e) => {
  if (!editMode) return;
  if (e.ctrlKey && e.key.toLowerCase() === 'z' && !e.shiftKey) {
    e.preventDefault();
    undoLayout();
  }
  if ((e.ctrlKey && e.key.toLowerCase() === 'y') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z')) {
    e.preventDefault();
    redoLayout();
  }
});
