// Edge Function /aduan: pembungkus Deno untuk proses.js (tombol "Laporkan komentar").

import { createClient } from 'npm:@supabase/supabase-js@2';
import { prosesAduan } from './proses.js';
import { diLatar, kabariPemilik } from '../_shared/telegram.ts';
import { pesanKomentarDiadukan, tombolKomentar } from '../_shared/kabar-pemilik.js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);
const REPORTER_SALT = Deno.env.get('REPORTER_SALT');
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

const balas = (req: Request, status: number, body: unknown) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' }
});

// Entri pertama x-forwarded-for bisa diisi client sesukanya: pakai header proxy tepercaya atau entri TERAKHIR.
function ipClient(req: Request): string | null {
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  const bagian = (req.headers.get('x-forwarded-for') ?? '').split(',').map(s => s.trim()).filter(Boolean);
  return bagian.length ? bagian[bagian.length - 1] : req.headers.get('x-real-ip');
}

function periksa<T>({ data, error }: { data: T; error: unknown }): T {
  if (error) throw error;
  return data;
}

const db = {
  async hitungAduanIp(ipHash: string, sejakMenit: number) {
    const { count, error } = await supabase.from('aduan_komentar').select('komentar_id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash).gte('dibuat', new Date(Date.now() - sejakMenit * 60_000).toISOString());
    if (error) throw error;
    return count ?? 0;
  },
  async komentarTampil(id: number) {
    const k = periksa(await supabase.from('komentar').select('id, isi, titik_parkir(nama)')
      .eq('id', id).eq('status', 'tampil').maybeSingle()) as { id: number; isi: string; titik_parkir: { nama: string } | null } | null;
    return k ? { id: k.id, isi: k.isi, namaTempat: k.titik_parkir?.nama ?? '' } : null;
  },
  async simpanAduan(a: { komentar_id: number; reporter_key: string; ip_hash: string | null }) {
    periksa(await supabase.from('aduan_komentar').upsert(a, { onConflict: 'komentar_id,reporter_key', ignoreDuplicates: true }));
  },
  async jumlahAduan(komentarId: number) {
    const { count, error } = await supabase.from('aduan_komentar').select('komentar_id', { count: 'exact', head: true })
      .eq('komentar_id', komentarId);
    if (error) throw error;
    return count ?? 0;
  },
  async sembunyikanKomentar(id: number) {
    periksa(await supabase.from('komentar').update({ status: 'disembunyikan', alasan: 'aduan' }).eq('id', id));
  }
};

const kabar = {
  komentarDiadukan(k: { id: number; isi: string; namaTempat: string; jumlah: number }) {
    diLatar(kabariPemilik(pesanKomentarDiadukan(k), tombolKomentar('disembunyikan', k.id)));
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return balas(req, 405, { ok: false, kode: 'metode', pesan: 'Gunakan POST.' });
  if (!REPORTER_SALT || !IP_SALT) return balas(req, 500, { ok: false, kode: 'konfigurasi', pesan: 'Layanan sedang bermasalah.' });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return balas(req, 400, { ok: false, kode: 'format', pesan: 'Format tidak valid.' });
  }
  try {
    const h = await prosesAduan({ body, ip: ipClient(req), garam: { reporter: REPORTER_SALT, ip: IP_SALT }, db, kabar });
    return balas(req, h.status, h.body);
  } catch (err) {
    console.error('[aduan]', err);
    return balas(req, 500, { ok: false, kode: 'server', pesan: 'Layanan sedang bermasalah. Coba lagi nanti.' });
  }
});
