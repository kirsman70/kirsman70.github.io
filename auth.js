/* ==========================================================
   KIR (Karya Ilmiah Remaja) : prototype auth + theme
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

const SUPABASE_URL = 'https://qalkibuywgookvicnuhv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhbGtpYnV5d2dvb2t2aWNudWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMjg5OTEsImV4cCI6MjA5OTgwNDk5MX0.P1d6Mf3xQITOIyFMLPdFnji0awZj38Sj1K7HZe2n4Zc';
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
window.supabaseClient = supabaseClient;

const KIR_SESSION_KEY  = 'kir_session';
const KIR_NAME_KEY     = 'kir_user_name';
const KIR_ROLE_KEY     = 'kir_user_role';
const KIR_CABANG_KEY   = 'kir_user_cabang';   // 'robotik' | 'sains' | 'both'
const KIR_AVATAR_KEY   = 'kir_user_avatar';   // base64 data URL, or absent
const KIR_THEME_KEY    = 'kir_theme';         // 'dark' | 'light'
const KIR_REDUCE_MOTION_KEY = 'kir_reduce_motion'; // 'true' | 'false'
const KIR_DISABLE_BRANCH_COLOR_KEY = 'kir_disable_branch_color'; // 'true' | 'false' — see kirSetDisableBranchColor()
const KIR_LAST_CABANG_KEY = 'kir_last_cabang'; // survives logout — see kirLogin()
const KIR_LANG_KEY     = 'kir_lang';          // 'id' | 'en'
const KIR_SIDEBAR_COLLAPSED_KEY = 'kir_sidebar_collapsed'; // 'true' | 'false' — persists across page loads
const KIR_SIDEBAR_POSITION_KEY = 'kir_sidebar_position'; // 'left' | 'right' | 'top' | 'bottom' — default 'left'
const KIR_SIDEBAR_NAV_SCROLL_KEY = 'kir_sidebar_nav_scroll'; // JSON {top, left} — sessionStorage, see kirSaveNavScrollPos()

const I18N = {
  id: { 
    chart_hint: 'Geser untuk menjelajah',
    tugas: 'Tugas', materials: 'Materi', nexus: 'Nexus', jadwal: 'Jadwal', anggota: 'Anggota', pengaturan: 'Pengaturan', beranda: 'Beranda', keluar: 'Keluar',
    robotik: 'Robotik', sains: 'Sains', both: 'Robotik & Sains',
    menu: 'Menu', akun: 'Akun', kir_long: 'Karya Ilmiah Remaja',
    settings_desc: 'Kelola profil, cabang, dan tampilan akun kamu.',
    active_branch: 'Cabang Aktif', branch_desc: 'Cabang terdaftar kamu saat ini.',
    appearance_lang: 'Tampilan & Bahasa', change_lang: 'Ubah Bahasa',
    crop_title: 'Sesuaikan Foto', crop_hint: 'Seret untuk menggeser, geser slider untuk memperbesar.', crop_cancel: 'Batal', crop_save: 'Simpan',
    dashboard_sub: 'Berikut yang terjadi di Orbit minggu ini.',
    active_tasks: 'Tugas Aktif', due_this_week: 'jatuh tempo minggu ini', late: 'terlambat',
    upcoming_events: 'Acara Mendatang', up_next: 'Selanjutnya:', recent_activity: 'Aktivitas terbaru',
    tasks_desc: 'Semua yang ditugaskan ke ekstrakurikuler saat ini.', assigned_to: 'Ditugaskan ke', due: 'Tenggat:', submitted: 'jawaban terkirim',
    status_progress: 'Sedang Dikerjakan', status_review: 'Menunggu Peninjauan', status_late: 'Terlambat', status_todo: 'Belum Dimulai', status_done: 'Selesai',
    modal_desc: 'Deskripsi tugas', modal_ans: 'Jawaban kamu', modal_upload: 'Klik untuk unggah file jawaban\u2026', modal_proto: 'Prototipe: file tidak benar-benar diunggah ke server, hanya nama filenya yang disimpan di browser kamu.',
    schedule_desc: 'Acara ekstrakurikuler mendatang, secara berurutan.', badge_next: 'Berikutnya',
    members_desc: 'Semua orang yang tergabung di KIR.', role_ketua: 'Ketua Ekstrakurikuler', role_wakil: 'Wakil Ketua', role_bendahara: 'Bendahara', role_anggota: 'Anggota', you: '(kamu)',
    materials_desc: 'Modul pembelajaran dan referensi untuk anggota klub.',
    admin_search_placeholder: 'Cari nama, email, atau kelas…',
    clock_label: 'Jam', dash_heatmap: 'Kontribusi', dash_heatmap_less: 'Sedikit', dash_heatmap_more: 'Banyak', dash_heatmap_active_days: 'Hari aktif',
    dash_quicklinks: 'Tautan Cepat', dash_roster_title: 'Anggota Aktif', dash_roster_online: 'Sedang aktif',
    dash_edit: 'Edit', dash_edit_hint: 'Seret widget untuk memindahkan, tekan ikon ukuran untuk mengubah besarnya.', dash_reset: 'Kembalikan ke tampilan awal', dash_remove_widget: 'Hapus widget',
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
    empty_materials_title: 'Belum ada materi di sini!', empty_materials_desc: 'Pengurus belum mengunggah referensi atau modul pembelajaran. Mohon bersabar, ya!',
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
    apply_section_kelas_cabang: 'Kelas & Cabang', apply_section_latar_belakang: 'Latar Belakang', apply_section_prestasi: 'Prestasi', apply_section_minat_lomba: 'Tertarik Dengan Lomba',
    apply_field_cabang: 'Cabang', apply_field_kelas: 'Kelas', apply_field_ekskul_lain: 'Ekstrakurikuler Lain', apply_field_smp_asal: 'SMP Asal', apply_field_prestasi: 'Prestasi',
    apply_registered_at: 'Terdaftar',
    time_just_now: 'baru saja', time_minutes_ago: '{n} menit lalu', time_hours_ago: '{n} jam lalu', time_days_ago: '{n} hari lalu',
    idx_login: 'Masuk', idx_register: 'Daftar', idx_dash_badge: 'Dasbor Ekstrakurikuler',
    idx_hero_title: '“In Harmonia Innovatio”',
    idx_hero_subtitle: 'Platform generasi baru KIR. Semua eksplorasi, penemuan, dan kegiatan ekstrakurikuler terjadi di sini.',
    idx_cta_1: 'Mulai menggunakan', idx_cta_2: 'Sudah punya akun? Masuk',
    idx_feat_heading: 'Alat bantu pengurus.',
    idx_feat1_title: 'Pelacakan tugas', idx_feat1_desc: 'Pantau penanggung jawab tugas, tenggat waktu, dan status penyelesaian setiap kegiatan. Sistem ini memastikan seluruh proyek berjalan sesuai rencana.',
    idx_feat2_title: 'Jadwal ekstrakurikuler', idx_feat2_desc: 'Susun kalender ekstrakurikuler dalam linimasa sentral. Modul ini mencegah bentrok jadwal latihan, rapat, dan kompetisi.',
    idx_feat3_title: 'Koordinasi tim', idx_feat3_desc: 'Fasilitasi anggota memahami alur kerja dan minimalkan miskomunikasi. Ruang kerja terpadu ini menampung laporan progres aktual.',
    idx_branch_title: 'Pilihan cabang:',
    idx_branch_sub: 'Pilih cabang saat mendaftar untuk mengonfigurasi tampilan dasbor.',
    idx_branch_rob_sub: 'Fokus pada kegiatan rancang bangun, pemrograman, dan kompetisi robot. Modul ini menyediakan ruang eksplorasi ke berbagai bidang seperti mikrokontroler, pengembangan game, pengembangan web, pemanfaatan AI cerdas, dan logika otomasi.',
    idx_branch_sci_sub: 'Fokus pada praktik riset, eksperimen, dan penulisan karya ilmiah. Anggota mengembangkan hipotesis, menguji metodologi baru, serta mempersiapkan diri untuk OPSI dan kompetisi penelitian lainnya di sini.',
    idx_proker_heading: 'Rencana Kegiatan', idx_proker_sub: 'Daftar kegiatan cabang Robotik dan Sains untuk tahun ajaran ini. Fitur ini menjabarkan target mingguan dan persiapan perlombaan.', idx_proker_cta: 'Lihat Program Kerja',
    idx_gallery_heading: 'Dokumentasi', idx_gallery_sub: 'Arsip foto kegiatan ekstrakurikuler dalam format direktori. Akses rekaman visual dari acara masa lalu dan sesi eksperimen laboratorium.', idx_gallery_cta: 'Buka Galeri',
    idx_scroll_hint: 'Gulir untuk melihat',
    idx_footer: 'KIR menetapkan pusat gravitasi. Seluruh ekstrakurikuler akan mengorbit ruang ini.',
    nav_fitur: 'Fitur', nav_cabang: 'Cabang',
    page_title_home: 'Orbit', page_title_dashboard: 'Beranda', page_title_tasks: 'Tugas',
    page_title_materials: 'Materi', page_title_nexus: 'Nexus', page_title_schedule: 'Jadwal', page_title_members: 'Anggota',
    page_title_voyages: 'Voyages', page_title_leaderboard: 'Peringkat',
    page_title_settings: 'Pengaturan', page_title_program_kerja: 'Program Kerja', page_title_gallery: 'Galeri',
    page_title_auth: 'Masuk atau Daftar',
    idx_dashboard: 'Dasbor', idx_open_dashboard: 'Buka Dasbor', idx_open_dashboard_hero: 'Buka dasbor kamu',
    greeting_morning: 'Selamat pagi', greeting_afternoon: 'Selamat siang', greeting_evening: 'Selamat sore', greeting_night: 'Selamat malam',
    activity_today: 'Hari ini pukul', activity_yesterday: 'Kemarin pukul', activity_at: 'pukul',
    deltas_label: 'Deltas', this_week: 'minggu ini', all_time: 'sepanjang waktu', deltas_points: 'deltas',
    deltas_range_week: 'Minggu ini', deltas_range_lifetime: 'Sepanjang waktu',
    deltas_desc: 'Poin didapat dari mengerjakan soal latihan.',
    streak_label: 'Beruntun', streak_days: 'hari beruntun',
    galeri: 'Galeri', program_kerja: 'Program Kerja',
    nav_beranda: 'Beranda', nav_galeri: 'Galeri', nav_proker: 'Program Kerja',
    gallery_title: 'Galeri', gallery_desc: 'Dokumentasi kegiatan ekstrakurikuler, disusun jadi folder seperti berkas di komputer kamu. Klik folder untuk membuka, atau tombol ".." untuk kembali.',
    gallery_up: '.. Kembali', gallery_empty: 'Folder ini belum berisi file. Foto akan segera diunggah.',
    gallery_items_one: 'item', gallery_items_other: 'item',
    proker_eyebrow: 'Tahun Ajaran 2025/2026',
    proker_title: 'Program Kerja', proker_desc: 'Rencana kerja cabang Robotik dan Sains untuk tahun ajaran ini mencakup kegiatan latihan rutin hingga kompetisi.',
    proker_robotik_label: 'Cabang Robotik', proker_sains_label: 'Cabang Sains',
    proker_cta_title: 'Tertarik ikut program ini?', proker_cta_desc: 'Daftar sebagai anggota dan pilih cabang yang kamu minati untuk mendapatkan dasbor yang disesuaikan secara otomatis.',
    proker_cta_btn: 'Daftar Sekarang',
    voyage_category: 'Voyage', nav_voyages: 'Voyages', nav_leaderboard: 'Peringkat',
    voyages_title: 'Voyages', voyages_desc: 'Latihan soal MIPA dan informatika. Selesaikan soal-soal ini untuk mengumpulkan deltas.',
    voyages_filter_all: 'Semua', voyages_filter_math: 'Matematika', voyages_filter_physics: 'Fisika', voyages_filter_informatika: 'Informatika',
    voyages_filter_chemistry: 'Kimia', voyages_filter_biology: 'Biologi', voyages_filter_selected: 'dipilih', voyages_filter_none: 'Tidak ada',
    voyages_filter_subject_label: 'Subjek', voyages_filter_type_label: 'Tipe',
    voyages_expedition_mode_label: 'Mode Ekspedisi', voyages_expedition_exit: 'Keluar Ekspedisi',
    voyages_expedition_empty: 'Semua voyage yang cocok dengan filter kamu sudah selesai.',
    voyages_expedition_fullscreen_required: 'Mode layar penuh diperlukan untuk memulai Ekspedisi.',
    voyages_expedition_fullscreen_unsupported: 'Perangkat ini tidak mendukung mode layar penuh.',
    voyages_expedition_complete: 'Ekspedisi selesai — kamu menyelesaikan semua voyage yang cocok!',
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
    voyages_submit: 'Kirim Jawaban', voyages_next: 'Selanjutnya', voyages_close: 'Tutup',
    voyages_correct: 'Jawaban benar!', voyages_incorrect: 'Belum tepat, coba lagi.',
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
    reset_voyages_title: 'Reset Voyages', reset_voyages_desc: 'Menghapus semua voyage yang sudah kamu selesaikan dan mengatur ulang deltas kamu ke 0.', reset_voyages_btn: 'Reset',
    reset_voyages_confirm_title: 'Kamu yakin?',
    reset_voyages_confirm_desc: 'Semua voyage yang sudah kamu selesaikan akan dihapus dan deltas kamu akan kembali ke 0. Tindakan ini tidak dapat dibatalkan.',
    reset_voyages_confirm_hint: 'Ketik "SAYA YAKIN" di bawah untuk melanjutkan.', reset_voyages_confirm_placeholder: 'SAYA YAKIN', reset_voyages_confirm_phrase: 'SAYA YAKIN',
    reset_voyages_confirm_btn: 'Reset Voyages', reset_voyages_cancel: 'Batal', reset_voyages_processing: 'Mereset…',
    reset_voyages_success: 'Voyages kamu berhasil direset.', reset_voyages_error: 'Gagal mereset voyages. Coba lagi.',

    admin_title: 'Admin Panel', admin_desc: 'Tinjau dan kelola pendaftaran anggota baru.',
    admin_tab_tasks: 'Tugas', admin_tab_schedule: 'Jadwal', admin_tab_materials: 'Materi', admin_tab_voyages: 'Voyages',
    admin_task_title_label: 'Judul Tugas', admin_task_title_placeholder: 'Masukkan judul…',
    admin_due_label: 'Tenggat Waktu (Due)', admin_pick_date: 'Pilih tanggal',
    admin_type_label: 'Tipe', admin_type_ekskul: 'Ekstrakurikuler', admin_type_individual: 'Individual', admin_type_kelompok: 'Kelompok',
    admin_cabang_label: 'Cabang', admin_cabang_both: 'Robotik & Sains',
    admin_assign_mode_label: 'Mode Penugasan', admin_assign_everyone: 'Semua Anggota Cabang', admin_assign_specific: 'Orang Tertentu',
    admin_assignee_label: 'Penerima (Assignee)', admin_assignee_placeholder: 'Nama anggota…', admin_assignee_hint: 'Masukkan satu atau lebih nama, pisahkan dengan koma.',
    admin_desc_label: 'Deskripsi', admin_desc_placeholder: 'Jelaskan detail tugas…',
    admin_image_label: 'Gambar (Opsional)', admin_image_upload: 'Klik untuk unggah gambar…',
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
    materials_search_placeholder: 'Cari materi…', materials_filter_cabang: 'Cabang', materials_all_branches: 'Semua Cabang',
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
    admin_essay_ref_label: 'Jawaban Referensi (Opsional)',
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
    voyages_alt_precise_title: 'Geser presisi', voyages_alt_precise_body: 'Tahan Alt sambil menyeret untuk mengatur rating dengan presisi 2 desimal, bukan hanya angka bulat.'
  },
  en: {
    chart_hint: 'Pan to explore',
    tugas: 'Tasks', materials: 'Materials', nexus: 'Nexus', jadwal: 'Schedule', anggota: 'Members', pengaturan: 'Settings', beranda: 'Home', keluar: 'Log Out',
    robotik: 'Robotics', sains: 'Science', both: 'Robotics and Science',
    menu: 'Menu', akun: 'Account', kir_long: 'Karya Ilmiah Remaja',
    settings_desc: 'Manage your profile, branch, and account appearance.',
    active_branch: 'Active Branch', branch_desc: 'Your currently registered branch.',
    appearance_lang: 'Appearance & Language', change_lang: 'Change Language',
    crop_title: 'Adjust Photo', crop_hint: 'Drag to reposition, use the slider to zoom.', crop_cancel: 'Cancel', crop_save: 'Save',
    dashboard_sub: "Here's what's happening in Orbit this week.",
    active_tasks: 'Active Tasks', due_this_week: 'due this week', late: 'late',
    upcoming_events: 'Upcoming Events', up_next: 'Up next:', recent_activity: 'Recent activity',
    tasks_desc: 'Everything currently assigned to the extracurricular.', assigned_to: 'Assigned to', due: 'Due:', submitted: 'submission sent',
    status_progress: 'In Progress', status_review: 'Pending Review', status_late: 'Overdue', status_todo: 'Not Started', status_done: 'Completed',
    modal_desc: 'Task description', modal_ans: 'Your submission', modal_upload: 'Click to upload submission file\u2026', modal_proto: 'Prototype: files are not actually uploaded to a server, only the filename is stored in your browser.',
    schedule_desc: 'Upcoming extracurricular events, in chronological order.', badge_next: 'Next',
    members_desc: 'Everyone currently in KIR.', role_ketua: 'Extracurricular President', role_wakil: 'Vice President', role_bendahara: 'Treasurer', role_anggota: 'Member', you: '(you)',
    materials_desc: 'Learning modules and references for club members.',
    admin_search_placeholder: 'Search by name, email, or class…',
    clock_label: 'Clock', dash_heatmap: 'Contributions', dash_heatmap_less: 'Less', dash_heatmap_more: 'More', dash_heatmap_active_days: 'Active days',
    dash_quicklinks: 'Quick Links', dash_roster_title: 'Active Members', dash_roster_online: 'Currently active',
    dash_edit: 'Edit', dash_edit_hint: 'Drag widgets to move them, tap the resize icon to change their size.', dash_reset: 'Reset to default layout', dash_remove_widget: 'Remove widget',
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
    empty_materials_title: 'No materials here yet!', empty_materials_desc: 'The organizers haven\u2019t uploaded any references or learning modules yet. Hang tight!',
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
    apply_section_kelas_cabang: 'Class & Branch', apply_section_latar_belakang: 'Background', apply_section_prestasi: 'Achievements', apply_section_minat_lomba: 'Interested In Competitions',
    apply_field_cabang: 'Branch', apply_field_kelas: 'Class', apply_field_ekskul_lain: 'Other Extracurriculars', apply_field_smp_asal: 'Previous School', apply_field_prestasi: 'Achievements',
    apply_registered_at: 'Registered',
    time_just_now: 'just now', time_minutes_ago: '{n}m ago', time_hours_ago: '{n}h ago', time_days_ago: '{n}d ago',
    idx_login: 'Log In', idx_register: 'Register', idx_dash_badge: 'Club Dashboard',
    idx_hero_title: '“In Harmonia Innovatio”',
    idx_hero_subtitle: 'The next generation of KIR. All explorations, discoveries, and extracurricular activities happen here.',
    idx_cta_1: 'Get started', idx_cta_2: 'Already have an account? Log In',
    idx_feat_heading: 'Organizer tools.',
    idx_feat1_title: 'Task tracking', idx_feat1_desc: 'Monitor task assignees, deadlines, and completion statuses for every activity. This system ensures all projects proceed according to plan.',
    idx_feat2_title: 'Extracurricular schedule', idx_feat2_desc: 'Organize the extracurricular calendar into a central timeline. This module prevents scheduling conflicts for training sessions and competitions.',
    idx_feat3_title: 'Team coordination', idx_feat3_desc: 'Help members understand workflows and minimize miscommunication. This unified workspace accommodates real-time progress reports.',
    idx_branch_title: 'Branch selection:',
    idx_branch_sub: 'Select a branch during registration to configure the dashboard.',
    idx_branch_rob_sub: 'Focus on robot engineering, programming, and competitions. This module provides exploration into various fields such as microcontrollers, game development, web development, smart AI usage, and automation logic.',
    idx_branch_sci_sub: 'Focus on research practice, experiments, and scientific papers. Members develop hypotheses, test new methodologies, and prepare for OPSI and other research competitions here.',
    idx_proker_heading: 'Activity Plan', idx_proker_sub: 'List of Robotics and Science activities for this school year. This feature outlines weekly targets and competition preparations.', idx_proker_cta: 'View Work Programs',
    idx_gallery_heading: 'Documentation', idx_gallery_sub: 'Archive of extracurricular activity photos in directory format. Access visual records from past events and laboratory experiment sessions.', idx_gallery_cta: 'Open Gallery',
    idx_scroll_hint: 'Scroll to view',
    idx_footer: 'KIR sets the gravity. Every extracurricular will orbit this core.',
    nav_fitur: 'Features', nav_cabang: 'Branches',
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
    gallery_up: '.. Back', gallery_empty: 'This folder is still empty. Photos are coming soon.',
    gallery_items_one: 'item', gallery_items_other: 'items',
    proker_eyebrow: '2025/2026 School Year',
    proker_title: 'Work Programs', proker_desc: 'The Robotics and Science branch work plans for this school year range from weekly training to competitions.',
    proker_robotik_label: 'Robotics Branch', proker_sains_label: 'Science Branch',
    proker_cta_title: 'Interested in joining a program?', proker_cta_desc: 'Register as a member and choose your preferred branch to get an automatically adjusted dashboard.',
    proker_cta_btn: 'Register Now',
    voyage_category: 'Voyage', nav_voyages: 'Voyages', nav_leaderboard: 'Leaderboard',
    voyages_title: 'Voyages', voyages_desc: 'MIPA and programming practice questions. Solve them to earn deltas.',
    voyages_filter_all: 'All', voyages_filter_math: 'Math', voyages_filter_physics: 'Physics', voyages_filter_informatika: 'Informatics', voyages_filter_selected: 'selected', voyages_filter_none: 'None',
    voyages_filter_subject_label: 'Subject', voyages_filter_type_label: 'Type',
    voyages_expedition_mode_label: 'Expedition Mode', voyages_expedition_exit: 'Exit Expedition',
    voyages_expedition_empty: 'Every voyage matching your filters is already done.',
    voyages_expedition_fullscreen_required: 'Fullscreen is required to start an Expedition.',
    voyages_expedition_fullscreen_unsupported: 'This device does not support fullscreen mode.',
    voyages_expedition_complete: 'Expedition complete — you finished every matching voyage!',
    voyages_search_placeholder: 'Search questions…', voyages_search_label: 'Search',
    voyages_sort_label: 'Sort by', voyages_sort_random: 'Random', voyages_sort_diff_asc: 'Rating: Low to High',
    voyages_sort_diff_desc: 'Rating: High to Low', voyages_sort_title_az: 'Title: A to Z', voyages_sort_newest: 'Newest',
    voyages_filter_chemistry: 'Chemistry', voyages_filter_biology: 'Biology',
    voyages_difficulty: 'Rating', voyages_osn_level: 'OSN Level', voyages_reward: 'Reward',
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
    voyages_submit: 'Submit Answer', voyages_next: 'Next', voyages_close: 'Close',
    voyages_correct: 'Correct answer!', voyages_incorrect: 'Not quite, try again.',
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
    reset_voyages_title: 'Reset Voyages', reset_voyages_desc: "Deletes every voyage you've completed and resets your deltas back to 0.", reset_voyages_btn: 'Reset',
    reset_voyages_confirm_title: 'Are you sure?',
    reset_voyages_confirm_desc: "Every voyage you've completed will be deleted and your deltas will go back to 0. This action cannot be undone.",
    reset_voyages_confirm_hint: 'Type "I\'M SURE" below to continue.', reset_voyages_confirm_placeholder: "I'M SURE", reset_voyages_confirm_phrase: "I'M SURE",
    reset_voyages_confirm_btn: 'Reset Voyages', reset_voyages_cancel: 'Cancel', reset_voyages_processing: 'Resetting…',
    reset_voyages_success: 'Your voyages have been reset.', reset_voyages_error: 'Failed to reset voyages. Try again.',

    admin_title: 'Admin Panel', admin_desc: 'Review and manage new member registrations.',
    admin_tab_tasks: 'Tasks', admin_tab_schedule: 'Schedule', admin_tab_materials: 'Materials', admin_tab_voyages: 'Voyages',
    admin_task_title_label: 'Task Title', admin_task_title_placeholder: 'Enter a title…',
    admin_due_label: 'Due Date', admin_pick_date: 'Pick a date',
    admin_type_label: 'Type', admin_type_ekskul: 'Extracurricular', admin_type_individual: 'Individual', admin_type_kelompok: 'Group',
    admin_cabang_label: 'Branch', admin_cabang_both: 'Robotics & Science',
    admin_assign_mode_label: 'Assignment Mode', admin_assign_everyone: 'All Branch Members', admin_assign_specific: 'Specific People',
    admin_assignee_label: 'Assignee', admin_assignee_placeholder: 'Member name…', admin_assignee_hint: 'Enter one or more names, separated by commas.',
    admin_desc_label: 'Description', admin_desc_placeholder: 'Describe the task details…',
    admin_image_label: 'Image (Optional)', admin_image_upload: 'Click to upload an image…',
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
    materials_search_placeholder: 'Search materials…', materials_filter_cabang: 'Branch', materials_all_branches: 'All Branches',
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
    admin_essay_ref_label: 'Reference Answer (Optional)',
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
    voyages_alt_precise_title: 'Precise drag', voyages_alt_precise_body: 'Hold Alt while dragging to set the rating with 2-decimal precision instead of snapping to whole numbers.'
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

/* ----------------------------------------------------------
   Lightweight modal show/hide, self-contained in auth.js.
   admin-shared.js has a fuller equivalent (kirModalShow/Hide,
   with scroll locking), but it isn't loaded on every page —
   auth.js is, and the global settings + avatar-crop modals
   need to work everywhere.
   ---------------------------------------------------------- */
function kirLocalModalShow(el) {
  if (!el) return;
  el.classList.remove('hidden', 'modal-closing');
  // Force a reflow between removing `hidden` and adding `modal-open` —
  // otherwise the browser coalesces both class changes into a single
  // paint and the opacity/transform transition never actually plays.
  void el.offsetWidth;
  el.classList.add('modal-open');
}

function kirLocalModalHide(el, durationMs = 200) {
  if (!el) return;
  el.classList.remove('modal-open');
  el.classList.add('modal-closing');
  setTimeout(() => {
    el.classList.add('hidden');
    el.classList.remove('modal-closing');
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

/* Small local shake helper — auth.html has its own page-scoped
   shakeEl(), but this modal is injected on every page via
   kirRenderShell(), so it needs its own copy here. Same `.shake`
   CSS class from style.css either way. */
function kirShakeEl(el) {
  if (!el) return;
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
}

/* ----------------------------------------------------------
   Danger Zone — reset voyages. Wipes every voyage_completions
   row for the current user (via the reset_my_voyages RPC, see
   migration_login_by_name.sql's sibling migration) and zeroes
   their deltas, letting them re-attempt everything from scratch.
   Gated behind a typed confirmation phrase so it can't be
   triggered by a stray click.
   ---------------------------------------------------------- */
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

  const { error } = await supabaseClient.rpc('reset_my_voyages');

  if (error) {
    statusEl.textContent = I18N[lang].reset_voyages_error;
    statusEl.className = 'text-xs text-red-400 mb-3';
    statusEl.classList.remove('hidden');
    kirShakeEl(modalCard);
    btn.textContent = originalText;
    btn.disabled = false;
    return;
  }

  statusEl.textContent = I18N[lang].reset_voyages_success;
  statusEl.className = 'text-xs text-emerald-400 mb-3';
  statusEl.classList.remove('hidden');

  setTimeout(() => {
    window.location.reload();
  }, 900);
}

function handleQuickAvatarUpload(event) {
  const file = event.target.files[0];
  event.target.value = ''; // allow re-selecting the same file next time
  if (!file) return;
  kirOpenAvatarCrop(file);
}

/* ----------------------------------------------------------
   Avatar cropper — opens whenever a new photo is picked (from
   the sidebar avatar). Lets the person pan/zoom within a
   circular frame before it's saved, instead of using the raw
   upload as-is.

   The crop viewport is a fixed-size circle (KIR_CROP_VIEWPORT).
   The image is displayed at `baseScale` (enough to cover the
   circle) times a user-controlled `zoom` (1x-3x), and can be
   panned within bounds that always keep it covering the circle.
   On confirm, the same math is replayed against a <canvas> to
   cut out exactly what's visible and produce the final square
   image (which renders as a circle everywhere via rounded-full).
   ---------------------------------------------------------- */
const KIR_CROP_VIEWPORT = 260; // px, must match the CSS width/height on #crop-viewport
const KIR_CROP_OUTPUT = 480;   // px, output image size
let kirCropState = null;       // { naturalW, naturalH, baseScale, zoom, panX, panY }
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
  // background-size takes an explicit width/height pair here (not the
  // 'cover' keyword) so zoom is driven entirely by our own math — the
  // browser never gets a chance to re-fit/stretch it on its own.
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

    // Map the visible circle-viewport window back into source-image
    // pixel coordinates, so the canvas crop matches what was shown.
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

    // No active/known session (or storage unavailable) — fall back to
    // keeping the cropped image locally rather than losing the edit.
    if (!avatarUrl) avatarUrl = canvas.toDataURL('image/jpeg', 0.92);

    kirSetUserAvatar(avatarUrl);
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
  // Taskbar position only ever renders at the lg breakpoint (see
  // css/style.css) — below that, the mobile top bar + drawer takes
  // over regardless of this setting. Locked on mobile so there's no
  // dead control that looks like it should do something but can't.
  if (!window.matchMedia('(min-width: 1024px)').matches) return;
  if (position === kirCurrentSidebarPosition()) return;
  kirSetSidebarPosition(position);
}

/* ----------------------------------------------------------
   Mobile nav drawer
   --------------------------------------------------------
   Below the lg breakpoint #sidebar is normally `hidden`, and the
   hamburger button in each page's mobile top bar used to just do
   `document.getElementById('sidebar').classList.toggle('hidden')`
   directly. That's wrong below lg: with `hidden` removed, #sidebar
   has no layout instruction of its own until the `lg:flex` utility
   kicks in at 1024px, so the browser falls back to its default
   block display for <aside> and the (very tall) nav list just
   opens up in normal document flow, shoving <main> straight down
   the page instead of floating over it.

   This turns that same toggle into a real overlay drawer: #sidebar
   gets fixed-positioned and slid in via .kir-sidebar-open (see
   css/style.css), with a dedicated backdrop behind it that dismisses
   the drawer on click, and body scroll gets suspended while it's
   open so the page behind can't be dragged around underneath it.
   Every page's hamburger button calls this instead of touching
   classList directly. ---------------------------------------- */
function kirCloseMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-mobile-backdrop');
  if (!sidebar || sidebar.classList.contains('hidden')) return;
  sidebar.classList.remove('kir-sidebar-open');
  if (backdrop) backdrop.classList.remove('visible');
  document.documentElement.classList.remove('kir-mobile-nav-open');
  setTimeout(() => {
    // Only actually hide once the slide-out transition (see
    // .kir-sidebar-open in css/style.css) has had time to play —
    // hiding immediately would just make it vanish instead of slide.
    if (!sidebar.classList.contains('kir-sidebar-open')) {
      sidebar.classList.add('hidden');
    }
  }, 220);
}

function kirToggleMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  if (!document.getElementById('sidebar-mobile-backdrop')) {
    const backdrop = document.createElement('div');
    backdrop.id = 'sidebar-mobile-backdrop';
    backdrop.className = 'kir-sidebar-backdrop';
    backdrop.onclick = () => kirCloseMobileSidebar();
    // Insert into the same stacking context as #sidebar (the
    // .kir-app-shell wrapper, which is `relative z-10`) instead of
    // document.body. Appending to <body> puts the backdrop in the
    // ROOT stacking context, where its z-index:55 is compared against
    // the *entire* z-10 wrapper (sidebar included) rather than against
    // #sidebar individually — so the backdrop was painting over the
    // wrapper as a whole, dimming the sidebar along with the page
    // behind it, no matter how high #sidebar's own z-index (60) was
    // set. Keeping both inside the same wrapper lets that z-index
    // actually apply, so the sidebar renders above the dim overlay.
    const shell = document.querySelector('.kir-app-shell') || document.body;
    shell.appendChild(backdrop);
  }

  const isOpen = sidebar.classList.contains('kir-sidebar-open');
  if (isOpen) {
    kirCloseMobileSidebar();
    return;
  }

  sidebar.classList.remove('hidden');
  document.documentElement.classList.add('kir-mobile-nav-open');
  // Force a reflow between removing `hidden` and adding the open class,
  // same reasoning as kirModalShow — otherwise the browser can coalesce
  // both changes into one paint and the slide-in transition never plays.
  void sidebar.offsetWidth;
  sidebar.classList.add('kir-sidebar-open');
  document.getElementById('sidebar-mobile-backdrop').classList.add('visible');
}

// If the viewport grows past the lg breakpoint while the mobile drawer
// is open (rotating a tablet, resizing a browser window), #sidebar
// becomes the normal always-visible desktop sidebar via `lg:flex` —
// make sure the drawer-only state (backdrop, scroll lock, slide
// transform) doesn't linger into that layout.
if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => {
    if (e.matches) kirCloseMobileSidebar();
    // Keep the Settings modal's taskbar-position picker in sync if it's
    // open (or opened later) across the same crossing — e.g. rotating a
    // tablet, or resizing a desktop window down past 1024px.
    if (typeof kirUpdateSidebarPositionModalUI === 'function') kirUpdateSidebarPositionModalUI();
  });
}

// Close on Escape, and after using any link/nav-tab inside the drawer
// itself (router.js keeps #sidebar's DOM node alive across same-shape
// SPA navigations, so without this the drawer would stay open, backdrop
// and all, over whatever page it just navigated to).
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') kirCloseMobileSidebar();
});
document.addEventListener('click', (e) => {
  if (e.target.closest('#sidebar a, #sidebar .nav-link')) kirCloseMobileSidebar();
});

function kirInjectSidebar(activeTab) {
  // router.js preserves the actual #sidebar DOM node across same-shape
  // SPA navigations (see navigate()'s sidebar-preservation block), so if
  // it's already here, this is a client-side nav to a page we're already
  // chrome-wise set up for — just move the active tab / pill instead of
  // tearing the whole sidebar down and rebuilding it from scratch. That's
  // what lets .nav-active-pill's CSS transition (and kirPositionNavPill's
  // animate=true path) actually have something persistent to slide from,
  // instead of always popping into place already correct.
  //
  // On a true hard page load #sidebar doesn't exist yet, so this always
  // falls through to the full kirRenderSidebarNow() build below.
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
        // Admin status can only change the *set* of nav links (the Admin
        // Panel entry appearing/disappearing), which the lightweight
        // class-toggle path above can't handle — fall back to a full
        // rebuild in that one case. Otherwise just refresh the bits that
        // could've changed (name/avatar/cabang).
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

  // Don't block the first paint on a network round-trip — render
  // instantly from whatever's cached, then quietly re-render only if
  // the authoritative profile (once it loads) actually changed
  // something (e.g. an admin promotion). In the normal case nothing
  // changed, so there's no visible flash on every page navigation.
  if (window.__kirProfileReady) {
    const before = JSON.stringify([kirCurrentUserName(), kirCurrentUserRole(), kirCurrentUserCabang()]);
    window.__kirProfileReady.then(() => {
      const after = JSON.stringify([kirCurrentUserName(), kirCurrentUserRole(), kirCurrentUserCabang()]);
      if (after !== before) kirRenderSidebarNow(activeTab);
    });
  }
}

function kirRenderSidebarNow(activeTab) {
  const sidebarHtml = `
  <aside id="sidebar" class="hidden lg:flex lg:flex-col w-full lg:h-screen glass border-y-0 border-l-0 px-4 py-6 lg:sticky lg:top-0 relative ${localStorage.getItem(KIR_SIDEBAR_COLLAPSED_KEY) === 'true' ? 'sidebar-collapsed' : ''}">
    <button id="sidebar-collapse-btn" class="absolute -right-3 top-8 w-6 h-6 rounded-full bg-accent-gradient text-white flex items-center justify-center z-50 hover:brightness-110 cursor-pointer touch-none">
      <svg class="w-3 h-3 collapse-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
    </button>
    <a href="index.html" class="hidden lg:flex items-center gap-2.5 px-2 mb-8 overflow-hidden">
      <!-- Removed bg-zinc-900, shadow-glow-sm, and border -->
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
      <a href="materials.html" data-tab="materials" class="nav-link ${activeTab === 'materials' ? 'active' : ''} flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300">
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
        <span class="nav-label" data-i18n="materials">Materials</span>
      </a>
      <a href="nexus.html" data-tab="nexus" class="nav-link ${activeTab === 'nexus' ? 'active' : ''} flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300">
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>
        <span class="nav-label" data-i18n="nexus">Nexus</span>
      </a>
      <a href="schedule.html" data-tab="schedule" class="nav-link ${activeTab === 'schedule' ? 'active' : ''} flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300">
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        <span class="nav-label" data-i18n="jadwal">Jadwal</span>
      </a>
      <a href="members.html" data-tab="members" class="nav-link ${activeTab === 'members' ? 'active' : ''} flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300">
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4" /></svg>
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
      <p class="text-[11px] font-medium text-zinc-600 uppercase tracking-wider px-3 mb-1" data-i18n="voyage_category">Voyage</p>
      <a href="voyages.html" data-tab="voyages" class="nav-link ${activeTab === 'voyages' ? 'active' : ''} flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300">
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2.5c2.5 2.2 4 5.4 4 8.9 0 2.1-.6 4-1.6 5.6L12 21.5l-2.4-4.5A10.6 10.6 0 018 11.4c0-3.5 1.5-6.7 4-8.9z" /><circle cx="12" cy="11" r="2" stroke-linecap="round" stroke-linejoin="round" /><path stroke-linecap="round" stroke-linejoin="round" d="M8.5 15.5c-1.8.7-3 1.8-3 3 0 1.7 3 3 6.5 3s6.5-1.3 6.5-3c0-1.2-1.2-2.3-3-3" /></svg>
        <span class="nav-label" data-i18n="nav_voyages">Voyages</span>
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
    </nav>
    </div>
    <div class="mt-auto pt-6 border-t border-white/10 hidden lg:flex lg:flex-col">
      <div class="flex items-center gap-2.5 px-2 py-2">
        <label class="cursor-pointer shrink-0" data-kir="avatar-wrapper">
          <div data-kir="avatar" class="w-8 h-8 rounded-full bg-accent-gradient flex items-center justify-center font-display font-semibold text-xs shrink-0 hover:brightness-110 transition">A</div>
          <input type="file" class="hidden" accept="image/*" onchange="handleQuickAvatarUpload(event)" />
        </label>
        <div class="min-w-0">
          <p data-kir="name" class="text-sm font-medium truncate">Anggota</p>
          <p id="sidebar-cabang-badge" class="text-[11px] text-zinc-500">Robotik</p>
        </div>
      </div>
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
      <section class="glass rounded-xl p-5 mt-4 border border-red-500/20">
        <h3 class="font-display text-sm font-semibold mb-1 text-red-400" data-i18n="danger_zone_title">Zona Berbahaya</h3>
        <p class="text-zinc-500 text-xs mb-4" data-i18n="danger_zone_desc">Tindakan di bawah ini bersifat permanen dan tidak dapat dibatalkan.</p>
        <div class="p-3 rounded-lg bg-red-500/5 border border-red-500/20 flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-zinc-200" data-i18n="reset_voyages_title">Reset Voyages</p>
            <p class="text-xs text-zinc-500 mt-1" data-i18n="reset_voyages_desc">Menghapus semua voyage yang sudah kamu selesaikan dan mengatur ulang deltas kamu ke 0.</p>
          </div>
          <button type="button" onclick="openResetVoyagesModal()" class="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition" data-i18n="reset_voyages_btn">Reset</button>
        </div>
      </section>
      <button onclick="kirLogout()" class="flex items-center justify-center gap-2.5 mt-4 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-white/10 w-full transition">
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        <span data-i18n="keluar">Keluar</span>
      </button>
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
          class="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition" data-i18n="reset_voyages_confirm_btn">Reset Voyages</button>
      </div>
    </div>
  </div>
  `;

  const avatarCropModalHtml = `
  <div id="avatar-crop-modal" class="modal-overlay hidden" onclick="if(event.target===this) cancelAvatarCrop()">
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

  document.getElementById('sidebar-root').innerHTML = sidebarHtml + settingsModalHtml + resetVoyagesModalHtml + avatarCropModalHtml;
  kirApplyTranslations();
  kirApplyBrandAssets();
  
  const badge = document.getElementById('sidebar-cabang-badge');
  if (badge) badge.textContent = kirCabangLabel(kirCurrentUserCabang());
  
  kirApplyTranslations();
  kirUpdateSidebarPositionModalUI();
  kirRenderUserChrome();
  kirInitSidebarDrag();
  kirInitSidebarShortcuts();
  kirInitCropDrag();
  kirSettleNavPill();
  kirRefreshAdminPingBadge();
}

/* ----------------------------------------------------------
   Admin sidebar "ping" — a small red count badge on the Admin
   Panel link (Discord-style unread ping) so admins can tell at a
   glance, from any page, whether members are waiting to be
   approved without having to open Admin Panel first.

   Counts profiles rows whose status isn't 'approved' yet, same
   definition admin.html itself uses for "Menunggu". Only runs when
   the admin-only nav link (and its badge span) actually exist in
   the DOM, i.e. only for admins.
   ---------------------------------------------------------- */
async function kirRefreshAdminPingBadge() {
  const badge = document.getElementById('admin-ping-badge');
  if (!badge || !window.supabaseClient) return;

  const { count, error } = await supabaseClient
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    // Mirrors admin.html's client-side `a.status !== 'approved'` check:
    // .neq() alone would silently exclude rows where status is NULL
    // (SQL's <> yields UNKNOWN, not TRUE, against NULL), so an
    // unapproved-but-not-yet-status-set row would be missed.
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

/* ----------------------------------------------------------
   Settle the pill into place once layout is actually final.
   Tailwind's CDN runtime applies utility CSS for freshly-injected
   markup (like this sidebar, built via innerHTML) through an async
   MutationObserver, not synchronously — so measuring nav-link
   positions right after injection can catch them before their real
   padding/spacing exists. That stale measurement was the cause of
   the pill rendering near the top of the sidebar and then visibly
   animating down once Tailwind caught up a moment later.

   The pill starts invisible (its default CSS state), so waiting a
   couple of frames before the first kirPositionNavPill/kirWatchNavPill
   call means it only ever becomes visible already in its correct
   spot — it never has a wrong position to animate away from.
   ---------------------------------------------------------- */
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

/* ----------------------------------------------------------
   Remember where the nav list was scrolled to, so navigating away
   and back (or a hard page load / refresh, which gets a brand-new
   #sidebar with no scroll history of its own) doesn't reset it to
   the top every time. sessionStorage rather than localStorage — this
   is throwaway UI state tied to the current browsing session, not a
   preference that should follow the user forever.
   Client-side nav between two sidebar-having pages actually reuses
   the same #sidebar DOM node (see router.js), so scrollTop already
   survives that case for free without any of this — this exists for
   the cases where it doesn't: a hard reload/direct URL load (always
   a fresh #sidebar), and the one full kirRenderSidebarNow() rebuild
   path in kirInjectSidebar (admin status changed mid-session).
   ---------------------------------------------------------- */
function kirSaveNavScrollPos() {
  const navScroll = document.querySelector('#sidebar .sidebar-nav-scroll');
  if (!navScroll) return;
  try {
    sessionStorage.setItem(KIR_SIDEBAR_NAV_SCROLL_KEY, JSON.stringify({ top: navScroll.scrollTop, left: navScroll.scrollLeft }));
  } catch (e) { /* sessionStorage unavailable (private mode, quota, etc.) — position just won't persist */ }
}

function kirRestoreNavScrollPos() {
  const navScroll = document.querySelector('#sidebar .sidebar-nav-scroll');
  if (!navScroll) return;
  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem(KIR_SIDEBAR_NAV_SCROLL_KEY) || 'null'); } catch (e) { /* ignore */ }
  if (!saved) return;
  navScroll.scrollTop = saved.top || 0;
  navScroll.scrollLeft = saved.left || 0;
}

/* ----------------------------------------------------------
   Nav-scroll edge fade — see .kir-fade-start/.kir-fade-end in
   css/style.css for the actual gradients. This just decides WHETHER
   each edge should be faded right now: read the container's real
   scroll offset against its scrollable range, on whichever axis is
   actually active (vertical for the default/left/right bar,
   horizontal once docked top/bottom), and toggle the two classes
   accordingly. A list that fits with no overflow at all never gets
   either class, so it never shows a fade — same "only when there's
   really something cut off" rule the fade itself is meant to signal.
   ---------------------------------------------------------- */
function kirUpdateNavScrollFade() {
  const navScroll = document.querySelector('#sidebar .sidebar-nav-scroll');
  if (!navScroll) return;
  const pos = document.documentElement.getAttribute('data-sidebar-pos');
  const horizontal = (pos === 'top' || pos === 'bottom') && window.matchMedia('(min-width: 1024px)').matches;
  const scrollPos = horizontal ? navScroll.scrollLeft : navScroll.scrollTop;
  const viewportSize = horizontal ? navScroll.clientWidth : navScroll.clientHeight;
  const contentSize = horizontal ? navScroll.scrollWidth : navScroll.scrollHeight;
  // 1px tolerance for sub-pixel rounding at either end of the range.
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
      // Throttle the sessionStorage write to once per frame — 'scroll'
      // can fire far more often than that during a fast fling.
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

/* ----------------------------------------------------------
   Traveling nav highlight — one shared "pill" sits behind
   whichever .nav-link is active and gets repositioned to match
   it, instead of each link owning its own static background.
   Repositioning animates via CSS (.nav-active-pill in style.css),
   so switching pages makes the highlight slide/resize into place.
   A ResizeObserver keeps it aligned through the sidebar
   collapse/expand animation and window resizes too.
   ---------------------------------------------------------- */
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
  if (!animate) pill.style.transition = 'none';

  // The pill is now a child of .sidebar-nav-scroll (a scroll container),
  // not #sidebar directly, so its top/left need to be expressed in that
  // container's unscrolled content coordinates — i.e. relative to its
  // own box, with the current scroll offset added back in. Once placed
  // there, the pill scrolls natively along with the rest of the nav
  // links (being an absolutely-positioned descendant of the thing
  // that's actually scrolling) with no further JS needed on scroll.
  const containerRect = navScroll.getBoundingClientRect();
  const activeRect = active.getBoundingClientRect();
  pill.style.top = (activeRect.top - containerRect.top + navScroll.scrollTop) + 'px';
  pill.style.left = (activeRect.left - containerRect.left + navScroll.scrollLeft) + 'px';
  pill.style.width = activeRect.width + 'px';
  pill.style.height = activeRect.height + 'px';
  pill.style.opacity = '1';

  if (!animate) {
    void pill.offsetHeight; // force reflow so removing the transition takes effect immediately
    pill.style.transition = '';
  }
}

function kirWatchNavPill() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar || !window.ResizeObserver) return;
  if (sidebar.__kirPillObserver) sidebar.__kirPillObserver.disconnect();
  const ro = new ResizeObserver(() => {
    // Always snap instantly during resize events so the pill stays tightly 
    // bound to the link frame-by-frame during the collapse/uncollapse animation.
    kirPositionNavPill(false);
  });
  ro.observe(sidebar);
  sidebar.__kirPillObserver = ro;
}

/* ----------------------------------------------------------
   Top/bottom-taskbar clearance for fixed-position UI.
   When the taskbar is docked to the top OR bottom of the screen
   (Settings → Taskbar Position → Atas/Bawah), it's `position: fixed`
   (see the media query above) and no longer reserves any space in
   .kir-app-shell's flex flow. <main>'s own padding-top/padding-bottom
   compensates for that (see the `html[data-sidebar-pos="top"/"bottom"]
   main` rules in css/style.css) — without it the taskbar just renders
   on top of whatever's at the very top of the page (e.g. the page's
   <h1> heading) when docked to the top, or the very bottom otherwise.
   The admin FABs (+ / Ekspedisi / Impor JSON / Tinjau integritas) and
   the admin toast (both `position: fixed`, see css/admin-shared.css)
   have the exact same problem on the bottom side.

   Rather than hardcode a second offset per element (which would also
   have to track collapsed-vs-expanded taskbar height, and only apply
   above the lg breakpoint where top/bottom taskbars exist at all),
   measure the taskbar's real rendered height and publish it as
   --kir-top-taskbar-h or --kir-bottom-taskbar-h on <html>, whichever
   side it's actually docked to right now — the other one is reset to
   0px on every call so a leftover clearance from before the position
   was last changed never lingers on the side that's no longer active.
   admin-shared.css and style.css both add these on top of each
   element's normal offset.

   A single ResizeObserver on #sidebar keeps this correct through
   collapse/expand, switching taskbar position, and window resizes
   crossing the lg breakpoint — every one of those changes #sidebar's
   own rendered box size, which is exactly what ResizeObserver reports.
   ---------------------------------------------------------- */
function kirUpdateTaskbarClearance() {
  const sidebar = document.getElementById('sidebar');
  // Read the CURRENT position fresh on every call rather than caching
  // which side was last measured — that's what makes switching directly
  // from "top" to "bottom" (or back) clear the side that's no longer
  // docked instead of leaving its old clearance applied underneath the
  // newly-active side's.
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

  // Belt-and-suspenders: a plain window resize listener as a fallback
  // alongside the observer above and the explicit calls in
  // kirSetSidebarPosition/kirToggleSidebarCollapse — window resize
  // covers crossing the lg breakpoint even in the rare case the
  // observer's own timing gets missed. Registered once per session
  // (window/document listeners aren't torn down on SPA navigation —
  // see router.js's header comment — so guard against piling up
  // duplicates across repeat kirWatchTaskbarClearance() calls).
  if (!window.__kirTaskbarClearanceResizeInit) {
    window.__kirTaskbarClearanceResizeInit = true;
    window.addEventListener('resize', () => kirUpdateTaskbarClearance());
  }
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
    
    // Apply friction to the raw mouse movement
    let rawY = e.clientY - startY;
    let y = rawY * 0.4;
    
    // Strict tactile boundaries
    const limit = 24;
    y = Math.max(-limit, Math.min(y, limit));
    
    currentY = y;
    btn.style.transform = `translateY(${y}px)`;
  });

  const endDrag = (e) => {
    if (!isDragging) return;
    isDragging = false;
    btn.releasePointerCapture(e.pointerId);
    
    // Check actual mouse travel distance to distinguish clicks from drags
    if (Math.abs(e.clientY - clickStartY) < 5) {
      kirToggleSidebarCollapse();
    }
    
    // Release the tension
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
  // Collapsing/expanding changes the top- or bottom-docked taskbar's
  // own height (slimmer padding when collapsed — see style.css), so the
  // clearance needs a fresh measurement too, not just the ResizeObserver.
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
  // Prevent duplicate global event listeners if the sidebar re-injects
  if (window.kirSidebarShortcutsInit) return;
  window.kirSidebarShortcutsInit = true;

  // Inject the visual tactile state for held items
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
    // Abort if typing inside an input field or using modifier keys
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const key = e.key;
    if (/^[0-9]$/.test(key)) {
      const sidebar = document.getElementById('sidebar');
      if (!sidebar) return; // Disables shortcuts on index, gallery, and program kerja

      const links = Array.from(sidebar.querySelectorAll('.nav-link'));
      // Map 1-9 to index 0-8, and map 0 to the 10th item (index 9)
      const index = key === '0' ? 9 : parseInt(key, 10) - 1;

      if (links[index]) {
        e.preventDefault();
        
        // Update the active tracking state to the newest key held
        activeShortcutKey = key;
        activeShortcutTarget = links[index];

        links.forEach(l => l.classList.remove('shortcut-highlight'));
        activeShortcutTarget.classList.add('shortcut-highlight');
      }
    }
  });

  document.addEventListener('keyup', (e) => {
    // Only fire the click if the key released matches the CURRENT active highlight
    // This allows rolling your fingers over 1 then 2 without triggering 1 when released.
    if (e.key === activeShortcutKey && activeShortcutTarget) {
      const target = activeShortcutTarget;
      
      activeShortcutKey = null;
      activeShortcutTarget = null;
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('shortcut-highlight'));
      
      target.click();
    }
  });

  // Failsafe: Clear visual state if the user alt-tabs away while holding a key
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
    'materials.html': 'page_title_materials',
    'nexus.html': 'page_title_nexus',
    'schedule.html': 'page_title_schedule',
    'members.html': 'page_title_members',
    'voyages.html': 'page_title_voyages',
    'leaderboard.html': 'page_title_leaderboard',
    'program-kerja.html': 'page_title_program_kerja',
    'gallery.html': 'page_title_gallery',
    'auth.html': 'page_title_auth',
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
  const disableBranchColor = localStorage.getItem(KIR_DISABLE_BRANCH_COLOR_KEY) === 'true';
  const suffix = type === 'glow' ? '_glow' : '';

  if (loggedIn && !disableBranchColor) {
    if (cabang === 'robotik') return `assets/robotik${suffix}.PNG`;
    if (cabang === 'sains') return `assets/sains${suffix}.PNG`;
    if (cabang === 'both') return `assets/hybrid${suffix}.PNG`;
  }
  if (theme === 'light') return `assets/kir_dark${suffix}.PNG`;
  return `assets/kir_light${suffix}.PNG`;
}

function kirApplyBrandAssets() {
  const faviconLink = document.querySelector('link[rel="icon"]');
  if (faviconLink) {
    faviconLink.href = resolveBrandAssetName('icon');
  } else {
    const newLink = document.createElement('link');
    newLink.rel = 'icon';
    newLink.type = 'image/png';
    newLink.href = resolveBrandAssetName('icon');
    document.head.appendChild(newLink);
  }

  document.querySelectorAll('img[data-kir-brand-logo]').forEach(img => {
    img.src = resolveBrandAssetName('glow');
  });
}

function kirApplyTranslations() {
  const lang = localStorage.getItem(KIR_LANG_KEY) || 'id';
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (I18N[lang][key]) el.textContent = I18N[lang][key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (I18N[lang][key]) el.setAttribute('placeholder', I18N[lang][key]);
  });
  kirApplyPageTitle(lang);
  kirApplyBrandAssets();
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

  const reduceMotion = localStorage.getItem(KIR_REDUCE_MOTION_KEY) === 'true';
  document.documentElement.setAttribute('data-reduce-motion', reduceMotion ? 'true' : 'false');

  const disableBranchColor = localStorage.getItem(KIR_DISABLE_BRANCH_COLOR_KEY) === 'true';
  document.documentElement.setAttribute('data-disable-branch-color', disableBranchColor ? 'true' : 'false');

  const sidebarPos = localStorage.getItem(KIR_SIDEBAR_POSITION_KEY) || 'left';
  document.documentElement.setAttribute('data-sidebar-pos', sidebarPos);

  // Only apply a colored cabang theme while logged in. Logged-out
  // visitors (landing + auth pages) stay black & white.
  if (localStorage.getItem(KIR_SESSION_KEY) === 'true') {
    const cabang = localStorage.getItem(KIR_CABANG_KEY) || 'robotik';
    document.documentElement.setAttribute('data-cabang', cabang);
  } else {
    document.documentElement.removeAttribute('data-cabang');
  }

  kirApplyPageTitle();
  kirApplyBrandAssets();
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
  kirApplyBrandAssets();
}

function kirLastKnownCabang() {
  return localStorage.getItem(KIR_LAST_CABANG_KEY) || 'robotik';
}

async function kirLogout() {
  await supabaseClient.auth.signOut();
  localStorage.removeItem(KIR_SESSION_KEY);
  localStorage.removeItem(KIR_NAME_KEY);
  localStorage.removeItem(KIR_ROLE_KEY);
  localStorage.removeItem(KIR_CABANG_KEY);
  localStorage.removeItem(KIR_AVATAR_KEY);
  document.documentElement.removeAttribute('data-cabang');
  kirApplyBrandAssets();
  window.location.href = 'index.html';
}

supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || !session) {
    localStorage.removeItem(KIR_SESSION_KEY);
  }
});

/* Call this at the very top of any protected page's <head>,
   right after loading this script, so it runs before the
   page paints. It sends logged-out visitors to auth.html. */
async function kirRequireAuth() {
  if (kirIsLoggedIn()) {
    // Optimistic path: we already have a cached session, so let the page
    // start painting immediately, then verify + refresh in the background.
    // If a pengurus has since revoked/un-approved this account,
    // kirRefreshCurrentProfile below will sign them out and redirect.
    window.__kirProfileReady = kirRefreshCurrentProfile();
    await window.__kirProfileReady;
    return;
  }

  // No cached session — but don't assume logged-out yet. If a real
  // Supabase session already exists (e.g. they registered earlier and
  // were waiting on approval, or logged in on another tab), this picks
  // it up and — if the account is now approved — lets them straight in
  // with no re-entering credentials required.
  window.__kirProfileReady = kirRefreshCurrentProfile();
  const result = await window.__kirProfileReady;
  // 'pending' already triggered its own redirect inside
  // kirRefreshCurrentProfile — only the "no session at all" case is
  // still ours to handle, so we don't clobber that redirect with this one.
  if (result !== 'approved' && result !== 'pending') {
    window.location.href = 'auth.html';
  }
}

async function kirRefreshCurrentProfile() {
  if (!supabaseClient) return 'none';
  try {
    const { data: userData, error: userErr } = await supabaseClient.auth.getUser();
    if (userErr) {
      if (userErr.status === 0 || userErr.status >= 500) {
        return kirIsLoggedIn() ? 'approved' : 'none';
      }
      localStorage.removeItem(KIR_SESSION_KEY);
      return 'none';
    }
    if (!userData?.user) {
      localStorage.removeItem(KIR_SESSION_KEY);
      return 'none';
    }
    const { data: profile, error: profileErr } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single();
    if (profileErr || !profile) return 'none';

    // Accounts that haven't been approved by a pengurus yet (or have had
    // approval revoked) never get a live session on protected pages —
    // send them back to the waiting screen instead.
    if (profile.status && profile.status !== 'approved') {
      localStorage.removeItem(KIR_SESSION_KEY);
      if (!/\/?auth\.html/.test(window.location.pathname)) {
        window.location.href = 'auth.html?pending=1';
      }
      return 'pending';
    }

    localStorage.setItem(KIR_SESSION_KEY, 'true');
    localStorage.setItem(KIR_NAME_KEY, profile.name);
    localStorage.setItem(KIR_ROLE_KEY, profile.role || 'Anggota');
    localStorage.setItem(KIR_CABANG_KEY, profile.cabang);
    localStorage.setItem(KIR_LAST_CABANG_KEY, profile.cabang);
    document.documentElement.setAttribute('data-cabang', profile.cabang);
    kirApplyBrandAssets();
    if (profile.avatar_url) localStorage.setItem(KIR_AVATAR_KEY, profile.avatar_url);
    else localStorage.removeItem(KIR_AVATAR_KEY);
    
    if (profile.dashboard_layout) localStorage.setItem('kir_dashboard_layout_v1', JSON.stringify(profile.dashboard_layout));
    if (profile.dashboard_note) localStorage.setItem('kir_dashboard_note', profile.dashboard_note);
    localStorage.setItem(KIR_DELTAS_KEY, String(profile.deltas_total || 0));

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
    if (typeof profile.reduce_motion === 'boolean' && localStorage.getItem(KIR_REDUCE_MOTION_KEY) === null) {
      localStorage.setItem(KIR_REDUCE_MOTION_KEY, profile.reduce_motion ? 'true' : 'false');
      document.documentElement.setAttribute('data-reduce-motion', profile.reduce_motion ? 'true' : 'false');
    }
    if (typeof profile.disable_branch_color === 'boolean' && localStorage.getItem(KIR_DISABLE_BRANCH_COLOR_KEY) === null) {
      localStorage.setItem(KIR_DISABLE_BRANCH_COLOR_KEY, profile.disable_branch_color ? 'true' : 'false');
      document.documentElement.setAttribute('data-disable-branch-color', profile.disable_branch_color ? 'true' : 'false');
    }
    if (profile.sidebar_position && localStorage.getItem(KIR_SIDEBAR_POSITION_KEY) === null) {
      localStorage.setItem(KIR_SIDEBAR_POSITION_KEY, profile.sidebar_position);
      document.documentElement.setAttribute('data-sidebar-pos', profile.sidebar_position);
    }
    return 'approved';
  } catch (e) {
    console.error('Failed to refresh current profile', e);
    return 'none';
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

function kirCurrentUserRole() {
  return localStorage.getItem(KIR_ROLE_KEY) || 'Anggota';
}

function kirIsAdmin() {
  const name = kirCurrentUserName();
  const role = kirCurrentUserRole();
  return name === 'Admin' || role === 'Ketua Ekstrakurikuler';
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

/* Global "disable branch colouring" toggle (Settings → Tampilan &
   Bahasa). Forces the --accent-* variables back to a neutral
   grayscale (see the html[data-disable-branch-color="true"] rules in
   css/style.css) regardless of the user's cabang, independent of
   dark/light theme — the CSS picks white-ish vs. near-black neutrals
   on its own based on data-theme. */
function kirCurrentDisableBranchColor() {
  return localStorage.getItem(KIR_DISABLE_BRANCH_COLOR_KEY) === 'true';
}

function kirSetDisableBranchColor(enabled) {
  localStorage.setItem(KIR_DISABLE_BRANCH_COLOR_KEY, enabled ? 'true' : 'false');
  document.documentElement.setAttribute('data-disable-branch-color', enabled ? 'true' : 'false');
  kirApplyBrandAssets();
  // Most pages pick this up for free through the --accent-* CSS
  // variable cascade (see html[data-disable-branch-color="true"] in
  // css/style.css). Pages that compute colors in JS instead of pure
  // CSS (e.g. js/nexus.html's per-node-type accent shades, baked into
  // rendered inline styles) can't rely on that cascade and need to
  // re-render themselves — this event is their hook to do so.
  window.dispatchEvent(new CustomEvent('kir:branch-color-change', { detail: { enabled } }));
  if (window.supabaseClient) {
    supabaseClient.auth.getUser().then(({ data: userData }) => {
      // Requires a `disable_branch_color` boolean column on `profiles`.
      // Harmless no-op error if that column doesn't exist yet — the
      // setting still works locally via localStorage either way.
      if (userData?.user) supabaseClient.from('profiles').update({ disable_branch_color: enabled }).eq('id', userData.user.id).then();
    });
  }
}

/* ----------------------------------------------------------
   Taskbar (sidebar) position — 'left' (default), 'right',
   'top', or 'bottom'. Applied as a data-attribute on <html> so
   css/style.css can restyle #sidebar into a horizontal bar (top/
   bottom) or mirror it (right) purely with CSS, without any of
   the surrounding markup changing. The collapse-to-icons toggle
   (KIR_SIDEBAR_COLLAPSED_KEY) is independent of position — it
   works the same "show icons only" way on all four sides, so
   switching position never needs to touch it.
   ---------------------------------------------------------- */
function kirCurrentSidebarPosition() {
  return localStorage.getItem(KIR_SIDEBAR_POSITION_KEY) || 'left';
}

function kirSetSidebarPosition(position) {
  localStorage.setItem(KIR_SIDEBAR_POSITION_KEY, position);
  document.documentElement.setAttribute('data-sidebar-pos', position);

  kirUpdateSidebarPositionModalUI();
  // Rects everywhere (nav pill, collapse button) shift the instant the
  // layout flips, so re-measure once the browser's had a frame to apply
  // the new CSS instead of positioning the pill against the old rects.
  requestAnimationFrame(() => requestAnimationFrame(() => kirPositionNavPill(false)));
  // Same reasoning for the top/bottom taskbar clearance: don't wait on
  // the ResizeObserver alone (this setting is usually changed from
  // inside the Settings modal, which freezes #sidebar's box via
  // __kirFreezeSidebar while it's open — see admin-shared.js — so a
  // resize triggered here can land before/without a clean observer
  // tick). Recompute directly, both right away and once the new layout's
  // definitely settled — kirUpdateTaskbarClearance() always reads
  // data-sidebar-pos fresh (set just above, a few lines up), so both
  // calls reflect the position we just switched TO, not whatever the
  // clearance was before this change, and the side we switched AWAY
  // FROM is correctly zeroed out rather than left stale.
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

/* ----------------------------------------------------------
   Voyages + Deltas
   --------------------------------------------------------
   Prototype point balance, kept in localStorage so Voyages
   and Leaderboard can share it. Starts at 1240 to match the
   dummy number already shown on the Dashboard "Deltas" card.
   TODO(real backend): replace with a real deltas ledger.
   ---------------------------------------------------------- */
const KIR_DELTAS_KEY = 'kir_deltas_total';
const KIR_VOYAGE_DONE_PREFIX = 'kir_voyage_done_';

function kirDeltasTotal() {
  const raw = localStorage.getItem(KIR_DELTAS_KEY);
  return raw === null ? 0 : parseInt(raw, 10) || 0;
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
  return raw ? JSON.parse(raw) : null; // { deltas, completedAt } or null
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

/* ----------------------------------------------------------
   Comments — shared mini widget used on Tasks and Voyages.
   --------------------------------------------------------
   Each comment: { id, author, avatar, text, attachment, createdAt }
   attachment (optional): { name, type, size, dataUrl }
   Stored per (scope, itemId) so 'task:t1' and 'voyage:v1' each
   get their own thread. All in localStorage — prototype only.
   TODO(real backend): swap for a real comments API.
   ---------------------------------------------------------- */
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

function kirRenderCommentItem(containerId, scope, itemId, c, lang, you, isReply) {
  const isYou = c.author === you;
  const initial = c.author.charAt(0).toUpperCase();
  const avatarStyle = c.avatar ? `style="background-image:url('${c.avatar}');background-size:cover;background-position:center;"` : '';
  const replyBoxId = `${containerId}-replybox-${c.id}`;
  return `
    <div class="comment-item${isReply ? ' comment-item-reply' : ''}">
      <div class="comment-avatar bg-accent-gradient" ${avatarStyle}>${c.avatar ? '' : initial}</div>
      <div class="comment-body min-w-0">
        <div class="flex items-baseline gap-2 flex-wrap">
          <span class="comment-author">${kirEscapeHtml(c.author)}${isYou ? ` <span class="text-accent-300">(${I18N[lang].leaderboard_you})</span>` : ''}</span>
          <span class="comment-time">${kirFormatActivityTime(new Date(c.createdAt))}</span>
        </div>
        ${c.text ? `<p class="comment-text">${kirEscapeHtml(c.text)}</p>` : ''}
        ${kirCommentAttachmentHtml(c.attachment)}
        <div class="flex items-center gap-3 mt-0.5">
          <button onclick="kirToggleReplyBox('${containerId}','${scope}','${itemId}','${c.id}')" class="comment-reply-btn" data-i18n="comments_reply">${I18N[lang].comments_reply}</button>
          ${isYou ? `<button onclick="kirDeleteCommentAndRerender('${containerId}','${scope}','${itemId}','${c.id}')" class="comment-delete-btn" data-i18n="comments_delete">${I18N[lang].comments_delete}</button>` : ''}
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

async function kirRenderCommentSection(containerId, scope, itemId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const lang = localStorage.getItem(KIR_LANG_KEY) || 'id';
  const you = kirCurrentUserName();

  container.innerHTML = `<p class="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-2">${I18N[lang].comments_title}</p><p class="text-xs text-zinc-500">Memuat...</p>`;

  const { data: comments, error } = await supabaseClient
    .from('comments')
    .select('*, profiles(name, avatar_url)')
    .eq('scope', scope)
    .eq('item_id', itemId)
    .order('created_at', { ascending: true });

  if (error) {
    container.innerHTML = `<p class="text-xs text-red-400">Gagal memuat komentar.</p>`;
    return;
  }

  const formatted = comments.map(c => ({
    id: c.id,
    author: c.profiles?.name || 'Anggota',
    avatar: c.profiles?.avatar_url || '',
    text: c.text,
    attachment: c.attachment_url ? { name: 'File', type: 'image/jpeg', dataUrl: c.attachment_url } : null,
    createdAt: c.created_at,
    parentId: c.parent_id,
    userId: c.user_id
  }));

  // Build a parent -> children map so replies-of-replies (and deeper)
  // nest correctly, instead of only ever showing one level of replies.
  const byParent = {};
  formatted.forEach(c => {
    if (!c.parentId) return;
    (byParent[c.parentId] = byParent[c.parentId] || []).push(c);
  });
  const topLevel = formatted.filter(c => !c.parentId);

  const renderThread = (c, isReply) => {
    const children = byParent[c.id] || [];
    const childrenHtml = children.length
      ? `<div class="comment-replies">${children.map(child => renderThread(child, true)).join('')}</div>`
      : '';
    return kirRenderCommentItem(containerId, scope, itemId, c, lang, you, isReply) + childrenHtml;
  };

  const listHtml = topLevel.length === 0
    ? `<p class="text-zinc-600 text-xs py-1" data-i18n="comments_empty">${I18N[lang].comments_empty}</p>`
    : topLevel.map(c => renderThread(c, false)).join('');

  container.innerHTML = `
    <p class="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-2" data-i18n="comments_title">${I18N[lang].comments_title}</p>
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
  document.querySelectorAll(`[id^="${containerId}-replybox-"]`).forEach(el => el.classList.add('hidden'));
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

/* ----------------------------------------------------------
   Custom dropdown — replaces native <select> styling with a
   themed trigger + option panel, shared by every dropdown on
   the site (Voyages' answer dropdown, the registration "Kelas"
   selects, etc).

   Usage: call kirRefreshCustomSelect('some-select-id') any time
   AFTER the underlying <select id="some-select-id"> exists in
   the DOM with its <option>s in place (on page load for static
   selects, or right after re-populating options dynamically).

   Optional: set data-trigger-class="..." on the <select> to add
   extra classes to the built trigger — e.g. "kir-select-pill
   bg-accent-15 text-accent-300 border border-accent-30" keeps a
   small colored status-pill look (see tasks.html's per-task status
   dropdown) instead of the default glass-input trigger.

   How it works: the real <select> stays in the DOM (hidden) so
   every bit of existing code that reads `.value` off it keeps
   working untouched — kirRefreshCustomSelect just builds/updates
   a custom-styled sibling widget that mirrors it and writes back
   into it when the user picks an option.
   ---------------------------------------------------------- */
/* Panels now size themselves to fit their content (see .kir-select-panel
   in style.css — no more max-height/scrollbar, and width can exceed the
   trigger's). That means a panel CAN spill past the viewport edge in a
   way the old fixed-to-trigger-width version never could: a narrow
   trigger near the right edge of the screen, or a trigger near the
   bottom, needs its panel shifted/flipped rather than clipped.
   Called right after a panel is un-hidden; getBoundingClientRect()
   forces the layout it needs to measure.

   The panel is position: fixed (see style.css), so every measurement
   and every value written back here is in real VIEWPORT pixels off
   trigger.getBoundingClientRect() — none of this can be expressed as a
   percentage/keyword relative to the wrapper anymore, unlike the old
   position: absolute version. */
function kirPositionSelectPanel(panel, trigger) {
  const margin = 8;
  const triggerRect = trigger.getBoundingClientRect();

  // Reset to the default "grow down-right from the trigger" pose first
  // so re-measuring below (panelRect) reflects this panel's own natural
  // size, not leftover overrides from the last time it was positioned.
  panel.style.minWidth = triggerRect.width + 'px';
  panel.style.left = triggerRect.left + 'px';
  panel.style.right = '';
  panel.style.top = (triggerRect.bottom + 6) + 'px';
  panel.style.bottom = '';

  const panelRect = panel.getBoundingClientRect();

  // Grows from the trigger's left edge by default; if that would push
  // it past the right edge of the viewport, anchor to the trigger's
  // right edge instead so it grows leftward.
  if (triggerRect.left + panelRect.width > window.innerWidth - margin) {
    panel.style.left = Math.max(margin, triggerRect.right - panelRect.width) + 'px';
  }

  // Opens below the trigger by default; if there's not enough room
  // below but there IS more room above, flip it above instead.
  const spaceBelow = window.innerHeight - triggerRect.bottom;
  const spaceAbove = triggerRect.top;
  if (panelRect.height > spaceBelow - margin && spaceAbove > spaceBelow) {
    panel.style.top = (triggerRect.top - panelRect.height - 6) + 'px';
  }
}

function kirCloseAllCustomSelects(exceptWrapper) {
  document.querySelectorAll('.kir-select-panel').forEach(p => {
    if (!exceptWrapper || !exceptWrapper.contains(p)) p.classList.add('hidden');
  });
  document.querySelectorAll('.kir-select-trigger').forEach(t => {
    if (!exceptWrapper || !exceptWrapper.contains(t)) t.classList.remove('open');
  });
}

function kirRefreshCustomSelect(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.classList.add('hidden');

  let wrapper = select.nextElementSibling;
  if (!wrapper || !wrapper.classList.contains('kir-select')) {
    wrapper = document.createElement('div');
    wrapper.className = 'kir-select';
    select.insertAdjacentElement('afterend', wrapper);
  }
  // Carry over layout/spacing utility classes from the (now-hidden)
  // native select so surrounding layout (margins, flex sizing) doesn't
  // collapse once it's swapped for the custom trigger.
  Array.from(select.classList).forEach(cls => {
    if (/^(m[trblxy]?-|flex-|w-|grow|shrink|basis-)/.test(cls)) wrapper.classList.add(cls);
  });

  const options = Array.from(select.options);
  const selectedOption = select.options[select.selectedIndex] || null;
  const isPlaceholder = !select.value;
  // Optional extra classes for the trigger itself — e.g.
  // data-trigger-class="kir-select-pill bg-accent-15 text-accent-300
  // border border-accent-30" on the source <select> to keep a
  // status-style colored pill look. Kept as a data attribute (not just
  // more classes on the <select>) so it's a deliberate opt-in per
  // dropdown rather than something the generic layout-class carry-over
  // above could stumble into by accident.
  const triggerClassTokens = (select.dataset.triggerClass || '').split(/\s+/).filter(Boolean);
  const extraTriggerClass = triggerClassTokens.length ? ' ' + triggerClassTokens.join(' ') : '';
  // "kir-select-pill" also has to land on the WRAPPER (not just the
  // trigger) — see the .kir-select.kir-select-pill rule in style.css —
  // so the wrapper shrink-wraps to the pill's own content width instead
  // of stretching to fill whatever layout slot it's sitting in. Synced
  // with classList.toggle (not just .add) so re-running this on a select
  // whose data-trigger-class changed can't leave a stale pill wrapper
  // behind.
  wrapper.classList.toggle('kir-select-pill', triggerClassTokens.includes('kir-select-pill'));

  const selectedI18n = selectedOption && selectedOption.getAttribute('data-i18n') ? ` data-i18n="${selectedOption.getAttribute('data-i18n')}"` : '';

  wrapper.innerHTML = `
    <button type="button" class="kir-select-trigger${extraTriggerClass}${isPlaceholder ? ' placeholder' : ''}" aria-haspopup="listbox" aria-expanded="false" ${select.disabled ? 'disabled' : ''}>
      <span class="kir-select-trigger-label"${selectedI18n}>${selectedOption ? kirEscapeHtml(selectedOption.textContent) : ''}</span>
      <svg class="kir-select-chevron" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
    </button>`;

  // The option panel is intentionally NOT nested inside the wrapper —
  // it's appended straight to <body> (one reused element per select id,
  // so refreshing the same select repeatedly doesn't pile up copies).
  // Reason: it's position: fixed and measured in viewport pixels (see
  // kirPositionSelectPanel), which only lines up correctly when nothing
  // between it and <body> introduces a transform — any ancestor with a
  // transform becomes the fixed element's containing block instead of
  // the viewport, silently breaking that math. Cards like the task list
  // rows animate in with a transform that lingers afterward (fill-mode
  // both) and are also overflow-hidden, so a panel left inside them ended
  // up mispositioned and clipped — clicking the trigger looked like it
  // did nothing. Living in <body> sidesteps both problems for every
  // dropdown that uses this component, not just this one.
  const panelId = 'kir-select-panel-' + selectId;
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
      ${kirEscapeHtml(o.textContent)}
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
    }
  };

  // Disabled options stay in the list (grayed out via CSS) so it's
  // clear the choice exists — they just don't get a click handler,
  // same intent as the native <option disabled> they mirror.
  panel.querySelectorAll('.kir-select-option:not(.disabled)').forEach(opt => {
    opt.onclick = (e) => {
      e.stopPropagation();
      select.value = opt.getAttribute('data-value');
      select.dispatchEvent(new Event('change', { bubbles: true }));
      kirRefreshCustomSelect(selectId);
    };
  });
}

/* ----------------------------------------------------------
   Multi-select variant — same visual shell as kirRefreshCustomSelect,
   but for filters where more than one option can be active at once
   (e.g. Voyages' subject filter). The backing <select multiple>
   keeps working with .selectedOptions like normal, so existing
   change-event listeners don't need to know anything changed —
   the difference is the panel stays open across picks and each
   row renders as a checkbox instead of swapping the trigger value.

   Usage: call kirRefreshMultiSelect('some-select-id') any time
   AFTER the underlying <select multiple id="some-select-id">
   exists in the DOM with its <option>s in place.
   ---------------------------------------------------------- */
function kirRefreshMultiSelect(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.classList.add('hidden');

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
    label = I18N[lang].voyages_filter_none;
  } else if (selected.length === options.length) {
    label = I18N[lang].voyages_filter_all;
  } else if (selected.length === 1) {
    label = selected[0].textContent;
  } else {
    label = `${selected.length} ${I18N[lang].voyages_filter_selected}`;
  }

  const wasOpen = wrapper.querySelector('.kir-select-panel') && !wrapper.querySelector('.kir-select-panel').classList.contains('hidden');

  wrapper.innerHTML = `
    <button type="button" class="kir-select-trigger${selected.length === 0 ? ' placeholder' : ''}" aria-haspopup="listbox" aria-expanded="${wasOpen}">
      <span class="kir-select-trigger-label">${kirEscapeHtml(label)}</span>
      <svg class="kir-select-chevron" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
    </button>
    <div class="kir-select-panel${wasOpen ? '' : ' hidden'}" role="listbox" aria-multiselectable="true">
      ${options.map(o => {
        const i18nAttr = o.getAttribute('data-i18n') ? ` data-i18n="${o.getAttribute('data-i18n')}"` : '';
        return `
        <div class="kir-select-option multi${o.selected ? ' selected' : ''}" data-value="${kirEscapeHtml(o.value)}" role="option" aria-selected="${o.selected}">
          <span class="kir-select-checkbox"></span>
          <span${i18nAttr}>${kirEscapeHtml(o.textContent)}</span>
        </div>`;
      }).join('')}
    </div>`;

  const trigger = wrapper.querySelector('.kir-select-trigger');
  const panel = wrapper.querySelector('.kir-select-panel');
  if (wasOpen) {
    trigger.classList.add('open');
    kirPositionSelectPanel(panel, trigger); // re-render keeps it open; content/width may have changed
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
    }
  };

  wrapper.querySelectorAll('.kir-select-option').forEach(opt => {
    opt.onclick = (e) => {
      e.stopPropagation();
      const value = opt.getAttribute('data-value');
      const targetOption = options.find(o => o.value === value);
      if (targetOption) targetOption.selected = !targetOption.selected;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      kirRefreshMultiSelect(selectId); // panel re-opens automatically via wasOpen above
    };
  });
}

document.addEventListener('click', () => kirCloseAllCustomSelects());
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') kirCloseAllCustomSelects(); });
// The panel is position: fixed (see .kir-select-panel in style.css) so
// it's anchored to the viewport, not to the trigger it opened from — if
// the page (or some inner scroll container, e.g. a modal body) scrolls
// while a panel's open, the trigger moves out from under it. Closing on
// any scroll, captured so it also catches scroll events from inner
// scroll containers (which don't bubble), is simpler and safer than
// trying to re-track the trigger's position on every scroll tick.
window.addEventListener('scroll', () => kirCloseAllCustomSelects(), true);