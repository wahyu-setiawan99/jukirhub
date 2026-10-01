// Pastikan commit terakhir di `main` sudah TAYANG di jukirhub.site (AGENTS.md bagian 9).
//
//   git push && npm run cek:tayang
//
// Membandingkan HEAD lokal dengan /versi.json di situs (ditulis saat build, lihat web/vite.config.js), sambil membaca
// status build Vercel dari GitHub (API publik). Dicek tiap 30 detik, maks. 10 menit: jangan lebih sering, loop cepat
// pernah memicu Vercel Security Checkpoint (29 Sept 2026).

import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const SITUS = 'https://jukirhub.site';
const REPO = 'wahyu-setiawan99/jukirhub';
const JEDA_MS = 30_000;
const MAKS_MS = 10 * 60_000;
// Build sudah sukses tapi situs belum berganti selama ini → deploy tidak otomatis dijadikan Production.
const TENGGANG_PRODUCTION_MS = 120_000;

// Fungsi murni (dites di tests/cek-tayang.test.js).
// statusGithub: 'pending' | 'success' | 'failure' | 'error' | null; msSejakSukses: sejak status GitHub pertama kali success.
export function putuskan({ commitTarget, commitTayang, statusGithub, msSejakSukses = 0, mitigasi = false }) {
  if (mitigasi) return 'diblokir';
  if (commitTayang && commitTarget && commitTayang === commitTarget) return 'tayang';
  if (statusGithub === 'failure' || statusGithub === 'error') return 'gagal';
  if (statusGithub === 'success' && msSejakSukses >= TENGGANG_PRODUCTION_MS) return 'belum_production';
  return 'tunggu';
}

export const PESAN = {
  tayang: (detik) => `✔ Sudah tayang di ${SITUS} (±${detik} detik setelah dicek).`,
  gagal: (url) => `✖ Build Vercel GAGAL untuk commit ini. Lihat log: ${url || 'tab Deployments proyek jukirhub di Vercel'}`,
  belum_production: () => [
    '✖ Build berhasil, tapi situs belum berganti: Vercel tidak otomatis menjadikannya Production.',
    '  Sekali saja di Vercel (proyek jukirhub) → Settings → Environments → Production:',
    '  - Branch Tracking = main',
    '  - aktifkan "Auto-assign Custom Production Domains"',
    '  Lalu Deployments → deploy teratas → ⋯ → Promote to Production.'
  ].join('\n'),
  diblokir: () => '✖ Vercel Security Checkpoint (403) untuk jaringan ini. Berhenti mengecek; buka situs dari HP untuk memastikan.',
  habis: () => '✖ Belum tayang setelah 10 menit. Cek tab Deployments proyek jukirhub di Vercel.'
};

const tidur = (ms) => new Promise(r => setTimeout(r, ms));

async function statusGithub(commit) {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/commits/${commit}/status`, {
      headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(15_000)
    });
    if (!res.ok) return { status: null };
    const j = await res.json();
    const vercel = (j.statuses ?? []).find(s => /vercel/i.test(s.context));
    return { status: vercel?.state ?? (j.statuses?.length ? j.state : 'pending'), url: vercel?.target_url };
  } catch {
    return { status: null };
  }
}

async function commitTayang() {
  try {
    const res = await fetch(`${SITUS}/versi.json?t=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(15_000) });
    if (res.status === 403 && res.headers.get('x-vercel-mitigated')) return { mitigasi: true };
    if (!res.ok) return {};
    return { commit: (await res.json()).commit };
  } catch {
    return {};
  }
}

async function main() {
  const target = execSync('git rev-parse HEAD').toString().trim();
  const diRemote = execSync('git ls-remote origin refs/heads/main').toString().split(/\s/)[0];
  if (diRemote !== target) {
    console.log('✖ Commit terakhir belum di-push ke origin/main. Jalankan git push dulu.');
    process.exit(1);
  }
  console.log(`Menunggu commit ${target.slice(0, 7)} tayang di ${SITUS} (cek tiap 30 detik)…`);
  const mulai = Date.now();
  let suksesSejak = null;
  while (Date.now() - mulai < MAKS_MS) {
    const [gh, situs] = await Promise.all([statusGithub(target), commitTayang()]);
    if (gh.status === 'success' && suksesSejak == null) suksesSejak = Date.now();
    const hasil = putuskan({
      commitTarget: target, commitTayang: situs.commit, statusGithub: gh.status,
      msSejakSukses: suksesSejak == null ? 0 : Date.now() - suksesSejak, mitigasi: situs.mitigasi
    });
    if (hasil === 'tayang') { console.log(PESAN.tayang(Math.round((Date.now() - mulai) / 1000))); return; }
    if (hasil !== 'tunggu') { console.log(PESAN[hasil](gh.url)); process.exit(2); }
    console.log(`  … build: ${gh.status ?? 'belum ada'}, situs: ${situs.commit?.slice(0, 7) ?? '-'}`);
    await tidur(JEDA_MS);
  }
  console.log(PESAN.habis());
  process.exit(2);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
