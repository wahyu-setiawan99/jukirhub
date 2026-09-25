// formatRupiah & formatJarak dipakai web DAN Edge Function — sumbernya di supabase/functions/_shared.
export { formatJarak, formatRupiah, formatRupiahRingkas } from '@shared/format.js';

export function jarakM(a, b) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2
          + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// localStorage bisa melempar (mode privat, diblokir) — jangan sampai app ikut mati.
export function bacaSimpan(kunci, bawaan) {
  try { return localStorage.getItem(kunci) ?? bawaan; } catch { return bawaan; }
}
export function tulisSimpan(kunci, nilai) {
  try { localStorage.setItem(kunci, nilai); } catch { /* abaikan */ }
}
