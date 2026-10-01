// Edge Function /berita (M5): pembungkus Deno untuk proses.js. Dipanggil pg_cron tiap 3 jam (migrasi
// 20261001000005_berita.sql) dengan header x-berita-secret. Rahasia: BERITA_SECRET, GEMINI_API_KEY
// (`npm run berita:setup`, dijalankan pemilik). Opsional: GEMINI_MODEL.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { prosesBerita } from './proses.js';
import { samaAman } from '../telegram/proses.js';
import { MODEL_BAWAAN, SKEMA_BERITA, USER_AGENT, bacaJawabanBerita, promptBerita } from '../_shared/berita.js';
import { pesanBeritaBaru, tombolBerita } from '../_shared/kabar-pemilik.js';
import { kabariPemilik } from '../_shared/telegram.ts';

const SECRET = Deno.env.get('BERITA_SECRET');
const KUNCI_AI = Deno.env.get('GEMINI_API_KEY');
const MODEL_AI = Deno.env.get('GEMINI_MODEL') || MODEL_BAWAAN;

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
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_AI}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KUNCI_AI! },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: sistem }] },
      contents: [{ role: 'user', parts: [{ text: pengguna }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: SKEMA_BERITA, temperature: 0.2, maxOutputTokens: 2048 }
    }),
    signal: AbortSignal.timeout(20_000)
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const hasil = await res.json();
  const teks = (hasil?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('');
  return bacaJawabanBerita(JSON.parse(teks), batch);
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
      .select('id, judul, sumber, relevan, ringkasan, kabupaten, url');
    if (error) throw error;
    return data ?? [];
  }
};

const kabar = {
  beritaBaru: (b: { id: number }) => kabariPemilik(pesanBeritaBaru(b as never), tombolBerita(false, b.id))
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { galat: 'metode tidak diizinkan' });
  if (!SECRET || !samaAman(req.headers.get('x-berita-secret') ?? '', SECRET)) return json(401, { galat: 'tidak diizinkan' });
  try {
    return json(200, await prosesBerita({ ambilFeed, ai: KUNCI_AI ? nilaiDenganGemini : null, db, kabar }));
  } catch (err) {
    console.error('[berita]', err);
    return json(500, { galat: String((err as Error)?.message ?? err) });
  }
});
