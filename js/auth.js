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
    idx_login: 'Masuk', idx_register: 'Daftar', idx_dash_badge: 'Dasbor Ekstrakurikuler',
    idx_h1_a: 'Satu tempat untuk', idx_h1_b: 'tugas, jadwal, dan tim kamu.',
    idx_sub: 'KIR membantu pengurus dan anggota klub melacak pembagian tugas dan jadwal acara mendatang. Tinggalkan grup obrolan yang berantakan dan beralih ke sistem yang lebih terorganisir.',
    idx_cta_1: 'Mulai sekarang', idx_cta_2: 'Sudah punya akun? Masuk',
    idx_feat1_title: 'Tugas yang jelas', idx_feat1_desc: 'Lihat siapa mengerjakan apa, tenggat waktunya, dan statusnya sekilas.',
    idx_feat2_title: 'Jadwal acara', idx_feat2_desc: 'Semua acara klub tersusun rapi dalam satu linimasa yang mudah dibaca.',
    idx_feat3_title: 'Tim yang sinkron', idx_feat3_desc: 'Setiap anggota tahu apa yang terjadi tanpa harus bertanya berulang kali.',
    idx_branch_title: 'Dua cabang, satu dasbor:',
    idx_branch_sub: 'Pilih salah satu atau keduanya saat mendaftar. Dasbor akan secara otomatis menyesuaikan tampilannya dengan warna cabang pilihanmu.',
    idx_branch_rob_sub: 'Untuk anggota yang fokus di rancang bangun, pemrograman, dan kompetisi robot.',
    idx_branch_sci_sub: 'Untuk anggota yang fokus di riset, eksperimen, dan karya tulis ilmiah.',
    idx_footer: 'KIR - Karya Ilmiah Remaja, dibuat untuk klub-klub kampus.',
    page_title_home: 'Orbit', page_title_dashboard: 'Beranda', page_title_tasks: 'Tugas',
    page_title_materials: 'Materi', page_title_schedule: 'Jadwal', page_title_members: 'Anggota',
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
    tugas: 'Tasks', materials: 'Materials', jadwal: 'Schedule', anggota: 'Members', pengaturan: 'Settings', beranda: 'Home', keluar: 'Log Out',
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
  } else {
    kirLocalModalHide(modal);
  }
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

function kirInjectSidebar(activeTab) {
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
  <aside id="sidebar" class="hidden lg:flex lg:flex-col w-full lg:w-64 lg:min-h-screen glass border-y-0 border-l-0 px-4 py-6 lg:sticky lg:top-0 relative ${localStorage.getItem(KIR_SIDEBAR_COLLAPSED_KEY) === 'true' ? 'sidebar-collapsed' : ''}">
    <span id="nav-active-pill" class="nav-active-pill"></span>
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
      ${typeof kirIsAdmin === 'function' && kirIsAdmin() ? `
      <a href="admin.html" class="nav-link ${activeTab === 'admin' ? 'active' : ''} flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300">
        <span class="relative shrink-0 inline-flex">
          <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span id="admin-ping-badge" class="nav-ping-badge hidden"></span>
        </span>
        <span class="nav-label" data-i18n="admin_title">Admin Panel</span>
      </a>` : ''}
      </nav>
    <nav class="flex flex-col gap-1.5 mt-6">
      <p class="text-[11px] font-medium text-zinc-600 uppercase tracking-wider px-3 mb-1" data-i18n="voyage_category">Voyage</p>
      <a href="voyages.html" class="nav-link ${activeTab === 'voyages' ? 'active' : ''} flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300">
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2.5c2.5 2.2 4 5.4 4 8.9 0 2.1-.6 4-1.6 5.6L12 21.5l-2.4-4.5A10.6 10.6 0 018 11.4c0-3.5 1.5-6.7 4-8.9z" /><circle cx="12" cy="11" r="2" stroke-linecap="round" stroke-linejoin="round" /><path stroke-linecap="round" stroke-linejoin="round" d="M8.5 15.5c-1.8.7-3 1.8-3 3 0 1.7 3 3 6.5 3s6.5-1.3 6.5-3c0-1.2-1.2-2.3-3-3" /></svg>
        <span class="nav-label" data-i18n="nav_voyages">Voyages</span>
      </a>
      <a href="leaderboard.html" class="nav-link ${activeTab === 'leaderboard' ? 'active' : ''} flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300">
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
          <p class="text-sm font-medium" data-i18n="theme_light">Mode Terang</p>
          <div id="theme-toggle" class="toggle-track" onclick="handleThemeToggle()">
            <div class="toggle-thumb"></div>
          </div>
        </div>
        <div class="flex items-center justify-between mb-1">
          <p class="text-sm font-medium" data-i18n="change_lang">Ubah Bahasa</p>
          <button onclick="handleLanguageToggle()" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-zinc-300 hover:text-white transition">ID / EN</button>
        </div>
      </section>
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

  document.getElementById('sidebar-root').innerHTML = sidebarHtml + settingsModalHtml + avatarCropModalHtml;
  kirApplyTranslations();
  kirApplyBrandAssets();
  
  const badge = document.getElementById('sidebar-cabang-badge');
  if (badge) badge.textContent = kirCabangLabel(kirCurrentUserCabang());
  
  kirApplyTranslations();
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
    });
  });
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
  const pill = document.getElementById('nav-active-pill');
  if (!sidebar || !pill) return;
  const active = sidebar.querySelector('.nav-link.active');
  if (!active) {
    pill.style.opacity = '0';
    return;
  }
  if (!animate) pill.style.transition = 'none';

  const sidebarRect = sidebar.getBoundingClientRect();
  const activeRect = active.getBoundingClientRect();
  pill.style.top = (activeRect.top - sidebarRect.top) + 'px';
  pill.style.left = (activeRect.left - sidebarRect.left) + 'px';
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
  const suffix = type === 'glow' ? '_glow' : '';

  if (loggedIn && cabang === 'robotik') return `assets/robotik${suffix}.PNG`;
  if (loggedIn && cabang === 'sains') return `assets/sains${suffix}.PNG`;
  if (loggedIn && cabang === 'both') return `assets/hybrid${suffix}.PNG`;
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
    if (userErr || !userData?.user) {
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

   How it works: the real <select> stays in the DOM (hidden) so
   every bit of existing code that reads `.value` off it keeps
   working untouched — kirRefreshCustomSelect just builds/updates
   a custom-styled sibling widget that mirrors it and writes back
   into it when the user picks an option.
   ---------------------------------------------------------- */
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

  wrapper.innerHTML = `
    <button type="button" class="kir-select-trigger${isPlaceholder ? ' placeholder' : ''}" aria-haspopup="listbox" aria-expanded="false" ${select.disabled ? 'disabled' : ''}>
      <span class="kir-select-trigger-label">${selectedOption ? kirEscapeHtml(selectedOption.textContent) : ''}</span>
      <svg class="kir-select-chevron" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
    </button>
    <div class="kir-select-panel hidden" role="listbox">
      ${options.map(o => `
        <div class="kir-select-option${o.value === select.value ? ' selected' : ''}${o.disabled ? ' disabled' : ''}" data-value="${kirEscapeHtml(o.value)}" role="option" aria-selected="${o.value === select.value}" aria-disabled="${o.disabled ? 'true' : 'false'}">
          ${kirEscapeHtml(o.textContent)}
        </div>`).join('')}
    </div>`;

  const trigger = wrapper.querySelector('.kir-select-trigger');
  const panel = wrapper.querySelector('.kir-select-panel');

  trigger.onclick = (e) => {
    e.stopPropagation();
    const willOpen = panel.classList.contains('hidden');
    kirCloseAllCustomSelects();
    if (willOpen) {
      panel.classList.remove('hidden');
      trigger.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
    }
  };

  // Disabled options stay in the list (grayed out via CSS) so it's
  // clear the choice exists — they just don't get a click handler,
  // same intent as the native <option disabled> they mirror.
  wrapper.querySelectorAll('.kir-select-option:not(.disabled)').forEach(opt => {
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
      ${options.map(o => `
        <div class="kir-select-option multi${o.selected ? ' selected' : ''}" data-value="${kirEscapeHtml(o.value)}" role="option" aria-selected="${o.selected}">
          <span class="kir-select-checkbox"></span>
          <span>${kirEscapeHtml(o.textContent)}</span>
        </div>`).join('')}
    </div>`;

  const trigger = wrapper.querySelector('.kir-select-trigger');
  const panel = wrapper.querySelector('.kir-select-panel');
  if (wasOpen) trigger.classList.add('open');

  trigger.onclick = (e) => {
    e.stopPropagation();
    const willOpen = panel.classList.contains('hidden');
    kirCloseAllCustomSelects();
    if (willOpen) {
      panel.classList.remove('hidden');
      trigger.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
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