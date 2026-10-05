// Edge Function /tarif (AGENTS.md 1.8 C): pembungkus Deno untuk proses.js. Dipanggil pg_cron tiap hari (migrasi
// 20261005000001_tarif_ai.sql) dengan header x-berita-secret; memakai GEMINI_API_KEY yang sama dengan berita.
// Opsional: GEMINI_MODEL_TARIF (bawaan gemini-2.5-flash-lite, satu-satunya yang punya pencarian Google gratis).

import { createClient } from 'npm:@supabase/supabase-js@2';
import { prosesTarif } from './proses.js';
import { samaAman } from '../telegram/proses.js';
import { KUNCI_GEMINI, panggilGeminiCari } from '../_shared/gemini.ts';
import { kabariPemilik } from '../_shared/telegram.ts';
import { bacaTarifKota } from '../_shared/tarif-db.ts';

const SECRET = Deno.env.get('BERITA_SECRET');
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false }
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function periksa<T>({ data, error }: { data: T; error: unknown }): T {
  if (error) throw error;
  return data;
}

const db = {
  async waktuCek() {
    const baris = periksa(await supabase.from('cek_tarif').select('kota, terakhir, hasil')) as
      Array<{ kota: string; terakhir: string; hasil: string }> | null;
    return new Map((baris ?? []).map(b => [b.kota, { terakhir: b.terakhir, hasil: b.hasil }]));
  },
  async catatCek(kota: string, hasil: string) {
    periksa(await supabase.from('cek_tarif').upsert({ kota, terakhir: new Date().toISOString(), hasil }));
  },
  async ambilJatahAi(jenis: string, batas: number) {
    return Boolean(periksa(await supabase.rpc('ambil_jatah_ai_jenis', { p_jenis: jenis, p_batas: batas })));
  },
  tarifSekarang: (kota: string) => bacaTarifKota(supabase, kota),
  async simpanUsulan(u: Record<string, unknown>) {
    const baris = periksa(await supabase.from('usulan_tarif').insert({
      kota: u.kota, motor: u.motor, mobil: u.mobil, dasar_hukum: u.dasar_hukum, sumber_url: u.sumber_url,
      kutipan: u.kutipan, berlaku_sejak: u.berlaku_sejak, catatan: u.catatan
    }).select('id').single()) as { id: number };
    return baris.id;
  }
};

const tg = { kirim: (teks: string, tombol: unknown) => kabariPemilik(teks, tombol) };

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { galat: 'metode tidak diizinkan' });
  if (!SECRET || !samaAman(req.headers.get('x-berita-secret') ?? '', SECRET)) return json(401, { galat: 'tidak diizinkan' });
  // Opsional untuk uji pemilik: { "kota": ["Makassar"] } mengecek kab/kota tertentu sekarang juga.
  const body = await req.json().catch(() => ({}));
  const kota = Array.isArray(body?.kota) ? body.kota.filter((k: unknown) => typeof k === 'string').slice(0, 5) : null;
  try {
    const hasil = await prosesTarif({ ai: KUNCI_GEMINI ? panggilGeminiCari : null, db, tg, kota });
    return json(200, hasil);
  } catch (err) {
    console.error('[tarif]', err);
    return json(500, { galat: String((err as Error)?.message ?? err) });
  }
});
