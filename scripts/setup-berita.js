// Pasang berita parkir per daerah (M5): kunci Gemini, secret jadwal, dan uji sekali.
// DIJALANKAN PEMILIK PROYEK (menangani kunci API; AI tidak melihat kunci):
//
//   npm run berita:setup
//
// Prasyarat: `npx supabase db push` (migrasi 20261001000005_berita.sql) dan
// `npx supabase functions deploy berita telegram` sudah dijalankan; proyek sudah di-link.
// Kunci Gemini gratis: https://aistudio.google.com/apikey (buat kunci khusus JukirHub, bukan kunci Adami).
// Langkah: tanya kunci Gemini (Enter = pakai yang sudah terpasang) → buat secret acak → pasang GEMINI_API_KEY &
// BERITA_SECRET ke secret Edge Function → simpan URL fungsi & secret ke Supabase Vault (dibaca jadwal pg_cron)
// → panggil fungsi `berita` sekali. Menjalankan ulang = rotasi secret (aman).

import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';

const sqlStr = (v) => `'${String(v).replace(/'/g, "''")}'`;

function queryCloud(sql) {
  const file = path.join(os.tmpdir(), `jukirhub-query-${process.pid}-${Date.now()}.sql`);
  fs.writeFileSync(file, sql, { mode: 0o600 });
  try {
    execSync(`npx --yes supabase@latest db query --linked --file "${file}"`, { stdio: ['ignore', 'ignore', 'inherit'] });
  } finally {
    fs.rmSync(file, { force: true });
  }
}

async function main() {
  const refFile = 'supabase/.temp/project-ref';
  if (!fs.existsSync(refFile)) throw new Error('Proyek Supabase belum di-link. Jalankan dulu: npx supabase link --project-ref <ref>');
  const ref = fs.readFileSync(refFile, 'utf8').trim();
  if (ref === 'pylduwdknbaslmbrimjg') throw new Error('Ini proyek Adami, bukan JukirHub. Batal.');
  const urlFungsi = `https://${ref}.supabase.co/functions/v1/berita`;

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const kunci = (process.env.GEMINI_API_KEY ||
    await rl.question('Tempel kunci Gemini dari aistudio.google.com/apikey (Enter = pakai yang sudah terpasang): ')).trim();
  rl.close();
  // Format kunci Google lama "AIza…" dan baru "AQ.…" (ada titik).
  if (kunci && !/^[A-Za-z0-9._-]{30,}$/.test(kunci)) throw new Error('Format kunci Gemini tidak dikenali. Salin ulang dari AI Studio.');

  const secret = randomBytes(32).toString('base64url');
  const fileSementara = path.join(os.tmpdir(), `jukirhub-secrets-${process.pid}.env`);
  fs.writeFileSync(fileSementara, [`BERITA_SECRET=${secret}`, ...(kunci ? [`GEMINI_API_KEY=${kunci}`] : [])].join('\n') + '\n', { mode: 0o600 });
  try {
    console.log('Memasang secret Edge Function…');
    execSync(`npx supabase secrets set --env-file "${fileSementara}" --project-ref ${ref}`, { stdio: 'inherit' });
  } finally {
    fs.rmSync(fileSementara, { force: true });
  }

  console.log('Menyimpan URL & secret jadwal ke Supabase Vault…');
  queryCloud(`
    do $blok$
    declare v uuid;
    begin
      select id into v from vault.secrets where name = 'berita_secret';
      if v is null then perform vault.create_secret(${sqlStr(secret)}, 'berita_secret', 'Header x-berita-secret untuk Edge Function berita');
      else perform vault.update_secret(v, ${sqlStr(secret)}); end if;
      select id into v from vault.secrets where name = 'berita_url';
      if v is null then perform vault.create_secret(${sqlStr(urlFungsi)}, 'berita_url', 'URL Edge Function berita');
      else perform vault.update_secret(v, ${sqlStr(urlFungsi)}); end if;
    end
    $blok$;`);

  console.log('Menunggu secret aktif…');
  await new Promise(r => setTimeout(r, 8000));
  const res = await fetch(urlFungsi, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-berita-secret': secret },
    body: '{}',
    signal: AbortSignal.timeout(90_000)
  });
  const isi = await res.json().catch(() => null);
  console.log(`\nUji fungsi berita → HTTP ${res.status}`, JSON.stringify(isi));
  if (res.status !== 200) throw new Error('Uji gagal. Tunggu ±1 menit lalu jalankan ulang (secret baru mungkin belum aktif).');
  if (isi?.dilewati) throw new Error('GEMINI_API_KEY belum terpasang. Jalankan ulang dan tempel kuncinya.');
  console.log(`\n✔ Berita parkir aktif: diambil tiap 3 jam, tampil di Beranda & halaman /berita (${isi?.relevan ?? 0} berita baru kali ini).`);
}

main().catch((err) => {
  console.error(`\n✖ ${err.message}`);
  process.exit(1);
});
