/* ==========================================================
   KIR (Karya Ilmiah Remaja) : auth + theme
   --------------------------------------------------------
   I use Supabase for authentication and data storage. JWT session
   tokens live in sessionStorage (tab-scoped). localStorage holds
   only UI preferences (theme, language, sidebar) and a non-secret
   kir_session flag for instant paint — never used as proof of auth.
   Admin checks call the server is_admin() RPC; RLS enforces access.

   The auth functions below integrate with Supabase to handle
   login, logout, and session management. Every page calls these
   same function names, so the rest of the site won't need to
   change if I update the auth implementation later.
   ========================================================== */

const SUPABASE_URL = 'https://qalkibuywgookvicnuhv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhbGtpYnV5d2dvb2t2aWNudWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMjg5OTEsImV4cCI6MjA5OTgwNDk5MX0.P1d6Mf3xQITOIyFMLPdFnji0awZj38Sj1K7HZe2n4Zc';
const KIR_AUTH_STORAGE_KEY = 'sb-qalkibuywgookvicnuhv-auth-token';
try { localStorage.removeItem(KIR_AUTH_STORAGE_KEY); } catch (e) { /* ignore */ }
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: window.sessionStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
}) : null;
window.supabaseClient = supabaseClient;

const KIR_SESSION_KEY  = 'kir_session';
const KIR_USER_ID_KEY  = 'kir_user_id';
const KIR_NAME_KEY     = 'kir_user_name';
const KIR_NICKNAME_KEY = 'kir_user_nickname';
const KIR_ROLE_KEY     = 'kir_user_role';
const KIR_CABANG_KEY   = 'kir_user_cabang';   // 'robotik' | 'sains' | 'both'
const KIR_AVATAR_KEY   = 'kir_user_avatar';   // base64 data URL, or absent
const KIR_THEME_KEY    = 'kir_theme';         // 'dark' | 'light'
const KIR_REDUCE_MOTION_KEY = 'kir_reduce_motion'; // 'true' | 'false'
const KIR_DISABLE_BRANCH_COLOR_KEY = 'kir_disable_branch_color'; // 'true' | 'false', see kirSetDisableBranchColor()
const KIR_LAST_CABANG_KEY = 'kir_last_cabang'; // survives logout, see kirLogin()
const KIR_LANG_KEY     = 'kir_lang';          // 'id' | 'en'
const KIR_SIDEBAR_COLLAPSED_KEY = 'kir_sidebar_collapsed'; // 'true' | 'false', persists across page loads
const KIR_SIDEBAR_POSITION_KEY = 'kir_sidebar_position'; // 'left' | 'right' | 'top' | 'bottom', default 'left'
const KIR_SIDEBAR_NAV_SCROLL_KEY = 'kir_sidebar_nav_scroll'; // JSON {top, left}, sessionStorage, see kirSaveNavScrollPos()
const KIR_ABOUT_ME_KEY = 'kir_user_about_me';   // free-form text, stored locally + synced to profiles.about_me
const KIR_BANNER_KEY   = 'kir_user_banner';      // CSS gradient string or data URL for the profile banner

const I18N = {
  id: { 
    chart_hint: 'Geser untuk menjelajah',
    tugas: 'Tugas', resources: 'Resources', course: 'Kursus', jadwal: 'Jadwal', anggota: 'Anggota', pengaturan: 'Pengaturan', beranda: 'Beranda', keluar: 'Keluar',
    robotik: 'Robotik', sains: 'Sains', both: 'Robotik & Sains',
    menu: 'Menu', akun: 'Akun', kir_long: 'Karya Ilmiah Remaja',
    profile_nickname_placeholder: 'Atur nama panggilan...', profile_about_empty: 'Klik untuk menambahkan sesuatu tentang diri kamu…',
    profile_about_placeholder: 'Ceritakan sesuatu tentang diri kamu…', profile_joined: 'Bergabung', profile_branch: 'Cabang',
    profile_role: 'Peran', profile_flags: 'bendera', profile_delta: 'Delta', profile_change_picture: 'Ganti foto profil',
    settings_desc: 'Kelola profil, cabang, dan tampilan akun kamu.',
    inbox: 'Kotak Masuk', inbox_desc: 'Pesan dan pemberitahuan kamu.', inbox_empty: 'Belum ada pesan.',
    inbox_empty_title: 'Belum ada pesan!', inbox_filter_all: 'Semua', inbox_filter_unread: 'Belum Dibaca',
    inbox_mark_all_read: 'Tandai Semua Dibaca', inbox_empty_unread_title: 'Semua sudah dibaca!', inbox_empty_unread_desc: 'Tidak ada pesan baru saat ini.',
    active_branch: 'Cabang Aktif', branch_desc: 'Cabang terdaftar kamu saat ini.',
    appearance_lang: 'Tampilan & Bahasa', change_lang: 'Ubah Bahasa',
    crop_title: 'Sesuaikan Foto', crop_hint: 'Seret untuk menggeser, geser slider untuk memperbesar.', crop_cancel: 'Batal', crop_save: 'Simpan',
    dashboard_sub: 'Berikut yang terjadi di Orbit minggu ini.',
    active_tasks: 'Tugas Aktif', due_this_week: 'jatuh tempo minggu ini', late: 'terlambat',
    upcoming_events: 'Acara Mendatang', up_next: 'Selanjutnya:', recent_activity: 'Aktivitas terbaru',
    tasks_desc: 'Semua yang ditugaskan ke ekstrakurikuler saat ini.', tasks_search_placeholder: 'Cari tugas…', assigned_to: 'Ditugaskan ke', due: 'Tenggat:', submitted: 'jawaban terkirim',
    status_progress: 'Sedang Dikerjakan', status_review: 'Menunggu Peninjauan', status_late: 'Terlambat', status_todo: 'Belum Dimulai', status_done: 'Selesai',
    modal_desc: 'Deskripsi tugas', modal_ans: 'Jawaban kamu', modal_upload: 'Klik untuk unggah file jawaban\u2026', modal_proto: 'Prototipe: file tidak benar-benar diunggah ke server, hanya nama filenya yang disimpan di browser kamu.',
    schedule_desc: 'Acara ekstrakurikuler mendatang, secara berurutan.', badge_next: 'Berikutnya',
    schedule_today_btn: 'Hari Ini', schedule_day_events: 'acara',
    schedule_no_events_day: 'Tidak ada acara pada tanggal ini.', schedule_add_event_day: 'Tambah acara di tanggal ini',
    schedule_select_day_hint: 'Pilih tanggal untuk melihat acaranya.',
    schedule_holiday_badge: 'Libur', schedule_leave_badge: 'Cuti Bersama',
    schedule_special_badge: 'Hari Spesial', schedule_world_snake_day: 'Hari Ular Sedunia',
    members_desc: 'Semua orang yang tergabung di KIR.', role_ketua: 'Ketua Ekstrakurikuler', role_wakil: 'Wakil Ketua', role_bendahara: 'Bendahara', role_anggota: 'Anggota', you: '(kamu)',
    resources_desc: 'Kursus yang tersedia untuk diikuti anggota ekstrakurikuler.',
    admin_search_placeholder: 'Cari nama, email, atau kelas…',
    clock_label: 'Jam', dash_heatmap: 'Kontribusi', dash_heatmap_less: 'Sedikit', dash_heatmap_more: 'Banyak', dash_heatmap_active_days: 'Hari aktif',
    dash_quicklinks: 'Tautan Cepat', dash_roster_title: 'Anggota Aktif', dash_roster_online: 'Sedang aktif',
    dash_edit: 'Edit', dash_save: 'Simpan', dash_edit_hint: 'Seret widget untuk memindahkan, tekan ikon ukuran untuk mengubah besarnya.', dash_reset: 'Kembalikan ke tampilan awal', dash_remove_widget: 'Hapus widget',
    dash_add_widget: 'Tambah Widget', dash_add_widget_desc: 'Pilih widget untuk ditambahkan ke dasbor kamu.', dash_no_more_widgets: 'Semua widget sudah ada di dasbor kamu.',
    empty_dash_tasks_title: 'Bebas tugas!', empty_dash_tasks_desc: 'Semua tugas sudah selesai atau belum ada tugas baru.',
    empty_dash_events_title: 'Belum ada acara', empty_dash_events_desc: 'Harap sabar, pengurus akan segera mengatur jadwal baru.',
    empty_dash_activity_title: 'Belum ada aktivitas', empty_dash_activity_desc: 'Kegiatan terbaru dari anggota akan muncul di sini.',
    dash_avg_per_day: 'rata-rata / hari', dash_highest_point: 'titik tertinggi',
    quote_by: 'Oleh', quote_refresh: 'Kutipan lain',
    dash_notes_title: 'Catatan', dash_notes_placeholder: 'Tulis sesuatu di sini...',
    events_soon: 'Segera', events_new_default: 'Acara Baru',
    widget_cat_profile_label: 'Profil Pengguna', widget_cat_profile_desc: 'Kartu ID keanggotaan kamu.',
    widget_cat_quote_label: 'Kutipan Harian', widget_cat_quote_desc: 'Motivasi acak untuk hari ini.',
    widget_cat_tasks_label: 'Tugas Aktif', widget_cat_tasks_desc: 'Ringkasan tugas yang sedang berjalan.',
    widget_cat_events_label: 'Acara Mendatang', widget_cat_events_desc: 'Acara klub berikutnya, sekilas.',
    widget_cat_deltas_label: 'Deltas', widget_cat_deltas_desc: 'Grafik perolehan poin kamu dari waktu ke waktu.',
    widget_cat_streak_label: 'Beruntun', widget_cat_streak_desc: 'Nyala si api streak harian kamu.',
    widget_cat_activity_label: 'Aktivitas Terbaru', widget_cat_activity_desc: 'Update terbaru dari tim kamu.',
    widget_cat_clock_label: 'Jam', widget_cat_clock_desc: 'Jam analog yang mengikuti warna cabang kamu.',
    widget_cat_leaderboard_label: 'Peringkat', widget_cat_leaderboard_desc: 'Peringkat deltas kamu di klub.',
    widget_cat_quicklinks_label: 'Tautan Cepat', widget_cat_quicklinks_desc: 'Jalan pintas ke halaman lain di Orbit.',
    widget_cat_notes_label: 'Catatan', widget_cat_notes_desc: 'Tulis catatan atau pengingat cepat.',
    widget_cat_heatmap_label: 'Peta Kontribusi', widget_cat_heatmap_desc: 'Sekilas seberapa aktif kamu tiap hari.',
    widget_cat_roster_label: 'Anggota Aktif', widget_cat_roster_desc: 'Siapa saja yang lagi aktif di klub.',
    empty_resources_title: 'Belum ada kursus di sini!', empty_resources_desc: 'Pengurus belum mengunggah kursus. Mohon bersabar, ya!',
    empty_schedule_title: 'Belum ada jadwal acara!', empty_schedule_desc: 'Kalender ekstrakurikuler masih kosong. Pengurus akan segera memperbaruinya.',
    empty_tasks_title: 'Belum ada tugas di sini!', empty_tasks_desc_none: 'Santai dulu, atau cek materi untuk belajar hal baru sementara pengurus menyiapkan kegiatan selanjutnya.', empty_tasks_desc_filtered: 'Coba ubah filter, atau cek lagi nanti.',
    no_answer_submitted: 'Belum ada jawaban dikirim.', rank_not_yet: 'Belum ada',
    empty_voyages_title: 'Tidak ada soal yang ditemukan!', empty_voyages_desc: 'Ubah pengaturan rating dan subjek, atau tunggu pengurus menambahkan soal baru.', empty_flagged_submissions: 'Tidak ada submission yang ditandai saat ini.',
    console_empty_input: '(kosong)', console_no_sample_testcase: 'Tidak ada sample test case.',
    admin_empty_pending: 'Tidak ada pendaftaran yang menunggu persetujuan.', admin_empty_approved: 'Belum ada anggota yang disetujui.', admin_empty_none_match: 'Tidak ada anggota yang cocok.', field_value_none: 'Tidak ada', field_not_filled: 'Tidak diisi',
    apply_filter_pending: 'Menunggu', apply_filter_approved: 'Disetujui', apply_filter_all: 'Semua',
    apply_status_pending: 'Menunggu', apply_status_approved: 'Disetujui', apply_status_pending_full: 'Menunggu Persetujuan',
    apply_no_name: 'Tanpa nama',
    apply_approve_btn: 'Setujui', apply_revoke_btn: 'Batalkan Persetujuan',
    apply_confirm_approve_title: 'Setujui pendaftaran ini?', apply_confirm_revoke_title: 'Batalkan persetujuan anggota ini?',
    apply_confirm_approve_msg: '"{name}" akan bisa langsung masuk ke akun mereka.', apply_confirm_revoke_msg: '"{name}" tidak akan bisa masuk sampai disetujui kembali.',
    apply_confirm_approve_label: 'Setujui', apply_confirm_revoke_label: 'Batalkan',
    apply_toast_approved: 'Anggota disetujui.', apply_toast_revoked: 'Persetujuan dibatalkan.',
    apply_edit_name_hint: 'Klik untuk mengedit nama', apply_name_empty_error: 'Nama tidak boleh kosong.',
    apply_name_save_error: 'Gagal menyimpan nama.', apply_name_saved: 'Nama berhasil disimpan.',
    apply_section_kelas_cabang: 'Kelas & Cabang', apply_section_latar_belakang: 'Latar Belakang', apply_section_prestasi: 'Prestasi', apply_section_minat_lomba: 'Tertarik Dengan Lomba',
    apply_field_cabang: 'Cabang', apply_field_kelas: 'Kelas', apply_field_ekskul_lain: 'Ekstrakurikuler Lain', apply_field_smp_asal: 'SMP Asal', apply_field_prestasi: 'Prestasi',
    apply_registered_at: 'Terdaftar',
    time_just_now: 'baru saja', time_minutes_ago: '{n} menit lalu', time_hours_ago: '{n} jam lalu', time_days_ago: '{n} hari lalu',
    idx_login: 'Masuk', idx_register: 'Daftar', idx_dash_badge: 'Dasbor Ekstrakurikuler',
    idx_hero_title: '“In Harmonia Innovatio”',
    idx_hero_subtitle: 'Platform generasi baru KIR.',
    idx_cta_1: 'Mulai menggunakan', idx_cta_2: 'Sudah punya akun? Masuk',
    idx_feat_heading: 'Alat bantu pengurus',
    idx_feat1_title: 'Pelacakan tugas', idx_feat1_desc: 'Pantau penanggung jawab tugas, tenggat waktu, dan status penyelesaian setiap kegiatan. Sistem ini memastikan seluruh proyek berjalan sesuai rencana.',
    idx_feat2_title: 'Jadwal ekstrakurikuler', idx_feat2_desc: 'Susun kalender ekstrakurikuler dalam linimasa sentral. Modul ini mencegah bentrok jadwal latihan, rapat, dan kompetisi.',
    idx_feat3_title: 'Koordinasi tim', idx_feat3_desc: 'Fasilitasi anggota memahami alur kerja dan minimalkan miskomunikasi. Ruang kerja terpadu ini menampung laporan progres aktual.',
    idx_branch_title: 'Pilihan cabang:',
    idx_branch_sub: 'Pilih cabang saat mendaftar untuk mengonfigurasi tampilan dasbor.',
    idx_branch_rob_sub: 'Fokus pada kegiatan rancang bangun, pemrograman, dan kompetisi robot. Modul ini menyediakan ruang eksplorasi ke berbagai bidang seperti mikrokontroler, pengembangan game, pengembangan web, pemanfaatan AI cerdas, dan logika otomasi.',
    idx_branch_sci_sub: 'Fokus pada praktik riset, eksperimen, dan penulisan karya ilmiah. Anggota mengembangkan hipotesis, menguji metodologi baru, serta mempersiapkan diri untuk OPSI dan kompetisi penelitian lainnya di sini.',
    idx_proker_heading: 'Rencana Kegiatan', idx_proker_sub: 'Daftar kegiatan cabang Robotik dan Sains untuk tahun ajaran ini. Fitur ini menjabarkan target mingguan dan persiapan perlombaan.', idx_proker_cta: 'Lihat Program Kerja',
    idx_katalog_heading: 'Karya Anggota', idx_katalog_sub: 'Kumpulan karya, proyek, dan penelitian yang dihasilkan anggota Robotik dan Sains dari tahun ke tahun.', idx_katalog_cta: 'Lihat Katalog',
    nav_faq: 'FAQ',
    idx_faq_heading: 'Pertanyaan Umum', idx_faq_sub: 'Klik pertanyaan untuk melihat jawabannya.',
    idx_faq_q1: 'Apa itu Orbit?', idx_faq_a1: 'Orbit adalah dasbor terpusat untuk KIR yang menyatukan pelacakan tugas, jadwal, dan koordinasi tim kedua cabang, Robotik dan Sains, dalam satu ruang kerja.',
    idx_faq_q2: 'Apa itu KIR?', idx_faq_a2: 'KIR (Karya Ilmiah Remaja) adalah ekstrakurikuler sekolah dengan dua cabang, Robotik dan Sains, tempat anggota berkarya lewat proyek teknik maupun riset ilmiah.',
    idx_faq_q3: 'Bagaimana cara bergabung?', idx_faq_a3: 'Klik tombol Daftar, isi formulir pendaftaran, lalu pilih cabang yang kamu minati. Pengurus akan meninjau pendaftaranmu sebelum akun diaktifkan.',
    idx_faq_q4: 'Apa saja kegiatan KIR?', idx_faq_a4: 'Latihan rutin diadakan setiap hari Kamis untuk kedua cabang. Robotik biasanya utak-atik C++ dan mengembangkan berbagai proyek, sementara Sains lebih banyak diskusi dan eksperimen.',
    idx_faq_q5: 'Apakah KIR punya Tutoring?', idx_faq_a5: 'Ada! Tutoring adalah salah satu program andalan kami, di mana kakak kelas mengajar adik kelas materi MIPA. Orbit juga akan segera dipakai untuk program ini, lengkap dengan kelas dan kursus di dalamnya.',
    idx_gallery_heading: 'Galeri', idx_gallery_sub: 'Arsip foto kegiatan dan rekaman visual acara ekstrakurikuler dalam format direktori.', idx_gallery_cta: 'Buka Galeri',
    idx_scroll_hint: 'Gulir untuk melihat',
    idx_footer: 'KIR menetapkan pusat gravitasi. Seluruh ekstrakurikuler akan mengorbit ruang ini.',
    idx_footer_meta: '© 2026 Karya Ilmiah Remaja · kirsman70@gmail.com',
    nav_fitur: 'Fitur', nav_cabang: 'Cabang',
    page_title_home: 'Orbit', page_title_dashboard: 'Beranda', page_title_tasks: 'Tugas',
    page_title_resources: 'Resources', page_title_course: 'Kursus', page_title_workspace: 'Workspace', page_title_schedule: 'Jadwal', page_title_members: 'Anggota',
    page_title_voyages: 'Voyages', page_title_leaderboard: 'Peringkat',
    page_title_settings: 'Pengaturan', page_title_program_kerja: 'Program Kerja', page_title_gallery: 'Galeri', page_title_katalog: 'Katalog', page_title_labs: 'Labs',
    page_title_inbox: 'Kotak Masuk',
    page_title_auth: 'Masuk atau Daftar',
    idx_open_dashboard: 'Buka Dasbor', idx_open_dashboard_hero: 'Buka dasbor kamu',
    greeting_morning: ['Selamat pagi, {name}', 'Pagi {name}! Udah melek?', 'Siap ngide hari ini, {name}?', 'Ayo mulai, {name}.', 'Sudah ngopi belum, {name}?', 'Semangat pagi, {name}! Hari baru, ide baru!', 'Mentari terbit, semangat {name} bangkit!', 'Siapkan amunisi ide kamu hari ini, {name}!', 'Sambut hari ini dengan karya terbaikmu, {name}!', 'Pagi yang cerah buat meluncurkan proyek baru, {name}!'],
    greeting_afternoon: ['Selamat siang, {name}', 'Masih fokus, {name}?', 'Lanjut nugas, {name}?', 'Jangan lupa minum, {name}.', 'Stay hydrated, {name}!', 'Siang {name}! Jangan lupa istirahat makan siang ya.', 'Energi masih full kan, {name}?', 'Tetap tenang dan terus berkarya, {name}!', 'Semangat tengah hari, {name}! Kamu pasti bisa.', 'Braking speed lumayan tinggi siang ini, {name}!'],
    greeting_evening: ['Selamat sore, {name}', 'Progres aman, {name}?', 'Hampir kelar, {name}?', 'Waktunya rehat bentar, {name}.', 'Satu push lagi, {name}!', 'Sore {name}! Nikmati senja sambil rapikan tugas.', 'Target hari ini udah tercapai belum, {name}?', 'Senja tiba, saatnya review hasil karya hari ini, {name}.', 'Sedikit lagi menuju garis finish hari ini, {name}!', 'Keren banget usaha kamu seharian ini, {name}!'],
    greeting_night: ['Selamat malam, {name}', 'Lagi dapet zone-nya ya, {name}?', 'Malam-malam gini emang paling pas ngide, {name}!', 'Tetap semangat, {name}!', 'Having a great time tonight, {name}?', 'Malam {name}! Suasana tenang buat fokus maksimal.', 'Ide-ide jenius biasa muncul jam segini nih, {name}!', 'Heningnya malam pendukung kreativitasmu, {name}.', 'Istirahat yang cukup nanti ya, {name}!', 'Lampu meja menyala, karya hebat tercipta, {name}!'],
    greeting_late_night: ['Jam-jam produktif nih, {name}!', 'Koding / nugas jam segini emang tiada tanding, {name}!', 'Brain in peak condition, {name}?', 'Lagi enak-enaknya fokus ya, {name}?', 'Night mode activated, {name}!', 'Dunia tidur, {name} masih beraksi!', 'Midnight coder / creator mode: ON, {name}!', 'Sunyi malam emang tempat ternyaman buat fokus, {name}.', 'Jangan lupa jaga kesehatan juga ya, {name}!', 'Bintang di langit kalah terang sama semangatmu, {name}!'],
    greeting_school_commute: ['Topi aman, {name}?', 'Seragam lengkap kan, {name}?', 'Dasi & kaos kaki aman, {name}?', 'Tugas di tas udah masuk, {name}?', 'Siap otw sekolah, {name}?', 'Sepatu & bekal udah, {name}?', 'Jangan telat masuk kelas, {name}!', 'Cek barang di tas dulu, {name}!', 'Helm / ongkos udah siap, {name}?', 'Botol minum udah kebawa, {name}?'],
    activity_today: 'Hari ini pukul', activity_yesterday: 'Kemarin pukul', activity_at: 'pukul',
    deltas_label: 'Deltas', this_week: 'minggu ini', all_time: 'sepanjang waktu', deltas_points: 'deltas',
    deltas_range_week: 'Minggu ini', deltas_range_lifetime: 'Sepanjang waktu',
    deltas_desc: 'Poin didapat dari mengerjakan soal latihan.',
    streak_label: 'streak', streak_days: 'streak',
    galeri: 'Galeri', program_kerja: 'Program Kerja',
    nav_beranda: 'Beranda', nav_galeri: 'Galeri', nav_proker: 'Program Kerja', nav_katalog: 'Katalog', nav_labs: 'Labs',
    gallery_title: 'Galeri', gallery_desc: 'Galeri kegiatan ekstrakurikuler, disusun jadi folder seperti berkas di komputer kamu. Klik folder untuk membuka, atau tombol ".." untuk kembali.',
    gallery_up: '.. Kembali', gallery_empty: 'Folder ini belum berisi file. Foto akan segera diunggah.',
    gallery_items_one: 'item', gallery_items_other: 'item',
    proker_eyebrow: 'Tahun Ajaran 2025/2026',
    proker_title: 'Program Kerja', proker_desc: 'Rencana kerja cabang Robotik dan Sains untuk tahun ajaran ini mencakup kegiatan latihan rutin hingga kompetisi.',
    proker_robotik_label: 'Cabang Robotik', proker_sains_label: 'Cabang Sains',
    proker_cta_title: 'Tertarik ikut program ini?', proker_cta_desc: 'Daftar sebagai anggota dan pilih cabang yang kamu minati untuk mendapatkan dasbor yang disesuaikan secara otomatis.',
    proker_cta_btn: 'Daftar Sekarang',
    wip_badge: 'Segera Hadir',
    gallery_wip_eyebrow: 'Galeri Foto', gallery_wip_title: 'Halaman ini sedang disiapkan',
    gallery_wip_desc: 'Kami sedang mengumpulkan foto kegiatan Robotik dan Sains untuk ditampilkan di sini. Nantikan galeri fotonya, ya!',
    proker_wip_eyebrow: 'Tahun Ajaran 2025/2026', proker_wip_title: 'Halaman ini sedang disiapkan',
    proker_wip_desc: 'Rincian program kerja cabang Robotik dan Sains untuk tahun ajaran ini sedang kami susun. Kembali lagi sebentar lagi, ya!',
    katalog_wip_eyebrow: 'Karya KIR', katalog_wip_title: 'Halaman ini sedang disiapkan',
    katalog_wip_desc: 'Kami sedang menyusun katalog karya dan proyek anggota Robotik dan Sains untuk ditampilkan di sini. Nantikan katalognya, ya!',
    labs_wip_eyebrow: 'KIR Labs', labs_wip_title: 'Halaman ini sedang disiapkan',
    labs_wip_desc: 'Kami sedang menyusun laboratorium virtual dan eksperimen KIR untuk ditampilkan di sini. Nantikan pembaruannya, ya!',
    labs_hero_badge: 'Orbit Utility Suite & Experimental Hub',
    labs_hero_desc: 'Kumpulan alat bantu produktivitas, olah gambar, generator naskah sains, dan kalkulator presisi tinggi untuk anggota Robotik & Sains. Semua berjalan langsung di browser kamu!',
    labs_search_ph: 'Cari tool (misal: "background", "rumus", "konverter", "QR")...',
    labs_terminal_placeholder: 'Ketik perintah atau cari tool...',
    latex_input_placeholder: 'Contoh: E = mc^2 atau \\frac{a}{b}',
    qr_input_placeholder: 'https://orbit.io atau ketik teks...',
    tool_bg_remover_title: 'Background Remover',
    tool_bg_remover_desc: 'Hapus latar belakang gambar secara instan langsung di browser dengan kontrol toleransi warna.',
    tool_img_converter_title: 'Kompresor & Konverter Gambar',
    tool_img_converter_desc: 'Ubah format gambar (PNG, JPG, WebP), ubah ukuran, dan optimalkan ukuran file tanpa kirim ke server.',
    tool_latex_studio_title: 'LaTeX & Math Studio',
    tool_latex_studio_desc: 'Generator rumus matematika & fisika untuk karya ilmiah KIR (OPSI/KTI) dengan preview real-time.',
    tool_unit_converter_title: 'Kalkulator Unit Sains & Robotik',
    tool_unit_converter_desc: 'Konverter satuan fisika, mekanika, dan elektronika (Panjang, Massa, Tekanan, Resistansi, Frekuensi).',
    tool_qr_studio_title: 'Generator QR Code & Label',
    tool_qr_studio_desc: 'Buat QR code kustom untuk pameran KIR, link berkas, atau label inventaris alat robotik.',
    tool_color_palette_title: 'Palet Warna & Kontras WCAG',
    tool_color_palette_desc: 'Generator kombinasi warna UI/Slide dan cek rasio kontras teks sesuai standar aksesibilitas.',
    tool_text_diff_title: 'Pembanding Teks & Code Diff',
    tool_text_diff_desc: 'Bandingkan dua naskah, kode Arduino/Python, atau draf jurnal untuk menemukan perubahan.',
    wip_back_home: 'Kembali ke Beranda', wip_check_back: 'Terima kasih atas kesabarannya!',
    labs_wip_title: 'Halaman ini sedang disiapkan',
    labs_wip_desc: 'Kami sedang merancang ruang eksperimen, perkakas interaktif, dan fitur laboratorium untuk anggota Orbit. Nantikan kejutannya, ya!',
    course_category: 'Kursus', nav_workspace: 'Workspace', nav_voyages: 'Voyages', nav_leaderboard: 'Peringkat',
    voyages_title: 'Voyages', voyages_desc: 'Latihan soal MIPA dan informatika. Selesaikan soal-soal ini untuk mengumpulkan deltas.',
    workspace_title: 'Workspace', workspace_desc: 'Lanjutkan progres kursus dan kumpulkan deltas kamu di sini.',
    course_my_courses: 'Kursus Saya', course_my_courses_desc: 'Berikut adalah daftar kursus yang sudah kamu ambil. Pilih salah satu untuk dibuka di sini.',
    course_new: 'Kursus Baru', course_empty_title: 'Kamu belum mengambil kursus apa pun.',
    course_empty_desc: 'Pilih kursus yang ingin kamu ikuti. Kursus tersebut akan langsung muncul di sini.',
    course_pick_btn: 'Pilih Kursus', course_open_btn: 'Buka Kursus Ini',
    course_steps_done: 'langkah selesai', course_status_active: 'Sedang Dibuka',
    course_card_menu: 'Opsi kursus', course_drop_btn: 'Keluar dari Kursus',
    course_drop_confirm: 'Yakin mau keluar dari kursus ini? Semua progres dan deltas dari kursus ini akan dihapus permanen dan tidak bisa dikembalikan.',
    course_drop_error: 'Gagal keluar dari kursus. Coba lagi.',
    course_programming_fallback: 'Voyage pemrograman belum bisa dikerjakan langsung dari halaman kursus.',
    course_programming_link: 'Buka di halaman Voyages', course_material_empty: 'Materi ini belum punya konten yang bisa ditampilkan.',
    course_mark_done: 'Tandai Selesai', course_feedback_incomplete: 'Jawab semua soal dulu sebelum mengirim.',
    course_feedback_incorrect: 'Ada jawaban yang belum tepat, coba lagi.', course_optional_badge: 'Opsional',
    course_locked_badge: 'Terkunci', course_open_material: 'Buka Materi', course_start_voyage: 'Mulai Voyage',
    course_start_flag: 'Mulai Flag', course_redo_voyage: 'Ulang Voyage', course_redo_flag: 'Ulang Flag', course_questions_count: 'Soal',
    course_material_new_tab: 'Buka dokumen di tab baru', course_video_new_tab: 'Buka video di tab baru',
    course_catalog_desc: 'Kursus yang tersedia untuk diikuti anggota ekstrakurikuler.',
    course_catalog_search: 'Cari kursus…', course_take: 'Ambil Kursus', course_taken: 'Kursus Diambil',
    course_modal_desc: 'Deskripsi Kursus',
    voyages_filter_all: 'Semua', voyages_filter_math: 'Matematika', voyages_filter_physics: 'Fisika', voyages_filter_informatika: 'Informatika',
    voyages_filter_chemistry: 'Kimia', voyages_filter_biology: 'Biologi', voyages_filter_selected: 'dipilih', voyages_filter_none: 'Tidak ada',
    voyages_filter_subject_label: 'Subjek', voyages_filter_type_label: 'Tipe',
    voyages_expedition_mode_label: 'Mode Ekspedisi', voyages_expedition_exit: 'Keluar Ekspedisi',
    voyages_expedition_empty: 'Semua voyage yang cocok dengan filter kamu sudah selesai.',
    voyages_expedition_fullscreen_required: 'Mode layar penuh diperlukan untuk memulai Ekspedisi.',
    voyages_expedition_fullscreen_unsupported: 'Perangkat ini tidak mendukung mode layar penuh.',
    voyages_expedition_complete: 'Ekspedisi selesai! Kamu telah menyelesaikan semua voyage yang cocok.',
    voyages_search_placeholder: 'Cari soal…', voyages_search_label: 'Cari',voyages_search_placeholder: 'Cari soal…',
 voyages_reward: 'Ganjaran',
    voyages_sort_label: 'Urutkan', voyages_sort_random: 'Acak', voyages_sort_diff_asc: 'Rating: Rendah ke Tinggi',
    voyages_sort_diff_desc: 'Rating: Tinggi ke Rendah', voyages_sort_title_az: 'Judul: A ke Z', voyages_sort_newest: 'Terbaru',
    voyages_grading_analyzing: 'Menilai jawaban dengan Penilaian Cerdas…',
    voyages_grading_result_title: 'Hasil Penilaian Cerdas',
    voyages_grading_strengths: 'Kelebihan Jawaban',
    voyages_grading_improvements: 'Poin untuk Ditingkatkan',
    voyages_grading_model: 'Dinilai oleh',
    voyages_grading_failed: 'Gagal memproses penilaian otomatis. Coba lagi.',
    voyages_grading_retry: 'Coba Lagi',
    voyages_grading_locked: 'Nilai Sempurna',
    voyages_earned_label: 'Ganjaran didapat',
    voyages_start: 'Mulai Soal', voyages_continue: 'Lihat Lagi', voyages_completed: 'Selesai',
    voyages_type_mc: 'Pilihan Ganda', voyages_type_dropdown: 'Dropdown', voyages_type_essay: 'Esai', voyages_type_programming: 'Kompetitif (Programming)',
    voyages_bahasa: 'Bahasa',
    voyages_run_samples: 'Jalankan', voyages_console_tests: 'Test Case', voyages_console_output: 'Konsol',
    voyages_console_empty: 'Menunggu kode dijalankan…', voyages_console_running: 'Menjalankan kode…',
    voyages_submit: 'Kirim Jawaban', voyages_next: 'Selanjutnya', voyages_prev: 'Sebelumnya', voyages_close: 'Tutup',
    voyages_correct: 'Jawaban benar!', voyages_correct_plural: 'Jawaban-jawaban benar!', voyages_incorrect: 'Belum tepat, coba lagi.',
    voyages_earned: 'deltas didapat', voyages_essay_sent: 'Esai terkirim untuk ditinjau pengurus.',
    voyages_choose_answer: 'Pilih salah satu jawaban di bawah.', voyages_choose_dropdown: 'Pilih jawaban dari menu di bawah.',
    voyages_pick_placeholder: 'Pilih jawaban', voyages_your_answer: 'Jawaban esai kamu',
    voyages_essay_placeholder: 'Tulis jawaban esai kamu di sini…',
    voyages_preview_label: 'Pratinjau', voyages_preview_empty: 'Pratinjau rumus akan muncul di sini…',
    voyages_already_done: 'Kamu sudah menyelesaikan soal ini sebelumnya.',
    leaderboard_title: 'Peringkat', leaderboard_desc: 'Peringkat deltas seluruh anggota KIR.',
    leaderboard_you: 'Kamu', leaderboard_rank: 'Peringkat', leaderboard_member: 'Anggota', leaderboard_deltas: 'Deltas',
    leaderboard_your_rank: 'Peringkat kamu', leaderboard_range_week: 'Minggu Ini', leaderboard_range_month: 'Bulan Ini', leaderboard_range_all: 'Sepanjang Waktu',
    leaderboard_search_placeholder: 'Cari anggota…', leaderboard_branch_all: 'Semua Cabang', leaderboard_no_results: 'Tidak ada anggota yang cocok.',
    comments_title: 'Komentar', comments_placeholder: 'Tulis komentar…', comments_send: 'Kirim',
    comments_empty: 'Belum ada komentar. Inisiatif menjadi pertama!', comments_attach: 'Lampirkan file',
    comments_delete: 'Hapus', comments_too_large: 'Pilih file di bawah 1.5MB (prototipe menyimpan ini di browser kamu).',
    comments_reply: 'Balas', comments_reply_placeholder: 'Tulis balasan…', comments_cancel: 'Batal',
    theme_light: 'Mode Terang',
    reduce_motion: 'Kurangi Gerakan', reduce_motion_desc: 'Nonaktifkan semua animasi dan transisi untuk meningkatkan kinerja.',
    disable_branch_color: 'Nonaktifkan Warna Cabang', disable_branch_color_desc: 'Tampilkan aksen netral (putih/hitam) alih-alih warna cabang kamu.',
    taskbar_position: 'Posisi Taskbar', taskbar_position_desc: 'Pilih sisi layar tempat menu navigasi ditampilkan.',
    taskbar_position_locked_desc: 'Posisi taskbar hanya bisa diatur di layar desktop.',
    pos_left: 'Kiri', pos_right: 'Kanan', pos_top: 'Atas', pos_bottom: 'Bawah',
    danger_zone_title: 'Zona Berbahaya', danger_zone_desc: 'Tindakan di bawah ini bersifat permanen dan tidak dapat dibatalkan.',
    reset_voyages_title: 'Reset Kursus', reset_voyages_desc: 'Menghapus semua progres kursus yang sudah kamu ambil dan mengatur ulang deltas kamu ke 0.', reset_voyages_btn: 'Reset',
    reset_voyages_confirm_title: 'Kamu yakin?',
    reset_voyages_confirm_desc: 'Semua progres kursus yang sudah kamu ambil akan dihapus dan deltas kamu akan kembali ke 0. Tindakan ini tidak dapat dibatalkan.',
    reset_voyages_confirm_hint: 'Ketik "SAYA YAKIN" di bawah untuk melanjutkan.', reset_voyages_confirm_placeholder: 'SAYA YAKIN', reset_voyages_confirm_phrase: 'SAYA YAKIN',
    reset_voyages_confirm_btn: 'Reset Kursus', reset_voyages_cancel: 'Batal', reset_voyages_processing: 'Mereset…',
    reset_voyages_success: 'Progres kursus kamu berhasil direset.', reset_voyages_error: 'Gagal mereset kursus. Coba lagi.',
    logout_all_btn: 'Keluar dari Semua Perangkat',
    logout_all_confirm_title: 'Keluar dari semua perangkat?',
    logout_all_confirm_desc: 'Kamu akan keluar dari semua sesi aktif di semua perangkat, termasuk browser ini. Kamu perlu masuk lagi di mana pun.',
    logout_all_cancel: 'Batal', logout_all_confirm_btn: 'Keluar dari Semua Perangkat', logout_all_processing: 'Memproses…',
    logout_all_error: 'Gagal keluar dari semua perangkat. Coba lagi.',

    admin_title: 'Admin Panel', admin_desc: 'Tinjau dan kelola pendaftaran anggota baru.',
    admin_tab_tasks: 'Tugas', admin_tab_schedule: 'Jadwal', admin_tab_materials: 'Materi', admin_tab_voyages: 'Voyages',
    admin_task_title_label: 'Judul Tugas', admin_task_title_placeholder: 'Masukkan judul…',
    admin_due_label: 'Tenggat Waktu (Due)', admin_pick_date: 'Pilih tanggal',
    admin_type_label: 'Tipe', admin_type_ekskul: 'Ekstrakurikuler', admin_type_individual: 'Individual', admin_type_kelompok: 'Kelompok',
    admin_cabang_label: 'Cabang', admin_cabang_both: 'Robotik & Sains',
    admin_assign_mode_label: 'Mode Penugasan', admin_assign_everyone: 'Semua Anggota Cabang', admin_assign_specific: 'Orang Tertentu',
    admin_assignee_label: 'Penerima (Assignee)', admin_assignee_placeholder: 'Nama anggota…', admin_assignee_hint: 'Masukkan satu atau lebih nama, pisahkan dengan koma.',
    admin_desc_label: 'Deskripsi', admin_desc_placeholder: 'Jelaskan detail tugas…',
    admin_image_label: 'Gambar', admin_image_upload: 'Klik untuk unggah gambar…',
    admin_save_task: 'Simpan Tugas',
    admin_event_name_label: 'Nama Acara', admin_event_name_placeholder: 'Masukkan nama acara…',
    admin_datetime_label: 'Waktu & Tanggal', admin_time_label: 'Jam',
    admin_location_label: 'Lokasi', admin_location_placeholder: 'Ruang 214, Student Union',
    admin_save_schedule: 'Simpan Jadwal',
    admin_material_title_label: 'Judul Materi', admin_material_title_placeholder: 'Masukkan judul…',
    admin_material_desc_label: 'Deskripsi Singkat', admin_material_desc_placeholder: 'Ringkasan materi…',
    admin_action_type_label: 'Jenis Tindakan', admin_action_link: 'Buka Tautan', admin_action_upload: 'Unggah File',
    admin_url_label: 'Tautan / URL File', admin_file_upload_label: 'Unggah File',
    admin_material_cabang_label: 'Cabang Materi', admin_material_cabang_all: 'Semua Cabang',
    admin_save_material: 'Simpan Materi',
    resources_search_placeholder: 'Cari kursus…', materials_filter_cabang: 'Cabang', materials_all_branches: 'Semua Cabang',
    admin_subject_label: 'Subjek', admin_subject_math: 'Matematika', admin_subject_physics: 'Fisika',
    admin_subject_chemistry: 'Kimia', admin_subject_biology: 'Biologi', admin_subject_informatika: 'Informatika',
    admin_rating_label: 'Rating',
    admin_question_type_label: 'Tipe Soal', admin_type_mc: 'Pilihan Ganda', admin_type_dropdown: 'Dropdown', admin_type_essay: 'Esai',
    admin_question_title_label: 'Judul Soal', admin_question_title_placeholder: 'Masukkan judul pertanyaan…',
    admin_question_text_label: 'Teks Soal', admin_question_text_placeholder: 'Tuliskan pertanyaan lengkap… (gunakan tombol simbol di atas)',
    admin_math_hint: 'Gunakan tombol di atas untuk menyisipkan simbol matematika tanpa mengetik LaTeX secara manual.',
    admin_preview_label: 'Pratinjau',
    admin_options_label: 'Opsi Jawaban', admin_options_hint: 'Tandai lingkaran di samping opsi untuk menjadikannya jawaban yang benar.',
    admin_option_placeholder: 'Tulis opsi jawaban…', admin_add_option: 'Tambah Opsi',
    admin_essay_ref_label: 'Jawaban Referensi',
    admin_essay_ref_placeholder: 'Tulis kunci jawaban atau poin-poin penting untuk peninjauan pengurus…',
    admin_save_voyage: 'Simpan Voyage',
    admin_view_json: 'Edit JSON', admin_upload_json: 'Unggah JSON',
    admin_json_editor_title: 'JSON Editor', admin_load_json: 'Muat dari JSON', admin_export_json: 'Ekspor ke JSON', admin_close: 'Tutup',
    admin_json_uploader_title: 'Unggah Voyage JSON', admin_drag_drop_json: 'Tarik file JSON di sini atau klik untuk memilih', admin_clear: 'Bersihkan',
    admin_math_frac: 'Pecahan', admin_math_pow: 'Pangkat', admin_math_sub: 'Subskrip', admin_math_sqrt: 'Akar', admin_math_greek: 'Yunani',
    admin_toast_tasks: 'Tugas berhasil ditambahkan!', admin_toast_schedule: 'Jadwal berhasil ditambahkan!',
    admin_toast_materials: 'Materi berhasil ditambahkan!', admin_toast_voyages: 'Voyage berhasil ditambahkan!',
    admin_error_need_2_options: 'Tambahkan minimal 2 opsi jawaban.', admin_error_need_correct: 'Pilih satu jawaban yang benar terlebih dahulu.',
    admin_error_need_date: 'Pilih tanggal terlebih dahulu.', admin_cal_today: 'Hari ini', admin_cal_clear: 'Hapus',
    voyages_difficulty: 'Rating', voyages_osn_level: 'Level OSN',
    voyages_alt_precise_title: 'Geser presisi', voyages_alt_precise_body: 'Tahan Alt sambil menyeret untuk mengatur rating dengan presisi 2 desimal, bukan hanya angka bulat.',
    redirect_evaluasi_title: 'Mengarahkan ke Form Evaluasi...',
    redirect_evaluasi_desc: 'Anda akan diarahkan ke form evaluasi pengurus KIR secara otomatis.',
    redirect_pendataan_title: 'Mengarahkan ke Form Pendataan...',
    redirect_pendataan_desc: 'Anda akan diarahkan ke form pendataan anggota KIR secara otomatis.',
    redirect_click_here: 'Click here if you\'re not redirected yet'
  },
  en: {
    chart_hint: 'Pan to explore',
    tugas: 'Tasks', resources: 'Resources', course: 'Course', jadwal: 'Schedule', anggota: 'Members', pengaturan: 'Settings', beranda: 'Home', keluar: 'Log Out',
    robotik: 'Robotics', sains: 'Science', both: 'Robotics and Science',
    menu: 'Menu', akun: 'Account', kir_long: 'Karya Ilmiah Remaja',
    settings_desc: 'Manage your profile, branch, and account appearance.',
    inbox: 'Inbox', inbox_desc: 'Your messages and notifications.', inbox_empty: 'No messages yet.',
    inbox_empty_title: 'No messages yet!', inbox_filter_all: 'All', inbox_filter_unread: 'Unread',
    inbox_mark_all_read: 'Mark All as Read', inbox_empty_unread_title: 'All caught up!', inbox_empty_unread_desc: 'No new messages right now.',
    active_branch: 'Active Branch', branch_desc: 'Your currently registered branch.',
    appearance_lang: 'Appearance & Language', change_lang: 'Change Language',
    crop_title: 'Adjust Photo', crop_hint: 'Drag to reposition, use the slider to zoom.', crop_cancel: 'Cancel', crop_save: 'Save',
    dashboard_sub: "Here's what's happening in Orbit this week.",
    active_tasks: 'Active Tasks', due_this_week: 'due this week', late: 'late',
    upcoming_events: 'Upcoming Events', up_next: 'Up next:', recent_activity: 'Recent activity',
    tasks_desc: 'Everything currently assigned to the extracurricular.', tasks_search_placeholder: 'Search tasks…', assigned_to: 'Assigned to', due: 'Due:', submitted: 'submission sent',
    status_progress: 'In Progress', status_review: 'Pending Review', status_late: 'Overdue', status_todo: 'Not Started', status_done: 'Completed',
    modal_desc: 'Task description', modal_ans: 'Your submission', modal_upload: 'Click to upload submission file\u2026', modal_proto: 'Prototype: files are not actually uploaded to a server, only the filename is stored in your browser.',
    schedule_desc: 'Upcoming extracurricular events, in chronological order.', badge_next: 'Next',
    schedule_today_btn: 'Today', schedule_day_events: 'events',
    schedule_no_events_day: 'No events on this date.', schedule_add_event_day: 'Add an event on this date',
    schedule_select_day_hint: 'Pick a date to see its events.',
    schedule_holiday_badge: 'Holiday', schedule_leave_badge: 'Collective Leave',
    schedule_special_badge: 'Special Day', schedule_world_snake_day: 'World Snake Day',
    members_desc: 'Everyone currently in KIR.', role_ketua: 'Extracurricular President', role_wakil: 'Vice President', role_bendahara: 'Treasurer', role_anggota: 'Member', you: '(you)',
    resources_desc: 'Courses available for club members to attend.',
    admin_search_placeholder: 'Search by name, email, or class…',
    clock_label: 'Clock', dash_heatmap: 'Contributions', dash_heatmap_less: 'Less', dash_heatmap_more: 'More', dash_heatmap_active_days: 'Active days',
    dash_quicklinks: 'Quick Links', dash_roster_title: 'Active Members', dash_roster_online: 'Currently active',
    dash_edit: 'Edit', dash_save: 'Save', dash_edit_hint: 'Drag widgets to move them, tap the resize icon to change their size.', dash_reset: 'Reset to default layout', dash_remove_widget: 'Remove widget',
    dash_add_widget: 'Add Widget', dash_add_widget_desc: 'Choose a widget to add to your dashboard.', dash_no_more_widgets: 'All widgets are already on your dashboard.',
    empty_dash_tasks_title: 'All caught up!', empty_dash_tasks_desc: 'All tasks are done, or there aren\u2019t any new ones yet.',
    empty_dash_events_title: 'No events yet', empty_dash_events_desc: 'Hang tight, organizers will schedule something new soon.',
    empty_dash_activity_title: 'No activity yet', empty_dash_activity_desc: 'Recent activity from members will show up here.',
    dash_avg_per_day: 'avg / day', dash_highest_point: 'highest point',
    quote_by: 'By', quote_refresh: 'Another quote',
    dash_notes_title: 'Notes', dash_notes_placeholder: 'Write something here...',
    events_soon: 'Soon', events_new_default: 'New Event',
    widget_cat_profile_label: 'User Profile', widget_cat_profile_desc: 'Your membership ID card.',
    widget_cat_quote_label: 'Daily Quote', widget_cat_quote_desc: 'Random motivation for today.',
    widget_cat_tasks_label: 'Active Tasks', widget_cat_tasks_desc: 'A summary of your ongoing tasks.',
    widget_cat_events_label: 'Upcoming Events', widget_cat_events_desc: 'The club\u2019s next events, at a glance.',
    widget_cat_deltas_label: 'Deltas', widget_cat_deltas_desc: 'A chart of your points earned over time.',
    widget_cat_streak_label: 'Streak', widget_cat_streak_desc: 'Your daily streak flame.',
    widget_cat_activity_label: 'Recent Activity', widget_cat_activity_desc: 'The latest updates from your team.',
    widget_cat_clock_label: 'Clock', widget_cat_clock_desc: 'An analog clock that follows your branch color.',
    widget_cat_leaderboard_label: 'Leaderboard', widget_cat_leaderboard_desc: 'Your deltas ranking in the club.',
    widget_cat_quicklinks_label: 'Quick Links', widget_cat_quicklinks_desc: 'Shortcuts to other pages in Orbit.',
    widget_cat_notes_label: 'Notes', widget_cat_notes_desc: 'Write a quick note or reminder.',
    widget_cat_heatmap_label: 'Contribution Map', widget_cat_heatmap_desc: 'A glance at how active you are each day.',
    widget_cat_roster_label: 'Active Members', widget_cat_roster_desc: 'Who\u2019s currently active in the club.',
    empty_resources_title: 'No courses here yet!', empty_resources_desc: 'The organizers haven\u2019t uploaded any courses yet. Hang tight!',
    empty_schedule_title: 'No events scheduled yet!', empty_schedule_desc: 'The extracurricular calendar is still empty. The organizers will update it soon.',
    empty_tasks_title: 'No tasks here yet!', empty_tasks_desc_none: 'Take it easy, or check out the materials to learn something new while the organizers prepare what\u2019s next.', empty_tasks_desc_filtered: 'Try changing the filter, or check back later.',
    no_answer_submitted: 'No answer submitted yet.', rank_not_yet: 'Not yet',
    empty_voyages_title: 'No questions found!', empty_voyages_desc: 'Adjust the rating or subject settings, or wait for organizers to add new questions.', empty_flagged_submissions: 'No flagged submissions right now.',
    console_empty_input: '(empty)', console_no_sample_testcase: 'No sample test cases.',
    admin_empty_pending: 'No registrations waiting for approval.', admin_empty_approved: 'No approved members yet.', admin_empty_none_match: 'No matching members.', field_value_none: 'None', field_not_filled: 'Not filled in',
    apply_filter_pending: 'Pending', apply_filter_approved: 'Approved', apply_filter_all: 'All',
    apply_status_pending: 'Pending', apply_status_approved: 'Approved', apply_status_pending_full: 'Pending Approval',
    apply_no_name: 'No name',
    apply_approve_btn: 'Approve', apply_revoke_btn: 'Revoke Approval',
    apply_confirm_approve_title: 'Approve this registration?', apply_confirm_revoke_title: 'Revoke this member\u2019s approval?',
    apply_confirm_approve_msg: '\u201c{name}\u201d will be able to log straight into their account.', apply_confirm_revoke_msg: '\u201c{name}\u201d won\u2019t be able to log in until approved again.',
    apply_confirm_approve_label: 'Approve', apply_confirm_revoke_label: 'Revoke',
    apply_toast_approved: 'Member approved.', apply_toast_revoked: 'Approval revoked.',
    apply_edit_name_hint: 'Click to edit name', apply_name_empty_error: 'Name can\u2019t be empty.',
    apply_name_save_error: 'Failed to save name.', apply_name_saved: 'Name saved.',
    apply_section_kelas_cabang: 'Class & Branch', apply_section_latar_belakang: 'Background', apply_section_prestasi: 'Achievements', apply_section_minat_lomba: 'Interested In Competitions',
    apply_field_cabang: 'Branch', apply_field_kelas: 'Class', apply_field_ekskul_lain: 'Other Extracurriculars', apply_field_smp_asal: 'Previous School', apply_field_prestasi: 'Achievements',
    apply_registered_at: 'Registered',
    time_just_now: 'just now', time_minutes_ago: '{n}m ago', time_hours_ago: '{n}h ago', time_days_ago: '{n}d ago',
    idx_login: 'Log In', idx_register: 'Register', idx_dash_badge: 'Club Dashboard',
    idx_hero_title: '“In Harmonia Innovatio”',
    idx_hero_subtitle: 'Next-generation platform for KIR.',
    idx_cta_1: 'Get started', idx_cta_2: 'Already have an account? Log In',
    idx_feat_heading: 'Organizer tools',
    idx_feat1_title: 'Task tracking', idx_feat1_desc: 'Monitor task assignees, deadlines, and completion statuses for every activity. This system ensures all projects proceed according to plan.',
    idx_feat2_title: 'Extracurricular schedule', idx_feat2_desc: 'Organize the extracurricular calendar into a central timeline. This module prevents scheduling conflicts for training sessions and competitions.',
    idx_feat3_title: 'Team coordination', idx_feat3_desc: 'Help members understand workflows and minimize miscommunication. This unified workspace accommodates real-time progress reports.',
    idx_branch_title: 'Branch selection:',
    idx_branch_sub: 'Select a branch during registration to configure the dashboard.',
    idx_branch_rob_sub: 'Focus on robot engineering, programming, and competitions. This module provides exploration into various fields such as microcontrollers, game development, web development, smart AI usage, and automation logic.',
    idx_branch_sci_sub: 'Focus on research practice, experiments, and scientific papers. Members develop hypotheses, test new methodologies, and prepare for OPSI and other research competitions here.',
    idx_proker_heading: 'Activity Plan', idx_proker_sub: 'List of Robotics and Science activities for this school year. This feature outlines weekly targets and competition preparations.', idx_proker_cta: 'View Work Programs',
    idx_katalog_heading: 'Member Works', idx_katalog_sub: 'A collection of projects, works, and research produced by Robotics and Science members over the years.', idx_katalog_cta: 'View Catalog',
    nav_faq: 'FAQ',
    idx_faq_heading: 'Frequently Asked Questions', idx_faq_sub: 'Click a question to see the answer.',
    idx_faq_q1: 'What is Orbit?', idx_faq_a1: 'Orbit is a centralized dashboard for KIR that brings together task tracking, scheduling, and team coordination for both branches, Robotics and Science, in one workspace.',
    idx_faq_q2: 'What is KIR?', idx_faq_a2: 'KIR (Karya Ilmiah Remaja / Youth Scientific Work) is a school extracurricular with two branches, Robotics and Science, where members build things through engineering projects or scientific research.',
    idx_faq_q3: 'How do I join?', idx_faq_a3: 'Click the Register button, fill in the registration form, then choose the branch you\u2019re interested in. An organizer will review your registration before your account is activated.',
    idx_faq_q4: 'What does KIR usually do?', idx_faq_a4: 'Regular sessions run every Thursday for both branches. Robotics usually means messing around with C++ and building various projects, while Science is mostly discussion and experiments.',
    idx_faq_q5: 'Does KIR have Tutoring?', idx_faq_a5: 'We do! Tutoring is one of our proud programs, where senior students teach STEM subjects to younger members. Orbit will soon be used for this too, complete with courses and classes built in.',
    idx_gallery_heading: 'Gallery', idx_gallery_sub: 'Archive of extracurricular activity photos and event recordings in directory format.', idx_gallery_cta: 'Open Gallery',
    idx_scroll_hint: 'Scroll to view',
    idx_footer: 'KIR sets the gravity. Every extracurricular will orbit this core.',
    idx_footer_meta: '© 2026 Karya Ilmiah Remaja (KIR) · kirsman70@gmail.com',
    nav_fitur: 'Features', nav_cabang: 'Branches',
    idx_dashboard: 'Dashboard', idx_open_dashboard: 'Open Dashboard', idx_open_dashboard_hero: 'Open your dashboard',
    greeting_morning: ['Good morning, {name}', 'Morning {name}! Awake yet?', 'Ready to brainstorm, {name}?', 'Let\'s get to it, {name}.', 'Coffee loaded, {name}?', 'Rise and shine, {name}! Fresh day, fresh ideas.', 'Great morning to build something amazing, {name}!', 'Ready to tackle today\'s goals, {name}?', 'Morning vibes hit different when you\'re ready, {name}!', 'Fuel up and let\'s create, {name}!'],
    greeting_afternoon: ['Good afternoon, {name}', 'Still focused, {name}?', 'Back to work, {name}?', 'Don\'t forget to drink, {name}.', 'Stay hydrated, {name}!', 'Afternoon check-in: how\'s the flow, {name}?', 'Powering through the day like a champ, {name}!', 'Midday momentum in full effect, {name}!', 'Take a quick stretch break, {name}!', 'Keep up the incredible energy, {name}!'],
    greeting_evening: ['Good evening, {name}', 'Making progress, {name}?', 'Almost done, {name}?', 'Time for a quick break, {name}.', 'One final push, {name}!', 'Evening golden hour, {name}! Time to wrap up nicely.', 'Great work done today, {name}!', 'Slowing down or powering through, {name}?', 'Reflecting on today\'s achievements, {name}.', 'Almost at the finish line for today, {name}!'],
    greeting_night: ['Good evening, {name}', 'In the zone tonight, {name}?', 'Having a great time cooking up ideas, {name}?', 'Prime focus hours, {name}!', 'Night mode activated, {name}!', 'Peaceful evening vibes for deep work, {name}.', 'Brilliant minds shine brightest at night, {name}!', 'Night owl productivity engaged, {name}!', 'Crafting quality stuff tonight, {name}!', 'Remember to get enough rest later, {name}!'],
    greeting_late_night: ['Peak brain performance hours, {name}!', 'Having a great time building, {name}?', 'Midnight brilliance unlocked, {name}!', 'The quiet hours hit different, {name}.', 'Flow state engaged, {name}!', 'While the world sleeps, {name} creates!', 'Late night focus levels are off the charts, {name}!', 'Unstoppable midnight drive, {name}!', 'Midnight inspiration at maximum capacity, {name}!', 'Legendary late night session, {name}!'],
    greeting_school_commute: ['Hat & tie ready, {name}?', 'Uniform all set, {name}?', 'Socks & shoes on, {name}?', 'Homework in your bag, {name}?', 'Ready to head to school, {name}?', 'Water bottle packed, {name}?', 'Don\'t be late for class, {name}!', 'Backpack checked, {name}?', 'All prepped for school, {name}?', 'Safe travels to school, {name}!'],
    activity_today: 'Today at', activity_yesterday: 'Yesterday at', activity_at: 'at',
    deltas_label: 'Deltas', this_week: 'this week', all_time: 'all time', deltas_points: 'deltas',
    deltas_range_week: 'This Week', deltas_range_lifetime: 'Lifetime',
    deltas_desc: 'Points earned by completing practice questions.',
    streak_label: 'streak', streak_days: 'streak',
    galeri: 'Gallery', program_kerja: 'Work Programs',
    nav_beranda: 'Home', nav_galeri: 'Gallery', nav_proker: 'Work Programs', nav_katalog: 'Catalog', nav_labs: 'Labs',
    profile_nickname_placeholder: 'Set a nickname...', profile_about_empty: 'Click to add something about yourself…',
    profile_about_placeholder: 'Tell people something about yourself…', profile_joined: 'Joined', profile_branch: 'Branch',
    profile_role: 'Role', profile_flags: 'flags', profile_delta: 'Delta', profile_change_picture: 'Change profile picture',
    gallery_title: 'Gallery', gallery_desc: 'Gallery from club activities, organized into folders just like the files on your computer. Click a folder to open it, or ".." to go back.',
    gallery_up: '.. Back', gallery_empty: 'This folder is still empty. Photos are coming soon.',
    gallery_items_one: 'item', gallery_items_other: 'items',
    proker_eyebrow: '2025/2026 School Year',
    proker_title: 'Work Programs', proker_desc: 'The Robotics and Science branch work plans for this school year range from weekly training to competitions.',
    proker_robotik_label: 'Robotics Branch', proker_sains_label: 'Science Branch',
    proker_cta_title: 'Interested in joining a program?', proker_cta_desc: 'Register as a member and choose your preferred branch to get an automatically adjusted dashboard.',
    proker_cta_btn: 'Register Now',
    wip_badge: 'Coming Soon',
    gallery_wip_eyebrow: 'Photo Gallery', gallery_wip_title: 'This page is being prepared',
    gallery_wip_desc: 'We\u2019re gathering photos from Robotics and Science activities to show here. Stay tuned for the photo gallery!',
    proker_wip_eyebrow: '2025/2026 School Year', proker_wip_title: 'This page is being prepared',
    proker_wip_desc: 'The details of the Robotics and Science branch work programs for this school year are still being put together. Check back soon!',
    katalog_wip_eyebrow: 'KIR Showcase', katalog_wip_title: 'This page is being prepared',
    katalog_wip_desc: 'We\u2019re putting together a catalog of member projects and works from Robotics and Science to show here. Stay tuned!',
    labs_wip_eyebrow: 'KIR Labs', labs_wip_title: 'This page is being prepared',
    labs_wip_desc: 'We\u2019re putting together virtual labs and experiments for KIR to show here. Stay tuned!',
    labs_hero_badge: 'Orbit Utility Suite & Experimental Hub',
    labs_hero_desc: 'A collection of productivity tools, image utilities, science paper generators, and high-precision calculators for Robotics & Science members. All running right in your browser!',
    labs_search_ph: 'Search tool (e.g. "background", "formula", "converter", "QR")...',
    labs_terminal_placeholder: 'Type a command or search for a tool...',
    latex_input_placeholder: 'Example: E = mc^2 or \\frac{a}{b}',
    qr_input_placeholder: 'https://orbit.io or enter text...',
    tool_bg_remover_title: 'Background Remover',
    tool_bg_remover_desc: 'Instantly remove image background directly in your browser with color tolerance controls.',
    tool_img_converter_title: 'Image Compressor & Converter',
    tool_img_converter_desc: 'Convert image format (PNG, JPG, WebP), resize, and optimize file size without uploading to a server.',
    tool_latex_studio_title: 'LaTeX & Math Studio',
    tool_latex_studio_desc: 'Math & Physics equation generator for KIR scientific papers (OPSI/KTI) with real-time preview.',
    tool_unit_converter_title: 'Science & Robotics Unit Calculator',
    tool_unit_converter_desc: 'Unit converter for physics, mechanics, and electronics (Length, Mass, Pressure, Resistance, Frequency).',
    tool_qr_studio_title: 'QR Code & Label Generator',
    tool_qr_studio_desc: 'Create custom QR codes for KIR exhibitions, document links, or robotics inventory tags.',
    tool_color_palette_title: 'Color Palette & WCAG Contrast',
    tool_color_palette_desc: 'UI/Slide color scheme generator and text contrast checker compliant with accessibility standards.',
    tool_text_diff_title: 'Text & Code Diff Checker',
    tool_text_diff_desc: 'Compare two manuscripts, Arduino/Python code, or journal drafts to spot changes.',
    wip_back_home: 'Back to Home', wip_check_back: 'Thanks for your patience!',
    labs_wip_title: 'This page is being prepared',
    labs_wip_desc: 'We are designing experimental spaces, interactive tools, and laboratory features for Orbit members. Stay tuned for updates!',
    course_category: 'Course', nav_workspace: 'Workspace', nav_voyages: 'Voyages', nav_leaderboard: 'Leaderboard',
    voyages_title: 'Voyages', voyages_desc: 'MIPA and programming practice questions. Solve them to earn deltas.',
    workspace_title: 'Workspace', workspace_desc: 'Continue your course progress and earn deltas here.',
    course_my_courses: 'My Courses', course_my_courses_desc: 'These are the courses you have enrolled in. Pick one to open here.',
    course_new: 'New Course', course_empty_title: 'You haven\'t taken any courses yet.',
    course_empty_desc: 'Pick a course you want to enroll in. It will appear right here.',
    course_pick_btn: 'Pick a Course', course_open_btn: 'Open This Course',
    course_steps_done: 'steps done', course_status_active: 'Currently Open',
    course_card_menu: 'Course options', course_drop_btn: 'Drop Course',
    course_drop_confirm: 'Drop this course? All progress and deltas earned from it will be permanently deleted and cannot be recovered.',
    course_drop_error: 'Could not drop the course. Please try again.',
    course_programming_fallback: 'Programming voyages cannot be completed directly from the course page yet.',
    course_programming_link: 'Open in Voyages page', course_material_empty: 'This material has no content to display yet.',
    course_mark_done: 'Mark as Done', course_feedback_incomplete: 'Answer all questions before submitting.',
    course_feedback_incorrect: 'Some answers are incorrect, try again.', course_optional_badge: 'Optional',
    course_locked_badge: 'Locked', course_open_material: 'Open Material', course_start_voyage: 'Start Voyage',
    course_start_flag: 'Start Flag', course_redo_voyage: 'Redo Voyage', course_redo_flag: 'Redo Flag', course_questions_count: 'Questions',
    course_material_new_tab: 'Open document in new tab', course_video_new_tab: 'Open video in new tab',
    course_catalog_desc: 'Courses available for club members to attend.',
    course_catalog_search: 'Search courses…', course_take: 'Take Course', course_taken: 'Course Taken',
    course_modal_desc: 'Course Description',
    voyages_filter_all: 'All', voyages_filter_math: 'Math', voyages_filter_physics: 'Physics', voyages_filter_informatika: 'Informatics', voyages_filter_selected: 'selected', voyages_filter_none: 'None',
    voyages_filter_subject_label: 'Subject', voyages_filter_type_label: 'Type',
    voyages_expedition_mode_label: 'Expedition Mode', voyages_expedition_exit: 'Exit Expedition',
    voyages_expedition_empty: 'Every voyage matching your filters is already done.',
    voyages_expedition_fullscreen_required: 'Fullscreen is required to start an Expedition.',
    voyages_expedition_fullscreen_unsupported: 'This device does not support fullscreen mode.',
    voyages_expedition_complete: 'Expedition complete! You finished every matching voyage.',
    voyages_search_placeholder: 'Search questions…', voyages_search_label: 'Search',
    voyages_sort_label: 'Sort by', voyages_sort_random: 'Random', voyages_sort_diff_asc: 'Rating: Low to High',
    voyages_sort_diff_desc: 'Rating: High to Low', voyages_sort_title_az: 'Title: A to Z', voyages_sort_newest: 'Newest',
    voyages_filter_chemistry: 'Chemistry', voyages_filter_biology: 'Biology',
    voyages_difficulty: 'Rating', voyages_osn_level: 'Provincial OSN Level', voyages_reward: 'Reward',
    voyages_grading_analyzing: 'Grading your answer with Smart Grading…',
    voyages_grading_result_title: 'Smart Grading Result',
    voyages_grading_strengths: 'Strengths',
    voyages_grading_improvements: 'Points to Improve',
    voyages_grading_model: 'Graded by',
    voyages_grading_failed: 'Automatic grading failed. Please try again.',
    voyages_grading_retry: 'Try Again',
    voyages_grading_locked: 'Perfect Grade',
    voyages_earned_label: 'Reward earned',
    voyages_start: 'Start Question', voyages_continue: 'Review Again', voyages_completed: 'Completed',
    voyages_type_mc: 'Multiple Choice', voyages_type_dropdown: 'Dropdown', voyages_type_essay: 'Essay', voyages_type_programming: 'Competitive (Programming)',
    voyages_bahasa: 'Language',
    voyages_run_samples: 'Run', voyages_console_tests: 'Test Cases', voyages_console_output: 'Console',
    voyages_console_empty: 'Waiting for code to run…', voyages_console_running: 'Running code…',
    voyages_submit: 'Submit Answer', voyages_next: 'Next', voyages_prev: 'Previous', voyages_close: 'Close',
    voyages_correct: 'Correct answer!', voyages_correct_plural: 'Correct answers!', voyages_incorrect: 'Not quite, try again.',
    voyages_earned: 'deltas earned', voyages_essay_sent: 'Essay submitted for officer review.',
    voyages_choose_answer: 'Choose one answer below.', voyages_choose_dropdown: 'Pick an answer from the menu below.',
    voyages_pick_placeholder: 'Choose an answer', voyages_your_answer: 'Your essay answer',
    voyages_essay_placeholder: 'Write your essay answer here…',
    voyages_preview_label: 'Preview', voyages_preview_empty: 'Formula preview will appear here…',
    voyages_already_done: 'You already completed this question before.',
    leaderboard_title: 'Leaderboard', leaderboard_desc: 'Deltas ranking across all KIR members.',
    leaderboard_you: 'You', leaderboard_rank: 'Rank', leaderboard_member: 'Member', leaderboard_deltas: 'Deltas',
    leaderboard_your_rank: 'Your rank', leaderboard_range_week: 'This Week', leaderboard_range_month: 'This Month', leaderboard_range_all: 'All Time',
    leaderboard_search_placeholder: 'Search members…', leaderboard_branch_all: 'All Branches', leaderboard_no_results: 'No members match.',
    comments_title: 'Comments', comments_placeholder: 'Write a comment…', comments_send: 'Send',
    comments_empty: 'No comments yet. Take the initiative to be the first!', comments_attach: 'Attach file',
    comments_delete: 'Delete', comments_too_large: 'Pick a file under 1.5MB (the prototype stores this in your browser).',
    comments_reply: 'Reply', comments_reply_placeholder: 'Write a reply…', comments_cancel: 'Cancel',
    theme_light: 'Light Mode',
    reduce_motion: 'Reduce Motion', reduce_motion_desc: 'Disable all animations and transitions to improve performance.',
    disable_branch_color: 'Disable Branch Colouring', disable_branch_color_desc: "Show a neutral accent (white/black) instead of your branch's colour.",
    taskbar_position: 'Taskbar Position', taskbar_position_desc: 'Choose which side of the screen the nav menu sits on.',
    taskbar_position_locked_desc: 'Taskbar position can only be changed on desktop screens.',
    pos_left: 'Left', pos_right: 'Right', pos_top: 'Top', pos_bottom: 'Bottom',
    danger_zone_title: 'Danger Zone', danger_zone_desc: 'Actions below are permanent and cannot be undone.',
    reset_voyages_title: 'Reset Courses', reset_voyages_desc: "Deletes every course progress you've completed and resets your deltas back to 0.", reset_voyages_btn: 'Reset',
    reset_voyages_confirm_title: 'Are you sure?',
    reset_voyages_confirm_desc: "Every course progress you've completed will be deleted and your deltas will go back to 0. This action cannot be undone.",
    reset_voyages_confirm_hint: 'Type "I\'M SURE" below to continue.', reset_voyages_confirm_placeholder: "I'M SURE", reset_voyages_confirm_phrase: "I'M SURE",
    reset_voyages_confirm_btn: 'Reset Courses', reset_voyages_cancel: 'Cancel', reset_voyages_processing: 'Resetting…',
    reset_voyages_success: 'Your courses have been reset.', reset_voyages_error: 'Failed to reset courses. Try again.',
    logout_all_btn: 'Log Out of All Devices',
    logout_all_confirm_title: 'Log out of all devices?',
    logout_all_confirm_desc: "You'll be signed out of every active session on every device, including this one. You'll need to sign back in everywhere.",
    logout_all_cancel: 'Cancel', logout_all_confirm_btn: 'Log Out of All Devices', logout_all_processing: 'Signing out…',
    logout_all_error: 'Failed to log out of all devices. Try again.',

    admin_title: 'Admin Panel', admin_desc: 'Review and manage new member registrations.',
    admin_tab_tasks: 'Tasks', admin_tab_schedule: 'Schedule', admin_tab_materials: 'Materials', admin_tab_voyages: 'Voyages',
    admin_task_title_label: 'Task Title', admin_task_title_placeholder: 'Enter a title…',
    admin_due_label: 'Due Date', admin_pick_date: 'Pick a date',
    admin_type_label: 'Type', admin_type_ekskul: 'Extracurricular', admin_type_individual: 'Individual', admin_type_kelompok: 'Group',
    admin_cabang_label: 'Branch', admin_cabang_both: 'Robotics & Science',
    admin_assign_mode_label: 'Assignment Mode', admin_assign_everyone: 'All Branch Members', admin_assign_specific: 'Specific People',
    admin_assignee_label: 'Assignee', admin_assignee_placeholder: 'Member name…', admin_assignee_hint: 'Enter one or more names, separated by commas.',
    admin_desc_label: 'Description', admin_desc_placeholder: 'Describe the task details…',
    admin_image_label: 'Image', admin_image_upload: 'Click to upload an image…',
    admin_save_task: 'Save Task',
    admin_event_name_label: 'Event Name', admin_event_name_placeholder: 'Enter an event name…',
    admin_datetime_label: 'Date & Time', admin_time_label: 'Time',
    admin_location_label: 'Location', admin_location_placeholder: 'Room 214, Student Union',
    admin_save_schedule: 'Save Event',
    admin_material_title_label: 'Material Title', admin_material_title_placeholder: 'Enter a title…',
    admin_material_desc_label: 'Short Description', admin_material_desc_placeholder: 'Material summary…',
    admin_action_type_label: 'Action Type', admin_action_link: 'Open Link', admin_action_upload: 'Upload File',
    admin_url_label: 'Link / File URL', admin_file_upload_label: 'Upload File',
    admin_material_cabang_label: 'Material Branch', admin_material_cabang_all: 'All Branches',
    admin_save_material: 'Save Material',
    resources_search_placeholder: 'Search courses…', materials_filter_cabang: 'Branch', materials_all_branches: 'All Branches',
    admin_subject_label: 'Subject', admin_subject_math: 'Math', admin_subject_physics: 'Physics',
    admin_subject_chemistry: 'Chemistry', admin_subject_biology: 'Biology', admin_subject_informatika: 'Informatics',
    admin_rating_label: 'Rating',
    admin_question_type_label: 'Question Type', admin_type_mc: 'Multiple Choice', admin_type_dropdown: 'Dropdown', admin_type_essay: 'Essay',
    admin_question_title_label: 'Question Title', admin_question_title_placeholder: 'Enter a question title…',
    admin_question_text_label: 'Question Text', admin_question_text_placeholder: 'Write the full question here… (use the symbol buttons above)',
    admin_math_hint: 'Use the buttons above to insert math symbols without typing LaTeX by hand.',
    admin_preview_label: 'Preview',
    admin_options_label: 'Answer Options', admin_options_hint: 'Mark the circle next to an option to set it as the correct answer.',
    admin_option_placeholder: 'Write an answer option…', admin_add_option: 'Add Option',
    admin_essay_ref_label: 'Reference Answer',
    admin_essay_ref_placeholder: 'Write an answer key or key points for officer review…',
    admin_save_voyage: 'Save Voyage',
    admin_view_json: 'Edit JSON', admin_upload_json: 'Upload JSON',
    admin_json_editor_title: 'JSON Editor', admin_load_json: 'Load from JSON', admin_export_json: 'Export to JSON', admin_close: 'Close',
    admin_json_uploader_title: 'Upload Voyage JSON', admin_drag_drop_json: 'Drag JSON files here or click to select', admin_clear: 'Clear',
    admin_math_frac: 'Fraction', admin_math_pow: 'Power', admin_math_sub: 'Subscript', admin_math_sqrt: 'Square Root', admin_math_greek: 'Greek',
    admin_toast_tasks: 'Task added successfully!', admin_toast_schedule: 'Event added successfully!',
    admin_toast_materials: 'Material added successfully!', admin_toast_voyages: 'Voyage added successfully!',
    admin_error_need_2_options: 'Add at least 2 answer options.', admin_error_need_correct: 'Select a correct answer first.',
    admin_error_need_date: 'Please pick a date first.', admin_cal_today: 'Today', admin_cal_clear: 'Clear',
    voyages_difficulty: 'Rating', voyages_osn_level: 'Provincial OSN Level',
    voyages_alt_precise_title: 'Precise drag', voyages_alt_precise_body: 'Hold Alt while dragging to set the rating with 2-decimal precision instead of snapping to whole numbers.',
    redirect_evaluasi_title: 'Redirecting to Evaluation Form...',
    redirect_evaluasi_desc: 'You will be automatically redirected to the KIR officer evaluation form.',
    redirect_pendataan_title: 'Redirecting to Data Collection Form...',
    redirect_pendataan_desc: 'You will be automatically redirected to the KIR member data collection form.',
    redirect_click_here: 'Click here if you\'re not redirected yet'
  }
};

function kirTimeGreeting(name) {
  const lang = localStorage.getItem(KIR_LANG_KEY) || 'id';
  let hour, minute, day;
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', { 
      hour: 'numeric', minute: 'numeric', hour12: false, weekday: 'short', timeZone: 'Asia/Jakarta' 
    }).formatToParts(now);
    
    let hourPart = 0, minutePart = 0, dayStr = '';
    parts.forEach(p => {
      if (p.type === 'hour') hourPart = parseInt(p.value, 10) % 24;
      if (p.type === 'minute') minutePart = parseInt(p.value, 10);
      if (p.type === 'weekday') dayStr = p.value;
    });

    hour = hourPart;
    minute = minutePart;
    const dayMap = { 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 0 };
    day = dayMap[dayStr] !== undefined ? dayMap[dayStr] : now.getDay();
  } catch (e) {
    const d = new Date();
    hour = d.getHours();
    minute = d.getMinutes();
    day = d.getDay();
  }
  
  const totalMinutes = hour * 60 + minute;
  const isWeekday = day >= 1 && day <= 5; // Mon-Fri
  
  let key;
  if (isWeekday && totalMinutes >= 300 && totalMinutes <= 435) { // 05:00 to 07:15
    key = 'greeting_school_commute';
  } else if (hour >= 0 && hour < 4) {
    key = 'greeting_late_night';
  } else if (hour >= 4 && hour < 11) {
    key = 'greeting_morning';
  } else if (hour >= 11 && hour < 15) {
    key = 'greeting_afternoon';
  } else if (hour >= 15 && hour < 19) {
    key = 'greeting_evening';
  } else {
    key = 'greeting_night';
  }
  
  const options = (I18N[lang] && I18N[lang][key]) || I18N['id'][key] || I18N['id']['greeting_morning'];
  let template = options;
  if (Array.isArray(options)) {
    const seed = new Date().getDate() + hour + minute;
    template = options[seed % options.length];
  }
  return template.replace('{name}', name);
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
  const time = `${then.hour}:${then.minute}`;

  if (diffDays === 0) return time;
  if (diffDays === 1) return lang === 'id' ? 'Kemarin' : 'Yesterday';

  const dateFmt = new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', {
    timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric'
  });
  return dateFmt.format(date);
}

/* ----------------------------------------------------------
   Modal show/hide and scroll locking.
   ---------------------------------------------------------- */
let __kirModalLockCount = 0;

function __kirGetScrollbarWidth() {
  const viewportGap = window.innerWidth - document.documentElement.clientWidth;
  if (viewportGap <= 0) return 0;

  const div = document.createElement('div');
  div.style.width = '100px';
  div.style.height = '100px';
  div.style.overflow = 'scroll';
  div.style.position = 'absolute';
  div.style.top = '-9999px';
  document.body.appendChild(div);
  const physicalWidth = div.offsetWidth - div.clientWidth;
  document.body.removeChild(div);

  return Math.min(viewportGap, physicalWidth);
}

function __kirFreezeSidebar(freeze) {
  const isDesktop = typeof window !== 'undefined' && window.matchMedia
    && window.matchMedia('(min-width: 1024px)').matches;
  if (!isDesktop) return;
  const sidebar = document.getElementById('sidebar');
  const root = document.getElementById('sidebar-root');
  if (!sidebar || !root) return;
  if (freeze) {
    const pos = kirCurrentSidebarPosition();
    const rect = sidebar.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;
    sidebar.classList.add('kir-sidebar-frozen');
    sidebar.style.position = 'fixed';
    sidebar.style.width = `${rect.width}px`;
    sidebar.style.height = `${rect.height}px`;
    root.style.width = `${rect.width}px`;
    root.style.flexShrink = '0';

    if (pos === 'right') {
      sidebar.style.top = `${rect.top}px`;
      sidebar.style.left = 'auto';
      sidebar.style.right = `${Math.max(0, window.innerWidth - rect.right)}px`;
      sidebar.style.bottom = '';
    } else if (pos === 'bottom') {
      sidebar.style.top = 'auto';
      sidebar.style.left = `${rect.left}px`;
      sidebar.style.right = '';
      sidebar.style.bottom = `${Math.max(0, window.innerHeight - rect.bottom)}px`;
    } else if (pos === 'top') {
      sidebar.style.top = `${rect.top}px`;
      sidebar.style.left = `${rect.left}px`;
      sidebar.style.right = '';
      sidebar.style.bottom = '';
    } else {
      sidebar.style.top = `${rect.top}px`;
      sidebar.style.left = `${rect.left}px`;
      sidebar.style.right = '';
      sidebar.style.bottom = '';
    }
  } else {
    sidebar.classList.remove('kir-sidebar-frozen');
    sidebar.style.position = '';
    sidebar.style.top = '';
    sidebar.style.left = '';
    sidebar.style.right = '';
    sidebar.style.bottom = '';
    sidebar.style.width = '';
    sidebar.style.height = '';
    root.style.width = '';
    root.style.flexShrink = '';
  }
}

function __kirModalLock(delta) {
  const wasLocked = __kirModalLockCount > 0;
  __kirModalLockCount = Math.max(0, __kirModalLockCount + delta);
  const isLocked = __kirModalLockCount > 0;
  if (isLocked === wasLocked) return;

  if (isLocked) {
    __kirFreezeSidebar(true);
    const scrollbarWidth = __kirGetScrollbarWidth();
    if (scrollbarWidth > 0) {
      document.documentElement.style.setProperty('--kir-scrollbar-w', `${scrollbarWidth}px`);
    }
    document.documentElement.classList.add('kir-scroll-locked');
    document.body.classList.add('kir-scroll-locked');
  } else {
    document.documentElement.classList.remove('kir-scroll-locked');
    document.body.classList.remove('kir-scroll-locked');
    document.documentElement.style.removeProperty('--kir-scrollbar-w');
    __kirFreezeSidebar(false);

    if (typeof kirUpdateTaskbarClearance === 'function') {
      requestAnimationFrame(() => requestAnimationFrame(() => kirUpdateTaskbarClearance()));
    }
  }
}

function kirLocalModalShow(el) {
  if (!el) return;
  const wasHidden = el.classList.contains('hidden');
  el.classList.remove('hidden', 'modal-closing');
  if (wasHidden) __kirModalLock(1);
  void el.offsetWidth;
  el.classList.add('modal-open');
}

function kirLocalModalHide(el, durationMs = 200) {
  if (!el) return;
  const wasVisible = !el.classList.contains('hidden');
  el.classList.remove('modal-open');
  el.classList.add('modal-closing');
  setTimeout(() => {
    el.classList.add('hidden');
    el.classList.remove('modal-closing');
    if (wasVisible) __kirModalLock(-1);
  }, durationMs);
}

function toggleSettingsModal() {
  const modal = document.getElementById('global-settings-modal');
  if (!modal) return;
  if (modal.classList.contains('hidden')) {
    kirLocalModalShow(modal);
    document.getElementById('modal-cabang-badge').textContent = kirCabangLabel(kirCurrentUserCabang());
    document.getElementById('modal-cabang-name').textContent = kirCabangLabel(kirCurrentUserCabang());
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) themeToggle.classList.toggle('on', kirCurrentTheme() === 'light');
    const reduceMotionToggle = document.getElementById('reduce-motion-toggle');
    if (reduceMotionToggle) reduceMotionToggle.classList.toggle('on', kirCurrentReduceMotion());
    const disableBranchColorToggle = document.getElementById('disable-branch-color-toggle');
    if (disableBranchColorToggle) disableBranchColorToggle.classList.toggle('on', kirCurrentDisableBranchColor());
    kirUpdateSidebarPositionModalUI();
  } else {
    kirLocalModalHide(modal);
  }
}

function kirShakeEl(el) {
  if (!el) return;
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
}

function openResetVoyagesModal() {
  const input = document.getElementById('reset-voyages-confirm-input');
  input.value = '';
  document.getElementById('reset-voyages-confirm-btn').disabled = true;
  const statusEl = document.getElementById('reset-voyages-status');
  statusEl.classList.add('hidden');
  kirLocalModalShow(document.getElementById('reset-voyages-modal'));
  setTimeout(() => input.focus(), 50);
}

function closeResetVoyagesModal() {
  kirLocalModalHide(document.getElementById('reset-voyages-modal'));
}

function resetVoyagesConfirmPhrase() {
  const lang = localStorage.getItem(KIR_LANG_KEY) || 'id';
  return I18N[lang].reset_voyages_confirm_phrase;
}

function handleResetVoyagesInput() {
  const input = document.getElementById('reset-voyages-confirm-input');
  const btn = document.getElementById('reset-voyages-confirm-btn');
  btn.disabled = input.value.trim().toUpperCase() !== resetVoyagesConfirmPhrase().toUpperCase();
}

async function confirmResetVoyages() {
  const input = document.getElementById('reset-voyages-confirm-input');
  const statusEl = document.getElementById('reset-voyages-status');
  const btn = document.getElementById('reset-voyages-confirm-btn');
  const modalCard = document.querySelector('#reset-voyages-modal .modal-card');
  const lang = localStorage.getItem(KIR_LANG_KEY) || 'id';

  if (input.value.trim().toUpperCase() !== resetVoyagesConfirmPhrase().toUpperCase()) {
    kirShakeEl(modalCard);
    return;
  }

  const originalText = btn.textContent;
  btn.textContent = I18N[lang].reset_voyages_processing;
  btn.disabled = true;

  const { error } = await supabaseClient.rpc('reset_my_courses');

  if (error) {
    statusEl.textContent = I18N[lang].reset_voyages_error;
    statusEl.className = 'text-xs text-red-400 mb-3';
    statusEl.classList.remove('hidden');
    kirShakeEl(modalCard);
    btn.textContent = originalText;
    btn.disabled = false;
    return;
  }

  try {
    const { data: userData } = await supabaseClient.auth.getUser();
    if (userData?.user?.id) {
      await supabaseClient.from('course_enrollments').delete().eq('user_id', userData.user.id);
    }
  } catch (enrollErr) {
    console.error('Error deleting course_enrollments on reset:', enrollErr);
  }

  localStorage.removeItem(KIR_DELTAS_KEY);
  localStorage.removeItem(KIR_FLAGS_KEY);
  localStorage.removeItem('kir_last_course_id');
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('kir_voyage_done_') || key.startsWith('kir_course_') || key.startsWith('kir_last_course')) {
      localStorage.removeItem(key);
    }
  });

  statusEl.textContent = I18N[lang].reset_voyages_success;
  statusEl.className = 'text-xs text-emerald-400 mb-3';
  statusEl.classList.remove('hidden');

  setTimeout(() => {
    window.location.reload();
  }, 900);
}

function handleQuickAvatarUpload(event) {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  kirOpenAvatarCrop(file);
}

const KIR_CROP_VIEWPORT = 260;
const KIR_CROP_OUTPUT = 480;
let kirCropState = null;
let kirCropDrag = null;

function kirOpenAvatarCrop(file) {
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) {
    alert('Pilih gambar di bawah 8MB.');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const naturalW = img.naturalWidth || 1;
      const naturalH = img.naturalHeight || 1;
      const baseScale = Math.max(KIR_CROP_VIEWPORT / naturalW, KIR_CROP_VIEWPORT / naturalH);
      kirCropState = { img, naturalW, naturalH, baseScale, zoom: 1, panX: 0, panY: 0 };
      const vp = document.getElementById('crop-viewport');
      if (vp) {
        vp.style.backgroundImage = `url("${reader.result}")`;
        vp.style.backgroundRepeat = 'no-repeat';
      }
      const zoomInput = document.getElementById('crop-zoom');
      if (zoomInput) zoomInput.value = '1';
      kirRenderCropTransform();
      kirLocalModalShow(document.getElementById('avatar-crop-modal'));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function kirRenderCropTransform() {
  const s = kirCropState;
  const vp = document.getElementById('crop-viewport');
  if (!s || !vp) return;
  const displayW = s.naturalW * s.baseScale * s.zoom;
  const displayH = s.naturalH * s.baseScale * s.zoom;
  const imageLeft = KIR_CROP_VIEWPORT / 2 - displayW / 2 + s.panX;
  const imageTop = KIR_CROP_VIEWPORT / 2 - displayH / 2 + s.panY;
  vp.style.backgroundSize = `${displayW}px ${displayH}px`;
  vp.style.backgroundPosition = `${imageLeft}px ${imageTop}px`;
}

function kirCropPanBounds() {
  const s = kirCropState;
  const displayW = s.naturalW * s.baseScale * s.zoom;
  const displayH = s.naturalH * s.baseScale * s.zoom;
  return {
    maxX: Math.max(0, (displayW - KIR_CROP_VIEWPORT) / 2),
    maxY: Math.max(0, (displayH - KIR_CROP_VIEWPORT) / 2),
  };
}

function kirClampCropPan() {
  const s = kirCropState;
  const { maxX, maxY } = kirCropPanBounds();
  s.panX = Math.max(-maxX, Math.min(maxX, s.panX));
  s.panY = Math.max(-maxY, Math.min(maxY, s.panY));
}

function handleCropZoomInput(event) {
  if (!kirCropState) return;
  kirCropState.zoom = parseFloat(event.target.value) || 1;
  kirClampCropPan();
  kirRenderCropTransform();
}

function kirInitCropDrag() {
  const vp = document.getElementById('crop-viewport');
  if (!vp || vp.__kirDragInit) return;
  vp.__kirDragInit = true;

  vp.addEventListener('pointerdown', (e) => {
    if (!kirCropState) return;
    kirCropDrag = { startX: e.clientX, startY: e.clientY, panX: kirCropState.panX, panY: kirCropState.panY };
    vp.setPointerCapture(e.pointerId);
    vp.classList.add('cursor-grabbing');
  });
  vp.addEventListener('pointermove', (e) => {
    if (!kirCropDrag || !kirCropState) return;
    kirCropState.panX = kirCropDrag.panX + (e.clientX - kirCropDrag.startX);
    kirCropState.panY = kirCropDrag.panY + (e.clientY - kirCropDrag.startY);
    kirClampCropPan();
    kirRenderCropTransform();
  });
  const endDrag = () => {
    kirCropDrag = null;
    vp.classList.remove('cursor-grabbing');
  };
  vp.addEventListener('pointerup', endDrag);
  vp.addEventListener('pointercancel', endDrag);
  vp.addEventListener('pointerleave', endDrag);
}

function cancelAvatarCrop() {
  kirLocalModalHide(document.getElementById('avatar-crop-modal'));
  kirCropState = null;
  kirCropDrag = null;
  const vp = document.getElementById('crop-viewport');
  if (vp) vp.style.backgroundImage = '';
}

async function confirmAvatarCrop() {
  if (!kirCropState) return;
  const saveBtn = document.getElementById('crop-save-btn');
  const originalLabel = saveBtn ? saveBtn.textContent : '';
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '...'; }

  try {
    const s = kirCropState;
    const scaleFactor = s.baseScale * s.zoom;
    const displayW = s.naturalW * scaleFactor;
    const displayH = s.naturalH * scaleFactor;
    const imageLeft = KIR_CROP_VIEWPORT / 2 - displayW / 2 + s.panX;
    const imageTop = KIR_CROP_VIEWPORT / 2 - displayH / 2 + s.panY;

    const sx = -imageLeft / scaleFactor;
    const sy = -imageTop / scaleFactor;
    const sw = KIR_CROP_VIEWPORT / scaleFactor;
    const sh = KIR_CROP_VIEWPORT / scaleFactor;

    const canvas = document.createElement('canvas');
    canvas.width = KIR_CROP_OUTPUT;
    canvas.height = KIR_CROP_OUTPUT;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(s.img, sx, sy, sw, sh, 0, 0, KIR_CROP_OUTPUT, KIR_CROP_OUTPUT);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) throw new Error('Gagal memproses gambar.');

    let avatarUrl = null;
    if (window.supabaseClient) {
      const { data: userData } = await supabaseClient.auth.getUser();
      if (userData?.user) {
        const filePath = `avatars/${userData.user.id}-${Date.now()}.jpg`;
        const { error: uploadError } = await supabaseClient.storage
          .from('assets')
          .upload(filePath, blob, { contentType: 'image/jpeg' });
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabaseClient.storage.from('assets').getPublicUrl(filePath);
        avatarUrl = publicUrlData.publicUrl;
        await supabaseClient.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userData.user.id);
      }
    }

    if (!avatarUrl) avatarUrl = canvas.toDataURL('image/jpeg', 0.92);

    kirSetUserAvatar(avatarUrl);
    __kirCachedBannerAvatarSrc = null;
    __kirCachedBannerColor = null;
    const bannerEl = document.getElementById('kir-profile-banner');
    if (bannerEl && !document.getElementById('kir-profile-modal')?.classList.contains('hidden')) {
      const modalAvatar = document.querySelector('[data-kir="profile-modal-avatar"]');
      if (modalAvatar) {
        modalAvatar.style.backgroundImage = `url("${avatarUrl}")`;
        modalAvatar.style.backgroundSize = 'cover';
        modalAvatar.style.backgroundPosition = 'center';
        modalAvatar.textContent = '';
      }
      kirExtractDominantColor(avatarUrl).then(rgb => {
        __kirCachedBannerColor = rgb;
        __kirCachedBannerAvatarSrc = avatarUrl;
        kirApplyBannerFromColor(bannerEl, rgb);
      });
    }
    kirRenderUserChrome();
    kirLocalModalHide(document.getElementById('avatar-crop-modal'));
    kirCropState = null;
  } catch (err) {
    console.error('Avatar upload failed:', err);
    alert('Gagal menyimpan foto: ' + (err.message || err));
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = originalLabel; }
  }
}

function handleLanguageToggle() {
  const current = localStorage.getItem(KIR_LANG_KEY) || 'id';
  kirSetLang(current === 'id' ? 'en' : 'id');
  document.getElementById('sidebar-cabang-badge').textContent = kirCabangLabel(kirCurrentUserCabang());
}

function handleThemeToggle() {
  const current = kirCurrentTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  kirSetTheme(next);
  document.getElementById('theme-toggle').classList.toggle('on', next === 'light');
}

function handleReduceMotionToggle() {
  const next = !kirCurrentReduceMotion();
  kirSetReduceMotion(next);
  document.getElementById('reduce-motion-toggle').classList.toggle('on', next);
}

function handleDisableBranchColorToggle() {
  const next = !kirCurrentDisableBranchColor();
  kirSetDisableBranchColor(next);
  document.getElementById('disable-branch-color-toggle').classList.toggle('on', next);
}

function handleSidebarPositionChange(position) {
  if (!window.matchMedia('(min-width: 1024px)').matches) return;
  if (position === kirCurrentSidebarPosition()) return;
  kirSetSidebarPosition(position);
}

function kirCloseMobileSidebar(immediate = false) {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-mobile-backdrop');
  if (!sidebar && !backdrop) return;
  if (immediate) {
    if (sidebar) {
      sidebar.style.transition = 'none';
      sidebar.classList.remove('kir-sidebar-open');
    }
    if (backdrop) {
      backdrop.style.transition = 'none';
      backdrop.classList.remove('visible');
      backdrop.remove();
    }
    void document.body.offsetHeight;
    if (sidebar) sidebar.style.transition = '';
    return;
  }
  if (sidebar) sidebar.classList.remove('kir-sidebar-open');
  if (backdrop) backdrop.classList.remove('visible');
}

function kirToggleMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  if (!document.getElementById('sidebar-mobile-backdrop')) {
    const backdrop = document.createElement('div');
    backdrop.id = 'sidebar-mobile-backdrop';
    backdrop.className = 'kir-sidebar-backdrop';
    backdrop.onclick = () => kirCloseMobileSidebar();
    const shell = document.querySelector('.kir-app-shell') || document.body;
    shell.appendChild(backdrop);
  }

  const isOpen = sidebar.classList.contains('kir-sidebar-open');
  if (isOpen) {
    kirCloseMobileSidebar();
    return;
  }

  kirPositionNavPill(false);
  void sidebar.offsetWidth;
  sidebar.classList.add('kir-sidebar-open');
  const backdrop = document.getElementById('sidebar-mobile-backdrop');
  if (backdrop) backdrop.classList.add('visible');

  requestAnimationFrame(() => kirPositionNavPill(false));
}

function kirSidebarCollapsedClass() {
  const isDesktop = typeof window !== 'undefined' && window.matchMedia
    && window.matchMedia('(min-width: 1024px)').matches;
  return (isDesktop && localStorage.getItem(KIR_SIDEBAR_COLLAPSED_KEY) === 'true') ? 'sidebar-collapsed' : '';
}

if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => {
    if (e.matches) kirCloseMobileSidebar();
    const sidebarEl = document.getElementById('sidebar');
    if (sidebarEl) {
      const shouldCollapse = e.matches && localStorage.getItem(KIR_SIDEBAR_COLLAPSED_KEY) === 'true';
      sidebarEl.classList.toggle('sidebar-collapsed', shouldCollapse);
    }
    if (typeof kirUpdateSidebarPositionModalUI === 'function') kirUpdateSidebarPositionModalUI();
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') kirCloseMobileSidebar();
});
document.addEventListener('click', (e) => {
  if (e.target.closest('#sidebar a, #sidebar .nav-link')) kirCloseMobileSidebar();
});

function kirInjectSidebar(activeTab) {
  const existingSidebar = document.getElementById('sidebar');
  if (existingSidebar) {
    existingSidebar.querySelectorAll('.nav-link[data-tab]').forEach(a => {
      a.classList.toggle('active', a.dataset.tab === activeTab);
    });
    
    requestAnimationFrame(() => kirPositionNavPill(true));

    kirRenderUserChrome();
    kirRefreshAdminPingBadge();
    const cabangBadge = document.getElementById('sidebar-cabang-badge');
    if (cabangBadge) cabangBadge.textContent = kirCabangLabel(kirCurrentUserCabang());

    if (window.__kirProfileReady) {
      window.__kirProfileReady.then(() => {
        const nowAdmin = typeof kirIsAdmin === 'function' && kirIsAdmin();
        const hasAdminLink = !!existingSidebar.querySelector('.nav-link[data-tab="admin"]');
        if (nowAdmin !== hasAdminLink) {
          kirRenderSidebarNow(activeTab);
        } else {
          kirRenderUserChrome();
          if (cabangBadge) cabangBadge.textContent = kirCabangLabel(kirCurrentUserCabang());
        }
      });
    }
    return;
  }

  kirRenderSidebarNow(activeTab);

  if (window.__kirProfileReady) {
    const beforeAdmin = typeof kirIsAdmin === 'function' && kirIsAdmin();
    const before = JSON.stringify([kirCurrentUserName(), kirCurrentUserRole(), kirCurrentUserCabang()]);
    window.__kirProfileReady.then(() => {
      const afterAdmin = typeof kirIsAdmin === 'function' && kirIsAdmin();
      const after = JSON.stringify([kirCurrentUserName(), kirCurrentUserRole(), kirCurrentUserCabang()]);
      if (after !== before || afterAdmin !== beforeAdmin) kirRenderSidebarNow(activeTab);
    });
  }
}

function kirRenderSidebarNow(activeTab) {
  const sidebarHtml = `
  <aside id="sidebar" class="hidden lg:flex lg:flex-col w-full lg:h-screen glass border-y-0 border-l-0 px-4 py-6 lg:sticky lg:top-0 relative ${kirSidebarCollapsedClass()}">
    <button id="sidebar-collapse-btn" class="absolute -right-3 top-8 w-6 h-6 rounded-full bg-accent-gradient text-white flex items-center justify-center z-50 hover:brightness-110 cursor-pointer touch-none">
      <svg class="w-3 h-3 collapse-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
    </button>
    <a href="index.html" class="hidden lg:flex items-center gap-2.5 px-2 mb-8 overflow-hidden">
      <div class="w-9 h-9 shrink-0 flex items-center justify-center">
        <img data-kir-brand-logo="glow" src="assets/kir_light_glow.PNG" alt="Orbit Logo" class="w-8 h-8 object-contain" />
      </div>
      <div class="sidebar-header-text shrink-0">
        <div class="flex items-center gap-1.5">
          <p class="font-display font-semibold leading-none tracking-wider text-gradient-accent">orbit.io</p>
          <svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="4" stroke-linecap="round" stroke-linejoin="round"/>
            <ellipse cx="12" cy="12" rx="10" ry="3" transform="rotate(-25 12 12)" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <p class="text-[11px] text-zinc-500 mt-1" data-i18n="kir_long">Karya Ilmiah Remaja</p>
      </div>
    </a>
    <div class="sidebar-nav-scroll flex flex-col flex-1 min-h-0">
    <span id="nav-active-pill" class="nav-active-pill"></span>
    <nav class="flex flex-col gap-1.5">
      <p class="text-[11px] font-medium text-zinc-600 uppercase tracking-wider px-3 mb-1" data-i18n="menu">Menu</p>
      <a href="dashboard.html" data-tab="dashboard" class="nav-link ${activeTab === 'dashboard' ? 'active' : ''} flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300">
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
        <span class="nav-label" data-i18n="beranda">Beranda</span>
      </a>
      <a href="tasks.html" data-tab="tasks" class="nav-link ${activeTab === 'tasks' ? 'active' : ''} flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300">
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
        <span class="nav-label" data-i18n="tugas">Tugas</span>
      </a>
      <a href="schedule.html" data-tab="schedule" class="nav-link ${activeTab === 'schedule' ? 'active' : ''} flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300">
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        <span class="nav-label" data-i18n="jadwal">Jadwal</span>
      </a>
      <a href="members.html" data-tab="members" class="nav-link ${activeTab === 'members' ? 'active' : ''} flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300">
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
        <span class="nav-label" data-i18n="anggota">Anggota</span>
      </a>
      ${typeof kirIsAdmin === 'function' && kirIsAdmin() ? `
      <a href="admin.html" data-tab="admin" class="nav-link ${activeTab === 'admin' ? 'active' : ''} flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300">
        <span class="relative shrink-0 inline-flex">
          <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span id="admin-ping-badge" class="nav-ping-badge hidden"></span>
        </span>
        <span class="nav-label" data-i18n="admin_title">Admin Panel</span>
      </a>` : ''}
      </nav>
    <nav class="flex flex-col gap-1.5 mt-6">
      <p class="text-[11px] font-medium text-zinc-600 uppercase tracking-wider px-3 mb-1" data-i18n="course_category">Course</p>
      <a href="course.html" data-tab="course" class="nav-link ${activeTab === 'course' ? 'active' : ''} flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300">
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
        <span class="nav-label" data-i18n="course">Kursus</span>
      </a>
      <a href="workspace.html" data-tab="workspace" class="nav-link ${activeTab === 'workspace' ? 'active' : ''} flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300">
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>
        <span class="nav-label" data-i18n="nav_workspace">Workspace</span>
      </a>
      <a href="leaderboard.html" data-tab="leaderboard" class="nav-link ${activeTab === 'leaderboard' ? 'active' : ''} flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300">
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 21h8m-4-4v4M6 4h12v3a6 6 0 01-6 6 6 6 0 01-6-6V4zM6 4H4a2 2 0 000 4h1.5M18 4h2a2 2 0 010 4h-1.5" /></svg>
        <span class="nav-label" data-i18n="nav_leaderboard">Leaderboard</span>
      </a>
    </nav>
    <nav class="flex flex-col gap-1.5 mt-6">
      <p class="text-[11px] font-medium text-zinc-600 uppercase tracking-wider px-3 mb-1" data-i18n="akun">Akun</p>
      <button onclick="toggleSettingsModal()" class="nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300 text-left">
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        <span class="nav-label" data-i18n="pengaturan">Pengaturan</span>
      </button>
      ${typeof kirIsAdmin === 'function' && kirIsAdmin() ? `
      <a href="inbox.html" data-tab="inbox" class="nav-link ${activeTab === 'inbox' ? 'active' : ''} flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300">
        <span class="relative shrink-0 inline-flex">
          <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          <span id="sidebar-inbox-badge" class="nav-ping-badge">3</span>
        </span>
        <span class="nav-label" data-i18n="inbox">Kotak Masuk</span>
      </a>` : ''}
    </nav>
    </div>
    <div class="mt-auto pt-6 border-t border-white/10 hidden lg:flex lg:flex-col">
      <button onclick="kirOpenProfileModal()" class="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/5 transition w-full text-left cursor-pointer group">
        <div data-kir="avatar" class="w-8 h-8 rounded-full bg-white/10 text-zinc-300 flex items-center justify-center font-display font-semibold text-xs shrink-0 group-hover:brightness-110 transition">A</div>
        <div class="min-w-0">
          <p data-kir="name" class="text-sm font-medium truncate">Anggota</p>
          <p id="sidebar-cabang-badge" class="text-[11px] text-zinc-500 truncate">Robotik</p>
        </div>
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
          <p class="text-sm font-medium" data-i18n="theme_light">Mode Terang</p>
          <div id="theme-toggle" class="toggle-track" onclick="handleThemeToggle()">
            <div class="toggle-thumb"></div>
          </div>
        </div>
        <div class="flex items-center justify-between mb-4">
          <div>
            <p class="text-sm font-medium" data-i18n="reduce_motion">Nonaktifkan Semua Animasi</p>
            <p class="text-zinc-500 text-xs mt-0.5" data-i18n="reduce_motion_desc">Nonaktifkan semua animasi dan transisi untuk meningkatkan kinerja.</p>
          </div>
          <div id="reduce-motion-toggle" class="toggle-track" onclick="handleReduceMotionToggle()">
            <div class="toggle-thumb"></div>
          </div>
        </div>
        <div class="flex items-center justify-between mb-4">
          <div>
            <p class="text-sm font-medium" data-i18n="disable_branch_color">Nonaktifkan Warna Cabang</p>
            <p class="text-zinc-500 text-xs mt-0.5" data-i18n="disable_branch_color_desc">Tampilkan aksen netral (putih/hitam) alih-alih warna cabang kamu.</p>
          </div>
          <div id="disable-branch-color-toggle" class="toggle-track" onclick="handleDisableBranchColorToggle()">
            <div class="toggle-thumb"></div>
          </div>
        </div>
        <div class="flex items-center justify-between mb-4">
          <p class="text-sm font-medium" data-i18n="change_lang">Ubah Bahasa</p>
          <button onclick="handleLanguageToggle()" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-zinc-300 hover:text-white transition">ID / EN</button>
        </div>
        <div class="pt-4 border-t border-white/10">
          <p class="text-sm font-medium mb-1" data-i18n="taskbar_position">Posisi Taskbar</p>
          <p id="taskbar-position-desc" class="text-zinc-500 text-xs mb-3" data-i18n="taskbar_position_desc">Pilih sisi layar tempat menu navigasi ditampilkan.</p>
          <p id="taskbar-position-locked-note" class="hidden text-zinc-500 text-xs mb-3 items-center gap-1.5" data-i18n="taskbar_position_locked_desc">
            <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            Posisi taskbar hanya bisa diatur di layar desktop.
          </p>
          <div id="taskbar-position-grid" class="grid grid-cols-4 gap-2">
            <button type="button" class="pos-option" data-pos="left" onclick="handleSidebarPositionChange('left')">
              <span class="pos-option-preview pos-preview-left"><span class="pos-bar"></span><span class="pos-page"></span></span>
              <span class="pos-option-label" data-i18n="pos_left">Kiri</span>
            </button>
            <button type="button" class="pos-option" data-pos="right" onclick="handleSidebarPositionChange('right')">
              <span class="pos-option-preview pos-preview-right"><span class="pos-page"></span><span class="pos-bar"></span></span>
              <span class="pos-option-label" data-i18n="pos_right">Kanan</span>
            </button>
            <button type="button" class="pos-option" data-pos="top" onclick="handleSidebarPositionChange('top')">
              <span class="pos-option-preview pos-preview-top"><span class="pos-bar"></span><span class="pos-page"></span></span>
              <span class="pos-option-label" data-i18n="pos_top">Atas</span>
            </button>
            <button type="button" class="pos-option" data-pos="bottom" onclick="handleSidebarPositionChange('bottom')">
              <span class="pos-option-preview pos-preview-bottom"><span class="pos-page"></span><span class="pos-bar"></span></span>
              <span class="pos-option-label" data-i18n="pos_bottom">Bawah</span>
            </button>
          </div>
        </div>
      </section>
      <div class="glass rounded-xl mt-4 mb-6 border border-red-500/20">
        <div class="p-5 flex items-center justify-between gap-4 cursor-pointer" onclick="const b=this.nextElementSibling;const c=this.querySelector('svg');if(b.style.gridTemplateRows==='0fr'){b.style.gridTemplateRows='1fr';c.style.transform='rotate(180deg)';}else{b.style.gridTemplateRows='0fr';c.style.transform='rotate(0deg)';}">
          <div>
            <h3 class="font-display text-sm font-semibold mb-1 text-red-400" data-i18n="danger_zone_title">Zona Berbahaya</h3>
            <p class="text-zinc-500 text-xs" data-i18n="danger_zone_desc">Tindakan di bawah ini bersifat permanen dan tidak dapat dibatalkan.</p>
          </div>
          <svg class="w-5 h-5 shrink-0 text-red-400/50 transition-transform duration-300" style="transform: rotate(0deg);" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </div>
        <div class="grid transition-all duration-300 ease-in-out" style="grid-template-rows: 0fr;">
          <div class="overflow-hidden">
            <div class="px-5">
              <div class="p-3 rounded-lg bg-red-500/5 border border-red-500/20 flex items-center justify-between gap-3">
                <div>
                  <p class="text-sm font-medium text-zinc-200" data-i18n="reset_voyages_title">Reset Kursus</p>
                  <p class="text-xs text-zinc-500 mt-1" data-i18n="reset_voyages_desc">Menghapus semua progres kursus yang sudah kamu ambil dan mengatur ulang deltas kamu ke 0.</p>
                </div>
                <button type="button" onclick="openResetVoyagesModal()" class="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition" data-i18n="reset_voyages_btn">Reset</button>
              </div>
              <div class="h-5 w-full"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="mt-4 space-y-2">
        <button onclick="kirLogout()" class="flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-white/10 w-full transition">
          <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          <span data-i18n="keluar">Keluar</span>
        </button>
        <button onclick="openLogoutAllModal()" class="flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 w-full transition">
          <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          <span data-i18n="logout_all_btn">Keluar dari Semua Perangkat</span>
        </button>
      </div>
    </div>
  </div>
  `;

  const resetVoyagesModalHtml = `
  <div id="reset-voyages-modal" class="modal-overlay hidden" style="z-index:60;" onclick="if(event.target===this) closeResetVoyagesModal()">
    <div class="modal-card p-6" style="max-width:24rem;">
      <div class="flex items-center justify-between mb-1">
        <h2 class="font-display text-lg font-semibold text-red-400" data-i18n="reset_voyages_confirm_title">Kamu yakin?</h2>
        <button type="button" onclick="closeResetVoyagesModal()" class="text-zinc-500 hover:text-zinc-300 p-1">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <p class="text-zinc-400 text-sm mb-4" data-i18n="reset_voyages_confirm_desc">Semua voyage yang sudah kamu selesaikan akan dihapus dan deltas kamu akan kembali ke 0. Tindakan ini tidak dapat dibatalkan.</p>

      <label class="block text-xs font-medium text-zinc-400 mb-1.5 tracking-wide" data-i18n="reset_voyages_confirm_hint">Ketik "SAYA YAKIN" di bawah untuk melanjutkan.</label>
      <input id="reset-voyages-confirm-input" type="text" autocomplete="off"
        class="glass-input w-full rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 transition mb-1"
        data-i18n-placeholder="reset_voyages_confirm_placeholder" placeholder="SAYA YAKIN"
        oninput="handleResetVoyagesInput()" onkeydown="if(event.key==='Enter') confirmResetVoyages()" />
      <p id="reset-voyages-status" class="hidden text-xs mb-3"></p>

      <div class="flex items-center gap-2.5 mt-3">
        <button type="button" onclick="closeResetVoyagesModal()" class="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 transition" data-i18n="reset_voyages_cancel">Batal</button>
        <button type="button" id="reset-voyages-confirm-btn" onclick="confirmResetVoyages()" disabled
          class="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition" data-i18n="reset_voyages_confirm_btn">Reset Kursus</button>
      </div>
    </div>
  </div>
  `;

  const avatarCropModalHtml = `
  <div id="avatar-crop-modal" class="modal-overlay hidden" style="z-index: 9999;" onclick="if(event.target===this) cancelAvatarCrop()">
    <div class="modal-card p-6" style="max-width:22rem;">
      <div class="flex items-center justify-between mb-5">
        <h2 class="font-display text-lg font-semibold" data-i18n="crop_title">Sesuaikan Foto</h2>
        <button onclick="cancelAvatarCrop()" class="text-zinc-500 hover:text-zinc-300 p-1">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div id="crop-viewport" class="relative mx-auto rounded-full overflow-hidden cursor-grab select-none" style="width:${KIR_CROP_VIEWPORT}px;height:${KIR_CROP_VIEWPORT}px;background-color:rgba(255,255,255,0.05);touch-action:none;"></div>
      <div class="flex items-center gap-3 mt-5">
        <svg class="w-4 h-4 text-zinc-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7" stroke-linecap="round" stroke-linejoin="round"/><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35"/></svg>
        <input id="crop-zoom" type="range" min="1" max="3" step="0.01" value="1" oninput="handleCropZoomInput(event)"
          class="kir-range flex-1 h-1.5 rounded-full appearance-none bg-white/10 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0" />
        <svg class="w-5 h-5 text-zinc-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7" stroke-linecap="round" stroke-linejoin="round"/><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35"/><path stroke-linecap="round" d="M8 11h6"/><path stroke-linecap="round" d="M11 8v6"/></svg>
      </div>
      <p class="text-[11px] text-zinc-500 text-center mt-3" data-i18n="crop_hint">Seret untuk menggeser, geser slider untuk memperbesar.</p>
      <div class="flex items-center gap-2.5 mt-5">
        <button onclick="cancelAvatarCrop()" class="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 transition" data-i18n="crop_cancel">Batal</button>
        <button id="crop-save-btn" onclick="confirmAvatarCrop()" class="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-accent-gradient hover:brightness-110 shadow-glow-sm transition" data-i18n="crop_save">Simpan</button>
      </div>
    </div>
  </div>
  `;

  const logoutAllModalHtml = `
  <div id="logout-all-modal" class="modal-overlay hidden" style="z-index:60;" onclick="if(event.target===this) closeLogoutAllModal()">
    <div class="modal-card p-6" style="max-width:24rem;">
      <div class="flex items-center justify-between mb-1">
        <h2 class="font-display text-lg font-semibold text-red-400" data-i18n="logout_all_confirm_title">Keluar dari semua perangkat?</h2>
        <button type="button" onclick="closeLogoutAllModal()" class="text-zinc-500 hover:text-zinc-300 p-1">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <p class="text-zinc-400 text-sm mb-4" data-i18n="logout_all_confirm_desc">Kamu akan keluar dari semua sesi aktif di semua perangkat, termasuk browser ini. Kamu perlu masuk lagi di mana pun.</p>
      <p id="logout-all-status" class="hidden text-xs mb-3"></p>
      <div class="flex items-center gap-2.5 mt-3">
        <button type="button" onclick="closeLogoutAllModal()" class="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 transition" data-i18n="logout_all_cancel">Batal</button>
        <button type="button" id="logout-all-confirm-btn" onclick="confirmLogoutAll()"
          class="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition" data-i18n="logout_all_confirm_btn">Keluar dari Semua Perangkat</button>
      </div>
    </div>
  </div>
  `;

  const profileModalHtml = `
  <div id="kir-profile-modal" class="modal-overlay hidden" style="z-index: 60;" onclick="if(event.target===this) kirCloseProfileModal()">
    <div class="modal-card modal-card-split p-0 kir-profile-modal-card">
      <div class="modal-split-main kir-profile-main flex flex-col overflow-hidden">
        <div class="w-full flex-1 overflow-y-auto custom-scrollbar relative">
          <!-- Banner -->
          <div id="kir-profile-banner" class="kir-profile-banner relative">
            <button onclick="kirCloseProfileModal()" class="md:hidden absolute top-3 right-3 z-20 text-zinc-300 hover:text-white p-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 transition" aria-label="Tutup" title="Tutup">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <!-- Avatar (centered, overlapping banner/card boundary) -->
          <div class="kir-profile-avatar-ring">
            <label class="cursor-pointer inline-block group" title="Change profile picture" data-i18n-title="profile_change_picture">
              <div id="kir-profile-modal-avatar" data-kir="profile-modal-avatar" class="kir-profile-avatar">A</div>
              <input type="file" class="hidden" accept="image/*" onchange="handleQuickAvatarUpload(event)" />
            </label>
          </div>
          <!-- Profile info card -->
          <div class="kir-profile-body pb-4">
            <div class="kir-profile-info-card">
              <div class="kir-profile-name-section mb-0.5 flex flex-col items-start">
                <div id="kir-profile-name-view" onclick="kirToggleProfileNameEdit()" class="cursor-pointer rounded-lg px-1.5 py-1 ml-[1px] hover:bg-white/5 transition inline-block">
                  <h2 id="kir-profile-modal-name" class="font-display text-lg font-semibold leading-tight">Anggota</h2>
                </div>
                <div id="kir-profile-name-edit" class="hidden relative ml-[1px]">
                  <input type="text" id="kir-profile-name-input" 
                    class="glass-input font-display text-lg font-semibold leading-tight rounded-lg px-1.5 py-1 text-zinc-100 placeholder-zinc-500 transition" 
                    style="field-sizing: content; min-width: 10rem;"
                    placeholder="Set a nickname..." maxlength="30" data-i18n-placeholder="profile_nickname_placeholder" />
                </div>
              </div>
              <p id="kir-profile-modal-username" class="text-xs text-zinc-500 mt-0.5 mb-3 ml-[7px]"></p>
              <!-- About Me -->
              <div class="kir-profile-about-section">
                <div id="kir-profile-about-view" onclick="kirToggleProfileAboutEdit()" class="kir-profile-about-view text-sm text-zinc-300 min-h-[2rem] cursor-pointer rounded-lg px-2 py-1.5 -mx-2 hover:bg-white/5 transition group">
                  <div id="kir-profile-about-text" class="break-words leading-relaxed pl-[7px] kir-markdown"></div>
                  <p id="kir-profile-about-empty" class="text-zinc-600 italic hidden pl-[7px]" data-i18n="profile_about_empty">Click to add something about yourself…</p>
                </div>
                <div id="kir-profile-about-edit" class="hidden">
                  <textarea id="kir-profile-about-input"
                    class="glass-input w-full rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 resize-none transition"
                    rows="3" maxlength="200"
                    placeholder="Tell people something about yourself…" data-i18n-placeholder="profile_about_placeholder"></textarea>
                  <div class="flex items-center justify-between mt-2">
                    <span id="kir-profile-about-counter" class="text-[11px] text-zinc-600">0/200</span>
                    <div class="flex gap-2">
                      <button onclick="kirCancelProfileAboutEdit()" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 transition">Cancel</button>
                      <button onclick="kirSaveProfileAbout()" class="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-accent-gradient hover:brightness-110 transition">Save</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- Stats row (Fixed to bottom) -->
        <div class="kir-profile-stats-row w-full shrink-0 border-t border-white/5 mt-auto mb-0 bg-zinc-900/50 backdrop-blur-md relative z-10 shadow-[0_-4px_24px_rgba(0,0,0,0.5)]">
          <div class="min-w-0 text-center">
            <p class="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-zinc-500 truncate" data-i18n="profile_joined">Bergabung</p>
            <p id="kir-profile-modal-createdat" class="text-xs sm:text-sm text-zinc-200 mt-0.5 truncate">—</p>
          </div>
          <div class="min-w-0 text-center">
            <p class="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-zinc-500 truncate" data-i18n="profile_branch">Cabang</p>
            <p id="kir-profile-modal-cabang" class="text-xs sm:text-sm text-zinc-200 mt-0.5 truncate">—</p>
          </div>
          <div class="min-w-0 text-center">
            <p class="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-zinc-500 truncate" data-i18n="profile_role">Peran</p>
            <div id="kir-profile-modal-role-container" class="mt-0.5 min-w-0">
              <p id="kir-profile-modal-role" class="text-xs sm:text-sm text-zinc-200 truncate">—</p>
            </div>
          </div>
          <div class="min-w-0 text-center">
            <p class="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-zinc-500 truncate" data-i18n="profile_delta">Delta</p>
            <div class="flex items-center justify-center gap-1 mt-0.5 min-w-0">
              <svg class="w-3.5 h-3.5 text-accent-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3.5l8.5 15h-17z" /></svg>
              <p id="kir-profile-modal-deltas" class="text-xs sm:text-sm font-semibold font-display text-zinc-200 truncate">—</p>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-split-comments flex-col">
        <div id="profile-comments-root" class="comment-panel-inner flex-1 overflow-hidden"></div>
      </div>
    </div>
    <div id="kir-profile-lightbox" class="absolute inset-0 z-50 flex items-center justify-center pointer-events-none" onclick="kirClosePfpLightbox(event)">
      <div id="kir-profile-lightbox-img" class="kir-profile-avatar w-[300px] h-[300px] text-[6.75rem] sm:w-[500px] sm:h-[500px] sm:text-[11.25rem] border-0 shadow-2xl scale-90"></div>
    </div>
    <style>
      #kir-profile-modal.lightbox-active {
        background: transparent !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }
      #kir-profile-lightbox {
        background: rgba(0,0,0,0.6);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      #kir-profile-modal.lightbox-active #kir-profile-lightbox {
        opacity: 1;
        pointer-events: auto;
      }
      #kir-profile-lightbox-img {
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      #kir-profile-modal.lightbox-active #kir-profile-lightbox-img {
        transform: scale(1);
      }
      #kir-profile-modal label.cursor-pointer.other-pfp::after {
        background: rgba(0, 0, 0, 0.5) !important;
      }
    </style>
  </div>
  `;

  document.getElementById('sidebar-root').innerHTML = sidebarHtml;

  let kirModalsRoot = document.getElementById('kir-modals-root');
  if (!kirModalsRoot) {
    kirModalsRoot = document.createElement('div');
    kirModalsRoot.id = 'kir-modals-root';
    document.body.appendChild(kirModalsRoot);
  }
  kirModalsRoot.innerHTML = settingsModalHtml + resetVoyagesModalHtml + logoutAllModalHtml + avatarCropModalHtml + profileModalHtml;

  kirApplyTranslations();
  kirApplyBrandAssets();
  
  const badge = document.getElementById('sidebar-cabang-badge');
  if (badge) badge.textContent = kirCabangLabel(kirCurrentUserCabang());
  
  kirApplyTranslations();
  kirUpdateSidebarPositionModalUI();
  kirRenderUserChrome();
  kirInitSidebarDrag();
  kirInitMobileSidebarSwipe();
  kirInitSidebarShortcuts();
  kirInitCropDrag();
  kirSettleNavPill();
  kirRefreshAdminPingBadge();
}

async function kirRefreshAdminPingBadge() {
  const badge = document.getElementById('admin-ping-badge');
  if (!badge || !window.supabaseClient) return;

  const { count, error } = await supabaseClient
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .or('status.neq.approved,status.is.null');

  if (error) {
    console.error('Error fetching pending applicant count:', error);
    return;
  }

  if (!count) {
    badge.classList.add('hidden');
    badge.textContent = '';
    return;
  }

  badge.textContent = count > 9 ? '9+' : String(count);
  badge.classList.remove('hidden');
}

function kirSettleNavPill() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      kirPositionNavPill(false);
      kirWatchNavPill();
      kirWatchTaskbarClearance();
      kirRestoreNavScrollPos();
      kirWatchNavScrollFade();
    });
  });
}

function kirSaveNavScrollPos() {
  const navScroll = document.querySelector('#sidebar .sidebar-nav-scroll');
  if (!navScroll) return;
  try {
    sessionStorage.setItem(KIR_SIDEBAR_NAV_SCROLL_KEY, JSON.stringify({ top: navScroll.scrollTop, left: navScroll.scrollLeft }));
  } catch (e) {}
}

function kirRestoreNavScrollPos() {
  const navScroll = document.querySelector('#sidebar .sidebar-nav-scroll');
  if (!navScroll) return;
  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem(KIR_SIDEBAR_NAV_SCROLL_KEY) || 'null'); } catch (e) {}
  if (!saved) return;
  navScroll.scrollTop = saved.top || 0;
  navScroll.scrollLeft = saved.left || 0;
}

function kirUpdateNavScrollFade() {
  const navScroll = document.querySelector('#sidebar .sidebar-nav-scroll');
  if (!navScroll) return;
  const pos = document.documentElement.getAttribute('data-sidebar-pos');
  const horizontal = (pos === 'top' || pos === 'bottom') && window.matchMedia('(min-width: 1024px)').matches;
  const scrollPos = horizontal ? navScroll.scrollLeft : navScroll.scrollTop;
  const viewportSize = horizontal ? navScroll.clientWidth : navScroll.clientHeight;
  const contentSize = horizontal ? navScroll.scrollWidth : navScroll.scrollHeight;
  navScroll.classList.toggle('kir-fade-start', scrollPos > 1);
  navScroll.classList.toggle('kir-fade-end', scrollPos < contentSize - viewportSize - 1);
}

function kirWatchNavScrollFade() {
  const navScroll = document.querySelector('#sidebar .sidebar-nav-scroll');
  if (!navScroll) return;
  kirUpdateNavScrollFade();
  if (!navScroll.__kirFadeScrollInit) {
    navScroll.__kirFadeScrollInit = true;
    navScroll.addEventListener('scroll', () => {
      kirUpdateNavScrollFade();
      if (navScroll.__kirScrollSaveScheduled) return;
      navScroll.__kirScrollSaveScheduled = true;
      requestAnimationFrame(() => {
        navScroll.__kirScrollSaveScheduled = false;
        kirSaveNavScrollPos();
      });
    }, { passive: true });
  }
  if (window.ResizeObserver) {
    if (navScroll.__kirFadeObserver) navScroll.__kirFadeObserver.disconnect();
    const ro = new ResizeObserver(() => kirUpdateNavScrollFade());
    ro.observe(navScroll);
    navScroll.__kirFadeObserver = ro;
  }
  if (!window.__kirFadeResizeInit) {
    window.__kirFadeResizeInit = true;
    window.addEventListener('resize', () => kirUpdateNavScrollFade());
  }
}

function kirPositionNavPill(animate) {
  const sidebar = document.getElementById('sidebar');
  const navScroll = sidebar ? sidebar.querySelector('.sidebar-nav-scroll') : null;
  const pill = document.getElementById('nav-active-pill');
  if (!sidebar || !navScroll || !pill) return;
  const active = sidebar.querySelector('.nav-link.active');
  if (!active) {
    pill.style.opacity = '0';
    return;
  }
  
  if (!animate) {
    pill.style.transition = 'none';
  }

  const activeRect = active.getBoundingClientRect();
  const scrollRect = navScroll.getBoundingClientRect();

  pill.style.top = (activeRect.top - scrollRect.top + navScroll.scrollTop) + 'px';
  pill.style.left = (activeRect.left - scrollRect.left + navScroll.scrollLeft) + 'px';
  pill.style.width = activeRect.width + 'px';
  pill.style.height = activeRect.height + 'px';
  pill.style.opacity = '1';

  if (!animate) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        pill.style.transition = '';
      });
    });
  }
}

function kirWatchNavPill() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar || !window.ResizeObserver) return;
  if (sidebar.__kirPillObserver) sidebar.__kirPillObserver.disconnect();
  
  const active = sidebar.querySelector('.nav-link.active');
  
  const ro = new ResizeObserver(() => {
    if (sidebar.offsetWidth === 0) return;
    kirPositionNavPill(false);
  });
  
  ro.observe(sidebar);
  if (active) ro.observe(active);
  
  sidebar.__kirPillObserver = ro;
}

function kirUpdateTaskbarClearance() {
  const sidebar = document.getElementById('sidebar');
  const position = document.documentElement.getAttribute('data-sidebar-pos');
  const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
  const height = (sidebar && isDesktop && (position === 'top' || position === 'bottom'))
    ? sidebar.getBoundingClientRect().height
    : 0;
  document.documentElement.style.setProperty('--kir-top-taskbar-h', (position === 'top' ? height : 0) + 'px');
  document.documentElement.style.setProperty('--kir-bottom-taskbar-h', (position === 'bottom' ? height : 0) + 'px');
}

function kirWatchTaskbarClearance() {
  const sidebar = document.getElementById('sidebar');
  kirUpdateTaskbarClearance();
  if (!sidebar || !window.ResizeObserver) return;
  if (sidebar.__kirTaskbarClearanceObserver) sidebar.__kirTaskbarClearanceObserver.disconnect();
  const ro = new ResizeObserver(() => kirUpdateTaskbarClearance());
  ro.observe(sidebar);
  sidebar.__kirTaskbarClearanceObserver = ro;

  if (!window.__kirTaskbarClearanceResizeInit) {
    window.__kirTaskbarClearanceResizeInit = true;
    window.addEventListener('resize', () => kirUpdateTaskbarClearance());
  }
}

function kirInitMobileSidebarSwipe() {
  if (window.kirMobileSidebarSwipeInit) return;
  window.kirMobileSidebarSwipeInit = true;

  let startX = null;
  let startY = null;
  let isHorizontalSwipe = null;
  let isSidebarOpenAtStart = false;
  let sidebarWidth = 0;
  let sidebar = null;
  let backdrop = null;

  // Helper to construct the backdrop safely if dragging before opening
  function ensureBackdrop() {
    let bd = document.getElementById('sidebar-mobile-backdrop');
    if (!bd) {
      bd = document.createElement('div');
      bd.id = 'sidebar-mobile-backdrop';
      bd.className = 'kir-sidebar-backdrop';
      bd.onclick = () => kirCloseMobileSidebar();
      const shell = document.querySelector('.kir-app-shell') || document.body;
      shell.appendChild(bd);
    }
    return bd;
  }

  document.addEventListener('touchstart', (e) => {
    if (window.innerWidth >= 1024) return;
    if (e.target.closest('.resize-handle') || e.target.closest('#chart-viewport')) return;
    
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isHorizontalSwipe = null;
    sidebar = document.getElementById('sidebar');
    if (sidebar) {
      isSidebarOpenAtStart = sidebar.classList.contains('kir-sidebar-open');
      sidebarWidth = sidebar.offsetWidth || 272; // default 17rem
    }
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (startX === null || startY === null || !sidebar || window.innerWidth >= 1024) return;
    
    // Do not intercept interactions with sliders, widget resize handles, or pannable canvases
    if (e.target.closest('input[type="range"]') || e.target.closest('.resize-handle') || e.target.closest('#chart-viewport')) return;

    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;

    // Determine the direction of the swipe on the first few pixels of movement
    if (isHorizontalSwipe === null) {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
        // If sidebar is closed, only hijack left-to-right (dx > 0)
        // This preserves admin quick actions (right-to-left) when closed.
        if (!isSidebarOpenAtStart && dx < 0) {
          isHorizontalSwipe = false; 
        } else {
          isHorizontalSwipe = true;
          backdrop = ensureBackdrop();
          // Disable CSS transitions so it strictly follows the finger without lag
          sidebar.style.transition = 'none';
          backdrop.style.transition = 'none';
          // Force visibility during the drag so it doesn't stay hidden when closed
          sidebar.style.visibility = 'visible';
        }
      } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
        isHorizontalSwipe = false;
      }
    }

    if (isHorizontalSwipe) {
      if (e.cancelable) e.preventDefault();

      let tx;
      if (isSidebarOpenAtStart) {
        // Dragging left to close
        tx = Math.max(-sidebarWidth, Math.min(0, dx));
      } else {
        // Dragging right to open
        tx = Math.max(-sidebarWidth, Math.min(0, dx - sidebarWidth));
      }

      // Calculate opacity for the backdrop (0 to 1) based on drag percentage
      const progress = 1 - (Math.abs(tx) / sidebarWidth);
      sidebar.style.transform = `translate3d(${tx}px, 0, 0)`;
      backdrop.style.opacity = progress.toString();
    }
  }, { passive: false });

  document.addEventListener('touchend', (e) => {
    if (startX === null || startY === null || window.innerWidth >= 1024) return;

    if (isHorizontalSwipe && sidebar) {
      const dx = e.changedTouches[0].clientX - startX;
      
      // Clear inline styles so the CSS stylesheet classes/transitions take over again
      sidebar.style.transition = '';
      sidebar.style.transform = '';
      sidebar.style.visibility = '';
      if (backdrop) {
        backdrop.style.transition = '';
        backdrop.style.opacity = '';
      }

      // Snap logic: Did they swipe at least 1/3 of the sidebar's width?
      const threshold = sidebarWidth / 3;

      if (!isSidebarOpenAtStart) {
        if (dx > threshold) {
          kirToggleMobileSidebar();
        } else {
          // Snap back closed
          if (backdrop) backdrop.classList.remove('visible');
        }
      } else {
        if (dx < -threshold) {
          kirCloseMobileSidebar();
        } else {
          // Snap back open
          if (backdrop) backdrop.classList.add('visible');
        }
      }
    }

    startX = null;
    startY = null;
    isHorizontalSwipe = null;
  }, { passive: true });
}

function kirInitSidebarDrag() {
  const btn = document.getElementById('sidebar-collapse-btn');
  const sidebar = document.getElementById('sidebar');
  if (!btn || !sidebar) return;

  let startY = 0;
  let currentY = 0;
  let clickStartY = 0;
  let isDragging = false;

  btn.addEventListener('pointerdown', (e) => {
    isDragging = true;
    clickStartY = e.clientY;
    startY = e.clientY - currentY;
    btn.classList.remove('rubber-bounce');
    btn.setPointerCapture(e.pointerId);
  });

  btn.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    let rawY = e.clientY - startY;
    let y = rawY * 0.4;
    const limit = 24;
    y = Math.max(-limit, Math.min(y, limit));
    currentY = y;
    btn.style.transform = `translateY(${y}px)`;
  });

  const endDrag = (e) => {
    if (!isDragging) return;
    isDragging = false;
    btn.releasePointerCapture(e.pointerId);
    if (Math.abs(e.clientY - clickStartY) < 5) {
      kirToggleSidebarCollapse();
    }
    currentY = 0;
    btn.classList.add('rubber-bounce');
    btn.style.transform = `translateY(0px)`;
  };

  btn.addEventListener('pointerup', endDrag);
  btn.addEventListener('pointercancel', endDrag);
}

function kirToggleSidebarCollapse() {
  const sidebar = document.getElementById('sidebar');
  const collapsed = sidebar.classList.toggle('sidebar-collapsed');
  localStorage.setItem(KIR_SIDEBAR_COLLAPSED_KEY, collapsed ? 'true' : 'false');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    kirUpdateTaskbarClearance();
    kirUpdateNavScrollFade();
  }));
  if (window.supabaseClient) {
    supabaseClient.auth.getUser().then(({ data: userData }) => {
      if (userData?.user) supabaseClient.from('profiles').update({ sidebar_collapsed: collapsed }).eq('id', userData.user.id).then();
    });
  }
}

function kirInitSidebarShortcuts() {
  if (window.kirSidebarShortcutsInit) return;
  window.kirSidebarShortcutsInit = true;

  const style = document.createElement('style');
  style.innerHTML = `
    .nav-link.shortcut-highlight {
      background: rgba(128, 128, 128, 0.15) !important;
      opacity: 1 !important;
      transform: scale(0.96);
      transition: transform 0.1s cubic-bezier(0.2, 0.8, 0.2, 1), background 0.1s ease;
    }
  `;
  document.head.appendChild(style);

  let activeShortcutKey = null;
  let activeShortcutTarget = null;

  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    
    // Disable sidebar navigation shortcuts if any modal (voyage, material, settings, etc.) is open
    if (document.querySelector('.modal-overlay:not(.hidden)')) return;

    const key = e.key;
    if (/^[0-9]$/.test(key)) {
      const sidebar = document.getElementById('sidebar');
      if (!sidebar) return;

      const links = Array.from(sidebar.querySelectorAll('.nav-link'));
      const index = key === '0' ? 9 : parseInt(key, 10) - 1;

      if (links[index]) {
        e.preventDefault();
        activeShortcutKey = key;
        activeShortcutTarget = links[index];
        links.forEach(l => l.classList.remove('shortcut-highlight'));
        activeShortcutTarget.classList.add('shortcut-highlight');
      }
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === activeShortcutKey && activeShortcutTarget) {
      const target = activeShortcutTarget;
      activeShortcutKey = null;
      activeShortcutTarget = null;
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('shortcut-highlight'));
      target.click();
    }
  });

  window.addEventListener('blur', () => {
    activeShortcutKey = null;
    activeShortcutTarget = null;
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('shortcut-highlight'));
  });
}

function kirSetLang(lang) {
  localStorage.setItem(KIR_LANG_KEY, lang);
  kirApplyTranslations();
  if (window.supabaseClient) {
    supabaseClient.auth.getUser().then(({ data: userData }) => {
      if (userData?.user) supabaseClient.from('profiles').update({ lang: lang }).eq('id', userData.user.id).then();
    });
  }
}

function kirPageTitleKey() {
  const filename = window.location.pathname.split('/').pop() || 'index.html';
  const titleMap = {
    'index.html': 'page_title_home',
    'dashboard.html': 'page_title_dashboard',
    'tasks.html': 'page_title_tasks',
    'course.html': 'page_title_course',
    'workspace.html': 'page_title_workspace',
    'schedule.html': 'page_title_schedule',
    'members.html': 'page_title_members',
    'voyages.html': 'page_title_voyages',
    'leaderboard.html': 'page_title_leaderboard',
    'work-programs.html': 'page_title_program_kerja',
    'gallery.html': 'page_title_gallery',
    'catalog.html': 'page_title_katalog',
    'labs.html': 'page_title_labs',
    'auth.html': 'page_title_auth',
    'inbox.html': 'page_title_inbox',
  };
  return titleMap[filename] || 'page_title_home';
}

function kirApplyPageTitle(lang = null) {
  const resolvedLang = lang || localStorage.getItem(KIR_LANG_KEY) || 'id';
  const key = kirPageTitleKey();
  const title = I18N[resolvedLang][key] || I18N[resolvedLang].page_title_home || 'Orbit';
  const titleEl = document.querySelector('title');
  if (titleEl) titleEl.textContent = title;
  document.title = title;
}

function resolveBrandAssetName(type = 'icon') {
  const loggedIn = localStorage.getItem(KIR_SESSION_KEY) === 'true';
  const cabang = localStorage.getItem(KIR_CABANG_KEY) || 'robotik';
  const theme = localStorage.getItem(KIR_THEME_KEY) || 'dark';
  const suffix = type === 'glow' ? '_glow' : '';
  const invertedTheme = theme === 'light' ? 'dark' : 'light';
  const disableBranchColor = localStorage.getItem(KIR_DISABLE_BRANCH_COLOR_KEY) === 'true';

  if (loggedIn && cabang !== 'both') {
    if (cabang === 'robotik') return disableBranchColor ? `assets/robotik_${invertedTheme}${suffix}.PNG` : `assets/robotik${suffix}.PNG`;
    if (cabang === 'sains') return disableBranchColor ? `assets/sains_${invertedTheme}${suffix}.PNG` : `assets/sains${suffix}.PNG`;
  }
  return `assets/kir_${invertedTheme}${suffix}.PNG`;
}

function kirPreloadBrandAssets() {
  try {
    const glowSrc = resolveBrandAssetName('glow');
    const iconSrc = resolveBrandAssetName('icon');
    const img1 = new Image(); img1.src = glowSrc;
    const img2 = new Image(); img2.src = iconSrc;
  } catch (e) {}
}

function kirApplyBrandAssets(root = document) {
  kirPreloadBrandAssets();
  const targetDoc = root.ownerDocument || (root.nodeType === 9 ? root : document);
  const faviconLink = targetDoc.querySelector('link[rel="icon"]');
  const iconSrc = resolveBrandAssetName('icon');
  if (faviconLink) {
    if (faviconLink.getAttribute('href') !== iconSrc) faviconLink.href = iconSrc;
  } else if (targetDoc.head) {
    const newLink = targetDoc.createElement('link');
    newLink.rel = 'icon';
    newLink.type = 'image/png';
    newLink.href = iconSrc;
    targetDoc.head.appendChild(newLink);
  }

  const glowSrc = resolveBrandAssetName('glow');
  const scope = (root.querySelectorAll ? root : targetDoc);
  scope.querySelectorAll('img[data-kir-brand-logo]').forEach(img => {
    if (img.getAttribute('src') !== glowSrc) img.src = glowSrc;
  });
}

function kirTranslateElements(root) {
  const lang = localStorage.getItem(KIR_LANG_KEY) || 'id';
  root.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (I18N[lang][key]) el.textContent = I18N[lang][key];
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (I18N[lang][key]) el.setAttribute('placeholder', I18N[lang][key]);
  });
  root.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (I18N[lang][key]) el.setAttribute('title', I18N[lang][key]);
  });
  return lang;
}

function kirSyncPublicHeaderAuth(root = document) {
  if (!kirIsLoggedIn()) return;
  const authLink = root.querySelector ? root.querySelector('#nav-auth-link') : document.getElementById('nav-auth-link');
  const ctaLink = root.querySelector ? root.querySelector('#nav-cta-link') : document.getElementById('nav-cta-link');
  if (authLink) authLink.remove();
  if (ctaLink && !ctaLink.querySelector('[data-kir="avatar"]')) {
    const pathname = (root === document ? window.location.pathname : '');
    const isRedirectSubdir = pathname.indexOf('/redirect/') !== -1;
    const targetHref = isRedirectSubdir ? '../../dashboard.html' : 'dashboard.html';
    ctaLink.innerHTML = '<div data-kir="avatar" class="w-9 h-9 rounded-full bg-accent-gradient flex items-center justify-center font-display font-semibold text-sm hover:brightness-110 transition shadow-glow-sm"></div>';
    ctaLink.className = 'flex items-center justify-center shrink-0';
    ctaLink.removeAttribute('data-i18n');
    ctaLink.href = targetHref;
  }
  if (typeof kirRenderUserChrome === 'function') kirRenderUserChrome(root);
}

function kirOnReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn);
  } else {
    fn();
  }
}

function kirApplyTranslations() {
  const lang = kirTranslateElements(document);
  kirApplyPageTitle(lang);
  kirApplyBrandAssets();
  kirSyncPublicHeaderAuth();
  if (typeof kirRenderUserChrome === 'function') kirRenderUserChrome();

  window.dispatchEvent(new CustomEvent('kir:lang-changed', { detail: { lang } }));

  kirRevealPage();
  kirInitNavIndicator();
}

function kirInitNavIndicator() {}

function kirRevealPage() {
  document.documentElement.classList.add('kir-ready');
}

function kirIsMobileDevice() {
  return window.matchMedia('(max-width: 767px)').matches || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

(function applyThemeImmediately() {
  const theme = localStorage.getItem(KIR_THEME_KEY) || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  kirSyncThemeChrome(theme);

  let reduceMotionVal = localStorage.getItem(KIR_REDUCE_MOTION_KEY);
  if (reduceMotionVal === null) {
    if (kirIsMobileDevice()) {
      reduceMotionVal = 'true';
      localStorage.setItem(KIR_REDUCE_MOTION_KEY, 'true');
    } else {
      reduceMotionVal = 'false';
    }
  }
  const reduceMotion = reduceMotionVal === 'true';
  document.documentElement.setAttribute('data-reduce-motion', reduceMotion ? 'true' : 'false');

  const disableBranchColor = localStorage.getItem(KIR_DISABLE_BRANCH_COLOR_KEY) === 'true';
  document.documentElement.setAttribute('data-disable-branch-color', disableBranchColor ? 'true' : 'false');

  const sidebarPos = localStorage.getItem(KIR_SIDEBAR_POSITION_KEY) || 'left';
  document.documentElement.setAttribute('data-sidebar-pos', sidebarPos);

  if (localStorage.getItem(KIR_SESSION_KEY) === 'true') {
    const cabang = localStorage.getItem(KIR_CABANG_KEY) || 'robotik';
    document.documentElement.setAttribute('data-cabang', cabang);
  } else {
    document.documentElement.removeAttribute('data-cabang');
  }

  kirApplyPageTitle();
  kirApplyBrandAssets();
})();

window.addEventListener('load', () => {
  if (!document.documentElement.classList.contains('kir-ready')) kirRevealPage();
  kirInitNavIndicator();
});

function kirIsLoggedIn() {
  return localStorage.getItem(KIR_SESSION_KEY) === 'true';
}

function kirLogin(name, cabang) {
  const resolvedCabang = cabang || kirLastKnownCabang();
  localStorage.setItem(KIR_SESSION_KEY, 'true');
  localStorage.setItem(KIR_NAME_KEY, name || 'Anggota');
  localStorage.setItem(KIR_CABANG_KEY, resolvedCabang);
  localStorage.setItem(KIR_LAST_CABANG_KEY, resolvedCabang);
  document.documentElement.setAttribute('data-cabang', resolvedCabang);
  kirApplyBrandAssets();
}

function kirLastKnownCabang() {
  return localStorage.getItem(KIR_LAST_CABANG_KEY) || 'robotik';
}

async function kirLogout(scope = 'local') {
  await supabaseClient.auth.signOut({ scope });
  kirClearAuthLocalState();
  document.documentElement.removeAttribute('data-cabang');
  kirApplyBrandAssets();
  window.location.href = 'index.html';
}

const KIR_LOGOUT_PRESERVE_KEYS = new Set([
  KIR_LANG_KEY, KIR_THEME_KEY, KIR_LAST_CABANG_KEY, KIR_REDUCE_MOTION_KEY,
  KIR_DISABLE_BRANCH_COLOR_KEY, KIR_SIDEBAR_COLLAPSED_KEY, KIR_SIDEBAR_POSITION_KEY,
]);

function kirClearAuthLocalState() {
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('kir_') && !KIR_LOGOUT_PRESERVE_KEYS.has(key)) {
      localStorage.removeItem(key);
    }
  });
  __kirAdminStatus = null;
  window.__kirProfileReady = null;
  kirLastProfileCheckAt = 0;
}

async function kirRequestPasswordReset(email) {
  if (!window.supabaseClient) return { success: false, error: 'Supabase client unavailable.' };
  const redirectUrl = window.location.origin + window.location.pathname; 
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  });
  if (error) return { success: false, error: error.message };
  return { success: true, error: null };
}

async function kirUpdatePassword(newPassword) {
  if (!window.supabaseClient) return { success: false, error: 'Supabase client unavailable.' };
  const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
  if (error) return { success: false, error: error.message };
  return { success: true, error: null };
}

function openLogoutAllModal() {
  const statusEl = document.getElementById('logout-all-status');
  if (statusEl) statusEl.classList.add('hidden');
  const btn = document.getElementById('logout-all-confirm-btn');
  if (btn) {
    btn.disabled = false;
    const lang = localStorage.getItem(KIR_LANG_KEY) || 'id';
    btn.textContent = I18N[lang].logout_all_confirm_btn;
  }
  kirLocalModalShow(document.getElementById('logout-all-modal'));
}

function closeLogoutAllModal() {
  kirLocalModalHide(document.getElementById('logout-all-modal'));
}

async function confirmLogoutAll() {
  const btn = document.getElementById('logout-all-confirm-btn');
  const statusEl = document.getElementById('logout-all-status');
  const lang = localStorage.getItem(KIR_LANG_KEY) || 'id';

  btn.disabled = true;
  btn.textContent = I18N[lang].logout_all_processing;

  try {
    await kirLogout('global');
  } catch (err) {
    statusEl.textContent = I18N[lang].logout_all_error;
    statusEl.className = 'text-xs text-red-400 mb-3';
    statusEl.classList.remove('hidden');
    kirShakeEl(document.querySelector('#logout-all-modal .modal-card'));
    btn.disabled = false;
    btn.textContent = I18N[lang].logout_all_confirm_btn;
  }
}

supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    kirClearAuthLocalState();
    document.documentElement.removeAttribute('data-cabang');
  } else if (session && session.user) {
    localStorage.setItem(KIR_SESSION_KEY, 'true');
    kirSyncPublicHeaderAuth();
    kirRefreshAdminStatus();
  }

  if (event === 'PASSWORD_RECOVERY') {
    localStorage.setItem('kir_password_recovery_mode', 'true');
    if (window.location.pathname.indexOf('auth.html') === -1) {
      let basePath = window.location.href.split('#')[0].split('?')[0].replace(/index\.html$/, '').replace(/\/$/, '');
      let targetUrl = basePath + '/auth.html';
      if (window.location.hash) targetUrl += window.location.hash;
      window.location.href = targetUrl;
    } else {
      if (typeof switchAuthPanel === 'function') {
        document.getElementById('auth-tabs').classList.add('hidden');
        switchAuthPanel('update', { instant: true });
      }
    }
  }
});

let kirLastProfileCheckAt = 0;
let __kirAdminStatus = null;

async function kirRefreshAdminStatus() {
  if (!supabaseClient) {
    __kirAdminStatus = false;
    return false;
  }
  try {
    const { data, error } = await supabaseClient.rpc('is_admin');
    __kirAdminStatus = !error && data === true;
  } catch (e) {
    __kirAdminStatus = false;
  }
  return __kirAdminStatus;
}

async function kirRequireAuth() {
  window.__kirProfileReady = kirRefreshCurrentProfile();
  const result = await window.__kirProfileReady;
  if (result !== 'approved' && result !== 'pending') {
    window.location.href = 'auth.html';
  }
}

async function kirRequireAdmin() {
  await kirRequireAuth();
  if (!kirIsAdmin()) {
    window.location.href = 'dashboard.html';
  }
}

async function kirHasValidLocalSession() {
  if (!supabaseClient) return false;
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session?.user || !session.expires_at) return false;
  return session.expires_at * 1000 > Date.now() + 5000;
}

async function kirRefreshCurrentProfile() {
  if (!supabaseClient) return 'none';
  try {
    const { data: userData, error: userErr } = await supabaseClient.auth.getUser();
    if (userErr) {
      if (userErr.status === 0 || userErr.status >= 500) {
        if (await kirHasValidLocalSession()) {
          kirLastProfileCheckAt = Date.now();
          return 'approved';
        }
        localStorage.removeItem(KIR_SESSION_KEY);
        return 'none';
      }
      localStorage.removeItem(KIR_SESSION_KEY);
      __kirAdminStatus = false;
      return 'none';
    }
    if (!userData?.user) {
      localStorage.removeItem(KIR_SESSION_KEY);
      __kirAdminStatus = false;
      return 'none';
    }
    const { data: profile, error: profileErr } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single();
    if (profileErr || !profile) return 'none';

    if (profile.status && profile.status !== 'approved') {
      localStorage.removeItem(KIR_SESSION_KEY);
      if (!/\/?auth\.html/.test(window.location.pathname)) {
        window.location.href = 'auth.html?pending=1';
      }
      return 'pending';
    }

    localStorage.setItem(KIR_SESSION_KEY, 'true');
    localStorage.setItem(KIR_USER_ID_KEY, userData.user.id);
    localStorage.setItem(KIR_NAME_KEY, profile.name);
    localStorage.setItem(KIR_ROLE_KEY, profile.role || 'Anggota');
    localStorage.setItem(KIR_CABANG_KEY, profile.cabang);
    localStorage.setItem(KIR_LAST_CABANG_KEY, profile.cabang);
    document.documentElement.setAttribute('data-cabang', profile.cabang);
    kirApplyBrandAssets();
    if (profile.avatar_url) localStorage.setItem(KIR_AVATAR_KEY, profile.avatar_url);
    else localStorage.removeItem(KIR_AVATAR_KEY);
    if (profile.about_me != null) localStorage.setItem(KIR_ABOUT_ME_KEY, profile.about_me);
    if (profile.nickname) localStorage.setItem(KIR_NICKNAME_KEY, profile.nickname);
    else localStorage.removeItem(KIR_NICKNAME_KEY);
    if (profile.kelas) localStorage.setItem('kir_user_kelas', profile.kelas);
    else localStorage.removeItem('kir_user_kelas');
    
    if (profile.dashboard_layout) localStorage.setItem('kir_dashboard_layout_v1', JSON.stringify(profile.dashboard_layout));
    if (profile.dashboard_note) localStorage.setItem('kir_dashboard_note', kirSanitizeRichHtml(profile.dashboard_note));
    localStorage.setItem(KIR_DELTAS_KEY, String(profile.deltas_total || 0));
    localStorage.setItem(KIR_FLAGS_KEY, String(profile.flags_total || 0));
    if (typeof profile.streak_days === 'number') localStorage.setItem('kir_user_streak', String(profile.streak_days));

    if (profile.lang && localStorage.getItem(KIR_LANG_KEY) === null) {
      localStorage.setItem(KIR_LANG_KEY, profile.lang);
      kirApplyTranslations();
    }
    if (profile.theme && localStorage.getItem(KIR_THEME_KEY) === null) {
      localStorage.setItem(KIR_THEME_KEY, profile.theme);
      document.documentElement.setAttribute('data-theme', profile.theme);
    }
    if (typeof profile.sidebar_collapsed === 'boolean' && localStorage.getItem(KIR_SIDEBAR_COLLAPSED_KEY) === null) {
      localStorage.setItem(KIR_SIDEBAR_COLLAPSED_KEY, profile.sidebar_collapsed ? 'true' : 'false');
      const sidebar = document.getElementById('sidebar');
      if (sidebar) sidebar.classList.toggle('sidebar-collapsed', profile.sidebar_collapsed);
    }
    if (localStorage.getItem(KIR_REDUCE_MOTION_KEY) === null) {
      let shouldReduce = false;
      if (typeof profile.reduce_motion === 'boolean') {
        shouldReduce = profile.reduce_motion;
      } else if (kirIsMobileDevice()) {
        shouldReduce = true;
      }
      localStorage.setItem(KIR_REDUCE_MOTION_KEY, shouldReduce ? 'true' : 'false');
      document.documentElement.setAttribute('data-reduce-motion', shouldReduce ? 'true' : 'false');
      if (userData?.user && typeof profile.reduce_motion !== 'boolean') {
        supabaseClient.from('profiles').update({ reduce_motion: shouldReduce }).eq('id', userData.user.id).then();
      }
    } else if (userData?.user && typeof profile.reduce_motion !== 'boolean') {
      const currentLocal = localStorage.getItem(KIR_REDUCE_MOTION_KEY) === 'true';
      supabaseClient.from('profiles').update({ reduce_motion: currentLocal }).eq('id', userData.user.id).then();
    }
    if (typeof profile.disable_branch_color === 'boolean' && localStorage.getItem(KIR_DISABLE_BRANCH_COLOR_KEY) === null) {
      localStorage.setItem(KIR_DISABLE_BRANCH_COLOR_KEY, profile.disable_branch_color ? 'true' : 'false');
      document.documentElement.setAttribute('data-disable-branch-color', profile.disable_branch_color ? 'true' : 'false');
    }
    if (profile.sidebar_position && localStorage.getItem(KIR_SIDEBAR_POSITION_KEY) === null) {
      localStorage.setItem(KIR_SIDEBAR_POSITION_KEY, profile.sidebar_position);
      document.documentElement.setAttribute('data-sidebar-pos', profile.sidebar_position);
    }
    kirLastProfileCheckAt = Date.now();
    await kirRefreshAdminStatus();
    return 'approved';
  } catch (e) {
    console.error('Failed to refresh current profile', e);
    return 'none';
  }
}

function kirFormatProperName(name) {
  if (!name) return name;
  if (name === name.toUpperCase() && /[A-Z]/.test(name)) {
    return name.toLowerCase().replace(/(?:^|\s|-)\S/g, match => match.toUpperCase());
  }
  return name;
}

function kirCurrentUserName() {
  return localStorage.getItem(KIR_NAME_KEY) || 'Anggota';
}

function kirSetUserName(name) {
  localStorage.setItem(KIR_NAME_KEY, kirFormatProperName(name) || 'Anggota');
}

function kirCurrentUserNickname() {
  return localStorage.getItem(KIR_NICKNAME_KEY) || null;
}

function kirSetUserNickname(nick) {
  const trimmed = (nick || '').trim();
  if (!trimmed) {
    localStorage.removeItem(KIR_NICKNAME_KEY);
  } else {
    localStorage.setItem(KIR_NICKNAME_KEY, trimmed);
  }
  if (window.supabaseClient) {
    supabaseClient.auth.getUser().then(({ data: userData }) => {
      if (userData?.user) supabaseClient.from('profiles').update({ nickname: trimmed || null }).eq('id', userData.user.id).then();
    });
  }
}

function kirCurrentUserRole() {
  return localStorage.getItem(KIR_ROLE_KEY) || 'Anggota';
}

function kirCurrentUserKelas() {
  return localStorage.getItem('kir_user_kelas') || '';
}

function kirIsAdmin() {
  return __kirAdminStatus === true;
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
  kirApplyBrandAssets();
}

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

function kirCurrentUserAboutMe() {
  return localStorage.getItem(KIR_ABOUT_ME_KEY) || '';
}

function kirSetUserAboutMe(text) {
  const trimmed = (text || '').trim().slice(0, 200);
  if (trimmed) localStorage.setItem(KIR_ABOUT_ME_KEY, trimmed);
  else localStorage.removeItem(KIR_ABOUT_ME_KEY);
  if (window.supabaseClient) {
    supabaseClient.auth.getUser().then(({ data: userData }) => {
      if (userData?.user) supabaseClient.from('profiles').update({ about_me: trimmed || null }).eq('id', userData.user.id).then();
    });
  }
}

function kirCurrentTheme() {
  return localStorage.getItem(KIR_THEME_KEY) || 'dark';
}

function kirSyncThemeChrome(theme = kirCurrentTheme()) {
  const resolvedTheme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.style.colorScheme = resolvedTheme;

  let themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (!themeColorMeta) {
    themeColorMeta = document.createElement('meta');
    themeColorMeta.name = 'theme-color';
    document.head.appendChild(themeColorMeta);
  }
  themeColorMeta.setAttribute('content', resolvedTheme === 'light' ? '#f4f4f5' : '#09090b');
}

function kirSetTheme(theme) {
  localStorage.setItem(KIR_THEME_KEY, theme);
  document.documentElement.setAttribute('data-theme', theme);
  kirSyncThemeChrome(theme);
  kirApplyBrandAssets();
  if (window.supabaseClient) {
    supabaseClient.auth.getUser().then(({ data: userData }) => {
      if (userData?.user) supabaseClient.from('profiles').update({ theme: theme }).eq('id', userData.user.id).then();
    });
  }
}

function kirCurrentReduceMotion() {
  return localStorage.getItem(KIR_REDUCE_MOTION_KEY) === 'true';
}

function kirSetReduceMotion(enabled) {
  localStorage.setItem(KIR_REDUCE_MOTION_KEY, enabled ? 'true' : 'false');
  document.documentElement.setAttribute('data-reduce-motion', enabled ? 'true' : 'false');
  if (window.supabaseClient) {
    supabaseClient.auth.getUser().then(({ data: userData }) => {
      if (userData?.user) supabaseClient.from('profiles').update({ reduce_motion: enabled }).eq('id', userData.user.id).then();
    });
  }
}

function kirCurrentDisableBranchColor() {
  return localStorage.getItem(KIR_DISABLE_BRANCH_COLOR_KEY) === 'true';
}

function kirCrossFadeBrandLogos(targetGlowSrc) {
  const brandLogos = document.querySelectorAll('img[data-kir-brand-logo]');
  const clones = [];

  brandLogos.forEach(img => {
    if (img.getAttribute('src') === targetGlowSrc) return;
    const parent = img.parentElement;
    if (!parent) return;

    const rect = img.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const csParent = window.getComputedStyle(parent);
    const origPos = parent.style.position;
    if (csParent.position === 'static') {
      parent.style.position = 'relative';
    }

    const clone = img.cloneNode(true);
    clone.removeAttribute('id');
    clone.removeAttribute('data-kir-brand-logo');
    clone._origParentPos = origPos;
    const csImg = window.getComputedStyle(img);

    clone.style.position = 'absolute';
    clone.style.top = `${img.offsetTop}px`;
    clone.style.left = `${img.offsetLeft}px`;
    clone.style.width = `${img.offsetWidth || rect.width}px`;
    clone.style.height = `${img.offsetHeight || rect.height}px`;
    clone.style.margin = csImg.margin;
    clone.style.transform = csImg.transform;
    clone.style.borderRadius = csImg.borderRadius;
    clone.style.objectFit = csImg.objectFit;
    clone.style.pointerEvents = 'none';
    clone.style.zIndex = '5';
    clone.style.opacity = '1';
    clone.style.transition = 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1)';

    parent.appendChild(clone);
    clones.push(clone);
  });

  return clones;
}

function kirSetDisableBranchColor(enabled) {
  localStorage.setItem(KIR_DISABLE_BRANCH_COLOR_KEY, enabled ? 'true' : 'false');

  const isReducedMotion = document.documentElement.getAttribute('data-reduce-motion') === 'true'
    || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  if (!isReducedMotion) {
    document.documentElement.classList.add('kir-color-transitioning');
    
    document.documentElement.setAttribute('data-disable-branch-color', enabled ? 'true' : 'false');
    const newGlowSrc = resolveBrandAssetName('glow');
    
    const clones = kirCrossFadeBrandLogos(newGlowSrc);
    kirApplyBrandAssets();

    if (clones.length > 0) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          clones.forEach(c => { c.style.opacity = '0'; });
        });
      });
      setTimeout(() => {
        clones.forEach(c => {
          if (c.parentElement && c._origParentPos !== undefined) {
            c.parentElement.style.position = c._origParentPos;
          }
          c.remove();
        });
      }, 450);
    }

    setTimeout(() => {
      document.documentElement.classList.remove('kir-color-transitioning');
    }, 500);
  } else {
    document.documentElement.setAttribute('data-disable-branch-color', enabled ? 'true' : 'false');
    kirApplyBrandAssets();
  }

  window.dispatchEvent(new CustomEvent('kir:branch-color-change', { detail: { enabled } }));
  if (window.supabaseClient) {
    supabaseClient.auth.getUser().then(({ data: userData }) => {
      if (userData?.user) supabaseClient.from('profiles').update({ disable_branch_color: enabled }).eq('id', userData.user.id).then();
    });
  }
}

function kirCurrentSidebarPosition() {
  return localStorage.getItem(KIR_SIDEBAR_POSITION_KEY) || 'left';
}

function kirSetSidebarPosition(position) {
  localStorage.setItem(KIR_SIDEBAR_POSITION_KEY, position);
  document.documentElement.setAttribute('data-sidebar-pos', position);

  const sidebar = document.getElementById('sidebar');
  if (sidebar && sidebar.classList.contains('kir-sidebar-frozen')) {
    __kirFreezeSidebar(false);
    __kirFreezeSidebar(true);
  }

  kirUpdateSidebarPositionModalUI();
  requestAnimationFrame(() => requestAnimationFrame(() => kirPositionNavPill(false)));
  setTimeout(() => kirPositionNavPill(false), 350);
  kirUpdateTaskbarClearance();
  kirUpdateNavScrollFade();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    kirUpdateTaskbarClearance();
    kirUpdateNavScrollFade();
  }));

  if (window.supabaseClient) {
    supabaseClient.auth.getUser().then(({ data: userData }) => {
      if (userData?.user) supabaseClient.from('profiles').update({ sidebar_position: position }).eq('id', userData.user.id).then(null, () => {});
    });
  }
}

function kirUpdateSidebarPositionModalUI() {
  const current = kirCurrentSidebarPosition();
  const isDesktop = window.matchMedia('(min-width: 1024px)').matches;

  document.querySelectorAll('.pos-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.pos === current);
    btn.classList.toggle('pos-option-locked', !isDesktop);
    btn.disabled = !isDesktop;
    btn.setAttribute('aria-disabled', String(!isDesktop));
  });

  const grid = document.getElementById('taskbar-position-grid');
  if (grid) grid.classList.toggle('pos-grid-locked', !isDesktop);

  const desc = document.getElementById('taskbar-position-desc');
  const lockedNote = document.getElementById('taskbar-position-locked-note');
  if (desc) desc.classList.toggle('hidden', !isDesktop);
  if (lockedNote) {
    lockedNote.classList.toggle('hidden', isDesktop);
    lockedNote.classList.toggle('flex', !isDesktop);
  }
}

const KIR_DELTAS_KEY = 'kir_deltas_total';
const KIR_FLAGS_KEY = 'kir_flags_total';
const KIR_VOYAGE_DONE_PREFIX = 'kir_voyage_done_';

function kirDeltasTotal() {
  const raw = localStorage.getItem(KIR_DELTAS_KEY);
  return raw === null ? 0 : parseInt(raw, 10) || 0;
}

function kirFlagsTotal() {
  const raw = localStorage.getItem(KIR_FLAGS_KEY);
  return raw === null ? 0 : parseInt(raw, 10) || 0;
}

function kirStreakDays() {
  const raw = localStorage.getItem('kir_user_streak');
  return raw === null ? 0 : parseInt(raw, 10) || 0;
}

function kirAddFlags(amount = 1) {
  const next = kirFlagsTotal() + (amount || 1);
  localStorage.setItem(KIR_FLAGS_KEY, String(next));
  if (typeof window.refreshWorkspaceFlagsHeader === 'function') {
    window.refreshWorkspaceFlagsHeader();
  }
  if (window.supabaseClient) {
    window.supabaseClient.rpc('increment_my_flags').then(({ error }) => {
      if (error) console.error('Failed to increment flags on server:', error);
    });
  }
}

function kirAddDeltas(amount) {
  const next = kirDeltasTotal() + amount;
  localStorage.setItem(KIR_DELTAS_KEY, String(next));
  
  supabaseClient.auth.getUser().then(({ data: userData }) => {
    if (userData?.user) {
      supabaseClient.from('profiles').select('deltas_total, deltas_week, deltas_lifetime')
        .eq('id', userData.user.id).single()
        .then(({ data: profile }) => {
          if (profile) {
            const week = profile.deltas_week || [0,0,0,0,0,0,0];
            const life = profile.deltas_lifetime || [0,0,0,0,0,0,0,0,0,0,0,0];
            week[week.length - 1] += amount;
            life[life.length - 1] += amount;
            
            supabaseClient.from('profiles')
              .update({ 
                deltas_total: next,
                deltas_week: week,
                deltas_lifetime: life
              })
              .eq('id', userData.user.id)
              .then();
          }
        });
    }
  });
  
  return next;
}

function kirVoyageCompletion(voyageId) {
  if (typeof window.USER_COMPLETIONS !== 'undefined') return window.USER_COMPLETIONS[voyageId] || null;
  const raw = localStorage.getItem(KIR_VOYAGE_DONE_PREFIX + voyageId);
  return raw ? JSON.parse(raw) : null;
}

async function kirMarkVoyageCompleted(voyageId, deltas) {
  localStorage.setItem(KIR_VOYAGE_DONE_PREFIX + voyageId, JSON.stringify({ deltas, completedAt: Date.now() }));
  if (typeof window.USER_COMPLETIONS !== 'undefined') {
    window.USER_COMPLETIONS[voyageId] = { deltas, completedAt: Date.now() };
  }
  
  const { data: userData } = await supabaseClient.auth.getUser();
  if (userData?.user) {
    await supabaseClient.from('voyage_completions').insert({
      user_id: userData.user.id,
      voyage_id: voyageId,
      deltas_earned: deltas
    });
  }
}

const KIR_COMMENTS_PREFIX = 'kir_comments_';
const KIR_COMMENT_MAX_ATTACHMENT_BYTES = 1.5 * 1024 * 1024;
const kirPendingCommentAttachments = {};

async function kirUploadFile(file, folder) {
  if (!window.supabaseClient) return null;
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `${folder}/${fileName}`;

  const { data, error } = await supabaseClient.storage
    .from('assets')
    .upload(filePath, file);

  if (error) {
    console.error('File upload error:', error.message);
    return null;
  }

  const { data: publicUrlData } = supabaseClient.storage
    .from('assets')
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

function kirEscapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function kirSanitizeRichHtml(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(String(html), 'text/html');
  doc.querySelectorAll('script, iframe, object, embed, form, link, meta, base').forEach(el => el.remove());
  doc.querySelectorAll('*').forEach(el => {
    [...el.attributes].forEach(attr => {
      const name = attr.name.toLowerCase();
      const val = (attr.value || '').trim().toLowerCase();
      if (name.startsWith('on') || name === 'srcdoc') {
        el.removeAttribute(attr.name);
      } else if ((name === 'href' || name === 'src') && (val.startsWith('javascript:') || val.startsWith('data:text/html'))) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return doc.body.innerHTML;
}

function kirCommentsKey(scope, itemId) {
  return KIR_COMMENTS_PREFIX + scope + '_' + itemId;
}

function kirFormatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function kirCommentAttachmentHtml(att) {
  if (!att) return '';
  if (att.type && att.type.startsWith('image/')) {
    return `<img src="${att.dataUrl}" alt="${kirEscapeHtml(att.name)}" class="comment-attachment-image" />`;
  }
  return `<span class="comment-attachment-chip">
    <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    ${kirEscapeHtml(att.name)}
  </span>`;
}

function kirRenderCommentItem(containerId, scope, itemId, c, lang, youId, isReply, mentionAuthor, hasReplies) {
  const isYou = c.userId === youId;
  const initial = c.author.charAt(0).toUpperCase();
  const avatarStyle = c.avatar ? `style="background-image:url('${c.avatar}');background-size:cover;background-position:center;"` : '';
  const replyBoxId = `${containerId}-replybox-${c.id}`;
  const mentionHtml = mentionAuthor ? `<span class="comment-mention text-accent-300 font-medium">@${kirEscapeHtml(mentionAuthor)}</span> ` : '';
  const threadConnectorHtml = hasReplies ? `<span class="comment-thread-connector"></span>` : '';
  return `
    <div class="comment-item${isReply ? ' comment-item-reply' : ''}">
      <div class="comment-avatar bg-white/10 text-zinc-300 cursor-pointer hover:opacity-80 transition" ${avatarStyle} onclick="kirOpenProfileModal('${c.userId}')">${c.avatar ? '' : initial}</div>
      ${threadConnectorHtml}
      <div class="comment-body min-w-0">
        <div class="flex items-baseline gap-2 flex-wrap">
          <span class="comment-author cursor-pointer hover:underline" onclick="kirOpenProfileModal('${c.userId}')">${kirEscapeHtml(c.author)}${isYou ? ` <span class="text-accent-300">(${I18N[lang].leaderboard_you})</span>` : ''}</span>
          <span class="comment-time">${kirFormatActivityTime(new Date(c.createdAt))}</span>
        </div>
        ${c.text || mentionHtml ? `<p class="comment-text">${mentionHtml}${kirEscapeHtml(c.text)}</p>` : ''}
        ${kirCommentAttachmentHtml(c.attachment)}
        <div class="flex items-center gap-3 mt-0.5">
          <button onclick="kirToggleReplyBox('${containerId}','${scope}','${itemId}','${c.id}')" class="comment-reply-btn" data-i18n="comments_reply">${I18N[lang].comments_reply}</button>
          ${isYou || (typeof kirIsAdmin === 'function' && kirIsAdmin()) ? `<button onclick="kirDeleteCommentAndRerender('${containerId}','${scope}','${itemId}','${c.id}')" class="comment-delete-btn" data-i18n="comments_delete">${I18N[lang].comments_delete}</button>` : ''}
        </div>
        <div id="${replyBoxId}" class="comment-reply-composer hidden">
          <textarea id="${replyBoxId}-text" rows="2" class="glass-input w-full rounded-lg px-3.5 py-2.5 text-sm" data-i18n-placeholder="comments_reply_placeholder" placeholder="${I18N[lang].comments_reply_placeholder}"></textarea>
          <div class="flex items-center justify-end gap-2 mt-2">
            <button onclick="kirToggleReplyBox('${containerId}','${scope}','${itemId}','${c.id}')" class="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition" data-i18n="comments_cancel">${I18N[lang].comments_cancel}</button>
            <button onclick="kirSubmitReply('${containerId}','${scope}','${itemId}','${c.id}')" class="px-4 py-1.5 rounded-lg text-xs font-semibold bg-accent-gradient text-white hover:brightness-110 shadow-glow-sm transition" data-i18n="comments_send">${I18N[lang].comments_send}</button>
          </div>
        </div>
      </div>
    </div>`;
}

async function kirRenderCommentSection(containerId, scope, itemId, closeCallbackExpr) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const lang = localStorage.getItem(KIR_LANG_KEY) || 'id';

  if (closeCallbackExpr !== undefined) {
    container.dataset.kirClose = closeCallbackExpr;
  }
  const closeFn = container.dataset.kirClose || '';

  let youId = null;
  if (window.supabaseClient) {
    const { data: userData } = await supabaseClient.auth.getUser();
    youId = userData?.user?.id;
  }

  const closeBtnHtml = closeFn
    ? `<button onclick="${closeFn}" class="kir-modal-close-desktop hidden md:block text-zinc-500 hover:text-zinc-300 p-1 -mr-1 transition" aria-label="Tutup" title="Tutup">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>`
    : '';

  container.innerHTML = `<div class="flex items-center justify-between mb-2">
    <p class="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">${I18N[lang].comments_title}</p>
    ${closeBtnHtml}
  </div><p class="text-xs text-zinc-500">Memuat...</p>`;

  const { data: comments, error } = await supabaseClient
    .from('comments')
    .select('*, profiles(name, nickname, avatar_url)')
    .eq('scope', scope)
    .eq('item_id', itemId)
    .order('created_at', { ascending: true });

  if (error) {
    container.innerHTML = `<p class="text-xs text-red-400">Gagal memuat komentar.</p>`;
    return;
  }

  const formatted = comments.map(c => ({
    id: c.id,
    author: c.profiles?.nickname || c.profiles?.name || 'Anggota',
    avatar: c.profiles?.avatar_url || '',
    text: c.text,
    attachment: c.attachment_url ? { name: 'File', type: 'image/jpeg', dataUrl: c.attachment_url } : null,
    createdAt: c.created_at,
    parentId: c.parent_id,
    userId: c.user_id
  }));

  const byParent = {};
  formatted.forEach(c => {
    if (!c.parentId) return;
    (byParent[c.parentId] = byParent[c.parentId] || []).push(c);
  });
  const topLevel = formatted.filter(c => !c.parentId);
  const MAX_NEST_DEPTH = 2;

  const renderThread = (c, depth, mentionAuthor) => {
    const isReply = depth > 0;
    const children = byParent[c.id] || [];
    const hasReplies = children.length > 0 && depth < MAX_NEST_DEPTH;
    const itemHtml = kirRenderCommentItem(containerId, scope, itemId, c, lang, youId, isReply, mentionAuthor, hasReplies);

    if (!children.length) {
      return isReply ? `<div class="comment-thread-group">${itemHtml}</div>` : itemHtml;
    }

    if (depth < MAX_NEST_DEPTH) {
      const childrenHtml = children.map(child => renderThread(child, depth + 1, null)).join('');
      const content = itemHtml + `<div class="comment-replies">${childrenHtml}</div>`;
      return isReply ? `<div class="comment-thread-group">${content}</div>` : content;
    }

    const childrenHtml = children.map(child => renderThread(child, depth, c.author)).join('');
    const content = isReply ? `<div class="comment-thread-group">${itemHtml}</div>` : itemHtml;
    return content + childrenHtml;
  };

  const listHtml = topLevel.length === 0
    ? `<p class="text-zinc-600 text-xs py-1" data-i18n="comments_empty">${I18N[lang].comments_empty}</p>`
    : topLevel.map(c => renderThread(c, 0, null)).join('');

  container.innerHTML = `
    <div class="flex items-center justify-between mb-2">
      <p class="text-[11px] font-medium text-zinc-500 uppercase tracking-wide" data-i18n="comments_title">${I18N[lang].comments_title}</p>
      ${closeBtnHtml}
    </div>
    <div class="comment-list mb-3">${listHtml}</div>
    <div class="comment-composer">
      <textarea id="${containerId}-text" rows="2" class="glass-input w-full rounded-lg px-3.5 py-2.5 text-sm" data-i18n-placeholder="comments_placeholder" placeholder="${I18N[lang].comments_placeholder}"></textarea>
      <div id="${containerId}-attach-preview" class="comment-attach-preview hidden"></div>
      <div class="flex items-center justify-between mt-2">
        <label class="comment-attach-btn">
          <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 10-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
          <span data-i18n="comments_attach">${I18N[lang].comments_attach}</span>
          <input type="file" class="hidden" onchange="kirHandleCommentAttachmentChange(event, '${containerId}')" />
        </label>
        <button id="${containerId}-send-btn" onclick="kirSubmitComment('${containerId}', '${scope}', '${itemId}')" class="px-4 py-1.5 rounded-lg text-xs font-semibold bg-accent-gradient text-white hover:brightness-110 shadow-glow-sm transition" data-i18n="comments_send">${I18N[lang].comments_send}</button>
      </div>
    </div>`;

  delete kirPendingCommentAttachments[containerId];
}

function kirToggleReplyBox(containerId, scope, itemId, commentId) {
  const boxId = `${containerId}-replybox-${commentId}`;
  const box = document.getElementById(boxId);
  if (!box) return;
  const wasHidden = box.classList.contains('hidden');
  document.querySelectorAll(`.comment-reply-composer[id^="${containerId}-replybox-"]`).forEach(el => el.classList.add('hidden'));
  if (wasHidden) {
    box.classList.remove('hidden');
    const textarea = document.getElementById(`${boxId}-text`);
    if (textarea) textarea.focus();
  }
}

async function kirSubmitReply(containerId, scope, itemId, commentId) {
  const textarea = document.getElementById(`${containerId}-replybox-${commentId}-text`);
  const text = textarea ? textarea.value.trim() : '';
  if (!text) return;
  
  const { data: userData } = await supabaseClient.auth.getUser();
  await supabaseClient.from('comments').insert({
    scope: scope,
    item_id: itemId,
    user_id: userData.user.id,
    text: text,
    parent_id: commentId
  });

  await kirRenderCommentSection(containerId, scope, itemId);
}

function kirHandleCommentAttachmentChange(event, containerId) {
  const file = event.target.files[0];
  if (!file) return;
  const lang = localStorage.getItem(KIR_LANG_KEY) || 'id';
  if (file.size > KIR_COMMENT_MAX_ATTACHMENT_BYTES) {
    alert(I18N[lang].comments_too_large);
    event.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    kirPendingCommentAttachments[containerId] = {
      name: file.name, type: file.type, size: file.size, dataUrl: reader.result, rawFile: file
    };
    const preview = document.getElementById(containerId + '-attach-preview');
    if (preview) {
      preview.classList.remove('hidden');
      preview.innerHTML = `
        ${kirCommentAttachmentHtml(kirPendingCommentAttachments[containerId])}
        <button onclick="kirClearCommentAttachment('${containerId}')" class="comment-attach-remove" aria-label="remove">&times;</button>`;
    }
  };
  reader.readAsDataURL(file);
}

function kirClearCommentAttachment(containerId) {
  delete kirPendingCommentAttachments[containerId];
  const preview = document.getElementById(containerId + '-attach-preview');
  if (preview) { preview.classList.add('hidden'); preview.innerHTML = ''; }
}

async function kirSubmitComment(containerId, scope, itemId) {
  const textarea = document.getElementById(containerId + '-text');
  const text = textarea ? textarea.value.trim() : '';
  const attachment = kirPendingCommentAttachments[containerId];
  if (!text && !attachment) return;

  const btn = document.getElementById(containerId + '-send-btn');
  if (btn) { btn.textContent = '...'; btn.disabled = true; }

  let attachUrl = null;
  if (attachment && attachment.rawFile) {
    attachUrl = await kirUploadFile(attachment.rawFile, 'comments');
  }

  const { data: userData } = await supabaseClient.auth.getUser();
  await supabaseClient.from('comments').insert({
    scope: scope,
    item_id: itemId,
    user_id: userData.user.id,
    text: text,
    attachment_url: attachUrl
  });

  await kirRenderCommentSection(containerId, scope, itemId);
}

async function kirDeleteCommentAndRerender(containerId, scope, itemId, commentId) {
  await supabaseClient.from('comments').delete().eq('id', commentId);
  await kirRenderCommentSection(containerId, scope, itemId);
}

function kirRenderUserChrome(root = document) {
  const fullName = kirCurrentUserName();
  const nickname = kirCurrentUserNickname();
  const displayName = nickname || fullName;
  const avatar = kirCurrentUserAvatar();

  root.querySelectorAll('[data-kir="name"]').forEach(el => {
    el.textContent = displayName;
  });
  root.querySelectorAll('[data-kir="greeting"]').forEach(el => {
    el.textContent = kirTimeGreeting(displayName);
  });
  const applyAvatar = (el, avatarUrl) => {
    if (avatarUrl) {
      el.style.backgroundImage = `url("${avatarUrl}")`;
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
      el.textContent = '';
    } else {
      el.style.backgroundImage = '';
      el.textContent = displayName.charAt(0).toUpperCase();
    }
  };
  root.querySelectorAll('[data-kir="avatar"]').forEach(el => applyAvatar(el, avatar));
}

let __kirCachedBannerColor = null;
let __kirCachedBannerAvatarSrc = null;

function kirExtractDominantColor(imgSrc) {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const size = 8;
        const c = document.createElement('canvas');
        c.width = size; c.height = size;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const pr = data[i], pg = data[i + 1], pb = data[i + 2], pa = data[i + 3];
          if (pa < 128) continue;
          const luma = pr * 0.299 + pg * 0.587 + pb * 0.114;
          if (luma < 15 || luma > 240) continue;
          r += pr; g += pg; b += pb; count++;
        }
        if (count === 0) { resolve(null); return; }
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        resolve({ r, g, b });
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = imgSrc;
  });
}

function kirApplyBannerFromColor(bannerEl, rgb) {
  if (!bannerEl) return;
  if (rgb) {
    const { r, g, b } = rgb;
    bannerEl.style.background = `rgb(${r},${g},${b})`;
  } else {
    bannerEl.style.background = 'var(--zinc-700, #3f3f46)';
  }
}

async function kirChangeUserRole(targetUserId, newRole, isSelf = false) {
  if (!targetUserId || !newRole) return;

  if (typeof kirIsAdmin === 'function' && !kirIsAdmin()) {
    if (typeof kirAdminToast === 'function') kirAdminToast('Hanya admin yang dapat mengubah peran', 'error');
    else alert('Hanya admin yang dapat mengubah peran');
    return;
  }

  const selectEl = document.getElementById('kir-profile-modal-role-select');
  if (selectEl) selectEl.disabled = true;

  try {
    const { error } = await supabaseClient
      .from('profiles')
      .update({ role: newRole })
      .eq('id', targetUserId);

    if (error) throw error;

    if (isSelf) {
      localStorage.setItem(KIR_ROLE_KEY, newRole);
    }

    if (typeof kirAdminToast === 'function') {
      kirAdminToast('Peran berhasil diperbarui!', 'success');
    }

    if (typeof fetchMembersFromDatabase === 'function') {
      fetchMembersFromDatabase();
    } else if (typeof MEMBERS !== 'undefined' && Array.isArray(MEMBERS)) {
      const idx = MEMBERS.findIndex(m => m.id === targetUserId);
      if (idx !== -1) {
        MEMBERS[idx].role = newRole;
        if (typeof renderMembers === 'function') {
          renderMembers();
        }
      }
    }
  } catch (err) {
    console.error('Failed to change user role:', err);
    if (typeof kirAdminToast === 'function') {
      kirAdminToast('Gagal mengubah peran: ' + (err.message || err), 'error');
    } else {
      alert('Gagal mengubah peran: ' + (err.message || err));
    }
  } finally {
    if (selectEl) selectEl.disabled = false;
  }
}

async function kirOpenProfileModal(targetUserId = null) {
  const modal = document.getElementById('kir-profile-modal');
  if (!modal) return;

  const { data: userData } = await supabaseClient.auth.getUser();
  const currentUserId = userData?.user?.id;
  const isSelf = !targetUserId || targetUserId === currentUserId;
  const actualTargetId = targetUserId || currentUserId;

  let name, nickname, avatar, cabang, role, about, kelas;
  let deltasTotal = 0;
  let flagsTotal = 0;
  let streakDays = 0;
  let createdAt = null;

  if (isSelf) {
    name   = kirCurrentUserName();
    nickname = kirCurrentUserNickname();
    avatar = kirCurrentUserAvatar();
    cabang = kirCurrentUserCabang();
    role   = kirCurrentUserRole();
    about  = kirCurrentUserAboutMe();
    kelas  = kirCurrentUserKelas();
    deltasTotal = kirDeltasTotal();
    flagsTotal = kirFlagsTotal();
    streakDays = kirStreakDays();
    createdAt = userData?.user?.created_at;
  } else {
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', actualTargetId)
      .single();

    if (!profile) return;

    name = profile.name;
    nickname = profile.nickname;
    avatar = profile.avatar_url;
    cabang = profile.cabang;
    role = profile.role;
    about = profile.about_me;
    kelas = profile.kelas;
    deltasTotal = profile.deltas_total || 0;
    flagsTotal = profile.flags_total || 0;
    streakDays = profile.streak_days || 0;
    createdAt = profile.created_at || profile.joined_at || null;
  }

  const nameEl = document.getElementById('kir-profile-modal-name');
  if (nameEl) nameEl.textContent = nickname || name;
  const usernameEl = document.getElementById('kir-profile-modal-username');
  if (usernameEl) {
    usernameEl.textContent = kelas ? `${name} ${kelas}` : name;
  }
  const cabangEl = document.getElementById('kir-profile-modal-cabang');
  if (cabangEl) cabangEl.textContent = kirCabangLabel(cabang);


  const roleContainer = document.getElementById('kir-profile-modal-role-container');
  const roleEl = document.getElementById('kir-profile-modal-role');
  const isAdminUser = typeof kirIsAdmin === 'function' && kirIsAdmin();

  if (isAdminUser && roleContainer) {
    const rolesList = [
      { value: 'Ketua Ekstrakurikuler', label: 'Ketua Ekstrakurikuler' },
      { value: 'Wakil Ketua', label: 'Wakil Ketua' },
      { value: 'Sekretaris', label: 'Sekretaris' },
      { value: 'Bendahara', label: 'Bendahara' },
      { value: 'PJ Robotika', label: 'PJ Robotika' },
      { value: 'PJ Sains', label: 'PJ Sains' },
      { value: 'Anggota', label: 'Anggota' }
    ];

    const currentRoleVal = role || 'Anggota';
    if (!rolesList.some(r => r.value === currentRoleVal)) {
      rolesList.unshift({ value: currentRoleVal, label: currentRoleVal });
    }

    const optionsHtml = rolesList.map(r => 
      `<option value="${kirEscapeHtml(r.value)}" ${r.value === currentRoleVal ? 'selected' : ''} style="background: #18181b; color: #f4f4f5;">${kirEscapeHtml(r.label)}</option>`
    ).join('');

    roleContainer.innerHTML = `
      <select id="kir-profile-modal-role-select" 
        data-trigger-class="kir-select-pill"
        onchange="kirChangeUserRole('${actualTargetId}', this.value, ${isSelf})">
        ${optionsHtml}
      </select>
    `;

    if (typeof kirRefreshCustomSelect === 'function') {
      kirRefreshCustomSelect('kir-profile-modal-role-select');
    }
  } else {
    const lang = localStorage.getItem(KIR_LANG_KEY) || 'id';
    let displayRole = role || 'Anggota';
    
    if (displayRole === 'Ketua Ekstrakurikuler') {
      displayRole = lang === 'en' ? 'President' : 'Ketua';
    } else if (displayRole === 'Wakil Ketua') {
      displayRole = I18N[lang]?.role_wakil || displayRole;
    } else if (displayRole === 'Bendahara') {
      displayRole = I18N[lang]?.role_bendahara || displayRole;
    } else if (displayRole === 'Anggota') {
      displayRole = I18N[lang]?.role_anggota || displayRole;
    }
    
    if (roleContainer) {
      roleContainer.innerHTML = `<p id="kir-profile-modal-role" class="text-sm text-zinc-200">${kirEscapeHtml(displayRole)}</p>`;
    } else if (roleEl) {
      roleEl.textContent = displayRole;
    }
  }
  const streakEl = document.getElementById('kir-profile-modal-streak');
  if (streakEl) streakEl.textContent = streakDays || 0;

  const flagsEl = document.getElementById('kir-profile-modal-flags');
  if (flagsEl) {
    const formatter = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
    flagsEl.textContent = formatter.format(flagsTotal || 0);
  }

  const deltasEl = document.getElementById('kir-profile-modal-deltas');
  if (deltasEl) {
    const formatter = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
    deltasEl.textContent = formatter.format(deltasTotal || 0);
  }

  const nameView = document.getElementById('kir-profile-name-view');
  const aboutView = document.getElementById('kir-profile-about-view');
  const avatarLabel = document.querySelector('#kir-profile-modal .kir-profile-avatar-ring label');
  const avatarInput = document.querySelector('#kir-profile-modal .kir-profile-avatar-ring input');

  if (isSelf) {
    if (nameView) {
      nameView.setAttribute('onclick', 'kirToggleProfileNameEdit()');
      nameView.classList.add('cursor-pointer', 'hover:bg-white/5');
      nameView.title = "Edit nickname";
    }
    if (aboutView) {
      aboutView.setAttribute('onclick', 'kirToggleProfileAboutEdit()');
      aboutView.classList.add('cursor-pointer', 'hover:bg-white/5');
      aboutView.title = "Edit about me";
    }
    if (avatarLabel) {
      avatarLabel.classList.add('cursor-pointer');
      avatarLabel.title = "Change profile picture";
      avatarLabel.classList.remove('other-pfp');
      avatarLabel.onclick = null;
    }
    if (avatarInput) avatarInput.disabled = false;
  } else {
    if (nameView) {
      nameView.removeAttribute('onclick');
      nameView.classList.remove('cursor-pointer', 'hover:bg-white/5');
      nameView.title = "";
    }
    if (aboutView) {
      aboutView.removeAttribute('onclick');
      aboutView.classList.remove('cursor-pointer', 'hover:bg-white/5');
      aboutView.title = "";
    }
    if (avatarLabel) {
      avatarLabel.classList.add('cursor-pointer', 'other-pfp');
      avatarLabel.title = "View profile picture";
      avatarLabel.onclick = (e) => {
        e.preventDefault();
        kirOpenPfpLightbox(avatar, nickname || name);
      };
    }
    if (avatarInput) avatarInput.disabled = true;
  }

  const modalAvatar = document.querySelector('[data-kir="profile-modal-avatar"]');
  if (modalAvatar) {
    if (avatar) {
      modalAvatar.style.backgroundImage = `url("${avatar}")`;
      modalAvatar.style.backgroundSize = 'cover';
      modalAvatar.style.backgroundPosition = 'center';
      modalAvatar.textContent = '';
    } else {
      modalAvatar.style.backgroundImage = '';
      modalAvatar.textContent = name.charAt(0).toUpperCase();
    }
  }

  const bannerEl = document.getElementById('kir-profile-banner');
  const customBanner = localStorage.getItem(KIR_BANNER_KEY);
  if (customBanner) {
    if (bannerEl) bannerEl.style.background = customBanner;
  } else if (avatar) {
    if (__kirCachedBannerAvatarSrc === avatar && __kirCachedBannerColor !== undefined) {
      kirApplyBannerFromColor(bannerEl, __kirCachedBannerColor);
    } else {
      kirApplyBannerFromColor(bannerEl, null);
      kirExtractDominantColor(avatar).then(rgb => {
        __kirCachedBannerColor = rgb;
        __kirCachedBannerAvatarSrc = avatar;
        kirApplyBannerFromColor(bannerEl, rgb);
      });
    }
  } else {
    kirApplyBannerFromColor(bannerEl, null);
  }

  kirRefreshProfileAboutView(about, isSelf);

  const createdAtEl = document.getElementById('kir-profile-modal-createdat');
  if (createdAtEl) {
    if (createdAt) {
      const d = new Date(createdAt);
      createdAtEl.textContent = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } else {
      createdAtEl.textContent = '—';
    }
  }

  if (actualTargetId) {
    kirRenderCommentSection('profile-comments-root', 'profile', actualTargetId, 'kirCloseProfileModal()');
  }

  kirLocalModalShow(modal);
}

function kirOpenPfpLightbox(avatarUrl, name) {
  const modal = document.getElementById('kir-profile-modal');
  const lightboxImg = document.getElementById('kir-profile-lightbox-img');
  if (!modal || !lightboxImg) return;

  if (avatarUrl) {
    lightboxImg.style.backgroundImage = '';
    lightboxImg.innerHTML = `<img src="${kirEscapeHtml(avatarUrl)}" alt="Profile" class="w-full h-full object-cover rounded-full pointer-events-auto" />`;
  } else {
    lightboxImg.innerHTML = '';
    lightboxImg.style.backgroundImage = '';
    lightboxImg.textContent = name ? name.charAt(0).toUpperCase() : 'A';
  }

  modal.classList.add('lightbox-active');
}

function kirClosePfpLightbox(e) {
  if (e) e.stopPropagation();
  const modal = document.getElementById('kir-profile-modal');
  if (modal) modal.classList.remove('lightbox-active');
}

function kirCloseProfileModal() {
  if (typeof kirCloseAllCustomSelects === 'function') kirCloseAllCustomSelects();
  kirCancelProfileAboutEdit();
  kirCancelProfileNameEdit();
  kirClosePfpLightbox();
  kirLocalModalHide(document.getElementById('kir-profile-modal'));
}

let _kirMarkdownDependenciesLoading = false;

function kirRefreshProfileAboutView(text, isSelf = true) {
  const textEl  = document.getElementById('kir-profile-about-text');
  const emptyEl = document.getElementById('kir-profile-about-empty');
  const viewEl  = document.getElementById('kir-profile-about-view');
  if (!textEl || !emptyEl) return;
  const val = (text || '').trim();
  if (val) {
    const renderFn = window.kirRenderMarkdownWithMath || window.kirRenderCourseMarkdown;
      if (typeof renderFn === 'function' && window.marked && window.DOMPurify) {
        textEl.innerHTML = renderFn(val);
      } else {
        textEl.textContent = val;
        
        if (!_kirMarkdownDependenciesLoading) {
          _kirMarkdownDependenciesLoading = true;
          const loadJs = (src, globalVar) => new Promise(r => {
            if (globalVar && window[globalVar]) return r();
            if (document.querySelector(`script[src="${src}"]`)) {
              if (!globalVar) return r();
              let attempts = 0;
              const check = setInterval(() => {
                if (window[globalVar] || ++attempts > 100) {
                  clearInterval(check);
                  r();
                }
              }, 50);
              return;
            }
            const s = document.createElement('script');
            s.src = src;
            s.onload = r;
            document.head.appendChild(s);
          });
          
          const scripts = [
            loadJs('https://cdn.jsdelivr.net/npm/dompurify/dist/purify.min.js', 'DOMPurify'),
            loadJs('https://cdn.jsdelivr.net/npm/marked/marked.min.js', 'marked')
          ];
          
          if (typeof kirRenderCourseMarkdown !== 'function') {
            scripts.push(loadJs('js/admin-shared.js', 'kirRenderMarkdownWithMath'));
          }
          
          Promise.all(scripts).then(() => {
            const fn = window.kirRenderMarkdownWithMath || window.kirRenderCourseMarkdown;
            if (typeof fn === 'function' && window.marked) {
              marked.setOptions({ gfm: true, breaks: true });
              textEl.innerHTML = fn(val);
            }
          }).catch(err => console.error("Failed to load markdown", err));
        }
      }
    if (viewEl) viewEl.classList.remove('hidden');
    textEl.classList.remove('hidden');
    emptyEl.classList.add('hidden');
  } else {
    textEl.textContent = '';
    textEl.classList.add('hidden');
    if (isSelf) {
      if (viewEl) viewEl.classList.remove('hidden');
      emptyEl.classList.remove('hidden');
    } else {
      emptyEl.classList.add('hidden');
      if (viewEl) viewEl.classList.add('hidden');
    }
  }
}

function kirToggleProfileAboutEdit() {
  const viewEl  = document.getElementById('kir-profile-about-view');
  const editEl  = document.getElementById('kir-profile-about-edit');
  const editBtn = document.getElementById('kir-profile-edit-btn');
  const input   = document.getElementById('kir-profile-about-input');
  if (!viewEl || !editEl || !input) return;
  const isEditing = !editEl.classList.contains('hidden');
  if (isEditing) {
    kirCancelProfileAboutEdit();
  } else {
    input.value = kirCurrentUserAboutMe();
    kirUpdateAboutMeCounter();
    viewEl.classList.add('hidden');
    editEl.classList.remove('hidden');
    if (editBtn) editBtn.textContent = 'Cancel';
    input.focus();
  }
}

function kirCancelProfileAboutEdit() {
  const viewEl  = document.getElementById('kir-profile-about-view');
  const editEl  = document.getElementById('kir-profile-about-edit');
  const editBtn = document.getElementById('kir-profile-edit-btn');
  if (viewEl) viewEl.classList.remove('hidden');
  if (editEl) editEl.classList.add('hidden');
  if (editBtn) editBtn.textContent = 'Edit';
}

function kirCancelProfileNameEdit() {
  const viewEl = document.getElementById('kir-profile-name-view');
  const editEl = document.getElementById('kir-profile-name-edit');
  if (viewEl) {
    viewEl.classList.remove('hidden');
    viewEl.classList.add('inline-block');
  }
  if (editEl) editEl.classList.add('hidden');
}

function kirToggleProfileNameEdit() {
  const viewEl = document.getElementById('kir-profile-name-view');
  const editEl = document.getElementById('kir-profile-name-edit');
  const input  = document.getElementById('kir-profile-name-input');
  if (!viewEl || !editEl || !input) return;

  const isEditing = !editEl.classList.contains('hidden');
  if (isEditing) {
    kirCancelProfileNameEdit();
  } else {
    input.value = kirCurrentUserNickname() || kirCurrentUserName();
    viewEl.classList.add('hidden');
    viewEl.classList.remove('inline-block');
    editEl.classList.remove('hidden');
    input.focus();
    input.select();
    
    if (!input._kirBound) {
      input._kirBound = true;
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') kirSaveProfileName();
        if (e.key === 'Escape') kirCancelProfileNameEdit();
      });
      input.addEventListener('blur', () => kirSaveProfileName());
    }
  }
}

function kirSaveProfileName() {
  const input = document.getElementById('kir-profile-name-input');
  if (!input) return;
  const nameVal = input.value.trim().slice(0, 30);
  if (nameVal && nameVal !== kirCurrentUserName()) {
    kirSetUserNickname(nameVal);
  } else {
    kirSetUserNickname(null);
  }
  
  const displayName = kirCurrentUserNickname() || kirCurrentUserName();
  const nameEl = document.getElementById('kir-profile-modal-name');
  if (nameEl) nameEl.textContent = displayName;
  
  if (!kirCurrentUserAvatar()) {
    const modalAvatar = document.querySelector('[data-kir="profile-modal-avatar"]');
    if (modalAvatar) modalAvatar.textContent = displayName.charAt(0).toUpperCase();
  }
  
  kirRenderUserChrome();
  kirCancelProfileNameEdit();
}

function kirSaveProfileAbout() {
  const input = document.getElementById('kir-profile-about-input');
  if (!input) return;
  const text = input.value.trim().slice(0, 200);
  kirSetUserAboutMe(text);
  kirRefreshProfileAboutView(text);
  kirCancelProfileAboutEdit();
}

function kirUpdateAboutMeCounter() {
  const input   = document.getElementById('kir-profile-about-input');
  const counter = document.getElementById('kir-profile-about-counter');
  if (input && counter) counter.textContent = `${input.value.length}/200`;
  if (input && !input._kirBound) {
    input._kirBound = true;
    input.addEventListener('input', kirUpdateAboutMeCounter);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) kirSaveProfileAbout();
      if (e.key === 'Escape') kirCancelProfileAboutEdit();
    });
  }
}

/* ----------------------------------------------------------
   Custom dropdown. Replaces native <select> styling with a
   themed trigger and option panel, shared by every dropdown on
   the site (Voyages' answer dropdown, the registration "Kelas"
   selects, etc).

   Usage: call kirRefreshCustomSelect('some-select-id') any time
   AFTER the underlying <select id="some-select-id"> exists in
   the DOM with its <option>s in place (on page load for static
   selects, or right after re-populating options dynamically).

   Optional: set data-trigger-class="..." on the <select> to add
   extra classes to the built trigger. For example "kir-select-pill
   bg-accent-15 text-accent-300 border border-accent-30" keeps a
   small colored status-pill look (see tasks.html's per-task status
   dropdown) instead of the default glass-input trigger.

   How it works: the real <select> stays in the DOM (hidden) so
   every bit of existing code that reads `.value` off it keeps
   working untouched. kirRefreshCustomSelect just builds or updates
   a custom-styled sibling widget that mirrors it and writes back
   into it when the user picks an option.
   ---------------------------------------------------------- */
/* Panels now size themselves to fit their content (see .kir-select-panel
   in style.css, no more max-height or scrollbar, and width can exceed the
   trigger's). That means a panel CAN spill past the viewport edge in a
   way the old fixed-to-trigger-width version never could: a narrow
   trigger near the right edge of the screen, or a trigger near the
   bottom, needs its panel shifted/flipped rather than clipped. */

function kirScrollSelectOptionToCenter(panel) {
  if (!panel) return;
  const selectedOpt = panel.querySelector('.kir-select-option.selected') || panel.querySelector('.kir-select-option');
  if (selectedOpt && panel.scrollHeight > panel.clientHeight) {
    const optTop = selectedOpt.offsetTop;
    const optHeight = selectedOpt.offsetHeight;
    const panelHeight = panel.clientHeight;
    panel.scrollTop = Math.max(0, optTop - (panelHeight / 2) + (optHeight / 2));
  }
}

function kirPositionSelectPanel(panel, trigger) {
  if (!panel || !trigger) return;
  const margin = 8;
  const triggerRect = trigger.getBoundingClientRect();

  panel.style.minWidth = Math.max(120, triggerRect.width) + 'px';
  panel.style.left = triggerRect.left + 'px';
  panel.style.right = '';
  panel.style.top = (triggerRect.bottom + 6) + 'px';
  panel.style.bottom = '';

  const panelRect = panel.getBoundingClientRect();

  if (triggerRect.left + panelRect.width > window.innerWidth - margin) {
    panel.style.left = Math.max(margin, triggerRect.right - panelRect.width) + 'px';
  }

  const spaceBelow = window.innerHeight - triggerRect.bottom;
  const spaceAbove = triggerRect.top;
  if (panelRect.height > spaceBelow - margin && spaceAbove > spaceBelow) {
    panel.style.top = Math.max(margin, triggerRect.top - panelRect.height - 6) + 'px';
  }
}

function kirCloseAllCustomSelects(exceptPanel) {
  document.querySelectorAll('.kir-select-panel').forEach(p => {
    if (!exceptPanel || p !== exceptPanel) {
      p.classList.add('hidden');
    }
  });
  document.querySelectorAll('.kir-select-trigger').forEach(t => {
    const panelId = t.dataset.panelId;
    const panel = panelId ? document.getElementById(panelId) : null;
    if (!panel || panel.classList.contains('hidden')) {
      t.classList.remove('open');
      t.setAttribute('aria-expanded', 'false');
    }
  });
}

function kirRefreshCustomSelect(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.classList.add('hidden');
  select.style.setProperty('display', 'none', 'important');

  let wrapper = select.nextElementSibling;
  if (!wrapper || !wrapper.classList.contains('kir-select')) {
    wrapper = document.createElement('div');
    wrapper.className = 'kir-select';
    select.insertAdjacentElement('afterend', wrapper);
  }
  Array.from(select.classList).forEach(cls => {
    if (/^(m[trblxy]?-|flex-|w-|grow|shrink|basis-)/.test(cls)) wrapper.classList.add(cls);
  });

  const options = Array.from(select.options);
  const selectedOption = select.options[select.selectedIndex] || null;
  const isPlaceholder = !select.value;
  const triggerClassTokens = (select.dataset.triggerClass || '').split(/\s+/).filter(Boolean);
  const extraTriggerClass = triggerClassTokens.length ? ' ' + triggerClassTokens.join(' ') : '';
  wrapper.classList.toggle('kir-select-pill', triggerClassTokens.includes('kir-select-pill'));

  const selectedI18n = selectedOption && selectedOption.getAttribute('data-i18n') ? ` data-i18n="${selectedOption.getAttribute('data-i18n')}"` : '';

  const panelId = 'kir-select-panel-' + selectId;

  wrapper.innerHTML = `
    <button type="button" class="kir-select-trigger${extraTriggerClass}${isPlaceholder ? ' placeholder' : ''}" data-panel-id="${panelId}" aria-haspopup="listbox" aria-expanded="false" ${select.disabled ? 'disabled' : ''}>
      <span class="kir-select-trigger-label"${selectedI18n}>${selectedOption ? kirEscapeHtml(selectedOption.textContent) : ''}</span>
      <svg class="kir-select-chevron" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
    </button>`;

  let panel = document.getElementById(panelId);
  if (!panel) {
    panel = document.createElement('div');
    panel.id = panelId;
    document.body.appendChild(panel);
  }
  panel.className = 'kir-select-panel hidden';
  panel.setAttribute('role', 'listbox');
  panel.innerHTML = options.map(o => {
    const i18nAttr = o.getAttribute('data-i18n') ? ` data-i18n="${o.getAttribute('data-i18n')}"` : '';
    return `
    <div class="kir-select-option${o.value === select.value ? ' selected' : ''}${o.disabled ? ' disabled' : ''}" data-value="${kirEscapeHtml(o.value)}" role="option" aria-selected="${o.value === select.value}" aria-disabled="${o.disabled ? 'true' : 'false'}"${i18nAttr}>
      <span>${kirEscapeHtml(o.textContent)}</span>
      ${o.value === select.value ? '<svg class="kir-select-check" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>' : ''}
    </div>`;
  }).join('');

  const trigger = wrapper.querySelector('.kir-select-trigger');

  trigger.onclick = (e) => {
    e.stopPropagation();
    const willOpen = panel.classList.contains('hidden');
    kirCloseAllCustomSelects();
    if (willOpen) {
      panel.classList.remove('hidden');
      trigger.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
      kirPositionSelectPanel(panel, trigger);
      kirScrollSelectOptionToCenter(panel);
    }
  };

  trigger.onkeydown = (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      trigger.click();
    }
  };

  panel.querySelectorAll('.kir-select-option:not(.disabled)').forEach(opt => {
    opt.onclick = (e) => {
      e.stopPropagation();
      select.value = opt.getAttribute('data-value');
      select.dispatchEvent(new Event('change', { bubbles: true }));
      kirRefreshCustomSelect(selectId);
      kirCloseAllCustomSelects();
    };
  });
}

/* Multi-select variant. */
function kirRefreshMultiSelect(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.classList.add('hidden');
  select.style.setProperty('display', 'none', 'important');

  let wrapper = select.nextElementSibling;
  if (!wrapper || !wrapper.classList.contains('kir-select')) {
    wrapper = document.createElement('div');
    wrapper.className = 'kir-select';
    select.insertAdjacentElement('afterend', wrapper);
  }
  Array.from(select.classList).forEach(cls => {
    if (/^(m[trblxy]?-|flex-|w-|grow|shrink|basis-)/.test(cls)) wrapper.classList.add(cls);
  });

  const lang = localStorage.getItem('kir_lang') || 'id';
  const options = Array.from(select.options);
  const selected = options.filter(o => o.selected);

  let label;
  if (selected.length === 0) {
    label = (I18N[lang] && I18N[lang].voyages_filter_none) || 'Tidak Ada';
  } else if (selected.length === options.length) {
    label = (I18N[lang] && I18N[lang].voyages_filter_all) || 'Semua';
  } else if (selected.length === 1) {
    label = selected[0].textContent;
  } else {
    label = `${selected.length} ${ (I18N[lang] && I18N[lang].voyages_filter_selected) || 'terpilih' }`;
  }

  const panelId = 'kir-select-panel-' + selectId;
  let panel = document.getElementById(panelId);
  const wasOpen = panel && !panel.classList.contains('hidden');
  const prevScrollTop = panel ? panel.scrollTop : 0;

  wrapper.innerHTML = `
    <button type="button" class="kir-select-trigger${select.disabled ? ' disabled' : ''}" data-panel-id="${panelId}" aria-haspopup="listbox" aria-expanded="${wasOpen ? 'true' : 'false'}" ${select.disabled ? 'disabled' : ''}>
      <span class="kir-select-trigger-label">${kirEscapeHtml(label)}</span>
      <svg class="kir-select-chevron" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
    </button>`;

  if (!panel) {
    panel = document.createElement('div');
    panel.id = panelId;
    document.body.appendChild(panel);
  }

  panel.className = 'kir-select-panel' + (wasOpen ? '' : ' hidden');
  panel.setAttribute('role', 'listbox');
  panel.setAttribute('aria-multiselectable', 'true');
  panel.innerHTML = options.map(o => {
    const checked = o.selected;
    const i18nAttr = o.getAttribute('data-i18n') ? ` data-i18n="${o.getAttribute('data-i18n')}"` : '';
    return `
    <div class="kir-select-option multi${checked ? ' selected' : ''}${o.disabled ? ' disabled' : ''}" data-value="${kirEscapeHtml(o.value)}" role="option" aria-selected="${checked}" aria-disabled="${o.disabled ? 'true' : 'false'}">
      <span class="kir-select-checkbox"></span>
      <span${i18nAttr}>${kirEscapeHtml(o.textContent)}</span>
    </div>`;
  }).join('');

  const trigger = wrapper.querySelector('.kir-select-trigger');

  if (wasOpen) {
    trigger.classList.add('open');
    kirPositionSelectPanel(panel, trigger);
    panel.scrollTop = prevScrollTop;
  }

  trigger.onclick = (e) => {
    e.stopPropagation();
    const willOpen = panel.classList.contains('hidden');
    kirCloseAllCustomSelects();
    if (willOpen) {
      panel.classList.remove('hidden');
      trigger.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
      kirPositionSelectPanel(panel, trigger);
      kirScrollSelectOptionToCenter(panel);
    }
  };

  trigger.onkeydown = (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      trigger.click();
    }
  };

  panel.querySelectorAll('.kir-select-option:not(.disabled)').forEach(opt => {
    opt.onclick = (e) => {
      e.stopPropagation();
      const value = opt.getAttribute('data-value');
      const targetOption = options.find(o => o.value === value);
      if (targetOption) targetOption.selected = !targetOption.selected;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      kirRefreshMultiSelect(selectId);
    };
  });
}

document.addEventListener('click', () => kirCloseAllCustomSelects());
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') kirCloseAllCustomSelects(); });
window.addEventListener('resize', () => kirCloseAllCustomSelects());
window.addEventListener('scroll', (e) => {
  if (e.target && e.target.closest && e.target.closest('.kir-select-panel')) return;
  kirCloseAllCustomSelects();
}, true);