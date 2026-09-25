// Kondisi koneksi & pemuatan bagian app yang dipisah dari unduhan awal (pola Adami).

// Koneksi sangat lambat / mode hemat data: jangan unduh peta tanpa diminta (dipakai mulai M1).
export function koneksiLambat() {
  const koneksi = navigator.connection;
  return !!koneksi && (koneksi.saveData === true || ['slow-2g', '2g'].includes(koneksi.effectiveType));
}

// Satu titik impor per bagian: React.lazy di App dan pramuat di sini memakai modul yang sama,
// jadi setiap file hanya diunduh sekali.
export const muatBagian = {
  daftar: () => import('../pages/Daftar.jsx'),
  info: () => import('../pages/Info.jsx')
};

function saatSenggang(jalankan, cadanganMs) {
  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(jalankan, { timeout: cadanganMs * 2 });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(jalankan, cadanganMs);
  return () => clearTimeout(id);
}

// Bagian-bagian kecil dipramuat juga di koneksi lambat supaya tersimpan service worker dan tetap bisa dibuka
// saat sinyal hilang.
export function pramuatBagianSaatSenggang() {
  if (navigator.onLine === false) return () => {};
  return saatSenggang(() => {
    for (const muat of Object.values(muatBagian)) muat().catch(() => { /* dicoba lagi saat dibuka */ });
  }, 3000);
}
