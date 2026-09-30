// Pemanggil Edge Function publik (`lapor`) dan kunci perangkat (pola Adami). Semua validasi ada di server;
// fungsi ini hanya meneruskan pesan galat server apa adanya ke pengguna. `fetch` & penyimpanan diberikan pemanggil
// supaya bisa dites dengan node:test.

const BATAS_TUNGGU_MS = 15_000;

export async function panggilFungsi(fetchFn, konfigurasi, nama, body) {
  if (!konfigurasi) return { ok: false, kode: 'konfigurasi', pesan: 'Layanan belum tersambung. Coba lagi nanti.' };
  try {
    const res = await fetchFn(`${konfigurasi.url}/functions/v1/${nama}`, {
      method: 'POST',
      // Fungsi publik tanpa JWT (verify_jwt = false); kunci anon/publishable cukup di header apikey.
      headers: { 'Content-Type': 'application/json', apikey: konfigurasi.kunci },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(BATAS_TUNGGU_MS)
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok) return { ok: true, data };
    return {
      ok: false,
      status: res.status,
      kode: data?.kode ?? `http_${res.status}`,
      pesan: data?.pesan ?? 'Laporan gagal dikirim. Coba lagi.'
    };
  } catch {
    return { ok: false, kode: 'jaringan', pesan: 'Tidak ada koneksi. Periksa internet Anda lalu coba lagi.' };
  }
}

// Isian form + tempat + posisi → body untuk Edge Function `lapor` (bentuknya divalidasi _shared/lapor.js).
// Tempat terlapor dikirim sebagai titik_id; tempat baru (peta / cari / pin) sebagai { nama, osm_ref, lat, lng }.
export function susunLaporan({ tempat, isian, posisi, perangkat }) {
  const t = tempat.id != null
    ? { titik_id: tempat.id }
    // Pin (tekan lama / "Laporkan di lokasi saya"): nama yang diketik di form. Tempat dari peta / cari: namanya sendiri.
    : { tempat: {
      nama: String((tempat.sumber === 'pin' ? isian.namaTempat : tempat.nama || isian.namaTempat) ?? '').trim(),
      osm_ref: tempat.osm_ref ?? null,
      lat: tempat.lat,
      lng: tempat.lng,
      sumber: tempat.sumber ?? 'pin'
    } };
  const adaJukir = isian.adaJukir !== false;
  return {
    perangkat,
    ...t,
    ada_jukir: adaJukir,
    kendaraan: isian.kendaraan,
    bantu_datang: isian.bantuDatang,
    bantu_pergi: isian.bantuPergi,
    bayar: isian.bayar,
    pungli: [...isian.pungli],
    bintang: isian.bintang,
    ...(String(isian.komentar ?? '').trim() ? { komentar: String(isian.komentar).trim() } : {}),
    lat: posisi?.lat,
    lng: posisi?.lng,
    akurasi_m: posisi?.akurasi != null ? Math.round(posisi.akurasi) : undefined
  };
}

// Identitas perangkat acak (lemah: bisa dihapus / mode penyamaran) — sengaja sederhana. Server hanya menyimpan
// hash bersaltnya; penjaga sebenarnya adalah batas per jaringan & gerbang lokasi di server.
export const KUNCI_PERANGKAT = 'jukirhub_perangkat';
let cadangan = null;

export function kunciPerangkat(simpan = globalThis.localStorage) {
  try {
    let k = simpan.getItem(KUNCI_PERANGKAT);
    if (!k || k.length < 8) { k = crypto.randomUUID(); simpan.setItem(KUNCI_PERANGKAT, k); }
    return k;
  } catch {
    cadangan ??= crypto.randomUUID();
    return cadangan;
  }
}
