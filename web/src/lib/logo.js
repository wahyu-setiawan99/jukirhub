// Logo JukirHub: huruf "P" putih di kotak biru, meniru rambu parkir.
// SATU sumber gambar untuk header React, header HTML statis (lib/seo.js), dan skrip
// scripts/buat-ikon.js (favicon, ikon layar utama HP, og.png). JavaScript murni tanpa JSX.

export const WARNA_LOGO = { latar: '#1d4ed8', gambar: '#ffffff' };

// Kanvas 512×512. Batang P x 126–198, lengkung sampai x 386; dipusatkan secara visual.
export function isiLogo({ warna = WARNA_LOGO.gambar } = {}) {
  return `<path d="M126 96 H256 C336 96 386 146 386 220 C386 294 336 344 256 344 H198 V416 H126 Z ` +
    `M198 160 V280 H252 C290 280 314 256 314 220 C314 184 290 160 252 160 Z" fill="${warna}" fill-rule="evenodd"/>`;
}

// SVG siap tempel untuk tampilan kecil (header). Dekoratif: nama "JukirHub" selalu tertulis di sebelahnya.
export function svgLogoInline(ukuran = 28) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ukuran}" height="${ukuran}" viewBox="0 0 512 512" aria-hidden="true" focusable="false">` +
    `<rect width="512" height="512" rx="112" fill="${WARNA_LOGO.latar}"/>${isiLogo()}</svg>`;
}
