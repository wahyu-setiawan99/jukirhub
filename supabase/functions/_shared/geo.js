// Jarak & kemiripan nama tempat: SATU sumber untuk web (lib/tempat.js) dan Edge Function `lapor`, supaya "tempat yang
// sama" (AGENTS.md bagian 5) dinilai dengan aturan yang sama di kedua sisi. ESM murni (Node & Deno).

export function jarakM(a, b) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2
          + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const normalisasiNama = (s) => String(s ?? '').toLocaleLowerCase('id-ID')
  .normalize('NFKD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, ' ').trim();

// Nama mirip: salah satu memuat yang lain (mis. "Indomaret" vs "Indomaret Jl. Perintis").
export function namaMirip(a, b) {
  const x = normalisasiNama(a), y = normalisasiNama(b);
  return !!x && !!y && (x.includes(y) || y.includes(x));
}
