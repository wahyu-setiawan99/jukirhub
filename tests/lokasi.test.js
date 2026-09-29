import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROFIL_LOKASI, SARAN_ANDROID, TEKS_GALAT_LOKASI, ambilPosisi, kodeGalatLokasi, pesanGalatLokasi
} from '../web/src/lib/lokasi.js';
import { BATAS } from '../supabase/functions/_shared/konstanta.js';

const posisi = (akurasi, lat = -5.1344, lng = 119.4467) => ({ coords: { latitude: lat, longitude: lng, accuracy: akurasi } });
const galat = (code) => Object.assign(new Error(`kode ${code}`), { code });

// Waktu dipendekkan supaya tes cepat; perilakunya sama dengan profil asli.
const CEPAT = { cukupM: 100, sabarMs: 40, longgarM: 250, batasMs: 120, umurMaksMs: 0 };

// Geolocation tiruan. `jaringan` = [jedaMs, hasil|galat] untuk getCurrentPosition,
// `gps` = daftar [jedaMs, hasil|galat] yang dikirim berurutan lewat watchPosition.
function geoTiruan({ jaringan, gps = [], tanpaPantau = false }) {
  const catatan = { opsi: [], dibersihkan: false };
  const jadwal = ([jeda, h], ok, gagal) => setTimeout(() => (h instanceof Error ? gagal(h) : ok(h)), jeda);
  const geo = {
    catatan,
    getCurrentPosition(ok, gagal, opsi) {
      catatan.opsi.push(opsi);
      const langkah = opsi.enableHighAccuracy ? gps[0] : jaringan;
      if (langkah) jadwal(langkah, ok, gagal);
    },
    watchPosition(ok, gagal, opsi) {
      catatan.opsi.push(opsi);
      const pemicu = gps.map(l => jadwal(l, ok, gagal));
      return pemicu;
    },
    clearWatch(id) { catatan.dibersihkan = true; id.forEach(clearTimeout); }
  };
  if (tanpaPantau) { delete geo.watchPosition; delete geo.clearWatch; }
  return geo;
}

const ukurWaktu = async (janji) => {
  const mulai = Date.now();
  const hasil = await janji;
  return { hasil, ms: Date.now() - mulai };
};

test('GPS dan lokasi jaringan diminta bersamaan', async () => {
  const geo = geoTiruan({ jaringan: [5, posisi(30)] });
  await ambilPosisi(geo, CEPAT);
  assert.deepEqual(geo.catatan.opsi.map(o => o.enableHighAccuracy), [false, true]);
});

test('lokasi jaringan sudah cukup akurat → langsung dipakai tanpa menunggu GPS, pemantauan GPS dihentikan', async () => {
  const geo = geoTiruan({ jaringan: [5, posisi(40)], gps: [[500, posisi(8)]] });
  const { hasil, ms } = await ukurWaktu(ambilPosisi(geo, CEPAT));
  assert.equal(hasil.akurasi, 40);
  assert.ok(ms < 40, `terlalu lama: ${ms} ms`);
  assert.ok(geo.catatan.dibersihkan);
});

test('jaringan kasar, GPS akurat datang kemudian → hasil GPS dipakai', async () => {
  const geo = geoTiruan({ jaringan: [2, posisi(1500)], gps: [[15, posisi(12, -4.5, 120.3)]] });
  const hasil = await ambilPosisi(geo, CEPAT);
  assert.deepEqual(hasil, { lat: -4.5, lng: 120.3, akurasi: 12 });
});

test('hasil longgar (≤ batas server) dipakai setelah masa sabar, tidak menunggu batas waktu', async () => {
  const geo = geoTiruan({ jaringan: [2, posisi(180)] });
  const { hasil, ms } = await ukurWaktu(ambilPosisi(geo, CEPAT));
  assert.equal(hasil.akurasi, 180);
  assert.ok(ms >= 35 && ms < 110, `waktu ${ms} ms`);
});

test('hanya ada hasil kasar → tetap dikembalikan di batas waktu (pemanggil menampilkan "sinyal lemah")', async () => {
  const geo = geoTiruan({ jaringan: [2, posisi(1500)] });
  const { hasil, ms } = await ukurWaktu(ambilPosisi(geo, CEPAT));
  assert.equal(hasil.akurasi, 1500);
  assert.ok(ms >= 110, `waktu ${ms} ms`);
});

test('GPS gagal dan jaringan sudah menjawab kasar → hasil kasar langsung dipakai tanpa menunggu batas', async () => {
  const geo = geoTiruan({ jaringan: [2, posisi(1500)], gps: [[5, galat(2)]] });
  const { hasil, ms } = await ukurWaktu(ambilPosisi(geo, CEPAT));
  assert.equal(hasil.akurasi, 1500);
  assert.ok(ms < 35, `waktu ${ms} ms`);
});

test('izin ditolak → langsung gagal dengan kode "ditolak"', async () => {
  const geo = geoTiruan({ jaringan: [2, galat(1)], gps: [[2, galat(1)]] });
  const mulai = Date.now();
  await assert.rejects(ambilPosisi(geo, CEPAT), err => kodeGalatLokasi(err) === 'ditolak');
  assert.ok(Date.now() - mulai < 35);
  assert.ok(geo.catatan.dibersihkan, 'pemantauan GPS dihentikan');
});

test('kedua sumber gagal → langsung "tidak_terdeteksi", tidak menunggu batas waktu', async () => {
  const geo = geoTiruan({ jaringan: [2, galat(2)], gps: [[4, galat(3)]] });
  const mulai = Date.now();
  await assert.rejects(ambilPosisi(geo, CEPAT), err => kodeGalatLokasi(err) === 'tidak_terdeteksi');
  assert.ok(Date.now() - mulai < 35);
});

test('tidak ada jawaban sama sekali → gagal tepat di batas waktu', async () => {
  const geo = geoTiruan({});
  const mulai = Date.now();
  await assert.rejects(ambilPosisi(geo, CEPAT), err => kodeGalatLokasi(err) === 'tidak_terdeteksi');
  assert.ok(Date.now() - mulai >= 110);
});

test('browser tanpa watchPosition tetap bekerja lewat dua getCurrentPosition', async () => {
  const geo = geoTiruan({ jaringan: [20, posisi(900)], gps: [[5, posisi(25)]], tanpaPantau: true });
  assert.equal((await ambilPosisi(geo, CEPAT)).akurasi, 25);
});

test('browser tanpa geolocation → kode "tidak_didukung"', async () => {
  await assert.rejects(ambilPosisi(undefined), (err) => kodeGalatLokasi(err) === 'tidak_didukung');
});

test('profil sejalan dengan batas server dan batas tunggu maksimal 12 detik', () => {
  assert.equal(PROFIL_LOKASI.lapor.longgarM, BATAS.akurasiMaksM);
  for (const [nama, p] of Object.entries(PROFIL_LOKASI)) {
    assert.ok(p.cukupM <= p.longgarM && p.sabarMs < p.batasMs && p.batasMs <= 12_000, nama);
  }
});

test('setiap kode galat punya pesan untuk pengguna; tanpa galat → null', () => {
  for (const kode of ['ditolak', 'tidak_terdeteksi', 'tidak_didukung']) assert.ok(TEKS_GALAT_LOKASI[kode], kode);
  assert.equal(kodeGalatLokasi(null), null);
});

test('Android: lokasi tidak terdeteksi disertai saran Akurasi Lokasi Google; izin ditolak & perangkat lain tidak', () => {
  const android = 'Mozilla/5.0 (Linux; Android 14; SM-A155F) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36';
  const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile Safari/604.1';
  assert.ok(pesanGalatLokasi('tidak_terdeteksi', android).endsWith(SARAN_ANDROID));
  assert.match(SARAN_ANDROID, /Akurasi Lokasi Google/);
  assert.equal(pesanGalatLokasi('tidak_terdeteksi', iphone), TEKS_GALAT_LOKASI.tidak_terdeteksi);
  assert.equal(pesanGalatLokasi('ditolak', android), TEKS_GALAT_LOKASI.ditolak);
  assert.equal(pesanGalatLokasi(null, android), null);
  const lapor = pesanGalatLokasi('tidak_terdeteksi', android, { lapor: true });
  assert.match(lapor, /GPS/);
  assert.ok(lapor.endsWith(SARAN_ANDROID));
});
