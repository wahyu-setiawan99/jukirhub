// Pembuat bagian SEO yang ditanam ke HTML saat build (lihat plugin di vite.config.js, pola Adami):
// meta & Open Graph, data terstruktur JSON-LD, konten statis per halaman, robots.txt, sitemap.xml.
// Setiap halaman (/, /peta, /daftar, /info) punya HTML statis sendiri: judul, deskripsi, canonical, dan isi
// yang bisa dibaca tanpa JavaScript. Halaman per tempat ditunda (AGENTS.md 1.2). Fungsi murni tanpa DOM supaya bisa
// dites dengan node:test.

import { CATATAN_KAKI, FAQ, HALAMAN, HERO, LANGKAH, SITUS, TENTANG, WILAYAH } from './konten-beranda.js';
import { svgLogoInline } from './logo.js';

// Halaman selain Beranda yang dibuatkan HTML statis sendiri (daftar.html, dst. — lihat cleanUrls di vercel.json).
export const JALUR_STATIS = ['/peta', '/daftar', '/info'];

export function escHtml(teks) {
  return String(teks)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// JSON di dalam <script>: "<" di-escape agar teks seperti "</script>" tidak menutup tag lebih awal.
const ESCAPE_KURUNG = '\\' + 'u003c';
export function jsonLdAman(obj) {
  return JSON.stringify(obj).replace(/</g, ESCAPE_KURUNG);
}

const rapikanUrl = (url) => String(url).replace(/\/+$/, '');
const halaman = (jalur) => HALAMAN[jalur] ?? HALAMAN['/'];
const urlHalaman = (dasar, jalur) => `${dasar}${jalur === '/' ? '/' : jalur}`;

// Hanya origin https (mis. https://xxxx.supabase.co) yang dipakai untuk preconnect; http lokal diabaikan.
function asalHttps(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' ? u.origin : null;
  } catch {
    return null;
  }
}

export function buatDataTerstruktur(url, jalur = '/') {
  const dasar = rapikanUrl(url);
  if (jalur !== '/') {
    const h = halaman(jalur);
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: h.judul,
        description: h.deskripsi,
        url: urlHalaman(dasar, jalur),
        inLanguage: 'id',
        isPartOf: { '@type': 'WebSite', name: SITUS.nama, url: `${dasar}/` }
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Beranda', item: `${dasar}/` },
          { '@type': 'ListItem', position: 2, name: h.nama, item: urlHalaman(dasar, jalur) }
        ]
      }
    ];
  }
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITUS.nama,
      url: `${dasar}/`,
      inLanguage: 'id'
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITUS.nama,
      url: `${dasar}/`,
      logo: `${dasar}/ikon-512.png`
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: SITUS.nama,
      url: `${dasar}/`,
      description: SITUS.deskripsi,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web, Android, iOS',
      inLanguage: 'id',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'IDR' },
      areaServed: WILAYAH.daftar.map(name => ({ '@type': 'AdministrativeArea', name }))
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.butir.map(f => ({
        '@type': 'Question',
        name: f.tanya,
        acceptedAnswer: { '@type': 'Answer', text: f.jawab }
      }))
    }
  ];
}

export function buatKepalaSeo(url, { supabaseUrl, jalur = '/' } = {}) {
  const dasar = rapikanUrl(url);
  const h = halaman(jalur);
  const kanonik = escHtml(urlHalaman(dasar, jalur));
  const asalData = asalHttps(supabaseUrl);
  const altGambar = escHtml(`${SITUS.nama}: info juru parkir dari laporan warga`);
  const t = escHtml(h.judul);
  const d = escHtml(h.deskripsi);
  return [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}" />`,
    `<meta name="robots" content="index, follow, max-image-preview:large" />`,
    `<link rel="canonical" href="${kanonik}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escHtml(SITUS.nama)}" />`,
    `<meta property="og:locale" content="id_ID" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:url" content="${kanonik}" />`,
    `<meta property="og:image" content="${escHtml(dasar)}/og.png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${altGambar}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
    `<meta name="twitter:image" content="${escHtml(dasar)}/og.png" />`,
    `<meta name="twitter:image:alt" content="${altGambar}" />`,
    `<meta name="application-name" content="${escHtml(SITUS.nama)}" />`,
    // Sambungan ke server data dibuka lebih awal: data tampil lebih cepat di jaringan seluler.
    ...(asalData ? [`<link rel="preconnect" href="${escHtml(asalData)}" crossorigin />`] : []),
    ...buatDataTerstruktur(dasar, jalur).map(o => `<script type="application/ld+json">${jsonLdAman(o)}</script>`)
  ].join('\n    ');
}

const kepalaStatis = () => {
  const e = escHtml;
  return `<header class="atas"><a class="merek" href="/" aria-label="${e(SITUS.nama)}, ke Beranda"><span class="logo">${svgLogoInline(28)}</span><span>${e(SITUS.nama)}</span></a></header>`;
};

const MENU = [['/', 'Beranda'], ['/peta', 'Peta'], ['/daftar', 'Daftar tempat'], ['/info', 'Info']];

// Konten statis yang bisa dibaca tanpa JavaScript. React menggantinya saat app dimuat;
// kelas CSS sama dengan halaman React agar pergantiannya halus.
export function buatIsiStatis(jalur = '/') {
  const e = escHtml;
  if (jalur !== '/') {
    const h = halaman(jalur);
    const menu = MENU.filter(([j]) => j !== jalur)
      .map(([j, label]) => `<a class="tombol-sekunder" href="${j}">${e(label)}</a>`).join('\n          ');
    return `<div class="statis">
      ${kepalaStatis()}
      <main class="halaman beranda">
        <section class="beranda-pembuka">
          <h1>${e(h.h1)}</h1>
          <p class="redup">${e(h.intro)}</p>
          <p class="beranda-status">Memuat data tempat parkir…</p>
        </section>
        <nav class="aksi-beranda" aria-label="Menu">
          ${menu}
        </nav>
        <p class="disclaimer">${e(CATATAN_KAKI)}</p>
      </main>
    </div>`;
  }
  return `<div class="statis">
      ${kepalaStatis()}
      <main class="halaman beranda">
        <section class="beranda-pembuka">
          <h1>${e(HERO.judul)}</h1>
          <p class="redup">${e(HERO.sub)}</p>
          <p class="beranda-status">Memuat data tempat parkir…</p>
        </section>
        <nav class="aksi-beranda" aria-label="Menu">
          <a class="tombol-sekunder" href="/peta">Buka peta</a>
          <a class="tombol-sekunder" href="/daftar">Lihat daftar</a>
        </nav>
        <section class="seksi-beranda">
          <h2>${e(TENTANG.judul)}</h2>
          ${TENTANG.paragraf.map(p => `<p>${e(p)}</p>`).join('\n          ')}
        </section>
        <section class="seksi-beranda">
          <h2>${e(LANGKAH.judul)}</h2>
          <ol class="langkah-beranda">
            ${LANGKAH.butir.map(b => `<li><strong>${e(b.judul)}</strong><span>${e(b.teks)}</span></li>`).join('\n            ')}
          </ol>
        </section>
        <section class="seksi-beranda">
          <h2>${e(WILAYAH.judul)}</h2>
          <p>${e(WILAYAH.teks)}</p>
        </section>
        <section class="seksi-beranda">
          <h2>${e(FAQ.judul)}</h2>
          <div class="faq">
            ${FAQ.butir.map(f => `<details><summary>${e(f.tanya)}</summary><p>${e(f.jawab)}</p></details>`).join('\n            ')}
          </div>
        </section>
        <p class="disclaimer">${e(CATATAN_KAKI)}</p>
      </main>
    </div>`;
}

export function buatRobots(url) {
  return `User-agent: *\nAllow: /\n\nSitemap: ${rapikanUrl(url)}/sitemap.xml\n`;
}

const PRIORITAS = { '/': '1.0', '/peta': '0.8', '/daftar': '0.8', '/info': '0.6' };

export function buatSitemap(url, tanggal = new Date(), jalur = ['/', ...JALUR_STATIS]) {
  const dasar = escHtml(rapikanUrl(url));
  const lastmod = tanggal.toISOString().slice(0, 10);
  const baris = jalur.map(j =>
    `  <url><loc>${urlHalaman(dasar, j)}</loc><lastmod>${lastmod}</lastmod><changefreq>${j === '/' ? 'daily' : 'weekly'}</changefreq><priority>${PRIORITAS[j] ?? '0.5'}</priority></url>`
  );
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    baris.join('\n') + '\n' +
    '</urlset>\n';
}
