// Halaman situs untuk pengunjung, mesin pencari, dan peninjau Google AdSense (persiapan daftar AdSense, 1 Okt 2026):
// Tentang, Kebijakan Privasi, Syarat Penggunaan, Kontak. SATU sumber teks untuk halaman React (pages/Legal.jsx) dan
// HTML statis yang ditanam saat build (lib/seo.js). JavaScript murni (dimuat Node saat build).
//
// Isi privasi HARUS sesuai kenyataan kode: bila cara data dikelola berubah, ubah juga bagian ini.

export const BERLAKU_SEJAK = '1 Oktober 2026';

// Opt-out iklan Google (wajib disebut di kebijakan privasi bila AdSense aktif).
export const TAUTAN_IKLAN = {
  pengaturanIklan: 'https://adssettings.google.com',
  aboutAds: 'https://www.aboutads.info/choices',
  kebijakanGoogle: 'https://policies.google.com/technologies/partner-sites'
};

/** @typedef {{ judul: string, paragraf?: string[], poin?: string[] }} Bagian */

/** @type {Record<string, { bagian: Bagian[] }>} */
export const ISI_LEGAL = {
  '/tentang': {
    bagian: [
      {
        judul: 'Apa itu JukirHub',
        paragraf: [
          'JukirHub adalah aplikasi web gratis tempat warga melaporkan pengalaman parkir di luar gedung: depan toko, ' +
          'minimarket, warung, kafe, ATM, dan pinggir jalan. Warga melaporkan apakah juru parkir (jukir) membantu saat ' +
          'datang dan saat pergi, berapa yang dibayar, adakah indikasi pungutan liar, atau bahwa tempat itu tidak ada ' +
          'jukirnya sama sekali.',
          'Laporan digabung menjadi gambaran per tempat di peta, imbauan per wilayah, dan peringkat pelapor, supaya ' +
          'warga dan pemerintah daerah sama-sama tahu kondisi parkir di sekitarnya.'
        ]
      },
      {
        judul: 'Prinsip kami',
        poin: [
          'Indikasi, bukan tuduhan. Indikasi pungli baru tampil setelah cukup laporan dari beberapa orang berbeda, dan ' +
          'tidak pernah menyebut nama, wajah, atau ciri pribadi juru parkir.',
          'Jukir yang membantu juga tercatat. Rating dan jawaban "membantu" sama pentingnya dengan indikasi pungli.',
          'Tanpa akun dan tanpa identitas pelapor. Laporan hanya bisa dikirim dari lokasi parkir supaya tidak bisa ' +
          'dipakai menyerang tempat dari jauh.',
          'Independen. JukirHub bukan layanan resmi dan tidak berafiliasi dengan Dinas Perhubungan, PD Parkir, atau ' +
          'pemerintah daerah mana pun.'
        ]
      },
      {
        judul: 'Wilayah',
        paragraf: [
          'Saat ini JukirHub mencakup seluruh pulau Sulawesi: Sulawesi Selatan, Sulawesi Barat, Sulawesi Tengah, ' +
          'Sulawesi Tenggara, Gorontalo, dan Sulawesi Utara. Pulau lain menyusul bertahap.'
        ]
      },
      {
        judul: 'Sumber data',
        poin: [
          'Laporan parkir: dari warga, lewat aplikasi ini.',
          'Peta dan nama tempat: © kontributor OpenStreetMap; peta dasar OpenFreeMap.',
          'Berita parkir: judul dan tautan dari media di Sulawesi, dengan ringkasan singkat buatan AI. Isi lengkap ' +
          'tetap di situs media aslinya.'
        ]
      }
    ]
  },

  '/privasi': {
    bagian: [
      {
        judul: 'Ringkasnya',
        poin: [
          'Tanpa akun, tanpa nama, tanpa nomor HP, tanpa email (kecuali Anda sendiri menuliskannya di formulir kontak).',
          'Koordinat saat melapor hanya untuk memastikan Anda di lokasi, tidak pernah ditampilkan, dan dihapus otomatis ' +
          'setelah 7 hari.',
          'JukirHub tidak menjual data pribadi dan tidak memakai pelacak iklan sendiri (seperti Meta Pixel).'
        ]
      },
      {
        judul: 'Data yang kami kumpulkan dan untuk apa',
        poin: [
          'Isi laporan: tempat, jawaban (membantu / tidak, bayar berapa, indikasi pungli), bintang, kendaraan, waktu, dan ' +
          'komentar opsional. Ditampilkan sebagai ringkasan per tempat dan riwayat tanpa nama pelapor; waktu di riwayat ' +
          'dibulatkan ke jam. Komentar baru diperiksa otomatis oleh AI; yang dinilai layak langsung tampil, sisanya ' +
          'menunggu pemeriksaan pengelola.',
          'Lokasi saat melapor (koordinat & akurasi GPS): untuk memastikan laporan dikirim dari dekat tempat parkir dan ' +
          'mendeteksi lokasi palsu. Tidak ditampilkan dan dihapus setelah 7 hari.',
          'Kunci perangkat acak: dibuat di browser Anda dan disimpan di server hanya dalam bentuk hash bersalt (tidak bisa ' +
          'dikembalikan). Dipakai untuk batas laporan, koin, dan peringkat.',
          'Alamat IP: disimpan hanya dalam bentuk hash bersalt untuk membatasi penyalahgunaan, dihapus setelah 7 hari.',
          'Koin dan peringkat: nama samaran acak (mis. "Anoa Makassar") dan statistik laporan. Anda bisa mengganti nama ' +
          'samaran atau menyembunyikan diri dari peringkat di tab Saya.',
          'Foto bukti (opsional): data lokasi di dalam foto dibuang, lalu foto diteruskan langsung ke Telegram pengelola. ' +
          'Keterangan untuk pengelola dapat menyebut apakah foto diambil dari kamera atau galeri, plus perkiraan umur ' +
          'file. Itu hanya petunjuk, tidak disimpan di server. Foto tidak ditampilkan di JukirHub dan tidak disimpan di server JukirHub.',
          'Kode kampanye iklan (bila Anda datang dari tautan iklan kami): nama kampanye saja, tanpa identitas, untuk ' +
          'mengukur iklan mana yang berguna.',
          'Pesan formulir kontak: diteruskan ke Telegram pengelola. Server hanya mencatat hash IP dan waktu kirim untuk ' +
          'mencegah spam (dihapus setelah 30 hari).'
        ]
      },
      {
        judul: 'Data di perangkat Anda',
        paragraf: [
          'JukirHub menyimpan beberapa pengaturan di penyimpanan lokal browser (localStorage), bukan cookie: tema, ' +
          'kendaraan, zona provinsi, daerah berita, data tempat terakhir untuk dipakai saat offline, kunci perangkat, dan ' +
          'kode kampanye. Anda bisa menghapusnya kapan saja lewat pengaturan browser; koin di HP itu ikut mulai dari nol.'
        ]
      },
      {
        judul: 'Lokasi Anda',
        paragraf: [
          'Izin lokasi hanya diminta saat Anda menekan tombol yang membutuhkannya. Tempat terdekat dihitung di perangkat ' +
          'Anda. Untuk menentukan kabupaten/kota (zona dan berita daerah), koordinat yang dibulatkan sekitar 1 km dikirim ' +
          'ke layanan OpenStreetMap Nominatim.'
        ]
      },
      {
        judul: 'Iklan dan cookie pihak ketiga',
        paragraf: [
          'JukirHub dapat menampilkan iklan dari Google AdSense untuk membiayai layanan gratis ini. Penyedia pihak ketiga, ' +
          'termasuk Google, menggunakan cookie untuk menayangkan iklan berdasarkan kunjungan Anda sebelumnya ke situs ini ' +
          'atau situs lain. Penggunaan cookie iklan oleh Google memungkinkan Google dan mitranya menayangkan iklan ' +
          'berdasarkan kunjungan Anda ke JukirHub dan/atau situs lain di internet.',
          'Anda dapat menolak iklan yang dipersonalisasi melalui Setelan Iklan Google (adssettings.google.com), atau ' +
          'menolak cookie iklan pihak ketiga lainnya melalui www.aboutads.info/choices. Cara Google memakai data dari situs ' +
          'mitra dijelaskan di policies.google.com/technologies/partner-sites.',
          'Iklan tidak ditempatkan di layar peta dan formulir laporan.'
        ]
      },
      {
        judul: 'Layanan pihak ketiga yang kami pakai',
        poin: [
          'Supabase: database dan fungsi server.',
          'Vercel: hosting situs.',
          'OpenStreetMap Nominatim dan OpenFreeMap: pencarian tempat dan peta. Layanan ini melihat alamat IP Anda saat ' +
          'peta dimuat.',
          'Google Gemini: membuat ringkasan judul berita, memeriksa isi komentar (hanya teks komentar dan nama tempat, ' +
          'tanpa data pelapor), dan mencari tarif parkir resmi di peraturan daerah (tanpa data pengguna; tarif tampil ' +
          'setelah diperiksa pengelola).',
          'Telegram: pengelola menerima foto bukti, komentar untuk diperiksa, dan pesan kontak.',
          'Google AdSense (bila iklan aktif): menayangkan iklan, lihat bagian di atas.',
          'Google Maps: hanya bila Anda menekan "Petunjuk arah".'
        ]
      },
      {
        judul: 'Hak Anda',
        paragraf: [
          'Sesuai Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi, Anda dapat meminta akses, koreksi, ' +
          'atau penghapusan data yang berkaitan dengan Anda, serta mengajukan keberatan atas laporan atau komentar. ' +
          'Karena tanpa akun, sebutkan nama tempat dan perkiraan waktu laporan lewat halaman Kontak supaya kami bisa ' +
          'menemukannya. Pemilik tempat atau pihak yang disebut dapat meminta tempat atau komentar disembunyikan.'
        ]
      },
      {
        judul: 'Anak-anak',
        paragraf: ['JukirHub tidak ditujukan untuk anak di bawah 13 tahun dan tidak sengaja mengumpulkan data mereka.']
      },
      {
        judul: 'Perubahan kebijakan',
        paragraf: [
          'Kebijakan ini dapat diperbarui bila cara kami mengelola data berubah. Tanggal berlaku di atas selalu ' +
          'menunjukkan versi terbaru.'
        ]
      }
    ]
  },

  '/syarat': {
    bagian: [
      {
        judul: 'Persetujuan',
        paragraf: [
          'Dengan memakai JukirHub, Anda menyetujui syarat ini. Bila tidak setuju, mohon tidak memakai layanan ini.'
        ]
      },
      {
        judul: 'Sifat informasi',
        poin: [
          'Semua informasi berasal dari laporan warga dan belum diverifikasi pihak berwenang. Gunakan sebagai petunjuk, ' +
          'bukan kepastian.',
          'Indikasi pungli adalah ringkasan pengalaman warga, bukan tuduhan kepada siapa pun dan bukan putusan hukum.',
          'JukirHub bukan layanan resmi dan tidak berafiliasi dengan Dinas Perhubungan, PD Parkir, atau pemerintah daerah.',
          'Ringkasan berita dibuat otomatis oleh AI dan bisa keliru; isi lengkap ada di situs media sumber.'
        ]
      },
      {
        judul: 'Saat melapor, Anda setuju untuk',
        poin: [
          'Melapor dengan jujur, dari lokasi parkir, tentang pengalaman Anda sendiri.',
          'Tidak menyebut nama, nomor HP, plat kendaraan, wajah, atau ciri pribadi juru parkir maupun orang lain.',
          'Tidak memakai kata kasar, ujaran kebencian, ancaman, atau tuduhan tindak pidana kepada orang tertentu.',
          'Tidak mengirim laporan palsu, memakai lokasi palsu, banyak perangkat, atau cara otomatis untuk memanipulasi ' +
          'laporan, koin, atau peringkat.',
          'Hanya mengirim foto yang Anda ambil sendiri, tanpa wajah orang dan tanpa plat nomor.'
        ]
      },
      {
        judul: 'Isi dari pengguna',
        paragraf: [
          'Anda memberi JukirHub izin untuk menyimpan, menggabungkan, dan menampilkan laporan Anda secara anonim. ' +
          'Pengelola dapat menolak atau menyembunyikan komentar, tempat, atau laporan yang melanggar syarat ini, tanpa ' +
          'pemberitahuan. Laporan yang terdeteksi tidak wajar dapat diberi bobot lebih rendah.'
        ]
      },
      {
        judul: 'Koin',
        paragraf: [
          'Koin, lencana, dan peringkat tidak memiliki nilai uang, tidak bisa ditukar, dan dapat disesuaikan atau dihapus ' +
          'bila ditemukan kecurangan. Koin tersimpan di HP dan browser yang Anda pakai.'
        ]
      },
      {
        judul: 'Tanggung jawab',
        paragraf: [
          'Layanan disediakan apa adanya. JukirHub tidak bertanggung jawab atas keputusan yang diambil berdasarkan ' +
          'informasi di aplikasi ini, atas isi situs pihak ketiga yang ditautkan, maupun atas gangguan layanan.'
        ]
      },
      {
        judul: 'Hukum yang berlaku',
        paragraf: [
          'Syarat ini tunduk pada hukum Republik Indonesia. Syarat dapat diperbarui sewaktu-waktu; tanggal berlaku di atas ' +
          'menunjukkan versi terbaru.'
        ]
      }
    ]
  },

  '/kontak': {
    bagian: [
      {
        judul: 'Untuk apa saja',
        poin: [
          'Keberatan atas tempat, laporan, atau komentar (pemilik tempat, pihak yang disebut, atau instansi).',
          'Permintaan akses, koreksi, atau penghapusan data (lihat Kebijakan Privasi).',
          'Laporan masalah aplikasi, saran fitur, atau kerja sama.'
        ]
      },
      {
        judul: 'Supaya cepat ditangani',
        paragraf: [
          'Sebutkan nama tempat dan perkiraan waktu laporan bila pesan Anda tentang tempat atau komentar tertentu. ' +
          'Isi email bila ingin dibalas. Jangan menulis nomor KTP atau data sensitif lain.'
        ]
      }
    ]
  }
};
