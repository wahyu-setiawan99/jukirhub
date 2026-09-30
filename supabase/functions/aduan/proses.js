// Edge Function `aduan` (AGENTS.md 1.3.1): tombol "Laporkan komentar". Aduan dari BATAS.aduanSembunyikan perangkat
// berbeda → komentar disembunyikan otomatis dan pemilik dikabari (bisa ditampilkan lagi lewat Telegram).
// JavaScript murni: database disuntikkan supaya bisa dites dengan node:test. Balasan selalu sama (tidak membocorkan
// jumlah aduan atau status komentar).

import { BATAS } from '../_shared/konstanta.js';
import { sha256 } from '../lapor/proses.js';

export const PESAN_ADUAN = 'Terima kasih, aduan Anda dicatat.';
const balasan = (status, body) => ({ status, body });
const ok = () => balasan(200, { ok: true, pesan: PESAN_ADUAN });

/**
 * @param {{ body: any, ip: string | null, garam: { reporter: string, ip: string }, db: {
 *   hitungAduanIp(ipHash: string, sejakMenit: number): Promise<number>,
 *   komentarTampil(id: number): Promise<{ id: number, isi: string, namaTempat: string } | null>,
 *   simpanAduan(a: { komentar_id: number, reporter_key: string, ip_hash: string | null }): Promise<void>,
 *   jumlahAduan(komentarId: number): Promise<number>,
 *   sembunyikanKomentar(id: number): Promise<void>
 * }, kabar?: { komentarDiadukan(k: { id: number, isi: string, namaTempat: string, jumlah: number }): void } }} p
 */
export async function prosesAduan({ body, ip, garam, db, kabar }) {
  const id = body?.komentar_id;
  if (!Number.isInteger(id) || id <= 0) return balasan(400, { ok: false, kode: 'komentar', pesan: 'Komentar tidak valid.' });
  if (typeof body?.perangkat !== 'string' || body.perangkat.length < 8 || body.perangkat.length > 100) {
    return balasan(400, { ok: false, kode: 'perangkat', pesan: 'Identitas perangkat tidak valid.' });
  }
  const ipHash = ip ? await sha256(`${garam.ip}:${ip}`) : null;
  if (ipHash && await db.hitungAduanIp(ipHash, 60) >= BATAS.aduanPerIpPerJam) {
    return balasan(429, { ok: false, kode: 'terlalu_sering', pesan: 'Terlalu banyak aduan dari jaringan Anda. Coba lagi nanti.' });
  }
  const komentar = await db.komentarTampil(id);
  if (!komentar) return ok();   // sudah disembunyikan / tidak ada: balasan tetap sama
  const reporterKey = await sha256(`${garam.reporter}:${body.perangkat}`);
  await db.simpanAduan({ komentar_id: id, reporter_key: reporterKey, ip_hash: ipHash });   // satu perangkat = satu aduan
  const jumlah = await db.jumlahAduan(id);
  if (jumlah >= BATAS.aduanSembunyikan) {
    await db.sembunyikanKomentar(id);
    try { kabar?.komentarDiadukan({ ...komentar, jumlah }); } catch { /* abaikan */ }
  }
  return ok();
}
