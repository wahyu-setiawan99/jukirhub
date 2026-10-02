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
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r=".7" fill="currentColor"/>',
  orang: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6"/>',
  // koin, lencana, foto, berita (tab Saya, layar sukses lapor, Beranda) — dari lib/ikon.js Adami
  koin: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/>',
  bendera: '<path d="M6 21V4M6 4h11l-2 4 2 4H6"/>',
  terbit: '<path d="M3 17h18M7 17a5 5 0 0 1 10 0M12 5v3M5.2 9.2l2 2M18.8 9.2l-2 2"/>',
  api: '<path d="M12 21c-4 0-6.5-2.6-6.5-6 0-3.5 3-5.5 3.5-9 2.5 1.5 3.5 4 3.5 5.5 1-.8 1.6-2 1.8-3.2 2 1.6 3.2 4 3.2 6.7 0 3.4-2.5 6-5.5 6z"/>',
  perisai: '<path d="M12 3l7 3v5.5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5V6z"/><polyline points="8.8 12 11 14.2 15.2 10"/>',
  piala: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4"/>',
  galeri: '<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-5 4 4 2.5-2.5L20 17"/>',
  kamera: '<path d="M4 8h3.5L9 5.5h6L16.5 8H20v11H4z"/><circle cx="12" cy="13.2" r="3.4"/>',
  centang: '<polyline points="5 12.5 10 17.5 19 7"/>',
  koran: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2"/><path d="M7.5 9h6M7.5 12.5h6M7.5 16h4"/>'
};

export function svgIkon(nama, ukuran = 22) {
  return `<svg width="${ukuran}" height="${ukuran}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IKON[nama] ?? ''}</svg>`;
}
