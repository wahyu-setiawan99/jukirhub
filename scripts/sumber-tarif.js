// Petunjuk sumber untuk AI tarif (AGENTS.md 1.8 C): scripts/data/tarif-resmi.json (hasil penelusuran 3 Okt 2026, juga
// bisa dikoreksi pemilik) → supabase/functions/_shared/sumber-tarif.js, supaya ikut ter-deploy ke Edge Function `tarif`.
// Hanya dasar hukum & tautan (tanpa angka). Jalankan setelah mengubah JSON, lalu deploy ulang fungsi `tarif`.
//
//   npm run tarif:sumber

import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const JSON_LEMBAR = fileURLToPath(new URL('./data/tarif-resmi.json', import.meta.url));
const MODUL = fileURLToPath(new URL('../supabase/functions/_shared/sumber-tarif.js', import.meta.url));

// Lembar → isi modul (fungsi murni, dites: modul harus sama dengan hasil fungsi ini).
export function buatModulPetunjuk(lembar) {
  const petunjuk = {};
  for (const k of lembar.kota) {
    if (!k.dasar_hukum) continue;
    petunjuk[k.kota] = [k.dasar_hukum, k.sumber_url ? `sumber: ${k.sumber_url}` : null].filter(Boolean).join('; ');
  }
  return [
    '// DIBUAT OTOMATIS oleh `npm run tarif:sumber` dari scripts/data/tarif-resmi.json. Jangan diubah langsung.',
    '// Petunjuk dasar hukum & sumber per kab/kota untuk AI tarif (AGENTS.md 1.8 C); tanpa angka tarif.',
    '',
    `export const PETUNJUK_TARIF = ${JSON.stringify(petunjuk, null, 2)};`,
    ''
  ].join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const isi = buatModulPetunjuk(JSON.parse(fs.readFileSync(JSON_LEMBAR, 'utf8')));
  fs.writeFileSync(MODUL, isi);
  console.log(`Ditulis: supabase/functions/_shared/sumber-tarif.js (${Object.keys(JSON.parse(isi.split('= ')[1].replace(/;\s*$/, ''))).length} kab/kota)`);
}
