// Alur komentar baru (dipanggil `lapor` di latar setelah komentar tersimpan 'menunggu'):
//   1. Bila ada kunci AI & jatah harian: Gemini menggolongkan komentar (_shared/periksa-komentar.js).
//   2. `layak` → status 'tampil' (alasan 'ai'), pemilik dikabari dengan tombol Sembunyikan.
//      Lainnya / AI gagal → tetap 'menunggu', pemilik dikabari dengan tombol Tampilkan / Tolak (+ catatan AI).
// JavaScript murni: AI, database, dan Telegram disuntikkan supaya bisa dites. Tidak pernah melempar galat.

import { BATAS_AI_KOMENTAR_PER_HARI, tampilOtomatis } from './periksa-komentar.js';
import { pesanKomentarBaru, tombolKomentar } from './kabar-pemilik.js';

/**
 * @param {{ komentar: { id: number, isi: string, namaTempat: string },
 *   ai: null | ((isi: string, namaTempat: string) => Promise<string | null>),
 *   db: { ambilJatahAi(jenis: string, batas: number): Promise<boolean>, tampilkanOtomatis(id: number): Promise<boolean> },
 *   tg: { kirim(teksHtml: string, tombol: unknown): Promise<unknown> } }} p
 * @returns {Promise<{ kategori: string | null, tampil: boolean }>}
 */
export async function moderasiKomentarBaru({ komentar, ai, db, tg }) {
  let kategori = null;
  try {
    if (ai && await db.ambilJatahAi('komentar', BATAS_AI_KOMENTAR_PER_HARI)) kategori = await ai(komentar.isi, komentar.namaTempat);
  } catch (err) {
    console.warn('[komentar] pemeriksaan AI gagal:', err?.message ?? err);
  }
  let tampil = false;
  if (tampilOtomatis(kategori)) {
    try { tampil = await db.tampilkanOtomatis(komentar.id); } catch (err) { console.warn('[komentar] gagal menampilkan:', err?.message ?? err); }
  }
  try {
    await tg.kirim(pesanKomentarBaru(komentar, { kategori, tampil }), tombolKomentar(tampil ? 'tampil' : 'menunggu', komentar.id));
  } catch (err) {
    console.warn('[komentar] kabar pemilik gagal:', err?.message ?? err);
  }
  return { kategori, tampil };
}
