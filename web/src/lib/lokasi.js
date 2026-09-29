// Mengambil posisi pengguna secepat mungkin, dan menerjemahkan kegagalan jadi pesan yang jelas (disalin dari Adami).
// Tanpa React/DOM (geolocation diberikan sebagai argumen) supaya bisa dites dengan node:test.
//
// GPS di dalam ruangan bisa belasan detik terkunci, sedangkan lokasi jaringan (Wi-Fi/seluler) biasanya ada dalam
// ~1 detik. Karena itu GPS dan lokasi jaringan diminta BERSAMAAN, dan hasil pertama yang cukup akurat langsung dipakai.

// Kebutuhan per keperluan:
//   cukupM      hasil seakurat ini langsung dipakai
//   sabarMs     setelah selama ini, hasil terbaik dipakai bila akurasinya ≤ longgarM
//   batasMs     batas tunggu: ada hasil → dipakai (pemanggil menilai akurasinya), tidak ada → gagal
//   umurMaksMs  posisi yang ditemukan selama ini lalu masih boleh dipakai ulang
export const PROFIL_LOKASI = {
  // Tempat terdekat, tombol lokasi peta: posisi kasar pun sudah berguna.
  umum: { cukupM: 1_000, sabarMs: 1_500, longgarM: Infinity, batasMs: 10_000, umurMaksMs: 120_000 },
  // Lapor: server menerima akurasi ≤ BATAS.akurasiMaksM (250 m).
  lapor: { cukupM: 100, sabarMs: 3_000, longgarM: 250, batasMs: 10_000, umurMaksMs: 30_000 }
};

const IZIN_DITOLAK = 1;   // GeolocationPositionError.PERMISSION_DENIED
const HABIS_WAKTU = 3;    // GeolocationPositionError.TIMEOUT

// null | 'ditolak' | 'tidak_terdeteksi' | 'tidak_didukung'
export function kodeGalatLokasi(err) {
  if (!err) return null;
  if (err.tidakDidukung) return 'tidak_didukung';
  if (err.code === IZIN_DITOLAK) return 'ditolak';
  return 'tidak_terdeteksi';
}

export const TEKS_GALAT_LOKASI = {
  ditolak: 'Izin lokasi ditolak. Aktifkan izin lokasi untuk situs ini di pengaturan browser. Peta dan pencarian tetap bisa dipakai.',
  tidak_terdeteksi: 'Lokasi belum terdeteksi. Pastikan GPS atau layanan lokasi HP aktif, lalu coba lagi.',
  tidak_didukung: 'Browser ini tidak bisa mendeteksi lokasi. Peta dan pencarian tetap bisa dipakai.'
};

// Penyebab tersering "lama lalu tidak terdeteksi" di Android: Akurasi Lokasi Google mati, sehingga hanya GPS murni
// yang dipakai (sulit terkunci di dalam ruangan) dan lokasi dari Wi-Fi/seluler tidak tersedia.
export const SARAN_ANDROID = 'Di Android, nyalakan Akurasi Lokasi Google (Setelan → Lokasi → Layanan lokasi) ' +
  'supaya lokasi cepat ditemukan, juga di dalam ruangan.';

export const perangkatAndroid = (userAgent) => /Android/i.test(String(userAgent ?? ''));

// Melapor wajib dari lokasi, jadi sarannya langsung ke izin/GPS.
export const TEKS_GALAT_LOKASI_LAPOR = {
  ditolak: 'Melapor butuh lokasi. Izinkan lokasi untuk situs ini di pengaturan browser, lalu coba lagi.',
  tidak_terdeteksi: 'Pastikan GPS atau layanan lokasi HP aktif, lalu coba lagi.',
  tidak_didukung: 'Browser ini tidak bisa mendeteksi lokasi. Coba buka JukirHub di Chrome atau Safari.'
};

// Pesan untuk pengguna; `userAgent` diberikan pemanggil (navigator.userAgent) supaya fungsi ini tetap murni.
export function pesanGalatLokasi(kode, userAgent, { lapor = false } = {}) {
  const teks = (lapor ? TEKS_GALAT_LOKASI_LAPOR : TEKS_GALAT_LOKASI)[kode];
  if (!teks) return null;
  return kode === 'tidak_terdeteksi' && perangkatAndroid(userAgent) ? `${teks} ${SARAN_ANDROID}` : teks;
}

// geo = navigator.geolocation (boleh undefined). Mengembalikan { lat, lng, akurasi } atau melempar galat.
export function ambilPosisi(geo, profil = PROFIL_LOKASI.umum) {
  const { cukupM, sabarMs, longgarM, batasMs, umurMaksMs } = { ...PROFIL_LOKASI.umum, ...profil };
  if (!geo?.getCurrentPosition) {
    const err = new Error('Geolocation tidak didukung');
    err.tidakDidukung = true;
    return Promise.reject(err);
  }

  return new Promise((ok, gagal) => {
    let terbaik = null;
    let sabarHabis = false;
    let selesai = false;
    let idPantau = null;
    let tSabar, tBatas;
    let galatTerakhir = null;
    const sumberSelesai = { jaringan: false, gps: false };

    const hentikan = () => {
      selesai = true;
      clearTimeout(tSabar);
      clearTimeout(tBatas);
      if (idPantau != null) geo.clearWatch?.(idPantau);
    };
    const pakai = (hasil) => { if (!selesai) { hentikan(); ok(hasil); } };
    const tolak = (err) => { if (!selesai) { hentikan(); gagal(err); } };
    // Semua sumber sudah memberi jawaban terakhirnya → tidak ada gunanya menunggu batas waktu.
    const cekSemuaSelesai = () => {
      if (sumberSelesai.jaringan && sumberSelesai.gps) terbaik ? pakai(terbaik) : tolak(galatTerakhir);
    };

    const terima = (sumber, sekaliJalan) => (p) => {
      if (selesai) return;
      const h = { lat: p.coords.latitude, lng: p.coords.longitude, akurasi: p.coords.accuracy };
      if (!terbaik || h.akurasi < terbaik.akurasi) terbaik = h;
      if (terbaik.akurasi <= cukupM || (sabarHabis && terbaik.akurasi <= longgarM)) return pakai(terbaik);
      if (sekaliJalan) { sumberSelesai[sumber] = true; cekSemuaSelesai(); }
    };
    const galat = (sumber) => (err) => {
      if (selesai) return;
      if (err?.code === IZIN_DITOLAK) return tolak(err);
      galatTerakhir = err;
      sumberSelesai[sumber] = true;
      cekSemuaSelesai();
    };

    tSabar = setTimeout(() => {
      sabarHabis = true;
      if (terbaik && terbaik.akurasi <= longgarM) pakai(terbaik);
    }, sabarMs);
    tBatas = setTimeout(() => {
      if (terbaik) return pakai(terbaik);
      tolak(Object.assign(new Error('Lokasi tidak terdeteksi dalam batas waktu'), { code: HABIS_WAKTU }));
    }, batasMs);

    // Lokasi jaringan: cepat, sekali jalan.
    geo.getCurrentPosition(
      terima('jaringan', true), galat('jaringan'),
      { enableHighAccuracy: false, timeout: batasMs, maximumAge: umurMaksMs }
    );
    if (selesai) return;
    // GPS: dipantau supaya hasil yang makin akurat langsung masuk begitu tersedia.
    const opsiGps = { enableHighAccuracy: true, timeout: batasMs, maximumAge: umurMaksMs };
    if (geo.watchPosition) {
      idPantau = geo.watchPosition(terima('gps', false), galat('gps'), opsiGps);
      if (selesai) geo.clearWatch?.(idPantau);
    } else {
      geo.getCurrentPosition(terima('gps', true), galat('gps'), opsiGps);
    }
  });
}
