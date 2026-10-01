// Cari nama tempat di Nominatim OpenStreetMap (AGENTS.md 1.2 poin 1). Aturan pakai Nominatim: hanya saat pengguna
// menekan Cari (bukan tiap huruf), maks. 1 permintaan per detik, atribusi OSM, hasil disimpan sementara.
// Tanpa React/DOM; `fetch` diberikan pemanggil supaya bisa dites dengan node:test.

// Hanya impor relatif (tanpa alias @shared) supaya bisa dimuat Node.
import { dataProvinsi } from '../../../supabase/functions/_shared/wilayah.js';

// Kotak pencarian: provinsi zona aktif (AGENTS.md 1.5, fase N2 Sulawesi): barat, utara, timur, selatan.
export function kotakZona(kode) {
  const p = dataProvinsi(kode) ?? dataProvinsi('sulsel');
  const [barat, selatan, timur, utara] = p.bbox;
  return { barat, utara, timur, selatan };
}
export const KOTAK_MAKASSAR_RAYA = { barat: 119.3, utara: -4.75, timur: 119.95, selatan: -5.65 };
export const JEDA_MIN_MS = 1100;
const BATAS_TUNGGU_MS = 8000;

export function urlNominatim(kueri, k = kotakZona('sulsel')) {
  const p = new URLSearchParams({
    q: String(kueri).trim(),
    format: 'jsonv2',
    limit: '5',
    countrycodes: 'id',
    viewbox: `${k.barat},${k.utara},${k.timur},${k.selatan}`,
    bounded: '1',
    'accept-language': 'id'
  });
  return `https://nominatim.openstreetmap.org/search?${p}`;
}

export const dalamKotak = ({ lat, lng }, k = kotakZona('sulsel')) =>
  lat <= k.utara && lat >= k.selatan && lng >= k.barat && lng <= k.timur;

const REF_SAH = new Set(['node', 'way', 'relation']);

// Jawaban Nominatim → [{ nama, alamat, lat, lng, osm_ref }]. Baris aneh / di luar kotak zona dibuang.
export function hasilNominatim(json, kotak = kotakZona('sulsel')) {
  if (!Array.isArray(json)) return [];
  return json
    .map(r => {
      const lat = Number(r?.lat), lng = Number(r?.lon);
      const bagian = String(r?.display_name ?? '').split(',').map(s => s.trim()).filter(Boolean);
      const nama = String(r?.name || bagian[0] || '').trim().slice(0, 60);
      const ref = REF_SAH.has(r?.osm_type) && /^\d+$/.test(String(r?.osm_id)) ? `${r.osm_type}/${r.osm_id}` : null;
      return { nama, alamat: bagian.slice(1, 4).join(', '), lat, lng, osm_ref: ref };
    })
    .filter(h => h.nama.length >= 2 && Number.isFinite(h.lat) && Number.isFinite(h.lng) && dalamKotak(h, kotak));
}

// Pencari dengan simpanan & jeda: satu instance per app.
export function buatPencari(fetchFn, sekarang = () => Date.now()) {
  const simpanan = new Map();
  let terakhir = 0;
  return async function cari(kueri, zona = 'sulsel') {
    const teks = String(kueri ?? '').trim().toLocaleLowerCase('id-ID');
    if (teks.length < 3) return [];
    const k = `${zona}|${teks}`;
    const kotak = kotakZona(zona);
    if (simpanan.has(k)) return simpanan.get(k);
    const tunggu = terakhir + JEDA_MIN_MS - sekarang();
    if (tunggu > 0) await new Promise(r => setTimeout(r, tunggu));
    terakhir = sekarang();
    const res = await fetchFn(urlNominatim(kueri, kotak), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(BATAS_TUNGGU_MS)
    });
    if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
    const hasil = hasilNominatim(await res.json(), kotak);
    simpanan.set(k, hasil);
    return hasil;
  };
}
