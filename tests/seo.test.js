import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FAQ, HALAMAN } from '../web/src/lib/konten-beranda.js';
import { JALUR_STATIS, buatIsiStatis, buatKepalaSeo, buatSitemap, jsonLdAman } from '../web/src/lib/seo.js';

// Aturan SEO (AGENTS.md bagian 7): judul ≤ 70, deskripsi 70–170 dan unik, satu h1, JSON-LD aman, masuk sitemap.
const URL = 'https://contoh.test';
const semuaJalur = ['/', ...JALUR_STATIS];

test('setiap halaman punya judul ≤ 70 dan deskripsi 70–170 karakter yang unik', () => {
  const judul = new Set();
  const deskripsi = new Set();
  for (const j of semuaJalur) {
    const h = HALAMAN[j];
    assert.ok(h, `HALAMAN ${j} belum ada`);
    assert.ok(h.judul.length <= 70, `judul ${j} ${h.judul.length} karakter`);
    assert.ok(h.deskripsi.length >= 70 && h.deskripsi.length <= 170, `deskripsi ${j} ${h.deskripsi.length} karakter`);
    judul.add(h.judul);
    deskripsi.add(h.deskripsi);
  }
  assert.equal(judul.size, semuaJalur.length, 'judul unik');
  assert.equal(deskripsi.size, semuaJalur.length, 'deskripsi unik');
});

test('HTML statis tiap halaman memuat tepat satu h1 dan tanpa <script>', () => {
  for (const j of semuaJalur) {
    const isi = buatIsiStatis(j);
    assert.equal((isi.match(/<h1[\s>]/g) ?? []).length, 1, j);
    assert.ok(!isi.includes('<script'), j);
  }
});

test('kepala memuat canonical per halaman dan JSON-LD yang bisa dibaca', () => {
  for (const j of semuaJalur) {
    const kepala = buatKepalaSeo(URL, { jalur: j });
    assert.ok(kepala.includes(`<link rel="canonical" href="${URL}${j}" />`), j);
    const jsonLd = [...kepala.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(m => JSON.parse(m[1]));
    assert.ok(jsonLd.length >= 2, j);
  }
  const beranda = buatKepalaSeo(URL);
  assert.ok(beranda.includes('"FAQPage"'));
  assert.equal(FAQ.butir.length, (beranda.match(/"Question"/g) ?? []).length);
});

test('jsonLdAman tidak bisa menutup tag script', () => {
  assert.ok(!jsonLdAman({ a: '</script><b>' }).includes('</script>'));
});

test('sitemap memuat semua halaman statis', () => {
  const peta = buatSitemap(URL, new Date('2026-09-24T00:00:00Z'));
  for (const j of semuaJalur) assert.ok(peta.includes(`<loc>${URL}${j}</loc>`), j);
});
