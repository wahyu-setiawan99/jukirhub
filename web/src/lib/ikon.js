// Isi SVG (viewBox 0 0 24 24, stroke currentColor) per nama ikon. String statis milik app — aman disisipkan sebagai HTML.
export const IKON = {
  silang: '<path d="M7 7l10 10M17 7L7 17"/>',
  cari: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>',
  lokasi: '<circle cx="12" cy="12" r="3.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>',
  kembali: '<path d="M15 5l-7 7 7 7"/>',
  bawah: '<path d="M6 9l6 6 6-6"/>',
  // tombol tema di header: matahari = ganti ke terang, bulan = ganti ke gelap
  matahari: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  bulan: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  peta: '<path d="M9 4L3.5 6.5v13L9 17l6 3 5.5-2.5v-13L15 7 9 4z"/><path d="M9 4v13M15 7v13"/>',
  bintang: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  // menu bawah (selalu bersama label teks)
  rumah: '<path d="M3.5 11L12 4l8.5 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
  daftar: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r=".7" fill="currentColor"/>'
};

export function svgIkon(nama, ukuran = 22) {
  return `<svg width="${ukuran}" height="${ukuran}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IKON[nama] ?? ''}</svg>`;
}
