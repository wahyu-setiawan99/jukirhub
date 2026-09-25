// Service worker JukirHub (disalin dari Adami, tanpa bagian Web Push).
//
// Hanya menyimpan FILE APLIKASI (HTML, JS, CSS, ikon, manifest) agar app tetap terbuka saat
// sinyal lemah/putus. Respons API (Supabase) dan tile peta TIDAK PERNAH disimpan di
// sini: data selalu dari jaringan; data terakhir disimpan terpisah oleh app (lib/offline.js, mulai M1).
//
// Saklar darurat: build dengan VITE_MATIKAN_SW=1 → app melepas SW ini & menghapus cache "jukirhub-".
// Naikkan VERSI bila strategi cache berubah; cache versi lama dihapus saat aktivasi.

const VERSI = 'jukirhub-v1';
const CACHE_HALAMAN = `${VERSI}-halaman`;
const CACHE_ASET = `${VERSI}-aset`;
const MAKS_ENTRI_ASET = 60;
const BATAS_TUNGGU_NAVIGASI_MS = 4000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_HALAMAN)
      .then(cache => cache.addAll(['/', '/manifest.webmanifest', '/ikon.svg', '/ikon-192.png']))
      .catch(() => { /* gagal pra-simpan tidak boleh menggagalkan instalasi */ })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const nama of await caches.keys()) {
      if (nama.startsWith('jukirhub-') && !nama.startsWith(`${VERSI}-`)) await caches.delete(nama);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // Supabase, peta: langsung ke jaringan

  if (req.mode === 'navigate') {
    event.respondWith(navigasi(req));
  } else if (url.pathname.startsWith('/assets/')) {
    event.respondWith(asetBerhash(req));
  } else if (url.pathname === '/manifest.webmanifest' || url.pathname.startsWith('/ikon')) {
    event.respondWith(segarkanDiLatar(req));
  }
});

// Halaman: jaringan dulu (versi terbaru setelah deploy); bila gagal/lebih dari 4 dtk → salinan terakhir.
async function navigasi(req) {
  const cache = await caches.open(CACHE_HALAMAN);
  // Tiap halaman (/, /peta, /daftar, /info) punya HTML statis sendiri untuk SEO → simpan per jalur;
  // jalur yang belum pernah dibuka offline memakai salinan Beranda (app React-nya sama).
  const kunci = new URL(req.url).pathname;
  const dariJaringan = fetch(req).then(async (res) => {
    if (res.ok && !res.redirected) await cache.put(kunci, res.clone());
    return res;
  });
  const salinan = async () => (await cache.match(kunci)) ?? (await cache.match('/'));
  const batasWaktu = new Promise(selesai => setTimeout(() => selesai(null), BATAS_TUNGGU_NAVIGASI_MS));
  try {
    const cepat = await Promise.race([dariJaringan, batasWaktu]);
    if (cepat) return cepat;
    const tersimpan = await salinan();
    return tersimpan ?? await dariJaringan;
  } catch {
    const tersimpan = await salinan();
    if (tersimpan) return tersimpan;
    return new Response(
      '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JukirHub</title><p style="font-family:system-ui;padding:24px">Tidak ada koneksi. Buka JukirHub lagi saat sinyal tersedia.</p>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

// File /assets/ ber-hash tidak pernah berubah isinya → simpanan dulu, jaringan bila belum ada.
async function asetBerhash(req) {
  const cache = await caches.open(CACHE_ASET);
  const tersimpan = await cache.match(req);
  if (tersimpan) return tersimpan;
  const res = await fetch(req);
  if (res.ok) {
    await cache.put(req, res.clone());
    rapikanCache(cache);
  }
  return res;
}

// Ikon & manifest: tampilkan simpanan segera, perbarui dari jaringan di latar.
async function segarkanDiLatar(req) {
  const cache = await caches.open(CACHE_HALAMAN);
  const tersimpan = await cache.match(req);
  const dariJaringan = fetch(req)
    .then(async (res) => { if (res.ok) await cache.put(req, res.clone()); return res; })
    .catch(() => null);
  return tersimpan ?? (await dariJaringan) ?? Response.error();
}

// Aset build lama menumpuk setiap deploy; buang yang tertua bila melebihi batas.
async function rapikanCache(cache) {
  const kunci = await cache.keys();
  for (const req of kunci.slice(0, Math.max(0, kunci.length - MAKS_ENTRI_ASET))) {
    await cache.delete(req);
  }
}
