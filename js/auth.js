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
    gallery_up: '.. Kembali', gallery_empty: 'Folder ini belum berisi file. Foto akan segera diunggah.',
    gallery_items_one: 'item', gallery_items_other: 'item',
    proker_eyebrow: 'Tahun Ajaran 2025/2026',
    proker_title: 'Program Kerja', proker_desc: 'Rencana kerja cabang Robotik dan Sains untuk tahun ajaran ini mencakup kegiatan latihan rutin hingga kompetisi.',
    proker_robotik_label: 'Cabang Robotik', proker_sains_label: 'Cabang Sains',
    proker_cta_title: 'Tertarik ikut program ini?', proker_cta_desc: 'Daftar sebagai anggota dan pilih cabang yang kamu minati untuk mendapatkan dasbor yang disesuaikan secara otomatis.',
    proker_cta_btn: 'Daftar Sekarang',
    voyage_category: 'Voyage', nav_voyages: 'Voyages', nav_leaderboard: 'Peringkat',
    voyages_title: 'Voyages', voyages_desc: 'Latihan soal MIPA dan koding. Selesaikan soal-soal ini untuk mengumpulkan deltas.',
    voyages_filter_all: 'Semua', voyages_filter_math: 'Matematika', voyages_filter_physics: 'Fisika', voyages_filter_coding: 'Koding',
    voyages_filter_chemistry: 'Kimia', voyages_filter_biology: 'Biologi', voyages_filter_selected: 'dipilih', voyages_filter_none: 'Tidak ada',
    voyages_search_placeholder: 'Cari soal…', voyages_search_label: 'Cari',voyages_search_placeholder: 'Cari soal…',
 voyages_reward: 'Ganjaran',
    voyages_start: 'Mulai Soal', voyages_continue: 'Lihat Lagi', voyages_completed: 'Selesai',
    voyages_type_mc: 'Pilihan Ganda', voyages_type_dropdown: 'Dropdown', voyages_type_essay: 'Esai',
    voyages_submit: 'Kirim Jawaban', voyages_next: 'Selanjutnya', voyages_close: 'Tutup',
    voyages_correct: 'Jawaban benar!', voyages_incorrect: 'Belum tepat, coba lagi.',
    voyages_earned: 'deltas didapat', voyages_essay_sent: 'Esai terkirim untuk ditinjau pengurus.',
    voyages_choose_answer: 'Pilih salah satu jawaban di bawah.', voyages_choose_dropdown: 'Pilih jawaban dari menu di bawah.',
    voyages_pick_placeholder: '-- Pilih jawaban --', voyages_your_answer: 'Jawaban esai kamu',
    voyages_essay_placeholder: 'Tulis jawaban esai kamu di sini…',
    voyages_already_done: 'Kamu sudah menyelesaikan soal ini sebelumnya.',
    leaderboard_title: 'Peringkat', leaderboard_desc: 'Peringkat deltas seluruh anggota KIR.',
    leaderboard_you: 'Kamu', leaderboard_rank: 'Peringkat', leaderboard_member: 'Anggota', leaderboard_deltas: 'Deltas',
    leaderboard_your_rank: 'Peringkat kamu', leaderboard_range_week: 'Minggu Ini', leaderboard_range_month: 'Bulan Ini', leaderboard_range_all: 'Sepanjang Waktu',
    leaderboard_search_placeholder: 'Cari anggota…', leaderboard_branch_all: 'Semua Cabang', leaderboard_no_results: 'Tidak ada anggota yang cocok.',
    comments_title: 'Komentar', comments_placeholder: 'Tulis komentar…', comments_send: 'Kirim',
    comments_empty: 'Belum ada komentar. Jadilah yang pertama.', comments_attach: 'Lampirkan file',
    comments_delete: 'Hapus', comments_too_large: 'Pilih file di bawah 1.5MB (prototipe menyimpan ini di browser kamu).',
    comments_reply: 'Balas', comments_reply_placeholder: 'Tulis balasan…', comments_cancel: 'Batal',
    theme_light: 'Mode Terang',

    admin_title: 'Admin Panel', admin_desc: 'Tambahkan entri data baru ke sistem.',
    admin_tab_tasks: 'Tugas', admin_tab_schedule: 'Jadwal', admin_tab_materials: 'Materi', admin_tab_voyages: 'Voyages',
    admin_task_title_label: 'Judul Tugas', admin_task_title_placeholder: 'Masukkan judul…',
    admin_due_label: 'Tenggat Waktu (Due)', admin_pick_date: 'Pilih tanggal',
    admin_type_label: 'Tipe', admin_type_ekskul: 'Ekstrakurikuler', admin_type_individual: 'Individual', admin_type_kelompok: 'Kelompok',
    admin_cabang_label: 'Cabang', admin_cabang_both: 'Robotik & Sains',
    admin_assign_mode_label: 'Mode Penugasan', admin_assign_everyone: 'Semua Anggota Cabang', admin_assign_specific: 'Orang Tertentu',
    admin_assignee_label: 'Penerima (Assignee)', admin_assignee_placeholder: 'Nama anggota…', admin_assignee_hint: 'Masukkan satu atau lebih nama, pisahkan dengan koma.',
    admin_desc_label: 'Deskripsi', admin_desc_placeholder: 'Jelaskan detail tugas…',
    admin_save_task: 'Simpan Tugas',
    admin_event_name_label: 'Nama Acara', admin_event_name_placeholder: 'Masukkan nama acara…',
    admin_datetime_label: 'Waktu & Tanggal', admin_time_label: 'Jam',
    admin_location_label: 'Lokasi', admin_location_placeholder: 'Ruang 214, Student Union',
    admin_save_schedule: 'Simpan Jadwal',
    admin_material_title_label: 'Judul Materi', admin_material_title_placeholder: 'Masukkan judul…',
    admin_material_desc_label: 'Deskripsi Singkat', admin_material_desc_placeholder: 'Ringkasan materi…',
    admin_action_type_label: 'Jenis Tindakan', admin_action_link: 'Buka Tautan', admin_action_upload: 'Unggah File',
    admin_url_label: 'Tautan / URL File', admin_file_upload_label: 'Unggah File',
    admin_save_material: 'Simpan Materi',
    admin_subject_label: 'Subjek', admin_subject_math: 'Matematika', admin_subject_physics: 'Fisika',
    admin_subject_chemistry: 'Kimia', admin_subject_biology: 'Biologi', admin_subject_coding: 'Koding',
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
    admin_view_json: 'Lihat/Edit JSON', admin_upload_json: 'Unggah JSON',
    admin_json_editor_title: 'JSON Editor', admin_load_json: 'Muat dari JSON', admin_export_json: 'Ekspor ke JSON', admin_close: 'Tutup',
    admin_json_uploader_title: 'Unggah Voyage JSON', admin_drag_drop_json: 'Tarik file JSON di sini atau klik untuk memilih', admin_clear: 'Bersihkan',
    admin_math_frac: 'Pecahan', admin_math_pow: 'Pangkat', admin_math_sub: 'Subskrip', admin_math_sqrt: 'Akar', admin_math_greek: 'Yunani',
    admin_toast_tasks: 'Tugas berhasil ditambahkan!', admin_toast_schedule: 'Jadwal berhasil ditambahkan!',
    admin_toast_materials: 'Materi berhasil ditambahkan!', admin_toast_voyages: 'Voyage berhasil ditambahkan!',
    admin_error_need_2_options: 'Tambahkan minimal 2 opsi jawaban.', admin_error_need_correct: 'Pilih satu jawaban yang benar terlebih dahulu.',
    admin_error_need_date: 'Pilih tanggal terlebih dahulu.', admin_cal_today: 'Hari ini', admin_cal_clear: 'Hapus',
    voyages_difficulty: 'Rating', voyages_osn_level: 'Level OSN'
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
    proker_cta_btn: 'Register Now',
    voyage_category: 'Voyage', nav_voyages: 'Voyages', nav_leaderboard: 'Leaderboard',
    voyages_title: 'Voyages', voyages_desc: 'MIPA and coding practice questions — solve them to earn deltas.',
    voyages_filter_all: 'All', voyages_filter_math: 'Math', voyages_filter_physics: 'Physics', voyages_filter_coding: 'Coding', voyages_filter_selected: 'selected', voyages_filter_none: 'None',
    voyages_search_placeholder: 'Search questions…', voyages_search_label: 'Search',
    voyages_filter_chemistry: 'Chemistry', voyages_filter_biology: 'Biology',
    voyages_difficulty: 'Rating', voyages_osn_level: 'OSN Level', voyages_reward: 'Reward',
    voyages_start: 'Start Question', voyages_continue: 'Review Again', voyages_completed: 'Completed',
    voyages_type_mc: 'Multiple Choice', voyages_type_dropdown: 'Dropdown', voyages_type_essay: 'Essay',
    voyages_submit: 'Submit Answer', voyages_next: 'Next', voyages_close: 'Close',
    voyages_correct: 'Correct answer!', voyages_incorrect: 'Not quite, try again.',
    voyages_earned: 'deltas earned', voyages_essay_sent: 'Essay submitted for officer review.',
    voyages_choose_answer: 'Choose one answer below.', voyages_choose_dropdown: 'Pick an answer from the menu below.',
    voyages_pick_placeholder: '-- Choose an answer --', voyages_your_answer: 'Your essay answer',
    voyages_essay_placeholder: 'Write your essay answer here…',
    voyages_already_done: 'You already completed this question before.',
    leaderboard_title: 'Leaderboard', leaderboard_desc: 'Deltas ranking across all KIR members.',
    leaderboard_you: 'You', leaderboard_rank: 'Rank', leaderboard_member: 'Member', leaderboard_deltas: 'Deltas',
    leaderboard_your_rank: 'Your rank', leaderboard_range_week: 'This Week', leaderboard_range_month: 'This Month', leaderboard_range_all: 'All Time',
    leaderboard_search_placeholder: 'Search members…', leaderboard_branch_all: 'All Branches', leaderboard_no_results: 'No members match.',
    comments_title: 'Comments', comments_placeholder: 'Write a comment…', comments_send: 'Send',
    comments_empty: 'No comments yet. Be the first.', comments_attach: 'Attach file',
    comments_delete: 'Delete', comments_too_large: 'Pick a file under 1.5MB (the prototype stores this in your browser).',
    comments_reply: 'Reply', comments_reply_placeholder: 'Write a reply…', comments_cancel: 'Cancel',
    theme_light: 'Light Mode',

    admin_title: 'Admin Panel', admin_desc: 'Add new data entries to the system.',
    admin_tab_tasks: 'Tasks', admin_tab_schedule: 'Schedule', admin_tab_materials: 'Materials', admin_tab_voyages: 'Voyages',
    admin_task_title_label: 'Task Title', admin_task_title_placeholder: 'Enter a title…',
    admin_due_label: 'Due Date', admin_pick_date: 'Pick a date',
    admin_type_label: 'Type', admin_type_ekskul: 'Extracurricular', admin_type_individual: 'Individual', admin_type_kelompok: 'Group',
    admin_cabang_label: 'Branch', admin_cabang_both: 'Robotics & Science',
    admin_assign_mode_label: 'Assignment Mode', admin_assign_everyone: 'All Branch Members', admin_assign_specific: 'Specific People',
    admin_assignee_label: 'Assignee', admin_assignee_placeholder: 'Member name…', admin_assignee_hint: 'Enter one or more names, separated by commas.',
    admin_desc_label: 'Description', admin_desc_placeholder: 'Describe the task details…',
    admin_save_task: 'Save Task',
    admin_event_name_label: 'Event Name', admin_event_name_placeholder: 'Enter an event name…',
    admin_datetime_label: 'Date & Time', admin_time_label: 'Time',
    admin_location_label: 'Location', admin_location_placeholder: 'Room 214, Student Union',
    admin_save_schedule: 'Save Event',
    admin_material_title_label: 'Material Title', admin_material_title_placeholder: 'Enter a title…',
    admin_material_desc_label: 'Short Description', admin_material_desc_placeholder: 'Material summary…',
    admin_action_type_label: 'Action Type', admin_action_link: 'Open Link', admin_action_upload: 'Upload File',
    admin_url_label: 'Link / File URL', admin_file_upload_label: 'Upload File',
    admin_save_material: 'Save Material',
    admin_subject_label: 'Subject', admin_subject_math: 'Math', admin_subject_physics: 'Physics',
    admin_subject_chemistry: 'Chemistry', admin_subject_biology: 'Biology', admin_subject_coding: 'Coding',
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
    admin_view_json: 'View/Edit JSON', admin_upload_json: 'Upload JSON',
    admin_json_editor_title: 'JSON Editor', admin_load_json: 'Load from JSON', admin_export_json: 'Export to JSON', admin_close: 'Close',
    admin_json_uploader_title: 'Upload Voyage JSON', admin_drag_drop_json: 'Drag JSON files here or click to select', admin_clear: 'Clear',
    admin_math_frac: 'Fraction', admin_math_pow: 'Power', admin_math_sub: 'Subscript', admin_math_sqrt: 'Square Root', admin_math_greek: 'Greek',
    admin_toast_tasks: 'Task added successfully!', admin_toast_schedule: 'Event added successfully!',
    admin_toast_materials: 'Material added successfully!', admin_toast_voyages: 'Voyage added successfully!',
    admin_error_need_2_options: 'Add at least 2 answer options.', admin_error_need_correct: 'Select a correct answer first.',
    admin_error_need_date: 'Please pick a date first.', admin_cal_today: 'Today', admin_cal_clear: 'Clear',
    voyages_difficulty: 'Rating', voyages_osn_level: 'Provincial OSN Level'
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
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) themeToggle.classList.toggle('on', kirCurrentTheme() === 'light');
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

function handleThemeToggle() {
  const current = kirCurrentTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  kirSetTheme(next);
  document.getElementById('theme-toggle').classList.toggle('on', next === 'light');
}

function kirInjectSidebar(activeTab) {
  const sidebarHtml = `
  <aside id="sidebar" class="hidden lg:flex lg:flex-col w-full lg:w-64 lg:min-h-screen glass border-y-0 border-l-0 px-4 py-6 lg:sticky lg:top-0 relative ${localStorage.getItem(KIR_SIDEBAR_COLLAPSED_KEY) === 'true' ? 'sidebar-collapsed' : ''}">
    <button id="sidebar-collapse-btn" class="absolute -right-3 top-8 w-6 h-6 rounded-full bg-accent-gradient text-white flex items-center justify-center z-50 hover:brightness-110 cursor-pointer touch-none">
      <svg class="w-3 h-3 collapse-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
    </button>
    <a href="index.html" class="hidden lg:flex items-center gap-2.5 px-2 mb-8 overflow-hidden">
      <!-- Removed bg-zinc-900, shadow-glow-sm, and border -->
      <div class="w-9 h-9 shrink-0 flex items-center justify-center">
        <img src="assets/KIR_light_heavy.png" alt="Orbit Logo" class="w-8 h-8 object-contain" />
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
      ${kirCurrentUserName() === 'Admin' ? `
      <a href="admin.html" class="nav-link ${activeTab === 'admin' ? 'active' : ''} flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300">
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        <span class="nav-label">Admin</span>
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

  document.getElementById('sidebar-root').innerHTML = sidebarHtml + settingsModalHtml;
  
  const badge = document.getElementById('sidebar-cabang-badge');
  if (badge) badge.textContent = kirCabangLabel(kirCurrentUserCabang());
  
  kirApplyTranslations();
  kirRenderUserChrome();
  kirInitSidebarDrag();
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
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (I18N[lang][key]) el.setAttribute('placeholder', I18N[lang][key]);
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
  return raw === null ? 1240 : parseInt(raw, 10) || 0;
}

function kirAddDeltas(amount) {
  const next = kirDeltasTotal() + amount;
  localStorage.setItem(KIR_DELTAS_KEY, String(next));
  return next;
}

function kirVoyageCompletion(voyageId) {
  const raw = localStorage.getItem(KIR_VOYAGE_DONE_PREFIX + voyageId);
  return raw ? JSON.parse(raw) : null; // { deltas, completedAt } or null
}

function kirMarkVoyageCompleted(voyageId, deltas) {
  localStorage.setItem(KIR_VOYAGE_DONE_PREFIX + voyageId, JSON.stringify({ deltas, completedAt: Date.now() }));
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
const KIR_COMMENT_MAX_ATTACHMENT_BYTES = 1.5 * 1024 * 1024; // 1.5MB, same cap as avatar upload
const kirPendingCommentAttachments = {}; // containerId -> { name, type, size, dataUrl } | undefined

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

function kirGetComments(scope, itemId) {
  const raw = localStorage.getItem(kirCommentsKey(scope, itemId));
  return raw ? JSON.parse(raw) : [];
}

function kirSaveComments(scope, itemId, list) {
  localStorage.setItem(kirCommentsKey(scope, itemId), JSON.stringify(list));
}

function kirAddComment(scope, itemId, { text, attachment, parentId }) {
  const list = kirGetComments(scope, itemId);
  const entry = {
    id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    author: kirCurrentUserName(),
    avatar: kirCurrentUserAvatar(),
    text: (text || '').trim(),
    attachment: attachment || null,
    createdAt: Date.now(),
    parentId: parentId || null,
  };
  list.push(entry);
  kirSaveComments(scope, itemId, list);
  return entry;
}

function kirDeleteComment(scope, itemId, commentId) {
  const list = kirGetComments(scope, itemId).filter(c => c.id !== commentId);
  kirSaveComments(scope, itemId, list);
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

/* Builds and injects the full comment thread + composer into
   `containerId`. Call this every time a modal opens (or after
   any comment is added/removed) to keep it in sync. */
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

function kirRenderCommentSection(containerId, scope, itemId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const lang = localStorage.getItem(KIR_LANG_KEY) || 'id';
  const comments = kirGetComments(scope, itemId);
  const you = kirCurrentUserName();

  const topLevel = comments.filter(c => !c.parentId);
  const repliesOf = pid => comments.filter(c => c.parentId === pid);

  const listHtml = topLevel.length === 0
    ? `<p class="text-zinc-600 text-xs py-1" data-i18n="comments_empty">${I18N[lang].comments_empty}</p>`
    : topLevel.map(c => {
        const replies = repliesOf(c.id);
        const repliesHtml = replies.length
          ? `<div class="comment-replies">${replies.map(r => kirRenderCommentItem(containerId, scope, itemId, r, lang, you, true)).join('')}</div>`
          : '';
        return kirRenderCommentItem(containerId, scope, itemId, c, lang, you, false) + repliesHtml;
      }).join('');

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
        <button onclick="kirSubmitComment('${containerId}', '${scope}', '${itemId}')" class="px-4 py-1.5 rounded-lg text-xs font-semibold bg-accent-gradient text-white hover:brightness-110 shadow-glow-sm transition" data-i18n="comments_send">${I18N[lang].comments_send}</button>
      </div>
    </div>`;

  delete kirPendingCommentAttachments[containerId];
}

/* Shows/hides the inline reply composer under a given comment.
   Only one reply box is kept open at a time per container to
   keep the thread tidy. */
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

function kirSubmitReply(containerId, scope, itemId, commentId) {
  const textarea = document.getElementById(`${containerId}-replybox-${commentId}-text`);
  const text = textarea ? textarea.value.trim() : '';
  if (!text) return;
  kirAddComment(scope, itemId, { text, attachment: null, parentId: commentId });
  kirRenderCommentSection(containerId, scope, itemId);
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
      name: file.name, type: file.type, size: file.size, dataUrl: reader.result,
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

function kirSubmitComment(containerId, scope, itemId) {
  const textarea = document.getElementById(containerId + '-text');
  const text = textarea ? textarea.value.trim() : '';
  const attachment = kirPendingCommentAttachments[containerId];
  if (!text && !attachment) return;
  kirAddComment(scope, itemId, { text, attachment });
  kirRenderCommentSection(containerId, scope, itemId);
}

function kirDeleteCommentAndRerender(containerId, scope, itemId, commentId) {
  kirDeleteComment(scope, itemId, commentId);
  kirRenderCommentSection(containerId, scope, itemId);
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
    <button type="button" class="kir-select-trigger${isPlaceholder ? ' placeholder' : ''}" aria-haspopup="listbox" aria-expanded="false">
      <span class="kir-select-trigger-label">${selectedOption ? kirEscapeHtml(selectedOption.textContent) : ''}</span>
      <svg class="kir-select-chevron" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
    </button>
    <div class="kir-select-panel hidden" role="listbox">
      ${options.filter(o => !o.disabled).map(o => `
        <div class="kir-select-option${o.value === select.value ? ' selected' : ''}" data-value="${kirEscapeHtml(o.value)}" role="option" aria-selected="${o.value === select.value}">
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

  wrapper.querySelectorAll('.kir-select-option').forEach(opt => {
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
