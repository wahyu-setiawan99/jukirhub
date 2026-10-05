// Baris view tarif_resmi_publik → peta per kab/kota (AGENTS.md 1.8 C). File terpisah tanpa impor supaya web (lembar
// tempat, bundel awal) tidak ikut memuat modul tarif lainnya.

// Tarif per kendaraan dari baris view tarif_resmi_publik → { [kota]: { motor, mobil, dasar_hukum, sumber_url } }.
export function petaTarif(baris) {
  const peta = {};
  for (const b of baris ?? []) {
    if (!b?.kota || !['motor', 'mobil'].includes(b.kendaraan) || !Number.isFinite(Number(b.tarif))) continue;
    const t = (peta[b.kota] ??= { motor: null, mobil: null, dasar_hukum: null, sumber_url: null });
    t[b.kendaraan] = Number(b.tarif);
    t.dasar_hukum ??= b.dasar_hukum ?? null;
    t.sumber_url ??= b.sumber_url ?? null;
  }
  return peta;
}
