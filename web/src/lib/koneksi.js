// Kondisi koneksi & pemuatan bagian app yang dipisah dari unduhan awal (pola Adami).

// Koneksi sangat lambat / mode hemat data: jangan unduh peta tanpa diminta.
export function koneksiLambat() {
  const koneksi = navigator.connection;
  return !!koneksi && (koneksi.saveData === true || ['slow-2g', '2g'].includes(koneksi.effectiveType));
}

// Satu titik impor per bagian: React.lazy di App dan pramuat di sini memakai modul yang sama,
// jadi setiap file hanya diunduh sekali.
export const muatModulPeta = () => import('../components/Peta.jsx');

export const muatBagian = {
  daftar: () => import('../pages/Daftar.jsx'),
  info: () => import('../pages/Info.jsx'),
  saya: () => import('../pages/Saya.jsx'),
  berita: () => import('../pages/Berita.jsx'),
  legal: () => import('../pages/Legal.jsx'),
  tempat: () => import('../pages/Tempat.jsx'),
  wilayah: () => import('../pages/Wilayah.jsx'),
  lapor: () => import('../components/LaporLayar.jsx')
};

// Jalankan setelah gambar pertama (satu frame): permintaan data tidak berebut dengan teks pertama halaman.
// Lighthouse menghitung semua permintaan yang mulai sebelum LCP sebagai penghalang; data Supabase (lintas origin)
// membuat LCP Beranda tersimulasi 4 detik padahal LCP nyata ±0,35 detik (diukur 1 Okt 2026). Mengembalikan pembatal.
// requestAnimationFrame tidak berjalan di tab tersembunyi / jendela diperkecil: cadangan timer 300 ms supaya data tetap
// dimuat (ditemukan 1 Okt 2026: Beranda di tab latar tidak pernah memuat data).
export function setelahGambarPertama(jalankan) {
  let selesai = false;
  let waktu = null;
  const sekali = () => { if (!selesai) { selesai = true; jalankan(); } };
  const bingkai = requestAnimationFrame(() => { waktu = setTimeout(sekali, 0); });
  const cadangan = setTimeout(sekali, 300);
  return () => {
    selesai = true;
    cancelAnimationFrame(bingkai);
    clearTimeout(cadangan);
    if (waktu != null) clearTimeout(waktu);
  };
}

// Pramuat menunggu halaman selesai dimuat + JEDA_PRAMUAT_MS, baru saat senggang: unduhan bagian lain (Peta ±275 KB)
// tidak boleh berebut jalur dengan teks & data halaman pertama. Lighthouse 1 Okt 2026: pramuat yang terlalu cepat
// membuat LCP Beranda tersimulasi 4 detik (LCP nyata ±0,35 detik).
const JEDA_PRAMUAT_MS = 3000;
function saatSenggang(jalankan, cadanganMs) {
  let id = null;
  let batal = false;
  const senggang = () => {
    if (batal) return;
    if ('requestIdleCallback' in window) id = window.requestIdleCallback(jalankan, { timeout: cadanganMs * 2 });
    else id = setTimeout(jalankan, cadanganMs);
  };
  const tunda = () => { id = setTimeout(senggang, JEDA_PRAMUAT_MS); };
  if (document.readyState === 'complete') tunda();
  else window.addEventListener('load', tunda, { once: true });
  return () => {
    batal = true;
    window.removeEventListener('load', tunda);
    if (id != null) { clearTimeout(id); if ('cancelIdleCallback' in window) window.cancelIdleCallback(id); }
  };
}

// Peta (MapLibre + worker + CSS, jauh lebih besar dari sisa app): setelah Beranda tampil & perangkat senggang,
// unduh di latar agar "Buka peta" terasa instan. Tidak saat koneksi lambat, hemat data, atau offline.
export function pramuatPetaSaatSenggang() {
  if (koneksiLambat() || navigator.onLine === false) return () => {};
  return saatSenggang(() => { muatModulPeta().catch(() => { /* dicoba lagi saat peta dibuka */ }); }, 2500);
}

// Bagian-bagian kecil dipramuat juga di koneksi lambat supaya tersimpan service worker dan tetap bisa dibuka
// saat sinyal hilang.
export function pramuatBagianSaatSenggang() {
  if (navigator.onLine === false) return () => {};
  return saatSenggang(() => {
    for (const muat of Object.values(muatBagian)) muat().catch(() => { /* dicoba lagi saat dibuka */ });
  }, 3000);
}
