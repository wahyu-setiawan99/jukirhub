// Buat ikon JukirHub (huruf "P" putih di kotak biru, meniru rambu parkir) untuk favicon & layar utama HP.
//
//   npm run ikon
//
// Gambar logo bersumber dari web/src/lib/logo.js (dipakai juga header website) → web/public:
//   ikon.svg, ikon-32.png                         favicon
//   ikon-192.png, ikon-512.png                    sudut membulat, latar transparan (purpose "any")
//   ikon-maskable-512.png                         latar penuh, gambar di zona aman 80% (Android)
//   ikon-apple-180.png                            latar penuh (iOS membulatkan sendiri)
//   og.png                                        pratinjau tautan WhatsApp/Facebook/X, 1200×630

import fs from 'node:fs';
import sharp from 'sharp';
import { WARNA_LOGO, isiLogo } from '../web/src/lib/logo.js';

const FOLDER = 'web/public';
const GAMBAR = isiLogo();

const IKON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="${WARNA_LOGO.latar}"/>${GAMBAR}
</svg>
`;

// Maskable: latar penuh tanpa sudut; gambar dipusatkan & dikecilkan 78% supaya tetap di dalam
// lingkaran zona aman berjari-jari 204,8 px.
const MASKABLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${WARNA_LOGO.latar}"/>
  <g transform="translate(256 256) scale(0.78) translate(-256 -256)">${GAMBAR}</g>
</svg>
`;

fs.mkdirSync(FOLDER, { recursive: true });
fs.writeFileSync(`${FOLDER}/ikon.svg`, IKON_SVG);

const keluaran = [
  ['ikon-32.png', IKON_SVG, 32],
  ['ikon-192.png', IKON_SVG, 192],
  ['ikon-512.png', IKON_SVG, 512],
  ['ikon-maskable-512.png', MASKABLE_SVG, 512],
  ['ikon-apple-180.png', MASKABLE_SVG, 180]
];

for (const [nama, svg, ukuran] of keluaran) {
  await sharp(Buffer.from(svg), { density: 384 })
    .resize(ukuran, ukuran)
    .png({ compressionLevel: 9 })
    .toFile(`${FOLDER}/${nama}`);
  console.log(`✔ ${FOLDER}/${nama} (${ukuran}×${ukuran})`);
}
console.log(`✔ ${FOLDER}/ikon.svg`);

const OG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <rect width="1200" height="630" fill="#ffffff"/>
  <g transform="translate(96 187) scale(0.5)"><rect width="512" height="512" rx="112" fill="${WARNA_LOGO.latar}"/>${GAMBAR}</g>
  <text x="400" y="292" font-family="'Segoe UI', Arial, sans-serif" font-weight="600" font-size="96" fill="#111111">JukirHub</text>
  <text x="404" y="364" font-family="'Segoe UI', Arial, sans-serif" font-size="38" fill="#444444">Tarif, kinerja, dan indikasi pungli</text>
  <text x="404" y="414" font-family="'Segoe UI', Arial, sans-serif" font-size="38" fill="#444444">juru parkir dari laporan warga</text>
</svg>`;
await sharp(Buffer.from(OG_SVG)).png({ compressionLevel: 9 }).toFile(`${FOLDER}/og.png`);
console.log(`✔ ${FOLDER}/og.png (1200×630)`);
