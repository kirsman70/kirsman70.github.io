/* ==========================================================
   KIR (Karya Ilmiah Remaja) - prototype auth + theme
   --------------------------------------------------------
   There is no backend yet, so "being logged in" is just a
   flag in localStorage. This is NOT secure and stores
   nothing sensitive - it only exists so the multi-page site
   can behave like a real app (redirects, session, logout,
   profile, cabang, appearance) while you build without a
   server.

   WHEN YOU ADD A REAL BACKEND LATER:
   Replace the storage-backed functions below with real calls
   to your auth API / session cookies / database. Every page
   calls these same function names, so the rest of the site
   won't need to change — just swap what's inside this file.
   ========================================================== */

const KIR_SESSION_KEY  = 'kir_session';
const KIR_NAME_KEY     = 'kir_user_name';
const KIR_CABANG_KEY   = 'kir_user_cabang';   // 'robotik' | 'sains' | 'both'
const KIR_AVATAR_KEY   = 'kir_user_avatar';   // base64 data URL, or absent
const KIR_THEME_KEY    = 'kir_theme';         // 'dark' | 'light'
const KIR_LAST_CABANG_KEY = 'kir_last_cabang'; // survives logout — see kirLogin()
const KIR_LANG_KEY     = 'kir_lang';          // 'id' | 'en'
const KIR_SIDEBAR_COLLAPSED_KEY = 'kir_sidebar_collapsed'; // 'true' | 'false' — persists across page loads

const I18N = {
  id: { 
    tugas: 'Tugas', materials: 'Materi', jadwal: 'Jadwal', anggota: 'Anggota', pengaturan: 'Pengaturan', beranda: 'Beranda', keluar: 'Keluar',
    robotik: 'Robotik', sains: 'Sains', both: 'Robotik & Sains',
    menu: 'Menu', akun: 'Akun', kir_long: 'Karya Ilmiah Remaja',
    settings_desc: 'Kelola profil, cabang, dan tampilan akun kamu.',
    active_branch: 'Cabang Aktif', branch_desc: 'Cabang terdaftar kamu saat ini.',
    appearance_lang: 'Tampilan & Bahasa', change_lang: 'Ubah Bahasa',
    dashboard_sub: 'Berikut yang terjadi di Orbit minggu ini.',
    active_tasks: 'Tugas Aktif', due_this_week: 'jatuh tempo minggu ini', late: 'terlambat',
    upcoming_events: 'Acara Mendatang', up_next: 'Selanjutnya:', recent_activity: 'Aktivitas terbaru',
    tasks_desc: 'Semua yang ditugaskan ke klub saat ini.', assigned_to: 'Ditugaskan ke', due: 'Tenggat:', submitted: 'jawaban terkirim',
    status_progress: 'Sedang Dikerjakan', status_review: 'Menunggu Peninjauan', status_late: 'Terlambat', status_todo: 'Belum Dimulai', status_done: 'Selesai',
    modal_desc: 'Deskripsi tugas', modal_ans: 'Jawaban kamu', modal_upload: 'Klik untuk unggah file jawaban\u2026', modal_proto: 'Prototipe: file tidak benar-benar diunggah ke server, hanya nama filenya yang disimpan di browser kamu.',
    schedule_desc: 'Acara klub mendatang, secara berurutan.', badge_next: 'Berikutnya',
    members_desc: 'Semua orang yang tergabung di KIR.', role_ketua: 'Ketua Klub', role_wakil: 'Wakil Ketua', role_bendahara: 'Bendahara', role_anggota: 'Anggota', you: '(kamu)',
    materials_desc: 'Modul pembelajaran dan referensi untuk anggota klub.',
    idx_login: 'Masuk', idx_register: 'Daftar', idx_dash_badge: 'Dasbor Klub',
    idx_h1_a: 'Satu tempat untuk', idx_h1_b: 'tugas, jadwal, dan tim kamu.',
    idx_sub: 'KIR membantu pengurus dan anggota klub melacak siapa mengerjakan apa, dan acara apa yang akan datang - tanpa grup chat yang berantakan.',
    idx_cta_1: 'Mulai sekarang', idx_cta_2: 'Sudah punya akun? Masuk',
    idx_feat1_title: 'Tugas yang jelas', idx_feat1_desc: 'Lihat siapa mengerjakan apa, tenggat waktunya, dan statusnya sekilas.',
    idx_feat2_title: 'Jadwal acara', idx_feat2_desc: 'Semua acara klub tersusun rapi dalam satu linimasa yang mudah dibaca.',
    idx_feat3_title: 'Tim yang sinkron', idx_feat3_desc: 'Setiap anggota tahu apa yang terjadi tanpa harus bertanya berulang kali.',
    idx_branch_title: 'Dua cabang, satu dasbor:',
    idx_branch_sub: 'Pilih salah satu atau keduanya saat mendaftar - dasbor kamu otomatis mengikuti warna cabang kamu.',
    idx_branch_rob_sub: 'Untuk anggota yang fokus di rancang bangun, pemrograman, dan kompetisi robot.',
    idx_branch_sci_sub: 'Untuk anggota yang fokus di riset, eksperimen, dan karya tulis ilmiah.',
    idx_footer: 'KIR - Karya Ilmiah Remaja, dibuat untuk klub-klub kampus.',
    idx_dashboard: 'Dasbor', idx_open_dashboard: 'Buka Dasbor', idx_open_dashboard_hero: 'Buka dasbor kamu',
    greeting_morning: 'Selamat pagi', greeting_afternoon: 'Selamat siang', greeting_evening: 'Selamat sore', greeting_night: 'Selamat malam',
    activity_today: 'Hari ini pukul', activity_yesterday: 'Kemarin pukul', activity_at: 'pukul',
    deltas_label: 'Deltas', this_week: 'minggu ini', all_time: 'sepanjang waktu', deltas_points: 'deltas',
    deltas_range_week: 'Minggu ini', deltas_range_lifetime: 'Sepanjang waktu',
    deltas_desc: 'Poin didapat dari mengerjakan soal latihan.',
    streak_label: 'Beruntun', streak_days: 'hari beruntun',
    galeri: 'Galeri', program_kerja: 'Program Kerja',
    nav_beranda: 'Beranda', nav_galeri: 'Galeri', nav_proker: 'Program Kerja',
    gallery_title: 'Galeri', gallery_desc: 'Dokumentasi kegiatan klub, disusun jadi folder seperti berkas di komputer kamu. Klik folder untuk membuka, atau tombol ".." untuk kembali.',
    gallery_up: '.. Kembali', gallery_empty: 'Folder ini masih kosong — foto menyusul.',
    gallery_items_one: 'item', gallery_items_other: 'item',
    proker_eyebrow: 'Tahun Ajaran 2025/2026',
    proker_title: 'Program Kerja', proker_desc: 'Rencana kerja cabang Robotik dan Sains untuk tahun ajaran ini — dari latihan rutin sampai kompetisi.',
    proker_robotik_label: 'Cabang Robotik', proker_sains_label: 'Cabang Sains',
    proker_cta_title: 'Tertarik ikut program ini?', proker_cta_desc: 'Daftar sebagai anggota dan pilih cabang yang kamu minati — dasbor kamu otomatis menyesuaikan.',
    proker_cta_btn: 'Daftar Sekarang'
  },
  en: { 
    tugas: 'Tasks', materials: 'Materials', jadwal: 'Schedule', anggota: 'Members', pengaturan: 'Settings', beranda: 'Home', keluar: 'Log Out',
    robotik: 'Robotics', sains: 'Science', both: 'Robotics and Science',
    menu: 'Menu', akun: 'Account', kir_long: 'Karya Ilmiah Remaja',
    settings_desc: 'Manage your profile, branch, and account appearance.',
    active_branch: 'Active Branch', branch_desc: 'Your currently registered branch.',
    appearance_lang: 'Appearance & Language', change_lang: 'Change Language',
    dashboard_sub: "Here's what's happening in Orbit this week.",
    active_tasks: 'Active Tasks', due_this_week: 'due this week', late: 'late',
    upcoming_events: 'Upcoming Events', up_next: 'Up next:', recent_activity: 'Recent activity',
    tasks_desc: 'Everything currently assigned to the club.', assigned_to: 'Assigned to', due: 'Due:', submitted: 'submission sent',
    status_progress: 'In Progress', status_review: 'Pending Review', status_late: 'Overdue', status_todo: 'Not Started', status_done: 'Completed',
    modal_desc: 'Task description', modal_ans: 'Your submission', modal_upload: 'Click to upload submission file\u2026', modal_proto: 'Prototype: files are not actually uploaded to a server, only the filename is stored in your browser.',
    schedule_desc: 'Upcoming club events, in chronological order.', badge_next: 'Next',
    members_desc: 'Everyone currently in KIR.', role_ketua: 'Club President', role_wakil: 'Vice President', role_bendahara: 'Treasurer', role_anggota: 'Member', you: '(you)',
    materials_desc: 'Learning modules and references for club members.',
    idx_login: 'Log In', idx_register: 'Register', idx_dash_badge: 'Club Dashboard',
    idx_h1_a: 'One place for your', idx_h1_b: 'tasks, schedule, and team.',
    idx_sub: 'KIR helps club officers and members track who is doing what, and what events are coming up - without messy group chats.',
    idx_cta_1: 'Get started now', idx_cta_2: 'Already have an account? Log In',
    idx_feat1_title: 'Clear tasks', idx_feat1_desc: 'See who is doing what, deadlines, and statuses at a glance.',
    idx_feat2_title: 'Event schedules', idx_feat2_desc: 'All club events organized neatly in an easy-to-read timeline.',
    idx_feat3_title: 'Synchronized team', idx_feat3_desc: 'Every member knows what is happening without having to ask repeatedly.',
    idx_branch_title: 'Two branches, one dashboard:',
    idx_branch_sub: 'Choose one or both when registering - your dashboard automatically follows your branch color.',
    idx_branch_rob_sub: 'For members focusing on engineering, programming, and robot competitions.',
    idx_branch_sci_sub: 'For members focusing on research, experiments, and scientific papers.',
    idx_footer: 'KIR - Karya Ilmiah Remaja, built for campus clubs.',
    idx_dashboard: 'Dashboard', idx_open_dashboard: 'Open Dashboard', idx_open_dashboard_hero: 'Open your dashboard',
    greeting_morning: 'Good morning', greeting_afternoon: 'Good afternoon', greeting_evening: 'Good evening', greeting_night: 'Good night',
    activity_today: 'Today at', activity_yesterday: 'Yesterday at', activity_at: 'at',
    deltas_label: 'Deltas', this_week: 'this week', all_time: 'all time', deltas_points: 'deltas',
    deltas_range_week: 'This Week', deltas_range_lifetime: 'Lifetime',
    deltas_desc: 'Points earned by completing practice questions.',
    streak_label: 'Streak', streak_days: 'day streak',
    galeri: 'Gallery', program_kerja: 'Work Programs',
    nav_beranda: 'Home', nav_galeri: 'Gallery', nav_proker: 'Work Programs',
    gallery_title: 'Gallery', gallery_desc: 'Documentation from club activities, organized into folders just like the files on your computer. Click a folder to open it, or ".." to go back.',
    gallery_up: '.. Back', gallery_empty: 'This folder is still empty — photos coming soon.',
    gallery_items_one: 'item', gallery_items_other: 'items',
    proker_eyebrow: '2025/2026 School Year',
    proker_title: 'Work Programs', proker_desc: 'The Robotics and Science branch work plans for this school year — from weekly training to competitions.',
    proker_robotik_label: 'Robotics Branch', proker_sains_label: 'Science Branch',
    proker_cta_title: 'Interested in joining a program?', proker_cta_desc: 'Register as a member and choose the branch you\'re interested in — your dashboard adjusts automatically.',
    proker_cta_btn: 'Register Now'
  }
};

function kirTimeGreeting() {
  const lang = localStorage.getItem(KIR_LANG_KEY) || 'id';
  let hour;
  try {
    hour = parseInt(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Jakarta' }).format(new Date()), 10);
  } catch (e) {
    hour = new Date().getHours();
  }
  let key;
  if (hour >= 4 && hour < 11) key = 'greeting_morning';
  else if (hour >= 11 && hour < 15) key = 'greeting_afternoon';
  else if (hour >= 15 && hour < 19) key = 'greeting_evening';
  else key = 'greeting_night';
  return I18N[lang][key];
}

function kirJakartaDateParts(date) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  const parts = {};
  fmt.formatToParts(date).forEach(p => { if (p.type !== 'literal') parts[p.type] = p.value; });
  return parts;
}

function kirFormatActivityTime(date) {
  const lang = localStorage.getItem(KIR_LANG_KEY) || 'id';
  const now = kirJakartaDateParts(new Date());
  const then = kirJakartaDateParts(date);
  const nowDay = Date.UTC(+now.year, +now.month - 1, +now.day);
  const thenDay = Date.UTC(+then.year, +then.month - 1, +then.day);
  const diffDays = Math.round((nowDay - thenDay) / 86400000);
  const time = `${then.hour}:${then.minute}:${then.second}`;

  if (diffDays === 0) return `${I18N[lang].activity_today} ${time}`;
  if (diffDays === 1) return `${I18N[lang].activity_yesterday} ${time}`;

  const dateFmt = new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', {
    timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short'
  });
  return `${dateFmt.format(date)} ${I18N[lang].activity_at} ${time}`;
}

function toggleSettingsModal() {
  const modal = document.getElementById('global-settings-modal');
  modal.classList.toggle('hidden');
  if (!modal.classList.contains('hidden')) {
    document.getElementById('modal-cabang-badge').textContent = kirCabangLabel(kirCurrentUserCabang());
    document.getElementById('modal-cabang-name').textContent = kirCabangLabel(kirCurrentUserCabang());
  }
}

function handleQuickAvatarUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    kirSetUserAvatar(reader.result);
    kirRenderUserChrome();
  };
  reader.readAsDataURL(file);
}

function handleLanguageToggle() {
  const current = localStorage.getItem(KIR_LANG_KEY) || 'id';
  kirSetLang(current === 'id' ? 'en' : 'id');
  document.getElementById('sidebar-cabang-badge').textContent = kirCabangLabel(kirCurrentUserCabang());
}

function kirInjectSidebar(activeTab) {
  const sidebarHtml = `
  <aside id="sidebar" class="hidden lg:flex lg:flex-col w-full lg:w-64 lg:min-h-screen glass border-y-0 border-l-0 px-4 py-6 lg:sticky lg:top-0 relative ${localStorage.getItem(KIR_SIDEBAR_COLLAPSED_KEY) === 'true' ? 'sidebar-collapsed' : ''}">
    <button onclick="kirToggleSidebarCollapse()" class="absolute -right-3 top-8 w-6 h-6 rounded-full bg-accent-gradient text-white flex items-center justify-center z-50 hover:brightness-110 cursor-pointer">
      <svg class="w-3 h-3 collapse-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
    </button>
    <a href="index.html" class="hidden lg:flex items-center gap-2.5 px-2 mb-8 overflow-hidden">
      <!-- Removed bg-zinc-900, shadow-glow-sm, and border -->
      <div class="w-9 h-9 shrink-0 flex items-center justify-center">
        <img src="assets/KIR_light_heavy.PNG" alt="Orbit Logo" class="w-8 h-8 object-contain" />
      </div>
      <div class="sidebar-header-text shrink-0">
        <div class="flex items-center gap-1.5">
          <p class="font-display font-semibold leading-none tracking-wider">orbit.io</p>
          <svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="4" stroke-linecap="round" stroke-linejoin="round"/>
            <ellipse cx="12" cy="12" rx="10" ry="3" transform="rotate(-25 12 12)" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <p class="text-[11px] text-zinc-500 mt-1" data-i18n="kir_long">Karya Ilmiah Remaja</p>
      </div>
    </a>
    <nav class="flex flex-col gap-1.5">
      <p class="text-[11px] font-medium text-zinc-600 uppercase tracking-wider px-3 mb-1" data-i18n="menu">Menu</p>
      <a href="dashboard.html" class="nav-link ${activeTab === 'dashboard' ? 'active' : ''} flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300">
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
        <span class="nav-label" data-i18n="beranda">Beranda</span>
      </a>
      <a href="tasks.html" class="nav-link ${activeTab === 'tasks' ? 'active' : ''} flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300">
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
        <span class="nav-label" data-i18n="tugas">Tugas</span>
      </a>
      <a href="materials.html" class="nav-link ${activeTab === 'materials' ? 'active' : ''} flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300">
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
        <span class="nav-label" data-i18n="materials">Materials</span>
      </a>
      <a href="schedule.html" class="nav-link ${activeTab === 'schedule' ? 'active' : ''} flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300">
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        <span class="nav-label" data-i18n="jadwal">Jadwal</span>
      </a>
      <a href="members.html" class="nav-link ${activeTab === 'members' ? 'active' : ''} flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300">
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4" /></svg>
        <span class="nav-label" data-i18n="anggota">Anggota</span>
      </a>
      <a href="gallery.html" class="nav-link ${activeTab === 'gallery' ? 'active' : ''} flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300">
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>
        <span class="nav-label" data-i18n="galeri">Galeri</span>
      </a>
      <a href="program-kerja.html" class="nav-link ${activeTab === 'proker' ? 'active' : ''} flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300">
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" /><path stroke-linecap="round" stroke-linejoin="round" d="M12 3a13.5 13.5 0 000 18M12 3a13.5 13.5 0 010 18" /></svg>
        <span class="nav-label" data-i18n="program_kerja">Program Kerja</span>
      </a>
    </nav>
    <nav class="flex flex-col gap-1.5 mt-6">
      <p class="text-[11px] font-medium text-zinc-600 uppercase tracking-wider px-3 mb-1" data-i18n="akun">Akun</p>
      <button onclick="toggleSettingsModal()" class="nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300 text-left">
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        <span class="nav-label" data-i18n="pengaturan">Pengaturan</span>
      </button>
    </nav>
    <div class="mt-auto pt-6 border-t border-white/10 hidden lg:flex lg:flex-col">
      <div class="flex items-center gap-2.5 px-2 py-2 mb-2">
        <label class="cursor-pointer shrink-0" data-kir="avatar-wrapper">
          <div data-kir="avatar" class="w-8 h-8 rounded-full bg-accent-gradient flex items-center justify-center font-display font-semibold text-xs shrink-0 hover:brightness-110 transition">A</div>
          <input type="file" class="hidden" accept="image/*" onchange="handleQuickAvatarUpload(event)" />
        </label>
        <div class="min-w-0">
          <p data-kir="name" class="text-sm font-medium truncate">Anggota</p>
          <p id="sidebar-cabang-badge" class="text-[11px] text-zinc-500">Robotik</p>
        </div>
      </div>
      <button onclick="kirLogout()" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 hover:bg-white/5 w-full transition">
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        <span class="nav-label" data-i18n="keluar">Keluar</span>
      </button>
    </div>
  </aside>
  `;
  const settingsModalHtml = `
  <div id="global-settings-modal" class="modal-overlay hidden" onclick="if(event.target===this) toggleSettingsModal()">
    <div class="modal-card p-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="font-display text-lg font-semibold" data-i18n="pengaturan">Pengaturan</h2>
          <p class="text-zinc-500 text-xs mt-1" data-i18n="settings_desc">Kelola profil, cabang, dan tampilan akun kamu.</p>
        </div>
        <button onclick="toggleSettingsModal()" class="text-zinc-500 hover:text-zinc-300 p-1">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <section class="glass rounded-xl p-5 mb-4">
        <h3 class="font-display text-sm font-semibold mb-3" data-i18n="active_branch">Cabang Aktif</h3>
        <div class="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
          <div>
            <p id="modal-cabang-name" class="font-medium text-sm text-zinc-200"></p>
            <p class="text-xs text-zinc-500 mt-1" data-i18n="branch_desc">Cabang terdaftar kamu saat ini.</p>
          </div>
          <div class="text-[11px] px-2.5 py-0.5 rounded-full border" id="modal-cabang-badge"></div>
        </div>
      </section>
      <section class="glass rounded-xl p-5">
        <h3 class="font-display text-sm font-semibold mb-3" data-i18n="appearance_lang">Tampilan & Bahasa</h3>
        <div class="flex items-center justify-between mb-4">
          <p class="text-sm font-medium" data-i18n="change_lang">Ubah Bahasa</p>
          <button onclick="handleLanguageToggle()" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-zinc-300 hover:text-white transition">ID / EN</button>
        </div>
      </section>
    </div>
  </div>
  `;

  document.getElementById('sidebar-root').innerHTML = sidebarHtml + settingsModalHtml;
  
  const badge = document.getElementById('sidebar-cabang-badge');
  if (badge) badge.textContent = kirCabangLabel(kirCurrentUserCabang());
  
  kirApplyTranslations();
  kirRenderUserChrome();
}

function kirToggleSidebarCollapse() {
  const sidebar = document.getElementById('sidebar');
  const collapsed = sidebar.classList.toggle('sidebar-collapsed');
  localStorage.setItem(KIR_SIDEBAR_COLLAPSED_KEY, collapsed ? 'true' : 'false');
}

function kirSetLang(lang) {
  localStorage.setItem(KIR_LANG_KEY, lang);
  kirApplyTranslations();
}

function kirApplyTranslations() {
  const lang = localStorage.getItem(KIR_LANG_KEY) || 'id';
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (I18N[lang][key]) el.textContent = I18N[lang][key];
  });
}

/* ----------------------------------------------------------
   Theme application — runs immediately (top-level, not inside
   a function) the instant this script loads, which is before
   the rest of <head> renders anything. This is what prevents
   a flash of the wrong color/theme on page load. Every page
   includes this script as the very first thing in <head>.
   ---------------------------------------------------------- */
(function applyThemeImmediately() {
  const theme = localStorage.getItem(KIR_THEME_KEY) || 'dark';
  document.documentElement.setAttribute('data-theme', theme);

  // Only apply a colored cabang theme while logged in. Logged-out
  // visitors (landing + auth pages) stay black & white.
  if (localStorage.getItem(KIR_SESSION_KEY) === 'true') {
    const cabang = localStorage.getItem(KIR_CABANG_KEY) || 'robotik';
    document.documentElement.setAttribute('data-cabang', cabang);
  } else {
    document.documentElement.removeAttribute('data-cabang');
  }
})();

/* ----------------------------------------------------------
   Session
   ---------------------------------------------------------- */
function kirIsLoggedIn() {
  // TODO(real auth): check a real session/cookie/token instead.
  return localStorage.getItem(KIR_SESSION_KEY) === 'true';
}

function kirLogin(name, cabang) {
  // TODO(real auth): call your API, store a real token, handle errors.
  // cabang is optional here — if omitted (e.g. the Login tab, where
  // there's no real account record to check yet) we fall back to
  // whatever cabang this browser last used.
  const resolvedCabang = cabang || kirLastKnownCabang();
  localStorage.setItem(KIR_SESSION_KEY, 'true');
  localStorage.setItem(KIR_NAME_KEY, name || 'Anggota');
  localStorage.setItem(KIR_CABANG_KEY, resolvedCabang);
  localStorage.setItem(KIR_LAST_CABANG_KEY, resolvedCabang);
  document.documentElement.setAttribute('data-cabang', resolvedCabang);
}

function kirLastKnownCabang() {
  return localStorage.getItem(KIR_LAST_CABANG_KEY) || 'robotik';
}

function kirLogout() {
  // TODO(real auth): invalidate the real session on the server too.
  localStorage.removeItem(KIR_SESSION_KEY);
  localStorage.removeItem(KIR_NAME_KEY);
  localStorage.removeItem(KIR_CABANG_KEY);
  localStorage.removeItem(KIR_AVATAR_KEY);
  window.location.href = 'index.html';
}

/* Call this at the very top of any protected page's <head>,
   right after loading this script, so it runs before the
   page paints. It sends logged-out visitors to auth.html. */
function kirRequireAuth() {
  if (!kirIsLoggedIn()) {
    window.location.href = 'auth.html';
  }
}

/* ----------------------------------------------------------
   Profile: name, cabang, avatar
   ---------------------------------------------------------- */
function kirCurrentUserName() {
  return localStorage.getItem(KIR_NAME_KEY) || 'Anggota';
}

function kirSetUserName(name) {
  localStorage.setItem(KIR_NAME_KEY, name || 'Anggota');
}

function kirCurrentUserCabang() {
  return localStorage.getItem(KIR_CABANG_KEY) || 'robotik';
}

function kirSetUserCabang(cabang) {
  localStorage.setItem(KIR_CABANG_KEY, cabang);
  localStorage.setItem(KIR_LAST_CABANG_KEY, cabang);
  if (kirIsLoggedIn()) {
    document.documentElement.setAttribute('data-cabang', cabang);
  }
}

/* Human-readable label + badge class for a cabang value. */
function kirCabangLabel(cabang) {
  const lang = localStorage.getItem(KIR_LANG_KEY) || 'id';
  if (cabang === 'sains') return I18N[lang]['sains'];
  if (cabang === 'both') return I18N[lang]['both'];
  return I18N[lang]['robotik'];
}

function kirCurrentUserAvatar() {
  return localStorage.getItem(KIR_AVATAR_KEY) || '';
}

function kirSetUserAvatar(dataUrl) {
  localStorage.setItem(KIR_AVATAR_KEY, dataUrl);
}

function kirClearUserAvatar() {
  localStorage.removeItem(KIR_AVATAR_KEY);
}

/* ----------------------------------------------------------
   Appearance
   ---------------------------------------------------------- */
function kirCurrentTheme() {
  return localStorage.getItem(KIR_THEME_KEY) || 'dark';
}

function kirSetTheme(theme) {
  localStorage.setItem(KIR_THEME_KEY, theme);
  document.documentElement.setAttribute('data-theme', theme);
}

/* ----------------------------------------------------------
   Shared UI helper: fills in any element on the page that
   wants to show the logged-in user's name/initial/avatar.
   Looks for elements with data-kir="name" / "initial" / "avatar".
   Call this once at the bottom of a logged-in page.
   ---------------------------------------------------------- */
function kirRenderUserChrome() {
  const name = kirCurrentUserName();
  const avatar = kirCurrentUserAvatar();

  document.querySelectorAll('[data-kir="name"]').forEach(el => {
    el.textContent = name;
  });
  document.querySelectorAll('[data-kir="greeting"]').forEach(el => {
    el.textContent = kirTimeGreeting() + ', ' + name + '!';
  });
  document.querySelectorAll('[data-kir="avatar"]').forEach(el => {
    if (avatar) {
      el.style.backgroundImage = `url("${avatar}")`;
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
      el.textContent = '';
    } else {
      el.style.backgroundImage = '';
      el.textContent = name.charAt(0).toUpperCase();
    }
  });
}
