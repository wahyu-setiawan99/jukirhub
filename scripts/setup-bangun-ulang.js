// Build ulang harian (AGENTS.md 1.8 B): simpan URL Vercel Deploy Hook ke Supabase Vault (`deploy_hook_url`), dibaca
// jadwal pg_cron `bangun-ulang` (02:00 WITA, hanya bila ada laporan/tempat baru 24 jam terakhir).
// DIJALANKAN PEMILIK PROYEK (URL hook = rahasia; AI tidak melihatnya):
//
//   npm run bangun:setup
//
// Prasyarat: `npx supabase db push` (migrasi 20261003000002_bangun_ulang.sql); proyek sudah di-link.
// Membuat hook: Vercel → proyek jukirhub → Settings → Git → Deploy Hooks → nama "bangun-ulang", branch "main" → Create,
// lalu salin URL-nya (https://api.vercel.com/v1/integrations/deploy/…). Menjalankan ulang = ganti URL (aman).

import { execSync } from 'node:child_process';
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

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const url = (process.env.DEPLOY_HOOK_URL || await rl.question('Tempel URL Deploy Hook dari Vercel (https://api.vercel.com/v1/integrations/deploy/…): ')).trim();
  rl.close();
  if (!/^https:\/\/api\.vercel\.com\/v1\/integrations\/deploy\/[A-Za-z0-9_]+\/[A-Za-z0-9_-]+$/.test(url)) {
    throw new Error('Bukan URL Deploy Hook Vercel. Salin ulang dari Settings → Git → Deploy Hooks.');
  }

  console.log('Menyimpan URL Deploy Hook ke Supabase Vault…');
  queryCloud(`
    do $blok$
    declare v uuid;
    begin
      select id into v from vault.secrets where name = 'deploy_hook_url';
      if v is null then perform vault.create_secret(${sqlStr(url)}, 'deploy_hook_url', 'Vercel Deploy Hook untuk build ulang harian');
      else perform vault.update_secret(v, ${sqlStr(url)}); end if;
    end
    $blok$;`);
  console.log('\n✔ Build ulang harian aktif: tiap 02:00 WITA bila ada laporan atau tempat baru 24 jam terakhir.');
  console.log('  Build pertama terjadi malam ini (tidak dipicu sekarang). Untuk membangun sekarang: Vercel → Deployments → Redeploy.');
}

main().catch((err) => {
  console.error(`\n✖ ${err.message}`);
  process.exit(1);
});
