import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { SITUS } from './src/lib/konten-beranda.js';
import { JALUR_STATIS, buatIsiStatis, buatKepalaSeo, buatRobots, buatSitemap } from './src/lib/seo.js';

// Modul skoring & konstanta hidup di supabase/functions/_shared agar ikut ter-deploy
// ke Edge Function. Web mengimpornya lewat alias ini — satu file, tidak disalin.
const shared = fileURLToPath(new URL('../supabase/functions/_shared', import.meta.url));

// SEO: app dirender JavaScript, jadi HTML awalnya kosong bagi mesin pencari & pratinjau tautan.
// Plugin ini menanam meta, JSON-LD, dan konten statis ke index.html (Beranda), lalu membuat HTML
// statis untuk /peta, /daftar, /info (disajikan lewat cleanUrls di vercel.json), robots.txt, sitemap.xml.
// Alamat situs dari VITE_SITE_URL. Halaman per tempat ditunda (AGENTS.md 1.2).
function seoHalaman() {
  let url = SITUS.urlBawaan;
  let supabaseUrl = '';
  return {
    name: 'seo-halaman',
    configResolved(config) {
      url = (config.env.VITE_SITE_URL || SITUS.urlBawaan).replace(/\/+$/, '');
      supabaseUrl = config.env.VITE_SUPABASE_URL || '';
    },
    transformIndexHtml(html) {
      if (!html.includes('<!--seo-kepala-->') || !html.includes('<!--seo-isi-->')) {
        throw new Error('index.html harus memuat penanda <!--seo-kepala--> dan <!--seo-isi-->');
      }
      return html
        .replace('<!--seo-kepala-->', () => buatKepalaSeo(url, { supabaseUrl }))
        .replace('<!--seo-isi-->', () => buatIsiStatis());
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: buatRobots(url) });
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: buatSitemap(url, new Date()) });
    },
    // index.html final (sudah berisi tag script/CSS hasil build) → salin per halaman, ganti bagian SEO-nya.
    writeBundle(options, bundle) {
      const index = bundle['index.html']?.source;
      if (typeof index !== 'string') return;
      const kepalaBeranda = buatKepalaSeo(url, { supabaseUrl });
      const isiBeranda = buatIsiStatis();
      if (!index.includes(kepalaBeranda) || !index.includes(isiBeranda)) {
        throw new Error('[seo] bagian SEO Beranda tidak ditemukan di index.html hasil build');
      }
      for (const jalur of JALUR_STATIS) {
        const html = index
          .replace(kepalaBeranda, () => buatKepalaSeo(url, { supabaseUrl, jalur }))
          .replace(isiBeranda, () => buatIsiStatis(jalur));
        fs.writeFileSync(path.join(options.dir, `${jalur.slice(1)}.html`), html);
      }
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
