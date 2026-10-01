// Wilayah pengguna (AGENTS.md 1.5, fase N2 Sulawesi): provinsi (= zona aktif: peta, cari, daftar, imbauan) dan
// kab/kota (berita per daerah). Dihitung dari posisi yang SUDAH diizinkan pengguna (tidak meminta izin lokasi
// sendiri), lewat Nominatim reverse dengan koordinat dibulatkan ±1 km, lalu disimpan di HP 7 hari per sel ±1 km.
// Pilihan manual pengguna (zona & daerah berita) selalu mengalahkan otomatis.
// Fungsi murni diberi `fetch` & penyimpanan oleh pemanggil supaya bisa dites dengan node:test.

// Hanya impor relatif (tanpa alias @shared) supaya bisa dimuat Node.
import {
  kabupatenSah, provinsiDariKoordinat, provinsiSah, urlKabupatenNominatim, wilayahDariAlamat
} from '../../../supabase/functions/_shared/wilayah.js';

export const KUNCI_DAERAH = 'jukirhub_daerah';
export const ZONA_BAWAAN = 'sulsel';
const HARI_SIMPAN = 7;
const sel = (posisi) => `${posisi.lat.toFixed(2)},${posisi.lng.toFixed(2)}`;

function baca(simpan) {
  try { return JSON.parse(simpan.getItem(KUNCI_DAERAH) ?? 'null') ?? {}; } catch { return {}; }
}
function tulis(simpan, ubah) {
  try { simpan.setItem(KUNCI_DAERAH, JSON.stringify({ ...baca(simpan), ...ubah })); } catch { /* abaikan */ }
}

// Daerah berita (kab/kota) pilihan manual, atau null untuk kembali otomatis.
export const pilihDaerahManual = (label, simpan = globalThis.localStorage) =>
  tulis(simpan, { manual: kabupatenSah(label) ? label : null });
export const daerahManual = (simpan = globalThis.localStorage) => {
  const m = baca(simpan).manual;
  return kabupatenSah(m) ? m : null;
};

// Zona (kode provinsi) pilihan manual, atau null untuk kembali otomatis.
export const pilihZonaManual = (kode, simpan = globalThis.localStorage) =>
  tulis(simpan, { zona: provinsiSah(kode) ? kode : null });
export const zonaManual = (simpan = globalThis.localStorage) => {
  const z = baca(simpan).zona;
  return provinsiSah(z) ? z : null;
};

// Posisi → { provinsi, kabupaten } (masing-masing bisa null bila di luar Sulawesi / gagal). Disimpan per sel.
// Nominatim gagal → provinsi diperkirakan dari kotak provinsi.
export async function wilayahDariPosisi(fetchFn, posisi, { simpan = globalThis.localStorage, sekarang = Date.now() } = {}) {
  if (!posisi) return { provinsi: null, kabupaten: null };
  const lama = baca(simpan);
  if (lama.sel === sel(posisi) && sekarang - (lama.waktu ?? 0) < HARI_SIMPAN * 86_400_000) {
    return { provinsi: lama.provinsi ?? null, kabupaten: lama.otomatis ?? null };
  }
  try {
    const res = await fetchFn(urlKabupatenNominatim(posisi.lat, posisi.lng), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const w = wilayahDariAlamat((await res.json())?.address);
    tulis(simpan, { sel: sel(posisi), waktu: sekarang, otomatis: w.kabupaten, provinsi: w.provinsi });
    return w;
  } catch {
    return { provinsi: provinsiDariKoordinat(posisi), kabupaten: null };
  }
}

// Kompatibel: posisi → label kab/kota atau null.
export const daerahDariPosisi = async (fetchFn, posisi, opsi) => (await wilayahDariPosisi(fetchFn, posisi, opsi)).kabupaten;
