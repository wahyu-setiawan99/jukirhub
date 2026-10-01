// Edge Function /kontak (halaman /kontak): pembungkus Deno untuk proses.js. Pesan diteruskan ke Telegram pengelola;
// database hanya mencatat hash IP & waktu (tabel pesan_kontak) untuk batas kirim.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { prosesKontak } from './proses.js';
import { CHAT_PEMILIK, panggilTelegram } from '../_shared/telegram.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);
const IP_SALT = Deno.env.get('IP_SALT');
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '*').split(',').map(s => s.trim()).filter(Boolean);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const izin = ALLOWED_ORIGINS.includes('*') ? '*' : (ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  return {
    'Access-Control-Allow-Origin': izin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin'
  };
}

function balas(req: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } });
}

// Entri pertama x-forwarded-for bisa diisi client sesukanya: pakai header proxy tepercaya atau entri TERAKHIR.
function ipClient(req: Request): string | null {
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  const bagian = (req.headers.get('x-forwarded-for') ?? '').split(',').map(s => s.trim()).filter(Boolean);
  return bagian.length ? bagian[bagian.length - 1] : req.headers.get('x-real-ip');
}

const db = {
  async hitung(ipHash: string, sejakMenit: number) {
    const { count, error } = await supabase.from('pesan_kontak').select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash).gte('dibuat', new Date(Date.now() - sejakMenit * 60_000).toISOString());
    if (error) throw error;
    return count ?? 0;
  },
  async catat(ipHash: string | null) {
    const { error } = await supabase.from('pesan_kontak').insert({ ip_hash: ipHash });
    if (error) throw error;
  }
};

const tg = {
  async kirim(teksHtml: string) {
    if (!CHAT_PEMILIK) return false;
    const hasil = await panggilTelegram('sendMessage', {
      chat_id: CHAT_PEMILIK, text: teksHtml, parse_mode: 'HTML', link_preview_options: { is_disabled: true }
    });
    return Boolean(hasil?.ok);
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return balas(req, 405, { ok: false, kode: 'metode', pesan: 'Gunakan POST.' });
  if (!IP_SALT) return balas(req, 500, { ok: false, kode: 'konfigurasi', pesan: 'Layanan sedang bermasalah. Coba lagi nanti.' });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return balas(req, 400, { ok: false, kode: 'format', pesan: 'Format permintaan tidak valid.' });
  }
  try {
    const hasil = await prosesKontak({ body, ip: ipClient(req), garam: { ip: IP_SALT }, db, tg });
    return balas(req, hasil.status, hasil.body);
  } catch (err) {
    console.error('[kontak]', err);
    return balas(req, 500, { ok: false, kode: 'server', pesan: 'Layanan sedang bermasalah. Coba lagi nanti.' });
  }
});
