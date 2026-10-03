// Isi kab/kota tempat yang masih kosong (titik_parkir.kota), untuk halaman wilayah, imbauan, dan peringkat koin.
// Server `lapor` mencoba mengisinya lewat Nominatim saat melapor, tetapi 3 Okt 2026 ketujuh tempat pertama masih kosong
// (dari server Supabase permintaannya kemungkinan ditolak / terlalu lambat). Skrip ini:
//   1. membaca view publik titik_publik (kunci anon dari web/.env.local, sama dengan web),
//   2. menanyakan Nominatim reverse untuk tempat tanpa kota (maks. 1 permintaan/detik, sesuai aturan Nominatim),
//   3. menulis file migrasi data `supabase/migrations/<waktu>_isi_kota.sql` (hanya `where kota is null`).
// Lalu pemilik: `npx supabase db push`. Tidak menulis ke database secara langsung.
//
//   npm run kota:isi

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { kabupatenDariAlamat, kabupatenSah, urlKabupatenNominatim } from '../supabase/functions/_shared/wilayah.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// SQL migrasi dari pasangan { id, kota } (fungsi murni, dites). Label kota harus label wilayah.js yang sah.
export function sqlIsiKota(hasil, keterangan = '') {
  const sah = hasil.filter(h => Number.isSafeInteger(h.id) && h.id > 0 && kabupatenSah(h.kota));
  if (!sah.length) return null;
  const kutip = (s) => `'${String(s).replace(/'/g, "''")}'`;
  return [
    `-- Isi kab/kota tempat yang masih kosong (scripts/isi-kota.js, Nominatim reverse). ${keterangan}`.trim(),
    '-- Hanya baris yang kotanya masih kosong; aman dijalankan ulang.',
    '',
    ...sah.map(h => `update titik_parkir set kota = ${kutip(h.kota)} where id = ${h.id} and kota is null;`),
    ''
  ].join('\n');
}

const tunggu = (ms) => new Promise(ok => setTimeout(ok, ms));

async function utama() {
  const url = String(process.env.VITE_SUPABASE_URL ?? '').replace(/\/+$/, '');
  const kunci = process.env.VITE_SUPABASE_ANON_KEY ?? '';
  if (!url || !kunci) {
    console.error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum ada di web/.env.local.');
    process.exit(1);
  }
  const res = await fetch(`${url}/rest/v1/titik_publik?select=id,nama,kota,lat,lng`, { headers: { apikey: kunci } });
  if (!res.ok) throw new Error(`titik_publik HTTP ${res.status}`);
  const kosong = (await res.json()).filter(t => !t.kota);
  if (!kosong.length) {
    console.log('Semua tempat sudah punya kab/kota.');
    return;
  }
  const hasil = [];
  for (const t of kosong) {
    const r = await fetch(urlKabupatenNominatim(t.lat, t.lng), {
      headers: { 'User-Agent': 'JukirHub/1.0 (+https://jukirhub.site)', Accept: 'application/json' }
    });
    const kota = r.ok ? kabupatenDariAlamat((await r.json())?.address) : null;
    console.log(`${t.id} ${t.nama} → ${kota ?? `tidak dikenal (HTTP ${r.status})`}`);
    if (kota) hasil.push({ id: Number(t.id), kota });
    await tunggu(1100);
  }
  const waktu = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  const sql = sqlIsiKota(hasil, `${hasil.length} tempat, ${new Date().toISOString().slice(0, 10)}.`);
  if (!sql) {
    console.log('Tidak ada kab/kota yang bisa diisi.');
    return;
  }
  const file = path.join(ROOT, 'supabase', 'migrations', `${waktu}_isi_kota.sql`);
  fs.writeFileSync(file, sql);
  console.log(`\nDitulis: ${path.relative(ROOT, file)}\nLangkah berikut (pemilik): npx supabase db push`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  utama().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
