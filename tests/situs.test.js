import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validasiKontak } from '../supabase/functions/_shared/kontak.js';
import { PESAN_TERKIRIM, prosesKontak } from '../supabase/functions/kontak/proses.js';
import { pesanKontak } from '../supabase/functions/_shared/kabar-pemilik.js';
import { JALUR_STATIS, buatIsiStatis, buatKepalaSeo, buatSitemap, kodeAdsenseSah } from '../web/src/lib/seo.js';
import { ISI_LEGAL } from '../web/src/lib/konten-legal.js';
import { TAUTAN_SITUS } from '../web/src/lib/konten-beranda.js';

// ------------------------------------------------ formulir kontak

test('kontak: validasi pesan, email opsional, batas tautan, jebakan bot', () => {
  assert.equal(validasiKontak({ pesan: 'pendek' }).kode, 'pesan');
  assert.equal(validasiKontak({ pesan: 'x'.repeat(1001) }).kode, 'pesan');
  assert.deepEqual(validasiKontak({ pesan: '  Mohon hapus komentar di Cafe Senja  ', email: '' }).data,
    { pesan: 'Mohon hapus komentar di Cafe Senja', email: null });
  assert.equal(validasiKontak({ pesan: 'Mohon dibalas ya pengelola', email: 'bukan-email' }).kode, 'email');
  assert.equal(validasiKontak({ pesan: 'Mohon dibalas ya pengelola', email: 'a@b.co' }).data.email, 'a@b.co');
  assert.equal(validasiKontak({ pesan: 'http://a.id http://b.id http://c.id promo murah' }).kode, 'tautan');
  assert.equal(validasiKontak({ pesan: 'Pesan biasa dari bot', situs: 'spam.com' }).kode, 'bot');
});

test('kontak: diteruskan ke Telegram, isi tidak disimpan, batas per jaringan, bot dapat balasan palsu', async () => {
  const catatan = [];
  const terkirim = [];
  const db = {
    async hitung(ip, menit) { return catatan.filter(c => c === ip).length >= 3 && menit === 60 ? 3 : catatan.filter(c => c === ip).length; },
    async catat(ip) { catatan.push(ip); }
  };
  const tg = { async kirim(t) { terkirim.push(t); return true; } };
  const kirim = (body, ip = '10.0.0.1') => prosesKontak({ body, ip, garam: { ip: 'g' }, db, tg });
  const h = await kirim({ pesan: 'Mohon hapus komentar <b>kasar</b> di Cafe Senja', email: 'a@b.co' });
  assert.deepEqual(h.body, { ok: true, pesan: PESAN_TERKIRIM });
  assert.match(terkirim[0], /&lt;b&gt;kasar&lt;\/b&gt;/);
  assert.match(terkirim[0], /Balas ke: a@b\.co/);
  assert.ok(!catatan[0].includes('10.0.0.1'), 'IP disimpan sebagai hash');
  await kirim({ pesan: 'Pesan kedua yang cukup panjang' });
  await kirim({ pesan: 'Pesan ketiga yang cukup panjang' });
  assert.equal((await kirim({ pesan: 'Pesan keempat yang cukup panjang' })).body.kode, 'terlalu_sering');
  const bot = await kirim({ pesan: 'Promo pesan dari robot', situs: 'x' }, '10.0.0.2');
  assert.equal(bot.body.ok, true);
  assert.equal(terkirim.length, 3, 'pesan bot tidak diteruskan');
  const gagal = await prosesKontak({ body: { pesan: 'Telegram sedang gangguan' }, ip: null, garam: { ip: 'g' }, db,
    tg: { async kirim() { return false; } } });
  assert.equal(gagal.status, 503);
  assert.match(pesanKontak({ pesan: 'x', email: null }), /Tanpa email balasan/);
});

// ------------------------------------------------ halaman situs & AdSense

test('halaman situs ada di HTML statis & sitemap dengan teks lengkap dan tautan situs', () => {
  for (const jalur of ['/tentang', '/privasi', '/syarat', '/kontak']) {
    assert.ok(JALUR_STATIS.includes(jalur), jalur);
    const html = buatIsiStatis(jalur);
    for (const b of ISI_LEGAL[jalur].bagian) assert.ok(html.includes(b.judul.replace(/&/g, '&amp;')), `${jalur}: ${b.judul}`);
    assert.ok(buatSitemap('https://contoh.test').includes(`https://contoh.test${jalur}<`));
  }
  for (const jalur of ['/', '/info', '/berita', '/privasi']) {
    const html = buatIsiStatis(jalur);
    for (const [ke] of TAUTAN_SITUS) assert.ok(html.includes(`href="${ke}"`), `${jalur} → ${ke}`);
  }
});

test('kebijakan privasi memuat pengungkapan wajib AdSense dan hal yang benar-benar dilakukan app', () => {
  const teks = JSON.stringify(ISI_LEGAL['/privasi']);
  for (const wajib of ['Google', 'cookie', 'adssettings.google.com', 'aboutads.info', 'partner-sites',
    '7 hari', 'hash bersalt', 'Telegram', 'Nominatim', 'Pelindungan Data Pribadi']) {
    assert.ok(teks.includes(wajib), wajib);
  }
});

test('meta verifikasi AdSense hanya bila kode penerbit sah', () => {
  assert.equal(kodeAdsenseSah('ca-pub-1234567890123456'), 'ca-pub-1234567890123456');
  assert.equal(kodeAdsenseSah('pub-123'), null);
  assert.ok(buatKepalaSeo('https://contoh.test', { adsense: 'ca-pub-1234567890123456' })
    .includes('<meta name="google-adsense-account" content="ca-pub-1234567890123456" />'));
  assert.ok(!buatKepalaSeo('https://contoh.test').includes('google-adsense-account'));
});

test('ads.txt tidak dialihkan ke aplikasi (404 sampai kode AdSense diisi, bukan HTML)', async () => {
  const fs = await import('node:fs');
  const v = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  assert.ok(new RegExp(v.rewrites[0].source.replace(/^\//, '^/') + '$').test('/privasi'));
  assert.ok(!new RegExp(v.rewrites[0].source.replace(/^\//, '^/') + '$').test('/ads.txt'));
});

test('domain utama jukirhub.site: kanonik, dan alamat lama & www dialihkan permanen', async () => {
  const fs = await import('node:fs');
  const { SITUS } = await import('../web/src/lib/konten-beranda.js');
  assert.equal(SITUS.urlBawaan, 'https://jukirhub.site');
  const v = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  for (const host of ['jukirhub.vercel.app', 'www.jukirhub.site']) {
    const r = v.redirects.find(x => x.has?.[0]?.value === host);
    // "/(.*)" (bukan "/:jalur*"): pola :jalur* di Vercel tidak mencakup halaman depan "/" (diuji live 1 Okt 2026).
    assert.ok(r && r.permanent && r.source === '/(.*)' && r.destination === 'https://jukirhub.site/$1', host);
  }
});
