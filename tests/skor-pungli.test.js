import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  alasanUtama, indikasiEfektif, levelDariSkor, median, ringkasTempat, skorLaporan
} from '../supabase/functions/_shared/skor-pungli.js';

const lap = (o = {}) => ({
  kendaraan: 'motor', bantu_datang: true, bantu_pergi: true, bayar: 2000, pungli: [], bintang: 4,
  reporter_key: 'a', bobot_manual: 1, dibuat: '2026-09-29T10:00:00Z', ...o
});
const SEKARANG = Date.parse('2026-09-30T10:00:00Z');

test('skor per laporan sesuai tabel AGENTS.md 6.2, maksimal 100', () => {
  assert.equal(skorLaporan(lap()), 0);
  assert.equal(skorLaporan(lap({ pungli: ['tanpa_karcis'] })), 30);
  assert.equal(skorLaporan(lap({ pungli: ['memaksa', 'kemahalan'] })), 55);
  assert.equal(skorLaporan(lap({ pungli: ['tanpa_karcis', 'kemahalan', 'memaksa', 'tanda_gratis'] })), 100);
});

test('tanpa karcis & tulisan parkir gratis hanya dihitung bila pelapor membayar', () => {
  assert.deepEqual(indikasiEfektif(lap({ bayar: 0, pungli: ['tanpa_karcis', 'tanda_gratis', 'memaksa'] })), ['memaksa']);
});

test('bayar di atas tarif resmi yang sudah diperiksa = kemahalan (tidak dihitung dua kali)', () => {
  assert.equal(skorLaporan(lap({ bayar: 3000 }), { tarifResmi: 2000 }), 25);
  assert.equal(skorLaporan(lap({ bayar: 3000, pungli: ['kemahalan'] }), { tarifResmi: 2000 }), 25);
  assert.equal(skorLaporan(lap({ bayar: 2000 }), { tarifResmi: 2000 }), 0);
  assert.equal(skorLaporan(lap({ bayar: 3000 }), { tarifResmi: null }), 0, 'tarif belum diperiksa → tidak dipakai');
});

test('level: 0–29 rendah, 30–59 sedang, ≥ 60 tinggi', () => {
  assert.equal(levelDariSkor(0), 'rendah');
  assert.equal(levelDariSkor(29.9), 'rendah');
  assert.equal(levelDariSkor(30), 'sedang');
  assert.equal(levelDariSkor(59), 'sedang');
  assert.equal(levelDariSkor(60), 'tinggi');
});

test('alasan utama = indikasi terbanyak dengan jumlahnya', () => {
  const l = [lap({ pungli: ['tanpa_karcis'] }), lap({ pungli: ['tanpa_karcis', 'memaksa'] }), lap({ pungli: ['memaksa'] }), lap({ pungli: ['tanpa_karcis'] })];
  assert.equal(alasanUtama(l), '3 dari 4 laporan tidak diberi karcis');
  assert.equal(alasanUtama([lap()]), 'Tidak ada indikasi pungli yang dilaporkan');
  assert.equal(alasanUtama([]), null);
});

test('median bulat', () => {
  assert.equal(median([2000, 1000, 3000]), 2000);
  assert.equal(median([1000, 2000]), 1500);
  assert.equal(median([]), null);
});

test('ringkasan tempat: jumlah, perangkat, membantu, tarif per kendaraan, bintang, laporan > 180 hari dibuang', () => {
  const r = ringkasTempat([
    lap({ reporter_key: 'a', bantu_datang: false, pungli: ['tanpa_karcis'], bintang: 2, dibuat: '2026-09-29T08:00:00Z' }),
    lap({ reporter_key: 'b', bantu_datang: false, pungli: ['tanpa_karcis', 'memaksa'], bintang: 1, bayar: 3000 }),
    lap({ reporter_key: 'b', kendaraan: 'mobil', bayar: 5000, bintang: 3 }),
    lap({ reporter_key: 'c', dibuat: '2026-01-01T00:00:00Z', pungli: ['memaksa'] })
  ], { sekarang: SEKARANG });
  assert.equal(r.jumlah_laporan, 3);
  assert.equal(r.jumlah_perangkat, 2);
  assert.equal(r.skor_pungli, 30);   // (30 + 60 + 0) / 3
  assert.equal(r.level_pungli, 'sedang');
  assert.equal(r.alasan_pungli, '2 dari 3 laporan tidak diberi karcis');
  assert.equal(r.bantu_datang_ya, 1);
  assert.equal(r.bantu_pergi_ya, 3);
  assert.deepEqual([r.bayar_median_motor, r.jumlah_motor, r.bayar_median_mobil, r.jumlah_mobil], [2500, 2, 5000, 1]);
  assert.equal(r.bintang_rata, 2);
  assert.equal(r.laporan_terakhir, '2026-09-29T10:00:00Z');
});

test('laporan GPS palsu (bobot 0,2) tetap terhitung jumlahnya, tapi pengaruhnya pada skor & bintang kecil', () => {
  const r = ringkasTempat([
    lap({ reporter_key: 'a', pungli: [], bintang: 5 }),
    lap({ reporter_key: 'palsu', pungli: ['tanpa_karcis', 'kemahalan', 'memaksa', 'tanda_gratis'], bintang: 1, bobot_manual: 0.2 })
  ], { sekarang: SEKARANG });
  assert.equal(r.jumlah_laporan, 2);
  assert.equal(r.skor_pungli, 16.7);   // (0·1 + 100·0,2) / 1,2
  assert.equal(r.level_pungli, 'rendah');
  assert.equal(r.bintang_rata, 4.33);
});

test('tanpa laporan → ringkasan kosong yang aman', () => {
  const r = ringkasTempat([], { sekarang: SEKARANG });
  assert.equal(r.jumlah_laporan, 0);
  assert.equal(r.level_pungli, null);
  assert.equal(r.bintang_rata, null);
});
