// Salinan data terakhir di perangkat untuk dipakai saat sinyal lemah/putus (pola Adami, versi sederhana).
// Isinya hanya data publik yang memang ditampilkan app (tempat + ringkasan dari view publik), tanpa data pribadi.
// Fungsi murni (tanpa localStorage) supaya bisa dites dengan node:test.

export const KUNCI_SNAPSHOT = 'jukirhub_snapshot_v1';
export const VERSI_SNAPSHOT = 1;
export const MAKS_UMUR_SNAPSHOT_MS = 24 * 60 * 60 * 1000;
const TOLERANSI_JAM_MAJU_MS = 5 * 60 * 1000;

export function buatSnapshot({ tempat, diambil }) {
  return JSON.stringify({ v: VERSI_SNAPSHOT, diambil, tempat });
}

// { diambil, tempat } atau null bila tidak ada / rusak / versi lain / terlalu lama.
export function bacaSnapshot(teks, sekarang) {
  if (typeof teks !== 'string' || !teks) return null;
  let data;
  try {
    data = JSON.parse(teks);
  } catch {
    return null;
  }
  if (!data || data.v !== VERSI_SNAPSHOT || !Number.isFinite(data.diambil) || !Array.isArray(data.tempat)) return null;
  if (sekarang - data.diambil > MAKS_UMUR_SNAPSHOT_MS) return null;
  if (data.diambil - sekarang > TOLERANSI_JAM_MAJU_MS) return null;
  const tempat = data.tempat.filter(t => t && Number.isFinite(t.id) && Number.isFinite(t.lat) && Number.isFinite(t.lng)
    && typeof t.nama === 'string' && t.ringkasan && typeof t.ringkasan === 'object');
  return { diambil: data.diambil, tempat };
}
