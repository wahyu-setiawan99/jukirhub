import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bacaKampanye, normalKode, tagKampanye } from '../web/src/lib/kampanye.js';
import { susunLaporan } from '../web/src/lib/fungsi.js';
import { validasiLaporan } from '../supabase/functions/_shared/lapor.js';
import { prosesLapor } from '../supabase/functions/lapor/proses.js';
import { rangkum } from '../scripts/kampanye.js';

const param = (s) => new URLSearchParams(s);

test('kode kampanye: huruf kecil, simbol jadi strip, maks 40', () => {
  assert.equal(normalKode('Makassar Uji (Okt)'), 'makassar-uji-okt');
  assert.equal(normalKode('  '), null);
  assert.equal(normalKode(null), null);
  assert.equal(normalKode('a'.repeat(50)).length, 40);
  assert.equal(normalKode('x'.repeat(39) + ' y'), 'x'.repeat(39));
});

test('baca UTM: iklan FB, fbclid tanpa UTM, kunjungan biasa', () => {
  assert.deepEqual(bacaKampanye(param('utm_source=facebook&utm_medium=paid&utm_campaign=Uji Makassar&utm_content=video-a')),
    { sumber: 'facebook', kampanye: 'uji-makassar', konten: 'video-a' });
  assert.deepEqual(bacaKampanye(param('utm_campaign=poster')), { sumber: 'lain', kampanye: 'poster', konten: '-' });
  assert.deepEqual(bacaKampanye(param('fbclid=abc')), { sumber: 'facebook', kampanye: 'tanpa-utm', konten: '-' });
  assert.equal(bacaKampanye(param('q=cafe')), null);
});

test('tag kampanye: berlaku 30 hari, isi aneh ditolak', () => {
  const sejak = Date.parse('2026-10-01T00:00:00Z');
  const c = { sumber: 'facebook', kampanye: 'uji', konten: '-', sejak };
  assert.equal(tagKampanye(c, sejak + 29 * 86_400_000), 'facebook/uji/-');
  assert.equal(tagKampanye(c, sejak + 31 * 86_400_000), null);
  assert.equal(tagKampanye({ ...c, kampanye: 'a/b' }, sejak), null);
  assert.equal(tagKampanye(null), null);
});

const dasar = { tempat: { id: 1 }, posisi: { lat: -5.14, lng: 119.43, akurasi: 10 }, perangkat: 'perangkat-uji-1',
  isian: { adaJukir: false, kendaraan: 'motor', pungli: new Set() } };

test('laporan membawa kampanye hanya bila ada; server membuang yang tidak valid tanpa menolak laporan', () => {
  assert.equal('kampanye' in susunLaporan(dasar), false);
  const body = susunLaporan({ ...dasar, kampanye: 'facebook/uji/video-a' });
  assert.equal(validasiLaporan(body).data.kampanye, 'facebook/uji/video-a');
  const aneh = validasiLaporan({ ...body, kampanye: 'DROP TABLE' });
  assert.equal(aneh.ok, true);
  assert.equal(aneh.data.kampanye, null);
});

test('lapor: kolom kampanye hanya ikut disimpan bila ada', async () => {
  const tersimpan = [];
  const db = {
    async hitungLaporan() { return 0; },
    async titikDekat() { return []; },
    async titikDetail() { return { id: 1, nama: 'Cafe', dibekukan: false, lat: -5.14, lng: 119.43 }; },
    async riwayatPerangkat() { return []; },
    async simpanLaporan(b) { tersimpan.push(b); return tersimpan.length; },
    async laporanTitik() { return []; },
    async simpanRingkasan() {}
  };
  const garam = { reporter: 'r', ip: 'i' };
  const body = susunLaporan(dasar);
  await prosesLapor({ body, ip: null, garam, db });
  await prosesLapor({ body: { ...body, kampanye: 'facebook/uji/-' }, ip: null, garam, db });
  assert.equal('kampanye' in tersimpan[0], false);
  assert.equal(tersimpan[1].kampanye, 'facebook/uji/-');
});

test('npm run kampanye: dijumlah per iklan, pelapor terbanyak dulu', () => {
  const h = rangkum([
    { sumber: 'facebook', kampanye: 'uji', konten: 'a', hari: '2026-10-01', laporan: 3, pelapor: 2 },
    { sumber: 'facebook', kampanye: 'uji', konten: 'b', hari: '2026-10-01', laporan: 5, pelapor: 5 },
    { sumber: 'facebook', kampanye: 'uji', konten: 'a', hari: '2026-10-02', laporan: 1, pelapor: 1 }
  ]);
  assert.deepEqual(h.map(x => [x.kunci, x.laporan, x.pelapor, x.hari]),
    [['facebook/uji/b', 5, 5, 1], ['facebook/uji/a', 4, 3, 2]]);
});
