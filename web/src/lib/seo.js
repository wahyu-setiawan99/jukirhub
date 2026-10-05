// Pembuat bagian SEO yang ditanam ke HTML saat build (lihat plugin di vite.config.js, pola Adami):
// meta & Open Graph, data terstruktur JSON-LD, konten statis per halaman, robots.txt, sitemap.xml.
// Setiap halaman (/, /peta, /daftar, /info) punya HTML statis sendiri: judul, deskripsi, canonical, dan isi
// yang bisa dibaca tanpa JavaScript, termasuk halaman per tempat (AGENTS.md 1.7) dan per wilayah (1.8 B). Fungsi murni
// tanpa DOM supaya bisa dites dengan node:test.

import { CATATAN_KAKI, FAQ, HALAMAN, HERO, LANGKAH, SITUS, TAUTAN_SITUS, TENTANG, WILAYAH } from './konten-beranda.js';
import { BERLAKU_SEJAK, ISI_LEGAL } from './konten-legal.js';
import { barisRingkasTempat, deskripsiTempat, jalurTempat, judulTempat, layakIndeks } from './halaman-tempat.js';
import {
  angkaWilayah, deskripsiWilayah, judulWilayah, remahTempat, remahWilayah, tetangga
} from './halaman-wilayah.js';
import { svgLogoInline } from './logo.js';

// Halaman selain Beranda yang dibuatkan HTML statis sendiri (daftar.html, dst. — lihat cleanUrls di vercel.json).
export const JALUR_STATIS = ['/peta', '/daftar', '/info', '/berita', '/tentang', '/privasi', '/syarat', '/kontak'];

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

export function buatDataTerstruktur(url, jalur = '/', khusus = null) {
  const dasar = rapikanUrl(url);
  if (jalur !== '/') {
    const h = khusus ?? halaman(jalur);
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
        // `khusus.remah` = [[nama, jalur], …] untuk halaman bertingkat (wilayah, tempat); selain itu Beranda › halaman.
        itemListElement: [['Beranda', '/'], ...(khusus?.remah ?? [[h.nama, jalur]])].map(([nama, j], i) => (
          { '@type': 'ListItem', position: i + 1, name: nama, item: urlHalaman(dasar, j) }
        ))
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

// Kode penerbit AdSense ca-pub-<16 angka> (env VITE_ADSENSE_CLIENT); selain itu diabaikan.
export const kodeAdsenseSah = (k) => (typeof k === 'string' && /^ca-pub-\d{16}$/.test(k) ? k : null);

// `khusus` = { nama, judul, deskripsi, indeks, remah? } untuk halaman dinamis (mis. /tempat/…), menggantikan HALAMAN[jalur].
export function buatKepalaSeo(url, { supabaseUrl, jalur = '/', adsense = null, khusus = null } = {}) {
  const dasar = rapikanUrl(url);
  const h = khusus ?? halaman(jalur);
  const kanonik = escHtml(urlHalaman(dasar, jalur));
  const asalData = asalHttps(supabaseUrl);
  const altGambar = escHtml(`${SITUS.nama}: info juru parkir dari laporan warga`);
  const t = escHtml(h.judul);
  const d = escHtml(h.deskripsi);
  return [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}" />`,
    `<meta name="robots" content="${khusus && !khusus.indeks ? 'noindex, follow' : 'index, follow, max-image-preview:large'}" />`,
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
    // Verifikasi situs Google AdSense lewat meta tag: tanpa memuat skrip iklan (situs tetap cepat).
    ...(kodeAdsenseSah(adsense) ? [`<meta name="google-adsense-account" content="${kodeAdsenseSah(adsense)}" />`] : []),
    // Sambungan ke server data dibuka lebih awal: data tampil lebih cepat di jaringan seluler.
    ...(asalData ? [`<link rel="preconnect" href="${escHtml(asalData)}" crossorigin />`] : []),
    ...buatDataTerstruktur(dasar, jalur, khusus).map(o => `<script type="application/ld+json">${jsonLdAman(o)}</script>`)
  ].join('\n    ');
}

const kepalaStatis = () => {
  const e = escHtml;
  return `<header class="atas"><a class="merek" href="/" aria-label="${e(SITUS.nama)}, ke Beranda"><span class="logo">${svgLogoInline(28)}</span><span class="nama-merek">${e(SITUS.nama)}</span></a></header>`;
};

const MENU = [['/', 'Beranda'], ['/peta', 'Peta'], ['/daftar', 'Daftar tempat'], ['/berita', 'Berita parkir'], ['/info', 'Info']];

const tautanSitusStatis = () => `<nav class="tautan-situs" aria-label="Tentang situs">${TAUTAN_SITUS
  .map(([j, label]) => `<a href="${j}">${escHtml(label)}</a>`).join('')}</nav>`;

// Halaman situs (Tentang, Privasi, Syarat, Kontak): teks lengkap ikut HTML statis supaya terbaca tanpa JavaScript.
function isiLegalStatis(jalur) {
  const e = escHtml;
  const h = halaman(jalur);
  const bagian = ISI_LEGAL[jalur].bagian.map(b => `<section class="kartu"><h2>${e(b.judul)}</h2>${(b.paragraf ?? []).map(p => `<p>${e(p)}</p>`).join('')}` +
    `${b.poin ? `<ul class="poin">${b.poin.map(p => `<li>${e(p)}</li>`).join('')}</ul>` : ''}</section>`).join('\n        ');
  const berlaku = jalur === '/privasi' || jalur === '/syarat' ? `<p class="redup kecil">Berlaku sejak ${e(BERLAKU_SEJAK)}.</p>` : '';
  return `<div class="statis">
      ${kepalaStatis()}
      <main class="halaman halaman-legal">
        <section class="kepala-halaman">
          <h1>${e(h.h1)}</h1>
          <p class="redup">${e(h.intro)}</p>
          ${berlaku}
        </section>
        ${bagian}
        ${tautanSitusStatis()}
        <p class="disclaimer">${e(CATATAN_KAKI)}</p>
      </main>
    </div>`;
}

// Konten statis yang bisa dibaca tanpa JavaScript. React menggantinya saat app dimuat;
// kelas CSS sama dengan halaman React agar pergantiannya halus.
export function buatIsiStatis(jalur = '/') {
  const e = escHtml;
  if (ISI_LEGAL[jalur]) return isiLegalStatis(jalur);
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
        ${tautanSitusStatis()}
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
        ${tautanSitusStatis()}
        <p class="disclaimer">${e(CATATAN_KAKI)}</p>
      </main>
    </div>`;
}

// Remah roti tampak: Beranda › … › halaman ini (item terakhir bukan tautan).
export function remahStatis(remah) {
  const e = escHtml;
  const isi = [['Beranda', '/'], ...remah].map(([nama, j], i, a) => (i === a.length - 1
    ? `<span aria-current="page">${e(nama)}</span>` : `<a href="${e(j)}">${e(nama)}</a>`)).join(' › ');
  return `<nav class="remah redup kecil" aria-label="Remah roti">${isi}</nav>`;
}

// ------------------------------------------------------------------ halaman per tempat (/tempat/<slug>-<id>)

export const khususTempat = (t) => ({
  nama: t.nama, judul: judulTempat(t), deskripsi: deskripsiTempat(t), indeks: layakIndeks(t), remah: remahTempat(t)
});

export function buatIsiTempat(t, sekitar = []) {
  const e = escHtml;
  const baris = barisRingkasTempat(t).map(([k, v]) => `<dt>${e(k)}</dt><dd>${e(v)}</dd>`).join('');
  const lain = sekitar.length
    ? `<section class="kartu"><h2>Tempat parkir lain di sekitar</h2><ul class="daftar-sekitar">${sekitar
      .map(x => `<li><a href="${jalurTempat(x)}">${e(x.nama)}</a></li>`).join('')}</ul></section>`
    : '';
  return `<div class="statis">
      ${kepalaStatis()}
      <main class="halaman halaman-tempat">
        ${remahStatis(remahTempat(t))}
        <section class="kepala-halaman">
          <h1>Parkir di ${e(t.nama)}</h1>
          <p class="redup">${e([t.kota, `${t.ringkasan.jumlah} laporan warga`].filter(Boolean).join(' · '))}</p>
        </section>
        <section class="kartu"><p>${e(deskripsiTempat(t))}</p><dl class="baris-ringkas">${baris}</dl></section>
        ${lain}
        <nav class="aksi-beranda" aria-label="Menu"><a class="tombol-sekunder" href="/peta">Peta</a><a class="tombol-sekunder" href="/daftar">Daftar tempat</a></nav>
        ${tautanSitusStatis()}
        <p class="disclaimer">Laporan warga, belum diverifikasi pihak berwenang. Indikasi bukan tuduhan. ${e(CATATAN_KAKI)}</p>
      </main>
    </div>`;
}

// Tautan ke semua halaman tempat, ditanam di HTML statis /daftar (jalur bagi mesin pencari).
export function buatDaftarTautanTempat(tempat) {
  if (!tempat.length) return '';
  return `<section class="kartu"><h2>Tempat yang sudah dilaporkan</h2><ul class="daftar-sekitar">${tempat
    .map(t => `<li><a href="${jalurTempat(t)}">${escHtml(t.nama)}</a></li>`).join('')}</ul></section>`;
}

// ------------------------------------------------------------------ halaman wilayah (/wilayah/<provinsi>[/<kab-kota>])

export const khususWilayah = (r) => ({
  nama: r.wilayah.nama, judul: judulWilayah(r.wilayah), deskripsi: deskripsiWilayah(r), indeks: r.indeks,
  remah: remahWilayah(r.wilayah)
});

const MAKS_TEMPAT_WILAYAH = 20;

// `tarif` = tarif resmi kab/kota { motor, mobil, dasar_hukum } yang sudah disetujui pemilik (1.8 C), atau null.
export function buatIsiWilayah(r, tarif = null) {
  const e = escHtml;
  const w = r.wilayah;
  const angka = angkaWilayah(r).map(([k, v]) => `<div><dt>${e(k)}</dt><dd>${e(v)}</dd></div>`).join('');
  const rp = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;
  const tarifResmi = tarif && (tarif.motor || tarif.mobil)
    ? `<section class="kartu"><h2>Tarif resmi parkir tepi jalan umum</h2><dl class="baris-ringkas">${tarif.motor ? `<dt>Motor</dt><dd>${rp(tarif.motor)} sekali parkir</dd>` : ''}${tarif.mobil ? `<dt>Mobil</dt><dd>${rp(tarif.mobil)} sekali parkir</dd>` : ''}</dl>` +
      `<p class="redup kecil">${e(tarif.dasar_hukum ?? '')}. Tarif bisa berbeda di lokasi tertentu; cek papan resmi.</p></section>`
    : '';
  const imbauan = r.imbauan
    ? `<section class="kartu imbauan"><h2>${e(r.imbauan.judul)}</h2><ul class="poin">${r.imbauan.kalimat.map(k => `<li>${e(k)}</li>`).join('')}</ul></section>`
    : '';
  const tempat = r.tempat.length
    ? `<section class="kartu"><h2>Tempat paling banyak dilaporkan</h2><ul class="daftar-sekitar">${r.tempat.slice(0, MAKS_TEMPAT_WILAYAH)
      .map(t => `<li><a href="${jalurTempat(t)}">${e(t.nama)}</a><span class="redup kecil jarak-sekitar">${t.ringkasan.jumlah} laporan</span></li>`).join('')}</ul></section>`
    : `<section class="kartu"><p>Belum ada tempat parkir yang dilaporkan di ${e(w.nama)}. Tempat muncul setelah warga melapor dari lokasi.</p></section>`;
  const ada = (r.kabupaten ?? []).filter(k => k.jumlahLaporan);
  const belum = (r.kabupaten ?? []).filter(k => !k.jumlahLaporan);
  const kab = r.kabupaten
    ? `<section class="kartu"><h2>Kabupaten/kota</h2>${ada.length ? `<ul class="daftar-sekitar">${ada
      .map(k => `<li><a href="${k.wilayah.jalur}">${e(k.wilayah.nama)}</a><span class="redup kecil jarak-sekitar">${k.jumlahTempat} tempat · ${k.jumlahLaporan} laporan</span></li>`).join('')}</ul>` : ''}` +
      `${belum.length ? `<p class="redup kecil">Belum ada laporan:</p><p class="tautan-wilayah">${belum.map(k => `<a href="${k.wilayah.jalur}">${e(k.wilayah.nama)}</a>`).join(' ')}</p>` : ''}</section>`
    : `<section class="kartu"><h2>Daerah lain di ${e(remahWilayah(w)[0][0])}</h2><p class="tautan-wilayah">${tetangga(w)
      .map(x => `<a href="${x.jalur}">${e(x.nama)}</a>`).join(' ')}</p></section>`;
  return `<div class="statis">
      ${kepalaStatis()}
      <main class="halaman halaman-wilayah">
        ${remahStatis(remahWilayah(w))}
        <section class="kepala-halaman">
          <h1>${e(judulWilayah(w).replace(/ · .*$/, ''))}</h1>
          <p class="redup">${e(deskripsiWilayah(r))}</p>
        </section>
        <dl class="angka-wilayah">${angka}</dl>
        ${tarifResmi}
        ${imbauan}
        ${tempat}
        ${kab}
        <nav class="aksi-beranda" aria-label="Menu"><a class="tombol-sekunder" href="/peta">Peta</a><a class="tombol-sekunder" href="/daftar">Daftar tempat</a><a class="tombol-sekunder" href="/berita">Berita parkir</a></nav>
        ${tautanSitusStatis()}
        <p class="disclaimer">Laporan warga, belum diverifikasi pihak berwenang. Indikasi bukan tuduhan. ${e(CATATAN_KAKI)}</p>
      </main>
    </div>`;
}

// Tautan ke halaman wilayah yang sudah punya laporan (provinsi & kab/kota), ditanam di HTML statis /daftar.
export function buatDaftarTautanWilayah(ringkasan) {
  const ada = ringkasan.filter(r => r.jumlahLaporan > 0);
  if (!ada.length) return '';
  return `<section class="kartu"><h2>Ringkasan per daerah</h2><ul class="daftar-sekitar">${ada
    .map(r => `<li><a href="${r.wilayah.jalur}">${escHtml(r.wilayah.nama)}</a><span class="redup kecil jarak-sekitar">${r.jumlahLaporan} laporan</span></li>`).join('')}</ul></section>`;
}

export function buatRobots(url) {
  return `User-agent: *\nAllow: /\n\nSitemap: ${rapikanUrl(url)}/sitemap.xml\n`;
}

const PRIORITAS = { '/': '1.0', '/peta': '0.8', '/daftar': '0.8', '/info': '0.6' };

// `tempat` = tempat terlapor, `wilayah` = ringkasan wilayah; hanya yang layak diindeks masuk sitemap,
// lastmod = laporan terakhir.
export function buatSitemap(url, tanggal = new Date(), jalur = ['/', ...JALUR_STATIS], tempat = [], wilayah = []) {
  const dasar = escHtml(rapikanUrl(url));
  const lastmod = tanggal.toISOString().slice(0, 10);
  const baris = jalur.map(j =>
    `  <url><loc>${urlHalaman(dasar, j)}</loc><lastmod>${lastmod}</lastmod><changefreq>${j === '/' ? 'daily' : 'weekly'}</changefreq><priority>${PRIORITAS[j] ?? '0.5'}</priority></url>`
  );
  for (const t of tempat.filter(layakIndeks)) {
    const ubah = t.ringkasan.terakhir ? String(t.ringkasan.terakhir).slice(0, 10) : lastmod;
    baris.push(`  <url><loc>${dasar}${escHtml(jalurTempat(t))}</loc><lastmod>${ubah}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>`);
  }
  for (const r of wilayah.filter(x => x.indeks)) {
    const ubah = r.terakhir ? String(r.terakhir).slice(0, 10) : lastmod;
    baris.push(`  <url><loc>${dasar}${escHtml(r.wilayah.jalur)}</loc><lastmod>${ubah}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`);
  }
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    baris.join('\n') + '\n' +
    '</urlset>\n';
}
