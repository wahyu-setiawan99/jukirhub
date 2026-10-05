// Buat ikon JukirHub (perisai heksagon + "P" cyan + titik sinyal di kotak gelap) untuk favicon & layar utama HP.
//
//   npm run ikon
//
// Gambar logo bersumber dari web/src/lib/logo.js (dipakai juga header website) → web/public:
//   ikon.svg, ikon-32.png                         favicon
//   ikon-192.png, ikon-512.png                    sudut membulat, latar transparan (purpose "any")
//   ikon-maskable-512.png                         latar penuh, gambar di zona aman 80% (Android)
//   ikon-apple-180.png                            latar penuh (iOS membulatkan sendiri)
//   (og.png: lihat scripts/buat-og.js)

import fs from 'node:fs';
import sharp from 'sharp';
import { WARNA_LOGO, isiLogo } from '../web/src/lib/logo.js';

const FOLDER = 'web/public';
const GAMBAR = isiLogo();

const IKON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="${WARNA_LOGO.latar}"/>
  <g transform="translate(256 256) scale(0.84) translate(-256 -256)">${GAMBAR}</g>
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

// og.png (pratinjau tautan) dibuat terpisah oleh scripts/buat-og.js (`npm run og`).
