// Logo JukirHub (konsep C, keputusan pemilik 1 Okt 2026): perisai heksagon + huruf "P" + titik sinyal kuning
// (= ada laporan baru). SATU sumber gambar untuk header React, header HTML statis (lib/seo.js), dan skrip
// scripts/buat-ikon.js (favicon, ikon layar utama HP, og.png). JavaScript murni tanpa JSX.

export const WARNA_LOGO = { latar: '#060a13', gambar: '#22d3ee', sinyal: '#facc15' };

// Kanvas 512×512 (digambar di grid 100, diskalakan 5,12). Kelas logo-* dipakai header supaya warna ikut tema.
export function isiLogo({ gambar = WARNA_LOGO.gambar, sinyal = WARNA_LOGO.sinyal, latar = WARNA_LOGO.latar } = {}) {
  return '<g transform="scale(5.12)">' +
    `<polygon class="logo-garis" points="50,8 87,29 87,71 50,92 13,71 13,29" fill="none" stroke="${gambar}" stroke-width="7" stroke-linejoin="round"/>` +
    `<path class="logo-isi" fill="${gambar}" fill-rule="evenodd" d="M39 28h15c8 0 13 5 13 12s-5 12-13 12h-6v18h-9zM48 36v8h5c3 0 4.5-1.8 4.5-4s-1.5-4-4.5-4z"/>` +
    `<circle class="logo-sinyal" cx="80" cy="20" r="9" fill="${sinyal}" stroke="${latar}" stroke-width="4"/>` +
    '</g>';
}

// SVG siap tempel untuk tampilan kecil (header), tanpa kotak latar. Dekoratif: nama "JukirHub" selalu tertulis.
export function svgLogoInline(ukuran = 28) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ukuran}" height="${ukuran}" viewBox="0 0 512 512" aria-hidden="true" focusable="false">` +
    `${isiLogo()}</svg>`;
}
