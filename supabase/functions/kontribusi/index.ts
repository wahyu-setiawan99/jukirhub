// Edge Function /kontribusi (tab Saya): pembungkus Deno untuk proses.js. Hanya di sini ada akses database
// (service_role) dan REPORTER_SALT. Publik tanpa JWT seperti `lapor` (verify_jwt = false di config.toml).

import { createClient } from 'npm:@supabase/supabase-js@2';
import { prosesKontribusi } from './proses.js';

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

const KOLOM = 'nama_samaran, putaran_nama, kabupaten_asal, tampil_di_peringkat, koin_tampil, laporan_berkoin, seri_hari, ' +
  'seri_terpanjang, tanggal_terakhir, pembuka_data, tempat_berbeda, maks_satu_tempat, lencana';

const db = {
  async bacaReputasi(key: string) {
    return periksa(await supabase.from('reputasi_pelapor').select(KOLOM).eq('reporter_key', key).maybeSingle());
  },
  async ubahReputasi(key: string, ubah: Record<string, unknown>) {
    periksa(await supabase.from('reputasi_pelapor').update({ ...ubah, diperbarui: new Date().toISOString() }).eq('reporter_key', key));
  },
  async koinSaya(key: string, hari: number) {
    return periksa(await supabase.rpc('koin_saya', { p_reporter: key, p_hari: hari })) ?? [];
  },
  async peringkat(kabupaten: string | null, hari: number, batas: number) {
    return periksa(await supabase.rpc('peringkat_pelapor', { p_kabupaten: kabupaten, p_hari: hari, p_batas: batas })) ?? [];
  },
  async posisi(key: string, kabupaten: string | null, nilai: number, hari: number) {
    return periksa(await supabase.rpc('posisi_peringkat', { p_reporter: key, p_kabupaten: kabupaten, p_nilai: nilai, p_hari: hari }));
  },
  // Tanpa bobot / tanda GPS palsu / koordinat: pelapor yang dicurigai tidak boleh tahu.
  async laporanTerakhir(key: string, batas: number) {
    const baris = periksa(await supabase.from('laporan')
      .select('titik_id, ada_jukir, kendaraan, bayar, bintang, dibuat, titik_parkir(nama)')
      .eq('reporter_key', key).order('dibuat', { ascending: false }).limit(batas)) ?? [];
    return (baris as Array<Record<string, unknown>>).map(l => ({
      titik_id: l.titik_id,
      nama: (l.titik_parkir as { nama?: string } | null)?.nama ?? null,
      ada_jukir: l.ada_jukir,
      kendaraan: l.kendaraan,
      bayar: l.bayar,
      bintang: l.bintang,
      waktu: l.dibuat
    }));
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
    const hasil = await prosesKontribusi({ body, garam: { reporter: REPORTER_SALT }, db });
    return balas(req, hasil.status, hasil.body);
  } catch (err) {
    console.error('[kontribusi]', err);
    return balas(req, 500, { ok: false, kode: 'server', pesan: 'Layanan sedang bermasalah. Coba lagi nanti.' });
  }
});
