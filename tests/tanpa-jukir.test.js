import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validasiLaporan } from '../supabase/functions/_shared/lapor.js';
import { ringkasTempat } from '../supabase/functions/_shared/skor-pungli.js';
import { gabungTempat, jumlahAdaJukir, kalimatBantu, kalimatTanpaJukir, kodeLevel, labelLevel, teksBintang } from '../web/src/lib/tempat.js';
import { susunLaporan } from '../web/src/lib/fungsi.js';

const dasar = { perangkat: 'perangkat-uji-1', titik_id: 1, kendaraan: 'motor', lat: -5.14, lng: 119.43, akurasi_m: 20 };
const lap = (o = {}) => ({ ada_jukir: true, kendaraan: 'motor', bantu_datang: true, bantu_pergi: true, bayar: 2000, pungli: [],
  bintang: 4, reporter_key: 'a', bobot_manual: 1, dibuat: '2026-09-29T10:00:00Z', ...o });
const tanpa = (rk) => lap({ ada_jukir: false, bantu_datang: null, bantu_pergi: null, bayar: 0, pungli: [], bintang: null, reporter_key: rk });
const SEKARANG = Date.parse('2026-09-30T10:00:00Z');

test('validasi: "tidak ada jukir" cukup tempat & lokasi; jawaban lain dikosongkan', () => {
  const v = validasiLaporan({ ...dasar, ada_jukir: false, bantu_datang: true, bayar: 5000, pungli: ['memaksa'], bintang: 1 });
  assert.equal(v.ok, true);
  assert.deepEqual(
    [v.data.ada_jukir, v.data.bantu_datang, v.data.bantu_pergi, v.data.bayar, v.data.pungli, v.data.bintang],
    [false, null, null, 0, [], null]
  );
  assert.equal(validasiLaporan({ ...dasar, ada_jukir: 'tidak' }).kode, 'ada_jukir');
  // klien lama tanpa ada_jukir = ada jukir, jawaban tetap wajib
  assert.equal(validasiLaporan({ ...dasar }).kode, 'bantu_datang');
});

test('ringkasan: laporan tanpa jukir hanya menambah jumlah & jumlah_tanpa_jukir', () => {
  const r = ringkasTempat([lap({ reporter_key: 'a', pungli: ['tanpa_karcis'], bintang: 2 }), tanpa('b'), tanpa('c')], { sekarang: SEKARANG });
  assert.equal(r.jumlah_laporan, 3);
  assert.equal(r.jumlah_tanpa_jukir, 2);
  assert.equal(r.jumlah_perangkat, 1, 'ambang level pungli hanya dari laporan ada jukir');
  assert.equal(r.skor_pungli, 30);
  assert.equal(r.alasan_pungli, '1 dari 1 laporan tidak diberi karcis');
  assert.deepEqual([r.bantu_datang_ya, r.bayar_median_motor, r.jumlah_motor, r.bintang_rata], [1, 2000, 1, 2]);
  const semuaTanpa = ringkasTempat([tanpa('b')], { sekarang: SEKARANG });
  assert.deepEqual([semuaTanpa.jumlah_laporan, semuaTanpa.level_pungli, semuaTanpa.bintang_rata], [1, null, null]);
});

test('web: kebanyakan tanpa jukir → penanda "tanpa"; sebagian kecil → kalimat "pernah"', () => {
  const [kebanyakan, sedikit] = gabungTempat(
    [{ id: 1, nama: 'Cafe A', lat: -5.14, lng: 119.43 }, { id: 2, nama: 'Toko B', lat: -5.15, lng: 119.42 }],
    [
      { titik_id: 1, jumlah_laporan: 3, jumlah_tanpa_jukir: 2, bantu_datang_ya: 1, bantu_pergi_ya: 1, bintang_rata: 4, data_cukup: false },
      { titik_id: 2, jumlah_laporan: 5, jumlah_tanpa_jukir: 1, bantu_datang_ya: 3, bantu_pergi_ya: 4, bintang_rata: 3, data_cukup: true, level_pungli: 'rendah' }
    ]
  );
  assert.equal(kodeLevel(kebanyakan.ringkasan), 'tanpa');
  assert.equal(labelLevel(kebanyakan.ringkasan), 'Tanpa jukir');
  assert.equal(kalimatTanpaJukir(kebanyakan.ringkasan), 'Dilaporkan tidak ada jukir (2 dari 3 laporan)');
  assert.equal(kodeLevel(sedikit.ringkasan), 'rendah');
  assert.equal(kalimatTanpaJukir(sedikit.ringkasan), 'Pernah dilaporkan tanpa jukir (1 dari 5 laporan)');
  assert.equal(jumlahAdaJukir(sedikit.ringkasan), 4);
  assert.equal(kalimatBantu(sedikit.ringkasan.bantuPergiYa, jumlahAdaJukir(sedikit.ringkasan)), 'membantu (4 dari 4 laporan)');
  assert.equal(teksBintang(sedikit.ringkasan), '3 (4)');
  // data lama (snapshot / view tanpa kolom baru) tetap aman
  const lama = gabungTempat([{ id: 3, nama: 'C', lat: -5.1, lng: 119.4 }], [{ titik_id: 3, jumlah_laporan: 2 }])[0];
  assert.equal(lama.ringkasan.tanpaJukir, 0);
  assert.equal(kalimatTanpaJukir(lama.ringkasan), null);
});

test('form: "Tidak ada jukir" menghasilkan body yang lolos validasi', () => {
  const b = susunLaporan({
    tempat: { id: 7 },
    isian: { adaJukir: false, kendaraan: 'motor', bantuDatang: null, bantuPergi: null, bayar: null, pungli: new Set(), bintang: 0 },
    posisi: { lat: -5.14, lng: 119.43, akurasi: 20 }, perangkat: 'perangkat-uji-1'
  });
  assert.equal(b.ada_jukir, false);
  assert.equal(validasiLaporan(b).ok, true);
});
