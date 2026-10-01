// Edge Function /foto (foto bukti untuk pemilik): pembungkus Deno untuk proses.js. Database lewat service_role,
// foto diteruskan ke Telegram pemilik (sendPhoto) tanpa disimpan.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { prosesFoto } from './proses.js';
import { kirimFotoPemilik } from '../_shared/telegram.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);
const REPORTER_SALT = Deno.env.get('REPORTER_SALT');
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

function periksa<T>({ data, error }: { data: T; error: unknown }): T {
  if (error) throw error;
  return data;
}

const db = {
  async laporan(id: number) {
    const l = periksa(await supabase.from('laporan')
      .select('id, reporter_key, dibuat, bobot_manual, ada_jukir, kendaraan, bayar, pungli, bintang, titik_parkir(nama)')
      .eq('id', id).maybeSingle()) as Record<string, unknown> | null;
    if (!l) return null;
    return { ...l, nama: (l.titik_parkir as { nama?: string } | null)?.nama ?? 'Tempat' } as never;
  },
  async adaFoto(laporanId: number) {
    const { count, error } = await supabase.from('foto_laporan').select('id', { count: 'exact', head: true }).eq('laporan_id', laporanId);
    if (error) throw error;
    return (count ?? 0) > 0;
  },
  async hitungFotoPerangkat(key: string, sejakMenit: number) {
    const { count, error } = await supabase.from('foto_laporan').select('id', { count: 'exact', head: true })
      .eq('reporter_key', key).gte('dibuat', new Date(Date.now() - sejakMenit * 60_000).toISOString());
    if (error) throw error;
    return count ?? 0;
  },
  async simpanFoto(f: { laporan_id: number; reporter_key: string; terkirim: boolean }) {
    periksa(await supabase.from('foto_laporan').insert(f));
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return balas(req, 405, { ok: false, kode: 'metode', pesan: 'Gunakan POST.' });
  if (!REPORTER_SALT) return balas(req, 500, { ok: false, kode: 'konfigurasi', pesan: 'Layanan sedang bermasalah. Coba lagi nanti.' });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return balas(req, 400, { ok: false, kode: 'format', pesan: 'Format permintaan tidak valid.' });
  }
  try {
    const hasil = await prosesFoto({ body, garam: { reporter: REPORTER_SALT }, db, tg: { kirimFoto: kirimFotoPemilik } });
    return balas(req, hasil.status, hasil.body);
  } catch (err) {
    console.error('[foto]', err);
    return balas(req, 500, { ok: false, kode: 'server', pesan: 'Layanan sedang bermasalah. Coba lagi nanti.' });
  }
});
