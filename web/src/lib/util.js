// formatRupiah & formatJarak dipakai web DAN Edge Function — sumbernya di supabase/functions/_shared.
export { formatJarak, formatRupiah, formatRupiahRingkas } from '@shared/format.js';
export { jarakM } from './tempat.js';

// localStorage bisa melempar (mode privat, diblokir) — jangan sampai app ikut mati.
export function bacaSimpan(kunci, bawaan) {
  try { return localStorage.getItem(kunci) ?? bawaan; } catch { return bawaan; }
}
export function tulisSimpan(kunci, nilai) {
  try { localStorage.setItem(kunci, nilai); } catch { /* abaikan */ }
}
