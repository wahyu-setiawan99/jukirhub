// Edge Function /lapor (AGENTS.md 1.2, 6.1): pembungkus Deno untuk proses.js. Hanya di sini ada akses database
// (service_role, otomatis tersedia di environment Edge Function) dan rahasia (REPORTER_SALT, IP_SALT).

import { createClient } from 'npm:@supabase/supabase-js@2';
import { prosesLapor } from './proses.js';
import { diLatar, kabariPemilik } from '../_shared/telegram.ts';
import { pesanKomentarBaru, pesanTempatBaru, tombolKomentar, tombolUntuk } from '../_shared/kabar-pemilik.js';
import { kabupatenDariAlamat, urlKabupatenNominatim } from '../_shared/kabupaten.js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);

const REPORTER_SALT = Deno.env.get('REPORTER_SALT');
const IP_SALT = Deno.env.get('IP_SALT');
const URL_WEB = Deno.env.get('URL_WEB') ?? 'https://jukirhub.vercel.app';
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
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' }
  });
}

// Entri pertama x-forwarded-for bisa diisi client sesukanya: pakai header proxy tepercaya atau entri TERAKHIR.
function ipClient(req: Request): string | null {
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  const bagian = (req.headers.get('x-forwarded-for') ?? '').split(',').map(s => s.trim()).filter(Boolean);
  return bagian.length ? bagian[bagian.length - 1] : req.headers.get('x-real-ip');
}

const menitLalu = (menit: number) => new Date(Date.now() - menit * 60_000).toISOString();

function periksa<T>({ data, error }: { data: T; error: unknown }): T {
  if (error) throw error;
  return data;
}

const db = {
  async hitungLaporan(filter: Record<string, string | number>, sejakMenit: number) {
    let q = supabase.from('laporan').select('id', { count: 'exact', head: true }).gte('dibuat', menitLalu(sejakMenit));
    for (const [k, v] of Object.entries(filter)) q = q.eq(k, v);
    const { count, error } = await q;
    if (error) throw error;
    return count ?? 0;
  },
  async titikDekat(lat: number, lng: number, radiusM: number) {
    return periksa(await supabase.rpc('titik_terdekat', { p_lat: lat, p_lng: lng, p_radius: radiusM })) ?? [];
  },
  async titikDetail(p: { id?: number; osm_ref?: string }) {
    const baris = periksa(await supabase.rpc('titik_detail', { p_id: p.id ?? null, p_osm_ref: p.osm_ref ?? null })) ?? [];
    return baris[0] ?? null;
  },
  async buatTitik(t: { nama: string; osm_ref: string | null; lat: number; lng: number; dibuat_oleh: string }) {
    return periksa(await supabase.rpc('buat_titik', {
      p_nama: t.nama, p_osm_ref: t.osm_ref, p_lat: t.lat, p_lng: t.lng, p_dibuat_oleh: t.dibuat_oleh
    })) as number;
  },
  async riwayatPerangkat(reporterKey: string) {
    return periksa(await supabase.from('laporan').select('lat, lng, akurasi_m, dibuat')
      .eq('reporter_key', reporterKey).gte('dibuat', menitLalu(7 * 24 * 60))
      .order('dibuat', { ascending: false }).limit(50)) ?? [];
  },
  async simpanLaporan(baris: Record<string, unknown>) {
    return (periksa(await supabase.from('laporan').insert(baris).select('id').single()) as { id: number }).id;
  },
  async simpanKomentar(k: { laporan_id: number; titik_id: number; isi: string }) {
    return (periksa(await supabase.from('komentar').insert(k).select('id').single()) as { id: number }).id;
  },
  async laporanTitik(titikId: number, sejakHari: number) {
    return periksa(await supabase.from('laporan')
      .select('ada_jukir, kendaraan, bantu_datang, bantu_pergi, bayar, pungli, bintang, reporter_key, bobot_manual, dibuat')
      .eq('titik_id', titikId).gte('dibuat', menitLalu(sejakHari * 24 * 60)).limit(5000)) ?? [];
  },
  async simpanRingkasan(titikId: number, ringkasan: Record<string, unknown>) {
    periksa(await supabase.from('ringkasan_titik')
      .upsert({ titik_id: titikId, ...ringkasan, diperbarui: new Date().toISOString() }));
  },
  // Koin (migrasi 20261001000003_koin.sql)
  async kotaTitik(titikId: number) {
    const baris = periksa(await supabase.from('titik_parkir').select('kota').eq('id', titikId).maybeSingle()) as { kota: string | null } | null;
    return baris?.kota ?? null;
  },
  async isiKota(titikId: number, kota: string) {
    periksa(await supabase.from('titik_parkir').update({ kota }).eq('id', titikId).is('kota', null));
  },
  async bacaReputasi(reporterKey: string) {
    return periksa(await supabase.from('reputasi_pelapor').select(KOLOM_REPUTASI).eq('reporter_key', reporterKey).maybeSingle());
  },
  async simpanReputasi(baris: Record<string, unknown>) {
    periksa(await supabase.from('reputasi_pelapor').upsert(baris));
  },
  async catatKoinHarian(k: { reporter: string; tanggal: string; kabupaten: string | null; tampil: number; sah: number }) {
    periksa(await supabase.rpc('catat_koin_harian', {
      p_reporter: k.reporter, p_tanggal: k.tanggal, p_kabupaten: k.kabupaten, p_tampil: k.tampil, p_sah: k.sah
    }));
  },
  async catatKoinSahLaporan(laporanId: number, koinSah: number) {
    periksa(await supabase.from('laporan').update({ koin_sah: koinSah }).eq('id', laporanId));
  }
};

const KOLOM_REPUTASI = 'nama_samaran, kabupaten_asal, koin_tampil, koin_sah, laporan_berkoin, seri_hari, seri_terpanjang, ' +
  'tanggal_terakhir, laporan_hari_ini, pembuka_data, tempat_berbeda, maks_satu_tempat, lencana';

// Kabupaten tempat baru dari Nominatim (sekali per tempat, maks. 3 detik; gagal → null, laporan tetap jalan).
const geo = {
  async kabupaten(lat: number, lng: number) {
    try {
      const res = await fetch(urlKabupatenNominatim(lat, lng), {
        headers: { 'User-Agent': `JukirHub/1.0 (+${URL_WEB})`, Accept: 'application/json' },
        signal: AbortSignal.timeout(3_000)
      });
      if (!res.ok) return null;
      return kabupatenDariAlamat((await res.json())?.address);
    } catch {
      return null;
    }
  }
};

// Tempat baru → kabar ke pemilik dengan tombol Sembunyikan (fungsi telegram menangani tombolnya).
const kabar = {
  tempatBaru(t: { id: number; nama: string; sumber: string; lat: number; lng: number }) {
    diLatar(kabariPemilik(pesanTempatBaru(t, URL_WEB), tombolUntuk('aktif', t.id)));
  },
  komentarBaru(k: { id: number; isi: string; namaTempat: string }) {
    diLatar(kabariPemilik(pesanKomentarBaru(k), tombolKomentar('menunggu', k.id)));
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return balas(req, 405, { ok: false, kode: 'metode', pesan: 'Gunakan POST.' });
  if (!REPORTER_SALT || !IP_SALT) {
    console.error('[lapor] REPORTER_SALT / IP_SALT belum di-set');
    return balas(req, 500, { ok: false, kode: 'konfigurasi', pesan: 'Layanan sedang bermasalah. Coba lagi nanti.' });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return balas(req, 400, { ok: false, kode: 'format', pesan: 'Format laporan tidak valid.' });
  }
  try {
    const hasil = await prosesLapor({ body, ip: ipClient(req), garam: { reporter: REPORTER_SALT, ip: IP_SALT }, db, kabar, geo });
    return balas(req, hasil.status, hasil.body);
  } catch (err) {
    console.error('[lapor]', err);
    return balas(req, 500, { ok: false, kode: 'server', pesan: 'Layanan sedang bermasalah. Coba lagi nanti.' });
  }
});
