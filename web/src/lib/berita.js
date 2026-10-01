// Data berita parkir (view berita_publik) diambil SEKALI per kunjungan dan dipakai bersama kartu Beranda & halaman
// /berita. Di /berita, unduhan dimulai sebelum React & bagian halaman selesai dimuat (main.jsx), karena daftar berita
// adalah isi utama (LCP) halaman itu — Lighthouse live 1 Okt 2026: LCP 3,4 s. Gagal → boleh dicoba lagi.

import { KONFIGURASI } from '../state.jsx';
import { KOLOM_BERITA, ambilView } from './data.js';

let janji = null;

export function muatBerita() {
  if (!KONFIGURASI) return Promise.resolve([]);
  janji ??= ambilView(fetch, KONFIGURASI, 'berita_publik', KOLOM_BERITA).catch((err) => {
    janji = null;
    throw err;
  });
  return janji;
}
