// Edge Function /berita (M5): pembungkus Deno untuk proses.js. Dipanggil pg_cron tiap 3 jam (migrasi
// 20261001000005_berita.sql) dengan header x-berita-secret. Rahasia: BERITA_SECRET, GEMINI_API_KEY
// (`npm run berita:setup`, dijalankan pemilik). Opsional: GEMINI_MODEL. Panggilan Gemini: _shared/gemini.ts.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { prosesBerita } from './proses.js';
import { samaAman } from '../telegram/proses.js';
import { SKEMA_BERITA, USER_AGENT, bacaJawabanBerita, promptBerita } from '../_shared/berita.js';
import { KUNCI_GEMINI, panggilGemini } from '../_shared/gemini.ts';

const SECRET = Deno.env.get('BERITA_SECRET');

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function ambilFeed(url: string) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/xml, text/xml' },
    signal: AbortSignal.timeout(10_000)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function nilaiDenganGemini(batch: Array<Record<string, string>>) {
  const { sistem, pengguna } = promptBerita(batch);
  return bacaJawabanBerita(await panggilGemini({ sistem, pengguna, skema: SKEMA_BERITA }), batch);
}

const db = {
  async sudahAda(urls: string[]) {
    const ada = new Set<string>();
    for (let i = 0; i < urls.length; i += 50) {
      const { data, error } = await supabase.from('berita').select('url').in('url', urls.slice(i, i + 50));
      if (error) throw error;
      for (const r of data ?? []) ada.add(r.url);
    }
    return ada;
  },
  async ambilJatahAi(batas: number) {
    const { data, error } = await supabase.rpc('ambil_jatah_ai', { p_batas: batas });
    if (error) throw error;
    return Boolean(data);
  },
  async simpan(baris: Array<Record<string, unknown>>) {
    const { data, error } = await supabase.from('berita').upsert(baris, { onConflict: 'url', ignoreDuplicates: true })
      .select('id, judul, sumber, relevan, ringkasan, kabupaten, provinsi, url');
    if (error) throw error;
    return data ?? [];
  }
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { galat: 'metode tidak diizinkan' });
  if (!SECRET || !samaAman(req.headers.get('x-berita-secret') ?? '', SECRET)) return json(401, { galat: 'tidak diizinkan' });
  try {
    return json(200, await prosesBerita({ ambilFeed, ai: KUNCI_GEMINI ? nilaiDenganGemini : null, db }));
  } catch (err) {
    console.error('[berita]', err);
    return json(500, { galat: String((err as Error)?.message ?? err) });
  }
});
