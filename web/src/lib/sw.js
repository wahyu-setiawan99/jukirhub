// Pendaftaran service worker (web/public/sw.js). Hanya di build produksi.
//
// Saklar darurat: bila SW bermasalah (mis. pengguna tertahan di versi lama), deploy ulang dengan
// environment variable VITE_MATIKAN_SW=1 → pada kunjungan berikutnya SW dilepas dan cache
// "jukirhub-" dihapus. Hapus variabel itu lagi untuk mengaktifkan SW kembali.

export function daftarkanServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  if (import.meta.env.VITE_MATIKAN_SW === '1') {
    navigator.serviceWorker.getRegistrations()
      .then(daftar => Promise.all(daftar.map(reg => reg.unregister())))
      .catch(() => {});
    if ('caches' in window) {
      caches.keys()
        .then(nama => Promise.all(nama.filter(n => n.startsWith('jukirhub-')).map(n => caches.delete(n))))
        .catch(() => {});
    }
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.warn('[sw] gagal didaftarkan:', err));
  });
}
