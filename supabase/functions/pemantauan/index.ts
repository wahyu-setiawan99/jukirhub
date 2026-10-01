// Edge Function /pemantauan: ringkasan harian ke Telegram pemilik (21.00 WITA, pg_cron; migrasi
// 20261001000008_pemantauan_ai.sql). Memakai secret jadwal yang sama dengan fungsi berita (header x-berita-secret,
// Vault `berita_secret`), jadi tidak perlu pemasangan rahasia baru.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { samaAman } from '../telegram/proses.js';
import { pesanRingkasanHarian } from '../_shared/pemantauan.js';
import { escapeHtml } from '../_shared/kabar-pemilik.js';
import { kabariPemilik } from '../_shared/telegram.ts';

const SECRET = Deno.env.get('BERITA_SECRET');
const URL_WEB = Deno.env.get('URL_WEB') ?? 'https://jukirhub.site';
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false }
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { galat: 'metode tidak diizinkan' });
  if (!SECRET || !samaAman(req.headers.get('x-berita-secret') ?? '', SECRET)) return json(401, { galat: 'tidak diizinkan' });
  try {
    const { data, error } = await supabase.rpc('ringkasan_pemantauan', { p_jam: 24 });
    if (error) throw error;
    const tanggal = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Makassar' }).format(new Date());
    const { teks, sehat } = pesanRingkasanHarian(data ?? {}, { tanggal, urlWeb: URL_WEB });
    await kabariPemilik(teks);
    return json(200, { ok: true, sehat });
  } catch (err) {
    console.error('[pemantauan]', err);
    // Gagal membaca ringkasan pun dikabarkan, supaya pemilik tahu pemantauannya sendiri bermasalah.
    await kabariPemilik(`🚨 <b>Ringkasan JukirHub gagal dibuat</b>\n${escapeHtml(String((err as Error)?.message ?? err).slice(0, 200))}`);
    return json(500, { galat: String((err as Error)?.message ?? err) });
  }
});
