import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cariLokal, cocokkanTempat, gabungTempat, jarakM, kalimatBantu, kodeLevel, labelLevel, namaMirip, teksBintang,
  teksTarif, urutkanTempat
} from '../web/src/lib/tempat.js';

const titik = [
  { id: 1, nama: 'Indomaret Jl. Perintis', osm_ref: 'node/111', kota: 'Makassar', lat: -5.1350, lng: 119.4900 },
  { id: 2, nama: 'Pinggir Jl. Veteran', osm_ref: null, kota: 'Makassar', lat: -5.1500, lng: 119.4200 },
  { id: 'x', nama: 'rusak', lat: 1, lng: 2 }
];
const ringkasan = [
  {
    titik_id: 1, jumlah_laporan: 4, data_cukup: true, level_pungli: 'tinggi', alasan_pungli: '3 dari 4 laporan tidak diberi karcis',
    bantu_datang_ya: 1, bantu_pergi_ya: 4, bayar_median_motor: 2000, jumlah_motor: 3, bayar_median_mobil: 5000,
    jumlah_mobil: 1, bintang_rata: 2.46, laporan_terakhir: '2026-09-28T10:00:00Z'
  },
  // di bawah ambang: view publik sudah mengosongkan level, tapi web tetap tidak boleh memakainya
  { titik_id: 2, jumlah_laporan: 1, data_cukup: false, level_pungli: 'tinggi', bantu_datang_ya: 1, bantu_pergi_ya: 1,
    bayar_median_motor: 1000, jumlah_motor: 1, jumlah_mobil: 0, bintang_rata: 5, laporan_terakhir: '2026-09-29T08:00:00Z' }
];
const daftar = gabungTempat(titik, ringkasan);

test('gabungTempat menggabungkan titik & ringkasan, membuang baris rusak, tidak memakai level di bawah ambang', () => {
  assert.equal(daftar.length, 2);
  assert.equal(daftar[0].ringkasan.level, 'tinggi');
  assert.equal(daftar[1].ringkasan.level, null);
  assert.equal(kodeLevel(daftar[0].ringkasan), 'tinggi');
  assert.equal(kodeLevel(daftar[1].ringkasan), 'kurang');
  assert.equal(labelLevel(daftar[0].ringkasan), 'Indikasi pungli tinggi');
  assert.equal(labelLevel(daftar[1].ringkasan), 'Data belum cukup (1 laporan)');
  const tanpaRingkasan = gabungTempat([titik[1]], []);
  assert.equal(tanpaRingkasan[0].ringkasan.jumlah, 0);
});

test('kalimat membantu selalu dengan jumlahnya', () => {
  assert.equal(kalimatBantu(4, 4), 'membantu (4 dari 4 laporan)');
  assert.equal(kalimatBantu(1, 4), 'tidak membantu (3 dari 4 laporan)');
  assert.equal(kalimatBantu(2, 4), 'berbeda-beda (2 dari 4 bilang membantu)');
  assert.equal(kalimatBantu(0, 0), null);
});

test('tarif mengikuti kendaraan terpilih; bintang dibulatkan satu desimal', () => {
  assert.equal(teksTarif(daftar[0].ringkasan, 'motor'), 'Rp 2.000 (dari 3 laporan motor)');
  assert.equal(teksTarif(daftar[0].ringkasan, 'mobil'), 'Rp 5.000 (dari 1 laporan mobil)');
  assert.equal(teksTarif(daftar[1].ringkasan, 'mobil'), null);
  assert.equal(teksBintang(daftar[0].ringkasan), '2,5 (4)');
});

test('tempat yang diketuk dicocokkan ke tempat terlapor: osm_ref, atau ≤ 30 m dengan nama mirip', () => {
  assert.equal(cocokkanTempat({ nama: 'Apa saja', osm_ref: 'node/111', lat: 0, lng: 0 }, daftar)?.id, 1);
  assert.equal(cocokkanTempat({ nama: 'Indomaret', lat: -5.13515, lng: 119.49005 }, daftar)?.id, 1);
  assert.equal(cocokkanTempat({ nama: 'Warung Sebelah', lat: -5.13515, lng: 119.49005 }, daftar), null, 'nama beda');
  assert.equal(cocokkanTempat({ nama: 'Indomaret', lat: -5.1360, lng: 119.4900 }, daftar), null, '±110 m, terlalu jauh');
  assert.equal(cocokkanTempat({ nama: '', lat: -5.15005, lng: 119.42002 }, daftar)?.id, 2, 'pin tanpa nama');
  assert.ok(namaMirip('INDOMARET', 'Indomaret Jl. Perintis'));
});

test('cari lokal: semua kata harus ada, tanpa peka huruf besar/aksen', () => {
  assert.deepEqual(cariLokal(daftar, 'indomaret perintis').map(t => t.id), [1]);
  assert.deepEqual(cariLokal(daftar, 'JL').map(t => t.id).sort(), [1, 2]);
  assert.deepEqual(cariLokal(daftar, 'a'), [], 'terlalu pendek');
});

test('urutan: terdekat dulu bila ada posisi, laporan terbaru dulu bila tidak', () => {
  assert.deepEqual(urutkanTempat(daftar, { lat: -5.1501, lng: 119.4201 }).map(t => t.id), [2, 1]);
  assert.deepEqual(urutkanTempat(daftar, null).map(t => t.id), [2, 1]);
  assert.ok(Math.abs(jarakM({ lat: -5.135, lng: 119.49 }, { lat: -5.136, lng: 119.49 }) - 111) < 2);
});
