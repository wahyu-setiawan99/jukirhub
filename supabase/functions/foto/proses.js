// Alur Edge Function `foto` (foto bukti, hanya untuk pemilik): { perangkat, laporan_id, foto: <base64 JPEG>,
// sumber?: 'kamera'|'galeri', umur_detik?: number }. Sumber yang tidak dikenal diabaikan (bukan alasan menolak).
// Syarat: laporan milik perangkat ini (hash sama dengan `lapor`), dikirim ≤ 30 menit lalu, satu foto per laporan,
// maks. 3 foto per perangkat per 24 jam, ≤ 500 KB. Metadata JPEG dibuang lagi di server, lalu foto diteruskan ke
// Telegram pemilik. File tidak disimpan di JukirHub. JavaScript murni: db & Telegram disuntikkan supaya bisa dites.

import { BATAS_FOTO, bacaPetunjukFoto, buangMetadataJpeg, dariBase64 } from '../_shared/foto.js';
import { keteranganFoto } from '../_shared/kabar-pemilik.js';
import { sha256 } from '../lapor/proses.js';

export const PESAN_FOTO = 'Foto terkirim ke pengelola JukirHub. Terima kasih.';
const tolak = (status, kode, pesan) => ({ status, body: { ok: false, kode, pesan } });

/**
 * @param {{ body: any, garam: { reporter: string }, sekarang?: number, db: {
 *   laporan(id: number): Promise<{ id: number, reporter_key: string, dibuat: string, bobot_manual: number,
 *     ada_jukir: boolean, kendaraan: string, bayar: number, pungli: string[], bintang: number | null, nama: string } | null>,
 *   adaFoto(laporanId: number): Promise<boolean>,
 *   hitungFotoPerangkat(key: string, sejakMenit: number): Promise<number>,
 *   simpanFoto(f: { laporan_id: number, reporter_key: string, terkirim: boolean }): Promise<void>
 * }, tg: { kirimFoto(jpeg: Uint8Array, keteranganHtml: string): Promise<boolean> } }} p
 */
export async function prosesFoto({ body, garam, db, tg, sekarang = Date.now() }) {
  const b = body && typeof body === 'object' ? body : {};
  if (typeof b.perangkat !== 'string' || b.perangkat.length < 8 || b.perangkat.length > 100) {
    return tolak(400, 'perangkat', 'Identitas perangkat tidak valid.');
  }
  if (!Number.isSafeInteger(b.laporan_id) || b.laporan_id <= 0) return tolak(400, 'laporan', 'Laporan tidak valid.');
  if (typeof b.foto !== 'string' || b.foto.length > Math.ceil(BATAS_FOTO.maksByte * 1.4)) {
    return tolak(413, 'ukuran', 'Foto terlalu besar. Coba foto lain.');
  }
  const mentah = dariBase64(b.foto);
  const bersih = mentah && buangMetadataJpeg(mentah);
  if (!bersih) return tolak(400, 'format', 'File harus berupa foto JPEG.');
  if (bersih.length > BATAS_FOTO.maksByte) return tolak(413, 'ukuran', 'Foto terlalu besar. Coba foto lain.');

  const key = await sha256(`${garam.reporter}:${b.perangkat}`);
  const lap = await db.laporan(b.laporan_id);
  if (!lap || lap.reporter_key !== key || sekarang - Date.parse(lap.dibuat) > BATAS_FOTO.menitSetelahLapor * 60_000) {
    return tolak(403, 'bukan_milik',
      `Foto hanya bisa ditambahkan ke laporan Anda sendiri, maks. ${BATAS_FOTO.menitSetelahLapor} menit setelah melapor.`);
  }
  if (await db.adaFoto(lap.id)) return tolak(409, 'sudah_ada', 'Laporan ini sudah punya foto.');
  if (await db.hitungFotoPerangkat(key, 24 * 60) >= BATAS_FOTO.maksPerHari) {
    return tolak(429, 'batas_harian', `Batas ${BATAS_FOTO.maksPerHari} foto per hari sudah tercapai. Laporan Anda tetap tercatat.`);
  }

  const petunjuk = bacaPetunjukFoto(b);
  const terkirim = await tg.kirimFoto(bersih, keteranganFoto({ ...lap, ...petunjuk })).catch(() => false);
  if (!terkirim) return tolak(503, 'telegram', 'Foto belum bisa dikirim. Coba lagi sebentar lagi.');
  await db.simpanFoto({ laporan_id: lap.id, reporter_key: key, terkirim: true });
  return { status: 200, body: { ok: true, pesan: PESAN_FOTO } };
}
