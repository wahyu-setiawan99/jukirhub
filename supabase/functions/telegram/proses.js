// Webhook bot Telegram pemilik (AGENTS.md bagian 5 & 1.3.1): tombol pada kabar tempat baru (Sembunyikan / Tampilkan
// lagi), komentar (Tampilkan / Tolak), dan usulan tarif resmi dari AI (Pakai / Abaikan, _shared/tarif.js). JavaScript murni: database & Telegram disuntikkan supaya bisa dites dengan
// node:test. Hanya chat pemilik yang boleh mengubah status; permintaan tanpa secret webhook yang benar ditolak.

import {
  barisStatus, barisStatusKomentar, bacaTombol, escapeHtml, tombolKomentar, tombolUntuk
} from '../_shared/kabar-pemilik.js';
import { barisStatusTarif, tombolTarif } from '../_shared/tarif.js';

export function samaAman(a, b) {
  const x = String(a ?? ''), y = String(b ?? '');
  if (!x || x.length !== y.length) return false;
  let beda = 0;
  for (let i = 0; i < x.length; i++) beda |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return beda === 0;
}

// Teks asli pesan tanpa baris status lama (supaya status tidak menumpuk saat tombol ditekan berulang).
const tanpaStatus = (teks) => String(teks ?? '').replace(/\n\n(🙈|✅|🚫)[^\n]*$/u, '');

/**
 * @param {{ update: any, rahasiaHeader: string | null, rahasia: string, chatPemilik: string,
 *   db: { ubahStatus(id: number, status: 'aktif' | 'disembunyikan'): Promise<{ nama: string } | null>,
 *     ubahStatusKomentar(id: number, status: 'tampil' | 'ditolak'): Promise<{ isi: string } | null>,
 *     putuskanTarif?(id: number, pakai: boolean): Promise<{ kota: string } | null>,
 *     hitungUlangKota?(kota: string): Promise<number> },
 *   tg: { jawabTombol(idCallback: string, teks: string): Promise<unknown>,
 *     ubahPesan(chatId: number, idPesan: number, teksHtml: string, tombol: unknown): Promise<unknown>,
 *     kirim(chatId: number, teksHtml: string): Promise<unknown> } }} p
 * @returns {Promise<{ status: number }>}
 */
export async function prosesTelegram({ update, rahasiaHeader, rahasia, chatPemilik, db, tg }) {
  if (!rahasia || !samaAman(rahasiaHeader, rahasia)) return { status: 401 };
  const pemilik = (id) => chatPemilik && String(id) === String(chatPemilik);

  const cb = update?.callback_query;
  if (cb) {
    if (!pemilik(cb.from?.id)) {
      await tg.jawabTombol(cb.id, 'Tombol ini hanya untuk pengelola JukirHub.');
      return { status: 200 };
    }
    const tombol = bacaTombol(cb.data);
    if (!tombol) {
      await tg.jawabTombol(cb.id, 'Tombol tidak dikenali.');
      return { status: 200 };
    }
    const pesan = cb.message;
    const ubahPesan = (teksStatus, markup) => (pesan?.chat?.id != null && pesan.message_id != null
      ? tg.ubahPesan(pesan.chat.id, pesan.message_id, escapeHtml(tanpaStatus(pesan.text)) + teksStatus, markup)
      : null);

    if (tombol.jenis === 'tarif') {
      const pakai = tombol.aksi === 'pakai';
      const hasil = await db.putuskanTarif?.(tombol.id, pakai);
      if (!hasil) {
        await tg.jawabTombol(cb.id, 'Usulan tidak ditemukan.');
        return { status: 200 };
      }
      // Tarif baru → ringkasan (indikasi kemahalan) tempat-tempat di kota itu dihitung ulang. Gagal tidak membatalkan.
      let dihitung = 0;
      if (pakai) {
        try { dihitung = (await db.hitungUlangKota?.(hasil.kota)) ?? 0; } catch (err) { console.warn('[tarif] hitung ulang:', err?.message ?? err); }
      }
      await tg.jawabTombol(cb.id, pakai ? `Tarif ${hasil.kota} dipakai (${dihitung} tempat dihitung ulang).` : 'Usulan diabaikan.');
      await ubahPesan(barisStatusTarif(pakai), tombolTarif(pakai ? 'dipakai' : 'diabaikan', tombol.id));
      return { status: 200 };
    }

    if (tombol.jenis === 'komentar') {
      const status = tombol.aksi === 'tampilkan' ? 'tampil' : 'ditolak';
      const komentar = await db.ubahStatusKomentar(tombol.id, status);
      if (!komentar) {
        await tg.jawabTombol(cb.id, 'Komentar tidak ditemukan.');
        return { status: 200 };
      }
      await tg.jawabTombol(cb.id, status === 'tampil' ? 'Komentar ditampilkan.' : 'Komentar tidak ditampilkan.');
      await ubahPesan(barisStatusKomentar(status), tombolKomentar(status, tombol.id));
      return { status: 200 };
    }

    const status = tombol.aksi === 'sembunyikan' ? 'disembunyikan' : 'aktif';
    const tempat = await db.ubahStatus(tombol.id, status);
    if (!tempat) {
      await tg.jawabTombol(cb.id, 'Tempat tidak ditemukan.');
      return { status: 200 };
    }
    await tg.jawabTombol(cb.id, status === 'disembunyikan' ? `${tempat.nama} disembunyikan.` : `${tempat.nama} ditampilkan lagi.`);
    await ubahPesan(barisStatus(status), tombolUntuk(status, tombol.id));
    return { status: 200 };
  }

  const msg = update?.message;
  if (msg?.chat?.id != null && pemilik(msg.chat.id) && /^\/start\b/.test(String(msg.text ?? ''))) {
    await tg.kirim(msg.chat.id, 'Terhubung. Kabar tempat parkir baru dan komentar warga dari JukirHub akan masuk ke sini.');
  }
  // Pesan lain (termasuk dari orang lain) diabaikan: bot ini hanya untuk pengelola.
  return { status: 200 };
}
