// Gambar pratinjau tautan (og.png, 1200×630) saat jukirhub.site dibagikan di Facebook/WhatsApp/X: ilustrasi suasana
// parkir + ajakan klik (permintaan pemilik 5 Okt 2026). Dua opsi, digambar dengan SVG (tanpa foto, tanpa logo/merek
// pihak lain, tanpa wajah/pelat sungguhan, tanpa klaim koin bisa jadi uang; docs/peluncuran/iklan.md bagian 1.3 & G2).
//
//   npm run og            → docs/peluncuran/og-a.png & og-b.png (untuk dipilih) + pasang opsi aktif ke web/public/og.png
//   npm run og -- b       → pasang opsi B
//
// Setelah push: Facebook Sharing Debugger (developers.facebook.com/tools/debug) → Scrape Again, supaya gambar lama
// di cache Facebook diganti.

import fs from 'node:fs';
import sharp from 'sharp';
import { WARNA_LOGO, isiLogo } from '../web/src/lib/logo.js';

export const OPSI_AKTIF = 'a';
const LOGO = isiLogo();
const C = { latar: WARNA_LOGO.latar, cyan: WARNA_LOGO.gambar, teks: '#e6edf7', redup: '#9fb0c8', garis: '#16233a', kartu: '#0f1b30' };
const SANS = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
const MONO = "Consolas, 'Courier New', monospace";
const GRID = Array.from({ length: 25 }, (_, i) => `M${i * 50} 0V630`).join('') + Array.from({ length: 13 }, (_, i) => `M0 ${i * 50}H1200`).join('');

const merek = (x, y) => `<g transform="translate(${x} ${y}) scale(0.125)">${LOGO}</g>
  <text x="${x + 76}" y="${y + 47}" font-family="${SANS}" font-weight="600" font-size="34" fill="${C.teks}">JukirHub</text>`;

const tombol = (x, y, teks, lebar) => `<rect x="${x}" y="${y}" width="${lebar}" height="64" rx="32" fill="${C.cyan}"/>
  <text x="${x + lebar / 2}" y="${y + 42}" text-anchor="middle" font-family="${SANS}" font-weight="700" font-size="28" fill="${C.latar}">${teks}</text>`;

const bintang = (x, y, n, ukuran = 26) => Array.from({ length: 5 }, (_, i) =>
  `<text x="${x + i * (ukuran + 4)}" y="${y}" font-family="${SANS}" font-size="${ukuran}" fill="${i < n ? '#fbbf24' : '#3a4a63'}">★</text>`).join('');

// ---------------------------------------------------------------- Opsi A: "Bayar berapa?" + layar app
function opsiA() {
  const pin = (x, y, warna) => `<g transform="translate(${x} ${y})"><path d="M0 0c-11 0-20 9-20 20 0 15 20 34 20 34s20-19 20-34c0-11-9-20-20-20z" fill="${warna}"/><circle cy="20" r="7" fill="${C.latar}"/></g>`;
  const jalan = [
    'M0 120H300', 'M0 250H300', 'M0 360H300', 'M70 0V470', 'M190 0V470', 'M0 40L300 300'
  ].map(d => `<path d="${d}" stroke="#22324d" stroke-width="14"/>`).join('');
  const hp = `<g transform="translate(790 34) rotate(4)">
    <rect width="330" height="600" rx="44" fill="#05080f" stroke="#2a3a55" stroke-width="4"/>
    <rect x="14" y="14" width="302" height="572" rx="32" fill="#111c2e"/>
    <g transform="translate(14 60)"><rect width="302" height="300" fill="#0d1626"/>${jalan}
      ${pin(70, 70, '#2dd4bf')}${pin(200, 40, '#fbbf24')}${pin(150, 170, '#2dd4bf')}${pin(250, 200, '#64748b')}${pin(110, 240, '#f87171')}
      <circle cx="150" cy="190" r="34" fill="none" stroke="${C.cyan}" stroke-width="3" opacity="0.7"/></g>
    <rect x="14" y="14" width="302" height="46" fill="#111c2e"/>
    <g transform="translate(30 22) scale(0.055)">${LOGO}</g>
    <text x="64" y="46" font-family="${SANS}" font-weight="600" font-size="20" fill="${C.teks}">JukirHub</text>
    <rect x="14" y="330" width="302" height="256" rx="22" fill="${C.kartu}" stroke="#22324d" stroke-width="2"/>
    <rect x="135" y="342" width="60" height="6" rx="3" fill="#2a3a55"/>
    <text x="34" y="384" font-family="${SANS}" font-weight="700" font-size="22" fill="${C.teks}">Contoh tempat parkir</text>
    <rect x="34" y="398" width="196" height="30" rx="15" fill="#123d3a"/>
    <text x="48" y="419" font-family="${SANS}" font-size="16" fill="#5eead4">● Indikasi pungli rendah</text>
    <text x="34" y="456" font-family="${SANS}" font-size="17" fill="${C.redup}">Saat pergi</text>
    <text x="150" y="456" font-family="${SANS}" font-size="17" fill="${C.teks}">membantu (4 dari 5)</text>
    <text x="34" y="484" font-family="${SANS}" font-size="17" fill="${C.redup}">Biasa dibayar</text>
    <text x="150" y="484" font-family="${SANS}" font-size="17" fill="${C.teks}">Rp 2.000 · motor</text>
    <text x="34" y="512" font-family="${SANS}" font-size="17" fill="${C.redup}">Rating</text>
    ${bintang(150, 514, 4, 18)}
    <rect x="34" y="530" width="262" height="42" rx="12" fill="${C.cyan}"/>
    <text x="165" y="558" text-anchor="middle" font-family="${SANS}" font-weight="700" font-size="18" fill="${C.latar}">Laporkan parkir</text>
  </g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <rect width="1200" height="630" fill="${C.latar}"/>
  <path d="${GRID}" stroke="#0e1829" stroke-width="2"/>
  <circle cx="955" cy="330" r="300" fill="${C.cyan}" opacity="0.07"/>
  ${merek(70, 52)}
  <text x="70" y="214" font-family="${SANS}" font-weight="700" font-size="66" fill="${C.teks}">Parkir di sini,</text>
  <text x="70" y="292" font-family="${SANS}" font-weight="700" font-size="66" fill="${C.teks}">bayar <tspan fill="${C.cyan}">berapa?</tspan></text>
  <text x="72" y="354" font-family="${MONO}" font-size="26" fill="${C.cyan}">&gt; jukirnya membantu? ada karcis?</text>
  <text x="72" y="410" font-family="${SANS}" font-size="28" fill="${C.redup}">Cek laporan warga sebelum parkir.</text>
  <text x="72" y="448" font-family="${SANS}" font-size="28" fill="${C.redup}">Gratis, tanpa akun, langsung dari HP.</text>
  ${tombol(70, 498, 'Cek di jukirhub.site  →', 420)}
  ${hp}
</svg>`;
}

// ---------------------------------------------------------------- Opsi B: suasana jalan + jukir ramah
function motor(x, y, s, warna) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <circle cx="32" cy="74" r="26" fill="#0b111c" stroke="#3a465c" stroke-width="6"/>
    <circle cx="138" cy="74" r="26" fill="#0b111c" stroke="#3a465c" stroke-width="6"/>
    <path d="M14 66 Q30 30 74 32 L118 30 Q150 34 160 64 L120 66 Q96 50 70 66 Z" fill="${warna}"/>
    <rect x="60" y="20" width="58" height="14" rx="7" fill="#111827"/>
    <path d="M128 30 L140 4 M132 6 H156" stroke="#9aa6b8" stroke-width="5" stroke-linecap="round"/>
    <rect x="22" y="58" width="40" height="8" rx="4" fill="#9aa6b8"/>
  </g>`;
}

function jukir(x, y) {
  return `<g transform="translate(${x} ${y})">
    <ellipse cx="80" cy="402" rx="78" ry="12" fill="#000" opacity="0.3"/>
    <rect x="44" y="250" width="34" height="140" rx="10" fill="#1f2937"/>
    <rect x="84" y="250" width="34" height="140" rx="10" fill="#1f2937"/>
    <rect x="36" y="382" width="46" height="18" rx="8" fill="#0b0f17"/>
    <rect x="82" y="382" width="46" height="18" rx="8" fill="#0b0f17"/>
    <path d="M30 120 Q30 98 54 96 L108 96 Q132 98 132 120 L136 262 L26 262 Z" fill="#1e3a8a"/>
    <path d="M38 104 L124 104 L130 262 L32 262 Z" fill="#f97316"/>
    <path d="M36 170 H128 M35 214 H130" stroke="#e5e7eb" stroke-width="9"/>
    <path d="M62 104 V262 M100 104 V262" stroke="#e5e7eb" stroke-width="7" opacity="0.85"/>
    <path d="M30 116 L6 190 Q2 204 14 210 L22 214" stroke="#1e3a8a" stroke-width="26" stroke-linecap="round" fill="none"/>
    <circle cx="20" cy="214" r="15" fill="#c68c5a"/>
    <path d="M132 118 L168 70 L184 40" stroke="#1e3a8a" stroke-width="26" stroke-linecap="round" fill="none"/>
    <circle cx="186" cy="36" r="17" fill="#c68c5a"/>
    <rect x="180" y="4" width="11" height="26" rx="5" fill="#c68c5a"/>
    <rect x="68" y="80" width="26" height="22" fill="#b97f4f"/>
    <circle cx="81" cy="56" r="34" fill="#c68c5a"/>
    <path d="M45 46 Q47 18 81 16 Q115 18 117 46 Z" fill="#111827"/>
    <path d="M100 44 H134 Q136 50 128 52 H100 Z" fill="#111827"/>
    <circle cx="70" cy="58" r="3.5" fill="#1f2937"/>
    <circle cx="94" cy="58" r="3.5" fill="#1f2937"/>
    <path d="M68 72 Q82 84 96 72" stroke="#1f2937" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M60 104 L81 138 L102 104" stroke="#9ca3af" stroke-width="3" fill="none"/>
    <rect x="76" y="136" width="12" height="18" rx="4" fill="#fbbf24"/>
  </g>`;
}

function ruko(x, lebar, tinggi, warna, papan) {
  const y = 470 - tinggi;
  const jendela = Array.from({ length: Math.floor(lebar / 60) }, (_, i) =>
    `<rect x="${x + 18 + i * 60}" y="${y + 28}" width="34" height="44" rx="4" fill="#fde68a" opacity="0.55"/>`).join('');
  return `<rect x="${x}" y="${y}" width="${lebar}" height="${tinggi}" fill="${warna}"/>${jendela}
    ${papan ? `<rect x="${x + 12}" y="${y + 92}" width="${lebar - 24}" height="40" rx="4" fill="#0f172a" opacity="0.85"/>
    <text x="${x + lebar / 2}" y="${y + 120}" text-anchor="middle" font-family="${SANS}" font-weight="700" font-size="22" fill="#fcd34d">${papan}</text>` : ''}
    <rect x="${x}" y="${y + 140}" width="${lebar}" height="${tinggi - 140}" fill="#000" opacity="0.25"/>`;
}

function opsiB() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="langit" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1324"/><stop offset="1" stop-color="#3b2a4a"/></linearGradient>
    <linearGradient id="kiri" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0b1324" stop-opacity="0.97"/><stop offset="0.55" stop-color="#0b1324" stop-opacity="0.9"/><stop offset="0.75" stop-color="#0b1324" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#langit)"/>
  ${ruko(560, 200, 300, '#334155', 'WARUNG MAKAN')}${ruko(760, 180, 340, '#3f3a5a', null)}${ruko(940, 260, 290, '#364152', 'FOTOKOPI')}
  <rect y="470" width="1200" height="60" fill="#475569"/>
  <rect y="470" width="1200" height="8" fill="#94a3b8"/>
  <rect y="530" width="1200" height="100" fill="#1f2937"/>
  <path d="M0 585 H1200" stroke="#e5e7eb" stroke-width="5" stroke-dasharray="40 30"/>
  ${motor(560, 430, 0.95, '#dc2626')}${motor(700, 430, 0.95, '#2563eb')}${motor(1010, 430, 0.95, '#16a34a')}
  ${jukir(820, 130)}
  <g transform="translate(966 60)">
    <rect width="200" height="98" rx="18" fill="${C.kartu}" stroke="${C.cyan}" stroke-width="2"/>
    ${bintang(18, 44, 5, 28)}
    <text x="18" y="80" font-family="${SANS}" font-size="20" fill="${C.teks}">Jukirnya membantu</text>
  </g>
  <rect width="1200" height="630" fill="url(#kiri)"/>
  ${merek(64, 48)}
  <text x="64" y="206" font-family="${SANS}" font-weight="700" font-size="64" fill="${C.teks}">Jukirnya membantu?</text>
  <text x="64" y="282" font-family="${SANS}" font-weight="700" font-size="64" fill="${C.cyan}">Kasih bintang.</text>
  <text x="66" y="342" font-family="${SANS}" font-size="28" fill="${C.redup}">Kurang ramah atau tanpa karcis? Ceritakan juga.</text>
  <text x="66" y="380" font-family="${SANS}" font-size="28" fill="${C.redup}">Bantu warga lain tahu kondisi parkir.</text>
  <text x="66" y="430" font-family="${MONO}" font-size="24" fill="${C.cyan}">&gt; gratis · tanpa akun · 1 menit</text>
  ${tombol(64, 474, 'Lapor di jukirhub.site  →', 440)}
</svg>`;
}

export const OPSI = { a: opsiA, b: opsiB };

async function utama() {
  const pilih = (process.argv[2] ?? OPSI_AKTIF).toLowerCase();
  if (!OPSI[pilih]) throw new Error(`Opsi tidak dikenal: ${pilih} (pilih a atau b)`);
  fs.mkdirSync('docs/peluncuran', { recursive: true });
  for (const [k, buat] of Object.entries(OPSI)) {
    await sharp(Buffer.from(buat())).png({ compressionLevel: 9 }).toFile(`docs/peluncuran/og-${k}.png`);
    console.log(`✔ docs/peluncuran/og-${k}.png`);
  }
  fs.copyFileSync(`docs/peluncuran/og-${pilih}.png`, 'web/public/og.png');
  console.log(`✔ web/public/og.png ← opsi ${pilih.toUpperCase()}`);
}

utama().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
