// Webhook bot Telegram pemilik (AGENTS.md bagian 5): tombol "Sembunyikan" / "Tampilkan lagi" pada kabar tempat baru.
// JavaScript murni: database & Telegram disuntikkan supaya bisa dites dengan node:test. Hanya chat pemilik yang
// boleh mengubah status tempat; permintaan tanpa secret webhook yang benar ditolak.

import { barisStatus, bacaTombol, escapeHtml, tombolUntuk } from '../_shared/kabar-pemilik.js';

export function samaAman(a, b) {
  const x = String(a ?? ''), y = String(b ?? '');
  if (!x || x.length !== y.length) return false;
  let beda = 0;
  for (let i = 0; i < x.length; i++) beda |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return beda === 0;
}

/**
 * @param {{ update: any, rahasiaHeader: string | null, rahasia: string, chatPemilik: string,
 *   db: { ubahStatus(id: number, status: 'aktif' | 'disembunyikan'): Promise<{ nama: string } | null> },
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
    const status = tombol.aksi === 'sembunyikan' ? 'disembunyikan' : 'aktif';
    const tempat = await db.ubahStatus(tombol.id, status);
    if (!tempat) {
      await tg.jawabTombol(cb.id, 'Tempat tidak ditemukan.');
      return { status: 200 };
    }
    await tg.jawabTombol(cb.id, status === 'disembunyikan' ? `${tempat.nama} disembunyikan.` : `${tempat.nama} ditampilkan lagi.`);
    const pesan = cb.message;
    if (pesan?.chat?.id != null && pesan.message_id != null) {
      // Teks asli (tanpa baris status lama) + status baru; tombol berganti arah supaya bisa dibatalkan.
      const asli = String(pesan.text ?? '').replace(/\n\n(🙈|✅)[^\n]*$/u, '');
      await tg.ubahPesan(pesan.chat.id, pesan.message_id, escapeHtml(asli) + barisStatus(status), tombolUntuk(status, tombol.id));
    }
    return { status: 200 };
  }

  const msg = update?.message;
  if (msg?.chat?.id != null && pemilik(msg.chat.id) && /^\/start\b/.test(String(msg.text ?? ''))) {
    await tg.kirim(msg.chat.id, 'Terhubung. Kabar tempat parkir baru dari JukirHub akan masuk ke sini, lengkap dengan tombol Sembunyikan.');
  }
  // Pesan lain (termasuk dari orang lain) diabaikan: bot ini hanya untuk pengelola.
  return { status: 200 };
}
