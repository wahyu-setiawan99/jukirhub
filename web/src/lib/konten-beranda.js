// Teks Beranda & halaman: SATU sumber untuk halaman React DAN HTML statis yang ditanam saat build
// (vite.config.js → lib/seo.js). Mesin pencari & pratinjau tautan membaca HTML statis itu,
// jadi ubah teks di sini saja agar keduanya tidak pernah berbeda.
//
// Hanya JavaScript murni (tanpa JSX, tanpa alias @shared) karena ikut dimuat oleh Node saat build.

export const SITUS = {
  nama: 'JukirHub',
  // Domain belum diputuskan (AGENTS.md bagian 11). Bisa ditimpa env VITE_SITE_URL.
  urlBawaan: 'https://jukirhub.vercel.app',
  judul: 'JukirHub: Info Juru Parkir, Tarif, dan Indikasi Pungli dari Warga',
  // Deskripsi ±150 karakter: lebih panjang dari ±160 dipotong Google di hasil pencarian.
  deskripsi:
    'Cek apakah jukir membantu, tarif parkir, dan indikasi pungli di depan toko dan pinggir jalan dari laporan ' +
    'warga. Gratis tanpa akun, di Makassar dan sekitarnya.'
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

export const WILAYAH = {
  judul: 'Wilayah yang tersedia',
  daftar: ['Makassar', 'Gowa', 'Maros', 'Takalar'],
  get teks() {
    return `Saat ini JukirHub mencakup tempat parkir di ${gabungDaftar(this.daftar)} (Makassar Raya). ` +
      'Wilayah lain menyusul setelah laporan di wilayah ini berjalan.';
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
    deskripsi: 'Peta tempat parkir di Makassar, Gowa, Maros, dan Takalar: jukir membantu atau tidak, tarif yang ' +
      'biasa dibayar, dan indikasi pungli dari laporan warga.',
    h1: 'Peta juru parkir dan indikasi pungli',
    intro: 'Ketuk tempat di peta atau cari namanya untuk melihat laporan parkir, atau laporkan pengalaman Anda.'
  },
  '/daftar': {
    nama: 'Daftar tempat parkir',
    judul: 'Daftar Tempat Parkir dan Tarif Juru Parkir · JukirHub',
    deskripsi: 'Daftar tempat parkir di depan toko, minimarket, dan pinggir jalan Makassar Raya yang sudah ' +
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
  }
};

function gabungDaftar(arr) {
  return arr.length < 2 ? arr.join('') : `${arr.slice(0, -1).join(', ')}, dan ${arr[arr.length - 1]}`;
}
