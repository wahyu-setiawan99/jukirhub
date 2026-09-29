// Membaca view publik Supabase lewat REST (PostgREST) dengan fetch biasa: web hanya MEMBACA view *_publik,
// semua tulis lewat Edge Function (AGENTS.md bagian 4), jadi library supabase-js tidak diperlukan.
// Tanpa React/DOM; `fetch` & konfigurasi diberikan pemanggil supaya bisa dites dengan node:test.

const BATAS_TUNGGU_MS = 10_000;

// { url, kunci } dari env Vite. Kosong → app tetap jalan tanpa data (mis. sebelum env Vercel diisi).
export function konfigurasiData(env) {
  const url = String(env?.VITE_SUPABASE_URL ?? '').replace(/\/+$/, '');
  const kunci = String(env?.VITE_SUPABASE_ANON_KEY ?? '');
  return /^https?:\/\//.test(url) && kunci ? { url, kunci } : null;
}

export function urlView(konfigurasi, view, kolom) {
  return `${konfigurasi.url}/rest/v1/${view}?select=${encodeURIComponent(kolom)}`;
}

export async function ambilView(fetchFn, konfigurasi, view, kolom) {
  const res = await fetchFn(urlView(konfigurasi, view, kolom), {
    // Kunci anon/publishable cukup di header apikey (juga untuk format kunci baru sb_publishable_…).
    headers: { apikey: konfigurasi.kunci, Accept: 'application/json' },
    signal: AbortSignal.timeout(BATAS_TUNGGU_MS)
  });
  if (!res.ok) throw new Error(`${view}: HTTP ${res.status}`);
  return res.json();
}

export const KOLOM_TITIK = 'id,nama,osm_ref,kota,lat,lng';
export const KOLOM_RINGKASAN = 'titik_id,jumlah_laporan,data_cukup,level_pungli,alasan_pungli,bantu_datang_ya,' +
  'bantu_pergi_ya,bayar_median_motor,jumlah_motor,bayar_median_mobil,jumlah_mobil,bintang_rata,laporan_terakhir';
