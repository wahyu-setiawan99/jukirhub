// Foto bukti opsional setelah lapor (hanya untuk pengelola, lewat Telegram). Foto dikecilkan di HP lewat kanvas
// (sisi terpanjang 1280 px, JPEG ±70%): hemat kuota, dan kanvas tidak menyalin EXIF (lokasi GPS, kamera) ke file
// baru. Server membuangnya lagi. Pola lib/foto.js Adami.

import { BATAS_FOTO, bacaFotoTertunda, hapusFotoTertunda, tulisFotoTertunda, umurFileDetik } from '@shared/foto.js';
import { ACARA_FOTO_TERTUNDA } from './foto-kunci.js';
import { KONFIGURASI } from '../state.jsx';
import { kunciPerangkat, panggilFungsi } from './fungsi.js';

async function gambarDari(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch { /* format tidak didukung → coba <img> */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const keBlob = (kanvas, kualitas) => new Promise(ok => kanvas.toBlob(ok, 'image/jpeg', kualitas));

function keBase64(blob) {
  return new Promise((ok, gagal) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).replace(/^data:[^,]*,/, ''));
    r.onerror = () => gagal(r.error);
    r.readAsDataURL(blob);
  });
}

// File dari <input type="file"> → base64 JPEG ≤ BATAS_FOTO.maksByte, atau null bila bukan gambar yang bisa dibaca.
export async function kecilkanFoto(file) {
  let gambar;
  try {
    gambar = await gambarDari(file);
  } catch {
    return null;
  }
  const lebarAsli = gambar.width, tinggiAsli = gambar.height;
  if (!lebarAsli || !tinggiAsli) return null;
  // Percobaan makin kecil bila foto yang sangat rinci masih melebihi batas ukuran.
  for (const [sisi, kualitas] of [[BATAS_FOTO.sisiMaks, BATAS_FOTO.kualitas], [1024, 0.6], [800, 0.5]]) {
    const skala = Math.min(1, sisi / Math.max(lebarAsli, tinggiAsli));
    const kanvas = document.createElement('canvas');
    kanvas.width = Math.round(lebarAsli * skala);
    kanvas.height = Math.round(tinggiAsli * skala);
    kanvas.getContext('2d').drawImage(gambar, 0, 0, kanvas.width, kanvas.height);
    const blob = await keBlob(kanvas, kualitas);
    if (blob && blob.size <= BATAS_FOTO.maksByte) {
      gambar.close?.();
      return keBase64(blob);
    }
  }
  gambar.close?.();
  return null;
}

export const umurDariFile = (file, sekarang = Date.now()) => umurFileDetik(file?.lastModified, sekarang);

const kabariFoto = () => { try { window.dispatchEvent(new Event(ACARA_FOTO_TERTUNDA)); } catch { /* tanpa window */ } };

export function simpanFotoTertunda(laporanId, waktu = Date.now()) {
  const ok = tulisFotoTertunda(sessionStorage, laporanId, waktu);
  if (ok) kabariFoto();
  return ok;
}

export function lupakanFotoTertunda() {
  hapusFotoTertunda(sessionStorage);
  kabariFoto();
}

export const fotoTertundaSekarang = (sekarang = Date.now()) => bacaFotoTertunda(sessionStorage, sekarang);

export function pantauFotoTertunda(fn) {
  const segar = () => fn(fotoTertundaSekarang());
  window.addEventListener(ACARA_FOTO_TERTUNDA, segar);
  document.addEventListener('visibilitychange', segar);
  return () => {
    window.removeEventListener(ACARA_FOTO_TERTUNDA, segar);
    document.removeEventListener('visibilitychange', segar);
  };
}

// `sumber` dan `umurDetik` hanya petunjuk untuk keterangan Telegram. Nilai lain tidak dikirim.
export function unggahFoto(laporanId, fotoBase64, { sumber, umurDetik } = {}) {
  const body = { perangkat: kunciPerangkat(), laporan_id: laporanId, foto: fotoBase64 };
  if (sumber === 'kamera' || sumber === 'galeri') body.sumber = sumber;
  if (umurDetik != null) body.umur_detik = umurDetik;
  return panggilFungsi(fetch, KONFIGURASI, 'foto', body);
}
