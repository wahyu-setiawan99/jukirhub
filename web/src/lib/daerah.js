// Daerah (kabupaten/kota Sulsel) pengguna untuk berita parkir per daerah (M5). Dihitung dari posisi yang SUDAH
// diizinkan pengguna (tidak meminta izin lokasi sendiri), lewat Nominatim reverse dengan koordinat dibulatkan ±1 km,
// lalu disimpan di HP 7 hari per sel ±1 km supaya tidak bertanya ulang. Pilihan manual pengguna mengalahkan otomatis.
// Fungsi murni diberi `fetch` & penyimpanan oleh pemanggil supaya bisa dites dengan node:test.

// Hanya impor relatif (tanpa alias @shared) supaya bisa dimuat Node.
import { kabupatenDariAlamat, kabupatenSah, urlKabupatenNominatim } from '../../../supabase/functions/_shared/kabupaten.js';

export const KUNCI_DAERAH = 'jukirhub_daerah';
const HARI_SIMPAN = 7;
const sel = (posisi) => `${posisi.lat.toFixed(2)},${posisi.lng.toFixed(2)}`;

function baca(simpan) {
  try { return JSON.parse(simpan.getItem(KUNCI_DAERAH) ?? 'null') ?? {}; } catch { return {}; }
}
function tulis(simpan, isi) {
  try { simpan.setItem(KUNCI_DAERAH, JSON.stringify(isi)); } catch { /* abaikan */ }
}

// Pilihan manual (label) atau null untuk kembali otomatis.
export function pilihDaerahManual(label, simpan = globalThis.localStorage) {
  const lama = baca(simpan);
  tulis(simpan, { ...lama, manual: kabupatenSah(label) ? label : null });
}

export const daerahManual = (simpan = globalThis.localStorage) => {
  const m = baca(simpan).manual;
  return kabupatenSah(m) ? m : null;
};

// Posisi → label kabupaten Sulsel, atau null (di luar Sulsel / gagal). Hasil disimpan per sel.
export async function daerahDariPosisi(fetchFn, posisi, { simpan = globalThis.localStorage, sekarang = Date.now() } = {}) {
  if (!posisi) return null;
  const lama = baca(simpan);
  if (lama.sel === sel(posisi) && sekarang - (lama.waktu ?? 0) < HARI_SIMPAN * 86_400_000) return lama.otomatis ?? null;
  try {
    const res = await fetchFn(urlKabupatenNominatim(posisi.lat, posisi.lng), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return null;
    const otomatis = kabupatenDariAlamat((await res.json())?.address);
    tulis(simpan, { ...baca(simpan), sel: sel(posisi), waktu: sekarang, otomatis });
    return otomatis;
  } catch {
    return null;
  }
}
