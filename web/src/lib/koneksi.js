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
  lapor: () => import('../components/LaporLayar.jsx')
};

function saatSenggang(jalankan, cadanganMs) {
  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(jalankan, { timeout: cadanganMs * 2 });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(jalankan, cadanganMs);
  return () => clearTimeout(id);
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
