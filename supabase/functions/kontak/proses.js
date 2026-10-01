// Alur Edge Function `kontak` (halaman /kontak): validasi → batas per jaringan (hash IP) → teruskan ke Telegram
// pengelola. Isi pesan TIDAK disimpan; database hanya mencatat hash IP & waktu untuk batas (dihapus 30 hari).
// JavaScript murni: db & Telegram disuntikkan supaya bisa dites dengan node:test.

import { BATAS_KONTAK, validasiKontak } from '../_shared/kontak.js';
import { pesanKontak } from '../_shared/kabar-pemilik.js';
import { sha256 } from '../lapor/proses.js';

export const PESAN_TERKIRIM = 'Terima kasih, pesan Anda sudah diterima pengelola JukirHub.';
const tolak = (status, kode, pesan) => ({ status, body: { ok: false, kode, pesan } });

/**
 * @param {{ body: unknown, ip: string | null, garam: { ip: string },
 *   db: { hitung(ipHash: string, sejakMenit: number): Promise<number>, catat(ipHash: string | null): Promise<void> },
 *   tg: { kirim(teksHtml: string): Promise<boolean> } }} p
 */
export async function prosesKontak({ body, ip, garam, db, tg }) {
  const v = validasiKontak(body);
  // Jebakan bot: balasan sukses palsu supaya bot tidak belajar.
  if (!v.ok && v.kode === 'bot') return { status: 200, body: { ok: true, pesan: PESAN_TERKIRIM } };
  if (!v.ok) return tolak(400, v.kode, v.pesan);

  const ipHash = ip ? await sha256(`${garam.ip}:${ip}`) : null;
  if (ipHash) {
    if (await db.hitung(ipHash, 60) >= BATAS_KONTAK.perIpPerJam || await db.hitung(ipHash, 24 * 60) >= BATAS_KONTAK.perIpPerHari) {
      return tolak(429, 'terlalu_sering', 'Terlalu banyak pesan dari jaringan Anda. Coba lagi nanti.');
    }
  }
  const terkirim = await tg.kirim(pesanKontak(v.data)).catch(() => false);
  if (!terkirim) return tolak(503, 'telegram', 'Pesan belum bisa dikirim. Coba lagi sebentar lagi.');
  await db.catat(ipHash);
  return { status: 200, body: { ok: true, pesan: PESAN_TERKIRIM } };
}
