import fs from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { SITUS } from './src/lib/konten-beranda.js';
import {
  JALUR_STATIS, buatDaftarTautanTempat, buatDaftarTautanWilayah, buatIsiStatis, buatIsiTempat, buatIsiWilayah, buatKepalaSeo,
  buatRobots, buatSitemap, khususTempat, khususWilayah, kodeAdsenseSah
} from './src/lib/seo.js';
import { KOLOM_IMBAUAN, KOLOM_RINGKASAN, KOLOM_TARIF, KOLOM_TITIK, ambilView, konfigurasiData } from './src/lib/data.js';
import { petaTarif } from '../supabase/functions/_shared/tarif-peta.js';
import { gabungTempat, jarakM } from './src/lib/tempat.js';
import { jalurTempat } from './src/lib/halaman-tempat.js';
import { ringkasWilayah, semuaWilayah } from './src/lib/halaman-wilayah.js';

// Modul skoring & konstanta hidup di supabase/functions/_shared agar ikut ter-deploy
// ke Edge Function. Web mengimpornya lewat alias ini — satu file, tidak disalin.
const shared = fileURLToPath(new URL('../supabase/functions/_shared', import.meta.url));

// Commit yang sedang dibangun (Vercel mengisi VERCEL_GIT_COMMIT_SHA). Ditulis ke /versi.json supaya
// `npm run cek:tayang` bisa memastikan push terakhir benar-benar tayang (AGENTS.md bagian 9).
function commitSekarang() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
  try { return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return 'lokal'; }
}

// SEO: app dirender JavaScript, jadi HTML awalnya kosong bagi mesin pencari & pratinjau tautan.
// Plugin ini menanam meta, JSON-LD, dan konten statis ke index.html (Beranda), lalu membuat HTML
// statis untuk /peta, /daftar, /info (disajikan lewat cleanUrls di vercel.json), robots.txt, sitemap.xml,
// versi.json. Alamat situs dari VITE_SITE_URL. Juga halaman per tempat (AGENTS.md 1.7) dan per wilayah (1.8 B) dari data
// Supabase saat build; build ulang harian (pg_cron `bangun-ulang`) menyegarkannya.
function seoHalaman() {
  let url = SITUS.urlBawaan;
  let supabaseUrl = '';
  let adsense = null;
  let konfigData = null;
  return {
    name: 'seo-halaman',
    configResolved(config) {
      url = (config.env.VITE_SITE_URL || SITUS.urlBawaan).replace(/\/+$/, '');
      supabaseUrl = config.env.VITE_SUPABASE_URL || '';
      // Kode penerbit AdSense (ca-pub-…), diisi pemilik di env Vercel setelah daftar AdSense. Kosong = tanpa meta & ads.txt.
      adsense = kodeAdsenseSah(config.env.VITE_ADSENSE_CLIENT);
      konfigData = konfigurasiData(config.env);
    },
    transformIndexHtml(html) {
      if (!html.includes('<!--seo-kepala-->') || !html.includes('<!--seo-isi-->')) {
        throw new Error('index.html harus memuat penanda <!--seo-kepala--> dan <!--seo-isi-->');
      }
      return html
        .replace('<!--seo-kepala-->', () => buatKepalaSeo(url, { supabaseUrl, adsense }))
        .replace('<!--seo-isi-->', () => buatIsiStatis());
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: buatRobots(url) });
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: buatSitemap(url, new Date()) });
      // ads.txt resmi Google AdSense (f08c47fec0942fa0 = ID TAG Google), hanya bila kode penerbit diisi.
      if (adsense) this.emitFile({ type: 'asset', fileName: 'ads.txt', source: `google.com, ${adsense.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n` });
      this.emitFile({ type: 'asset', fileName: 'versi.json', source: `${JSON.stringify({ commit: commitSekarang(), dibangun: new Date().toISOString() })}\n` });
    },
    // index.html final (sudah berisi tag script/CSS hasil build) → salin per halaman, ganti bagian SEO-nya.
    async writeBundle(options, bundle) {
      const index = bundle['index.html']?.source;
      if (typeof index !== 'string') return;
      const kepalaBeranda = buatKepalaSeo(url, { supabaseUrl, adsense });
      const isiBeranda = buatIsiStatis();
      if (!index.includes(kepalaBeranda) || !index.includes(isiBeranda)) {
        throw new Error('[seo] bagian SEO Beranda tidak ditemukan di index.html hasil build');
      }
      for (const jalur of JALUR_STATIS) {
        const html = index
          .replace(kepalaBeranda, () => buatKepalaSeo(url, { supabaseUrl, jalur, adsense }))
          .replace(isiBeranda, () => buatIsiStatis(jalur));
        fs.writeFileSync(path.join(options.dir, `${jalur.slice(1)}.html`), html);
      }

      // Halaman per tempat (/tempat/<slug>-<id>): data dari view publik Supabase saat build. Gagal / tanpa env → dilewati
      // (halaman tetap bisa dibuka lewat React). Data baru tampil di HTML statis pada build berikutnya.
      let tempat = [];
      let barisImbauan = [];
      let tarif = {};
      if (konfigData) {
        try {
          const [titik, ringkasan] = await Promise.all([
            ambilView(fetch, konfigData, 'titik_publik', KOLOM_TITIK),
            ambilView(fetch, konfigData, 'ringkasan_titik_publik', KOLOM_RINGKASAN)
          ]);
          tempat = gabungTempat(titik, ringkasan).filter(t => t.ringkasan.jumlah > 0);
        } catch (err) {
          console.warn('[seo] halaman tempat dilewati:', err.message);
        }
        // Angka 30 hari per kab/kota (imbauan & aturan indeks wilayah). Gagal → halaman wilayah tanpa angka 30 hari.
        barisImbauan = await ambilView(fetch, konfigData, 'imbauan_publik', KOLOM_IMBAUAN).catch((err) => {
          console.warn('[seo] imbauan_publik dilewati:', err.message);
          return [];
        });
        // Tarif resmi yang sudah disetujui pemilik (1.8 C). View belum ada / gagal → tanpa tarif.
        tarif = petaTarif(await ambilView(fetch, konfigData, 'tarif_resmi_publik', KOLOM_TARIF).catch(() => []));
      }
      fs.mkdirSync(path.join(options.dir, 'tempat'), { recursive: true });
      for (const t of tempat) {
        const jalur = jalurTempat(t);
        const sekitar = tempat.filter(x => x.id !== t.id).map(x => ({ ...x, jarak: jarakM(t, x) })).sort((a, b) => a.jarak - b.jarak).slice(0, 5);
        const html = index
          .replace(kepalaBeranda, () => buatKepalaSeo(url, { supabaseUrl, jalur, adsense, khusus: khususTempat(t) }))
          .replace(isiBeranda, () => buatIsiTempat(t, sekitar));
        fs.writeFileSync(path.join(options.dir, `${jalur.slice(1)}.html`), html);
      }
      // Halaman wilayah: selalu 87 (6 provinsi + 81 kab/kota Sulawesi); yang datanya tipis tetap dibuat tetapi noindex.
      const wilayah = semuaWilayah().map(w => ringkasWilayah(tempat, w, barisImbauan));
      for (const r of wilayah) {
        const jalur = r.wilayah.jalur;
        fs.mkdirSync(path.dirname(path.join(options.dir, `${jalur.slice(1)}.html`)), { recursive: true });
        const html = index
          .replace(kepalaBeranda, () => buatKepalaSeo(url, { supabaseUrl, jalur, adsense, khusus: khususWilayah(r) }))
          .replace(isiBeranda, () => buatIsiWilayah(r, r.wilayah.jenis === 'kabupaten' ? tarif[r.wilayah.kode] : null));
        fs.writeFileSync(path.join(options.dir, `${jalur.slice(1)}.html`), html);
      }
      // /daftar statis memuat tautan ke semua tempat & wilayah berlaporan; sitemap memuat yang layak diindeks.
      const fileDaftar = path.join(options.dir, 'daftar.html');
      fs.writeFileSync(fileDaftar, fs.readFileSync(fileDaftar, 'utf8').replace('<p class="disclaimer">',
        () => `${buatDaftarTautanWilayah(wilayah)}\n        ${buatDaftarTautanTempat(tempat)}\n        <p class="disclaimer">`));
      fs.writeFileSync(path.join(options.dir, 'sitemap.xml'), buatSitemap(url, new Date(), undefined, tempat, wilayah));
      if (tempat.length) console.log(`[seo] ${tempat.length} halaman tempat dibuat`);
      console.log(`[seo] ${wilayah.length} halaman wilayah dibuat (${wilayah.filter(r => r.indeks).length} diindeks)`);
    }
  };
}

export default defineConfig({
  plugins: [react(), seoHalaman()],
  resolve: { alias: { '@shared': shared } },
  // MapLibre v6 memuat worker lewat URL relatif (maplibre-gl-worker.mjs + shared.mjs).
  // Pre-bundling Vite memindahkan modul ke .vite/deps tanpa file worker → source tidak pernah dimuat (pelajaran Adami).
  optimizeDeps: { exclude: ['maplibre-gl'] },
  worker: { format: 'es' },
  server: {
    // 5174: tidak bentrok dengan server dev Adami (5173).
    port: 5174,
    fs: { allow: ['..'] }
  },
  preview: { port: 4174 }
});
