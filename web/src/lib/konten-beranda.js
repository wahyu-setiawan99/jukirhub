// Teks Beranda & halaman: SATU sumber untuk halaman React DAN HTML statis yang ditanam saat build
// (vite.config.js → lib/seo.js). Mesin pencari & pratinjau tautan membaca HTML statis itu,
// jadi ubah teks di sini saja agar keduanya tidak pernah berbeda.
//
// Hanya JavaScript murni (tanpa JSX, tanpa alias @shared) karena ikut dimuat oleh Node saat build.

export const SITUS = {
  nama: 'JukirHub',
  // Tagline logo (keputusan pemilik 1 Okt 2026). Satu sumber: header, Beranda, og.png.
  tagline: 'Melaporkan juru parkir liar',
  // Domain belum diputuskan (AGENTS.md bagian 11). Bisa ditimpa env VITE_SITE_URL.
  urlBawaan: 'https://jukirhub.site',
  judul: 'JukirHub: Info Juru Parkir, Tarif, dan Indikasi Pungli dari Warga',
  // Deskripsi ±150 karakter: lebih panjang dari ±160 dipotong Google di hasil pencarian.
  deskripsi:
    'Cek apakah jukir membantu, tarif parkir, dan indikasi pungli di depan toko dan pinggir jalan dari laporan ' +
    'warga. Gratis tanpa akun, di seluruh pulau Sulawesi.'
};

export const HERO = {
  judul: 'Info juru parkir di sekitar Anda, dari laporan warga',
  sub: 'Apakah jukirnya membantu, berapa tarif yang biasa dibayar, dan adakah indikasi pungli. ' +
    'Pilih tempat di peta, lihat laporannya, atau laporkan pengalaman Anda. Gratis, tanpa akun.'
};

export const TENTANG = {
  judul: 'Apa itu JukirHub?',
  paragraf: [
    'JukirHub mencatat juru parkir (jukir) di luar gedung: depan minimarket, toko, ruko, warung, ATM, sekolah, ' +
    'dan pinggir jalan. Warga yang baru parkir melaporkan apakah jukir membantu saat datang dan saat pergi, ' +
    'berapa yang dibayar, adakah indikasi pungli, dan memberi rating.',
    'Laporan digabung menjadi gambaran per tempat yang bisa dilihat siapa saja di peta, supaya warga dan ' +
    'pemerintah daerah sama-sama tahu aktivitas parkir di sekitarnya.'
  ]
};

export const LANGKAH = {
  judul: 'Cara kerjanya',
  butir: [
    {
      judul: 'Pilih tempat di peta',
      teks: 'Ketuk nama toko atau tempat di peta, atau cari namanya. Tempat yang sudah dilaporkan punya penanda ' +
        'berwarna.'
    },
    {
      judul: 'Laporkan parkir',
      teks: 'Jawab singkat: jukir membantu atau tidak saat datang dan saat pergi, bayar berapa, adakah indikasi ' +
        'pungli, lalu beri bintang. Kurang dari 30 detik, tanpa akun, dari lokasi parkir.'
    },
    {
      judul: 'Digabung menjadi gambaran per tempat',
      teks: 'Indikasi pungli baru ditampilkan setelah ada minimal 3 laporan dari 2 orang berbeda, supaya satu ' +
        'laporan tidak langsung menjadi kesimpulan.'
    }
  ]
};

// Fase N2 (AGENTS.md 1.5): pulau Sulawesi. Nama sama dengan PROVINSI di supabase/functions/_shared/wilayah.js
// (file ini dimuat Node saat build, jadi daftar ditulis ulang di sini; dijaga tests/seo.test.js).
export const WILAYAH = {
  judul: 'Wilayah yang tersedia',
  daftar: ['Sulawesi Selatan', 'Sulawesi Barat', 'Sulawesi Tengah', 'Sulawesi Tenggara', 'Gorontalo', 'Sulawesi Utara'],
  get teks() {
    return `Saat ini JukirHub mencakup tempat parkir di seluruh pulau Sulawesi: ${gabungDaftar(this.daftar)}. ` +
      'Pilih zona provinsi di bagian atas aplikasi, atau biarkan terpilih otomatis dari lokasi Anda. ' +
      'Pulau lain menyusul bertahap.';
  }
};

export const FAQ = {
  judul: 'Pertanyaan umum',
  butir: [
    {
      tanya: 'Apakah JukirHub layanan resmi pemerintah?',
      jawab: 'Bukan. JukirHub tidak berafiliasi dengan Dishub atau pemerintah daerah. Semua data berasal dari ' +
        'laporan warga dan belum diverifikasi pihak berwenang, jadi anggap sebagai petunjuk, bukan kepastian.'
    },
    {
      tanya: 'Bagaimana cara melapor?',
      jawab: 'Saat berada di tempat parkir, buka Peta, ketuk tempat Anda parkir (atau cari namanya), lalu tekan ' +
        'Laporkan parkir. Jawab apakah jukir membantu saat datang dan saat pergi, bayar berapa, adakah indikasi ' +
        'pungli, lalu beri bintang. Lokasi diperiksa untuk memastikan Anda benar-benar di sana.'
    },
    {
      tanya: 'Apa arti indikasi pungli?',
      jawab: 'Indikasi dihitung dari pengalaman yang dilaporkan warga: tidak diberi karcis, tarif kemahalan, ' +
        'jukir memaksa atau marah, atau dipungut di tempat bertuliskan parkir gratis. Hasilnya rendah, sedang, atau ' +
        'tinggi. Ini bukan tuduhan kepada siapa pun dan bukan putusan hukum.'
    },
    {
      tanya: 'Kenapa sebagian tempat di peta tidak punya penanda?',
      jawab: 'Tanpa penanda berarti belum ada laporan parkir di tempat itu. Penanda abu-abu berarti laporannya masih ' +
        'sedikit. Ketuk tempatnya untuk menjadi yang pertama melapor.'
    },
    {
      tanya: 'Parkir apa saja yang dicatat?',
      jawab: 'Hanya parkir di luar gedung yang dijaga jukir: tepi jalan, depan toko, minimarket, ruko, warung, ATM, ' +
        'sekolah, tempat ibadah, dan pasar. Parkir resmi berpalang atau bergedung seperti mall dan basement ' +
        'tidak dicatat.'
    },
    {
      tanya: 'Apakah identitas jukir atau pelapor ditampilkan?',
      jawab: 'Tidak. JukirHub tidak mencatat nama, foto, atau ciri pribadi jukir, dan tidak menampilkan siapa ' +
        'pelapornya. Laporan berupa pilihan dan bintang.'
    },
    {
      tanya: 'Apakah lokasi saya disimpan?',
      jawab: 'Lokasi untuk menampilkan tempat terdekat dihitung di perangkat Anda. Saat melapor, koordinat disimpan ' +
        'untuk memastikan Anda benar-benar di lokasi, tidak pernah ditampilkan ke publik, dan dihapus otomatis ' +
        'setelah 7 hari.'
    },
    {
      tanya: 'Apakah JukirHub berbayar atau perlu mendaftar?',
      jawab: 'Tidak. JukirHub gratis dipakai tanpa akun, tanpa nama, dan tanpa nomor HP.'
    },
    {
      tanya: 'Apa itu koin di tab Saya?',
      jawab: 'Setiap laporan parkir dari lokasi memberi koin, ditambah bonus untuk pelapor pertama di suatu tempat ' +
        'dan melapor beberapa hari berturut-turut. Koin untuk lencana dan peringkat per kabupaten dengan nama ' +
        'samaran, belum bisa ditukar uang atau hadiah. Tanpa akun, koin tersimpan di HP dan browser yang Anda pakai.'
    }
  ]
};

export const CATATAN_KAKI =
  'Data dari laporan warga, belum diverifikasi pihak berwenang dan bukan data resmi pemerintah. ' +
  'Peta © kontributor OpenStreetMap.';

// Judul, deskripsi, dan isi pembuka per halaman: dipakai HTML statis per rute (lib/seo.js) dan
// judul tab + meta saat berpindah halaman di app (App.jsx). Deskripsi ±150 karakter.
export const HALAMAN = {
  '/': { nama: 'Beranda', judul: SITUS.judul, deskripsi: SITUS.deskripsi },
  '/peta': {
    nama: 'Peta parkir',
    judul: 'Peta Juru Parkir dan Indikasi Pungli · JukirHub',
    deskripsi: 'Peta tempat parkir di Sulawesi, dari Makassar sampai Manado: jukir membantu atau tidak, tarif yang ' +
      'biasa dibayar, dan indikasi pungli dari laporan warga.',
    h1: 'Peta juru parkir dan indikasi pungli',
    intro: 'Ketuk tempat di peta atau cari namanya untuk melihat laporan parkir, atau laporkan pengalaman Anda.'
  },
  '/daftar': {
    nama: 'Daftar tempat parkir',
    judul: 'Daftar Tempat Parkir dan Tarif Juru Parkir · JukirHub',
    deskripsi: 'Daftar tempat parkir di depan toko, minimarket, dan pinggir jalan di Sulawesi yang sudah ' +
      'dilaporkan warga, dengan tarif yang biasa dibayar dan indikasi pungli.',
    h1: 'Daftar tempat parkir',
    intro: 'Tempat yang sudah dilaporkan warga, diurutkan dari yang terdekat saat lokasi diizinkan.'
  },
  '/info': {
    nama: 'Info',
    judul: 'Cara Melapor Jukir, Arti Tanda, dan Privasi · JukirHub',
    deskripsi: 'Panduan memakai JukirHub: cara melapor juru parkir, arti membantu dan indikasi pungli, arti ' +
      'penanda di peta, dan cara JukirHub menjaga privasi Anda.',
    h1: 'Info dan panduan memakai JukirHub',
    intro: 'Cara melapor, arti setiap tanda, dan bagaimana data lokasi Anda dijaga.'
  },
  '/berita': {
    nama: 'Berita parkir',
    judul: 'Berita Parkir dan Juru Parkir di Sulawesi · JukirHub',
    deskripsi: 'Berita terbaru soal juru parkir, parkir liar, dan retribusi parkir dari media di Sulawesi, dirangkum ' +
      'singkat dan diurutkan dari daerah Anda.',
    h1: 'Berita parkir di Sulawesi',
    intro: 'Berita soal juru parkir dan parkir dari media di Sulawesi, 30 hari terakhir. Daerah Anda tampil paling atas.'
  },
  // Halaman situs (persiapan Google AdSense): isi di lib/konten-legal.js.
  '/tentang': {
    nama: 'Tentang',
    judul: 'Tentang JukirHub: Laporan Warga soal Juru Parkir',
    deskripsi: 'Apa itu JukirHub, prinsip kami (indikasi bukan tuduhan, tanpa identitas), wilayah yang dicakup, dan dari ' +
      'mana data parkir, peta, serta berita berasal.',
    h1: 'Tentang JukirHub',
    intro: 'Aplikasi web gratis untuk laporan warga soal juru parkir di luar gedung.'
  },
  '/privasi': {
    nama: 'Kebijakan Privasi',
    judul: 'Kebijakan Privasi · JukirHub',
    deskripsi: 'Data apa saja yang dikumpulkan JukirHub, untuk apa, berapa lama disimpan, layanan pihak ketiga, cookie ' +
      'iklan, dan hak Anda atas data pribadi.',
    h1: 'Kebijakan Privasi',
    intro: 'Cara JukirHub mengumpulkan, memakai, dan melindungi data Anda.'
  },
  '/syarat': {
    nama: 'Syarat Penggunaan',
    judul: 'Syarat Penggunaan · JukirHub',
    deskripsi: 'Aturan memakai JukirHub: sifat informasi laporan warga, kewajiban saat melapor, moderasi isi, koin tanpa ' +
      'nilai uang, dan batas tanggung jawab.',
    h1: 'Syarat Penggunaan',
    intro: 'Aturan sederhana supaya laporan tetap jujur dan adil bagi semua.'
  },
  '/kontak': {
    nama: 'Kontak',
    judul: 'Kontak Pengelola JukirHub',
    deskripsi: 'Hubungi pengelola JukirHub untuk keberatan atas tempat atau komentar, permintaan penghapusan data, ' +
      'laporan masalah, saran, atau kerja sama.',
    h1: 'Kontak',
    intro: 'Kirim pesan langsung ke pengelola JukirHub. Tanpa akun.'
  }
};

// Tautan situs di bagian bawah halaman berisi teks (components/TautanSitus.jsx & HTML statis).
export const TAUTAN_SITUS = [
  ['/tentang', 'Tentang'],
  ['/berita', 'Berita parkir'],
  ['/privasi', 'Kebijakan Privasi'],
  ['/syarat', 'Syarat Penggunaan'],
  ['/kontak', 'Kontak']
];

function gabungDaftar(arr) {
  return arr.length < 2 ? arr.join('') : `${arr.slice(0, -1).join(', ')}, dan ${arr[arr.length - 1]}`;
}
