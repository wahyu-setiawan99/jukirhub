// Format angka untuk tampilan: dipakai web DAN Edge Function. ESM murni, tanpa impor.

const RUPIAH = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

// 2000 → "Rp 2.000"
export function formatRupiah(nilai) {
  const n = Math.round(Number(nilai));
  if (!Number.isFinite(n)) return '';
  return `Rp ${RUPIAH.format(n)}`;
}

// Bentuk ringkas untuk estimasi: 150000 → "Rp 150rb", 2500000 → "Rp 2,5jt". Di bawah seribu tetap utuh.
export function formatRupiahRingkas(nilai) {
  const n = Math.round(Number(nilai));
  if (!Number.isFinite(n)) return '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `Rp ${angkaRingkas(n / 1_000_000)}jt`;
  if (abs >= 1_000) return `Rp ${angkaRingkas(n / 1_000)}rb`;
  return `Rp ${n}`;
}

// Satu angka desimal bila perlu, koma sebagai pemisah desimal (gaya Indonesia).
function angkaRingkas(x) {
  const bulat = Math.round(x * 10) / 10;
  return Number.isInteger(bulat) ? String(bulat) : String(bulat).replace('.', ',');
}

export function formatJarak(meter) {
  const m = Number(meter);
  if (!Number.isFinite(m)) return '';
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} m`;
  return `${String(Math.round(m / 100) / 10).replace('.', ',')} km`;
}
