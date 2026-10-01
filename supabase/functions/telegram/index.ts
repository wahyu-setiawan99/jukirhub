// Edge Function /telegram: webhook bot pemilik (pembungkus Deno untuk proses.js).
// Rahasia: TELEGRAM_BOT_TOKEN, TELEGRAM_OWNER_CHAT_ID, TELEGRAM_WEBHOOK_SECRET (scripts/setup-telegram.js).

import { createClient } from 'npm:@supabase/supabase-js@2';
import { prosesTelegram } from './proses.js';
import { CHAT_PEMILIK, panggilTelegram } from '../_shared/telegram.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);
const RAHASIA = Deno.env.get('TELEGRAM_WEBHOOK_SECRET') ?? '';

const db = {
  async ubahStatus(id: number, status: 'aktif' | 'disembunyikan') {
    const { data, error } = await supabase.from('titik_parkir').update({ status }).eq('id', id).select('nama').maybeSingle();
    if (error) throw error;
    return data;
  },
  async ubahStatusKomentar(id: number, status: 'tampil' | 'ditolak') {
    const { data, error } = await supabase.from('komentar').update({ status, alasan: 'pemilik' }).eq('id', id).select('isi').maybeSingle();
    if (error) throw error;
    return data;
  },
  async ubahStatusBerita(id: number, disembunyikan: boolean) {
    const { data, error } = await supabase.from('berita').update({ disembunyikan }).eq('id', id).select('judul').maybeSingle();
    if (error) throw error;
    return data;
  }
};

const tg = {
  jawabTombol: (idCallback: string, teks: string) => panggilTelegram('answerCallbackQuery', { callback_query_id: idCallback, text: teks }),
  ubahPesan: (chatId: number, idPesan: number, teksHtml: string, tombol: unknown) => panggilTelegram('editMessageText', {
    chat_id: chatId, message_id: idPesan, text: teksHtml, parse_mode: 'HTML',
    link_preview_options: { is_disabled: true }, reply_markup: tombol
  }),
  kirim: (chatId: number, teksHtml: string) => panggilTelegram('sendMessage', { chat_id: chatId, text: teksHtml, parse_mode: 'HTML' })
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok');
  let update: unknown = null;
  try {
    update = await req.json();
  } catch {
    return new Response('format', { status: 400 });
  }
  try {
    const hasil = await prosesTelegram({
      update, rahasiaHeader: req.headers.get('x-telegram-bot-api-secret-token'), rahasia: RAHASIA,
      chatPemilik: CHAT_PEMILIK, db, tg
    });
    return new Response(hasil.status === 200 ? 'ok' : 'ditolak', { status: hasil.status });
  } catch (err) {
    console.error('[telegram]', err);
    // 200 supaya Telegram tidak mengulang terus; galat tercatat di log fungsi.
    return new Response('galat', { status: 200 });
  }
});
