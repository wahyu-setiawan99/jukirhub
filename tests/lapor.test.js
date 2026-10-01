import { test } from 'node:test';
import assert from 'node:assert/strict';
import { periksaNamaTempat, validasiLaporan } from '../supabase/functions/_shared/lapor.js';
import { PESAN_SUKSES, prosesLapor, sha256 } from '../supabase/functions/lapor/proses.js';

// Tempat terlapor tiruan di sekitar Jl. Perintis, Makassar.
const TEMPAT_A = { id: 1, nama: 'Indomaret Perintis', osm_ref: 'node/111', dibekukan: false, lat: -5.1350, lng: 119.4900 };
const DEKAT_A = { lat: -5.1352, lng: 119.4902 };   // ±30 m dari A

const isian = (o = {}) => ({
  perangkat: 'perangkat-uji-1', titik_id: 1, kendaraan: 'motor', bantu_datang: false, bantu_pergi: true,
  bayar: 2000, pungli: ['tanpa_karcis'], bintang: 3, ...DEKAT_A, akurasi_m: 20, ...o
});

// Database tiruan: menyimpan laporan di memori dan meniru fungsi SQL secukupnya.
function dbTiruan({ tempat = [TEMPAT_A], laporan = [] } = {}) {
  const t = tempat.map(x => ({ ...x }));
  const l = laporan.map(x => ({ ...x }));
  const ringkasan = new Map();
  const jarak = (a, b) => Math.hypot((a.lat - b.lat) * 111_000, (a.lng - b.lng) * 111_000);
  const db = {
    t, l, ringkasan,
    async hitungLaporan(filter, sejakMenit) {
      const batas = Date.now() - sejakMenit * 60_000;
      return l.filter(x => Date.parse(x.dibuat) >= batas && Object.entries(filter).every(([k, v]) => x[k] === v)).length;
    },
    async titikDekat(lat, lng, radius) {
      return t.filter(x => jarak(x, { lat, lng }) <= radius).map(({ id, nama }) => ({ id, nama }));
    },
    async titikDetail({ id, osm_ref }) {
      return t.find(x => (id != null && x.id === id) || (osm_ref != null && x.osm_ref === osm_ref)) ?? null;
    },
    async buatTitik({ nama, osm_ref, lat, lng }) {
      const id = t.length + 1;
      t.push({ id, nama, osm_ref, lat, lng, dibekukan: false });
      return id;
    },
    async riwayatPerangkat(rk) { return l.filter(x => x.reporter_key === rk); },
    async simpanLaporan(baris) { l.push({ ...baris, id: l.length + 1, dibuat: new Date().toISOString() }); return l.length; },
    async laporanTitik(id) { return l.filter(x => x.titik_id === id); },
    async simpanRingkasan(id, r) { ringkasan.set(id, r); },
    // koin (migrasi 20261001000003)
    reputasi: new Map(), harian: [],
    async bacaReputasi(k) { return db.reputasi.get(k) ?? null; },
    async simpanReputasi(b) { db.reputasi.set(b.reporter_key, { ...db.reputasi.get(b.reporter_key), ...b }); },
    async catatKoinHarian(k) { db.harian.push(k); },
    async kotaTitik(id) { return t.find(x => x.id === id)?.kota ?? null; },
    async isiKota(id, kota) { t.find(x => x.id === id).kota = kota; },
    async catatKoinSahLaporan(id, n) { l.find(x => x.id === id).koin_sah = n; }
  };
  return db;
}

const garam = { reporter: 'garam-r', ip: 'garam-i' };
const lapor = (db, body, ip = '10.0.0.1') => prosesLapor({ body, ip, garam, db });

test('validasi: isian wajib form 1.2 dan pesan yang jelas', () => {
  assert.equal(validasiLaporan(isian()).ok, true);
  assert.equal(validasiLaporan(isian({ bantu_datang: undefined })).kode, 'bantu_datang');
  assert.equal(validasiLaporan(isian({ bantu_pergi: 'ya' })).kode, 'bantu_pergi');
  assert.equal(validasiLaporan(isian({ bayar: 1500.5 })).kode, 'bayar');
  assert.equal(validasiLaporan(isian({ bayar: 200000 })).kode, 'bayar');
  assert.equal(validasiLaporan(isian({ pungli: ['preman'] })).kode, 'pungli');
  assert.equal(validasiLaporan(isian({ bintang: 0 })).kode, 'bintang');
  assert.equal(validasiLaporan(isian({ kendaraan: 'truk' })).kode, 'kendaraan');
  assert.equal(validasiLaporan(isian({ lat: undefined })).kode, 'lokasi');
  assert.equal(validasiLaporan(isian({ perangkat: 'x' })).kode, 'perangkat');
  assert.deepEqual(validasiLaporan(isian({ pungli: ['memaksa', 'memaksa'] })).data.pungli, ['memaksa'], 'duplikat dibuang');
  const baru = validasiLaporan(isian({ titik_id: undefined, tempat: { nama: '  Pinggir Jl. Veteran ', lat: -5.15, lng: 119.42 } }));
  assert.equal(baru.data.tempat.nama, 'Pinggir Jl. Veteran');
  assert.equal(validasiLaporan(isian({ titik_id: undefined })).kode, 'tempat');
  assert.equal(validasiLaporan(isian({ titik_id: undefined, tempat: { nama: 'Toko', osm_ref: 'google/1', lat: -5.1, lng: 119.4 } })).kode, 'tempat');
});

test('nama tempat: tolak nomor HP, tautan, plat, kata kasar; nama wajar lolos', () => {
  assert.equal(periksaNamaTempat('Pinggir Jl. Veteran depan warung'), null);
  assert.equal(periksaNamaTempat('Indomaret 24 Jam'), null);
  assert.match(periksaNamaTempat('Parkir 0812 3456 7890'), /telepon/);
  assert.match(periksaNamaTempat('lihat www.contoh.com'), /tautan/);
  assert.match(periksaNamaTempat('Jukir DD 1234 XY'), /plat/);
  assert.match(periksaNamaTempat('Parkir bangsat'), /kasar/);
  assert.equal(periksaNamaTempat('Pantai Losari'), null, '"tai" di dalam kata tidak dianggap kasar');
  assert.match(periksaNamaTempat('A'), /2–60/);
});

test('laporan sah ke tempat terlapor: disimpan tanpa IP/kunci mentah, ringkasan dihitung ulang', async () => {
  const db = dbTiruan();
  const h = await lapor(db, isian());
  assert.equal(h.status, 200);
  assert.deepEqual({ ...h.body, koin: h.body.koin?.koin }, { ok: true, pesan: PESAN_SUKSES, titik: { id: 1, nama: 'Indomaret Perintis' },
    laporan_id: 1, koin: 15 });
  assert.equal(db.l.length, 1);
  const s = db.l[0];
  assert.equal(s.reporter_key, await sha256('garam-r:perangkat-uji-1'));
  assert.equal(s.ip_hash, await sha256('garam-i:10.0.0.1'));
  assert.ok(!JSON.stringify(s).includes('10.0.0.1') && !JSON.stringify(s).includes('perangkat-uji-1'));
  assert.equal(s.bobot_manual, 1);
  assert.ok(s.jarak_m > 0 && s.jarak_m < 60);
  const r = db.ringkasan.get(1);
  assert.equal(r.jumlah_laporan, 1);
  assert.equal(r.alasan_pungli, '1 dari 1 laporan tidak diberi karcis');
});

test('gerbang lokasi: lebih dari 250 m ditolak dengan jarak; akurasi lemah ditolak', async () => {
  const db = dbTiruan();
  const jauh = await lapor(db, isian({ lat: -5.1400, lng: 119.4900 }));   // ±550 m
  assert.equal(jauh.status, 422);
  assert.equal(jauh.body.kode, 'jauh');
  assert.match(jauh.body.pesan, /Indomaret Perintis/);
  const lemah = await lapor(db, isian({ akurasi_m: 400 }));
  assert.equal(lemah.body.kode, 'akurasi');
  assert.equal(db.l.length, 0);
});

test('tempat baru dari peta: dicocokkan lewat osm_ref / ≤ 30 m nama mirip, kalau tidak dibuat baru', async () => {
  const db = dbTiruan();
  const lewatOsm = await lapor(db, isian({ titik_id: undefined, tempat: { nama: 'Nama beda', osm_ref: 'node/111', lat: -5.1350, lng: 119.4900 } }));
  assert.equal(lewatOsm.body.titik.id, 1);
  const lewatDekat = await lapor(db, isian({ perangkat: 'perangkat-uji-2', titik_id: undefined,
    tempat: { nama: 'INDOMARET', lat: -5.13505, lng: 119.49005 } }));
  assert.equal(lewatDekat.body.titik.id, 1);
  const baru = await lapor(db, isian({ perangkat: 'perangkat-uji-3', titik_id: undefined,
    tempat: { nama: 'Warung Coto Sebelah', lat: -5.13505, lng: 119.49005 } }));
  assert.equal(baru.body.titik.id, 2, 'nama beda → tempat baru');
  assert.equal(db.t[1].nama, 'Warung Coto Sebelah');
  assert.equal(db.ringkasan.get(2).jumlah_laporan, 1);
});

test('batas: sekali per tempat per 24 jam, 10 per perangkat per hari, 10 per jaringan per jam', async () => {
  const db = dbTiruan();
  assert.equal((await lapor(db, isian())).status, 200);
  const ulang = await lapor(db, isian());
  assert.equal(ulang.status, 429);
  assert.equal(ulang.body.kode, 'sudah_lapor');

  const penuh = dbTiruan({ laporan: Array.from({ length: 10 }, (_, i) => ({ titik_id: 9, reporter_key: 'x', ip_hash: `ip${i}`, dibuat: new Date().toISOString() })) });
  penuh.l.forEach(async (x) => { x.reporter_key = await sha256('garam-r:perangkat-uji-1'); });
  await new Promise(r => setTimeout(r, 10));
  assert.equal((await lapor(penuh, isian())).body.kode, 'terlalu_sering');

  const ipHash = await sha256('garam-i:10.0.0.9');
  const jaringan = dbTiruan({ laporan: Array.from({ length: 10 }, () => ({ titik_id: 9, reporter_key: 'y', ip_hash: ipHash, dibuat: new Date().toISOString() })) });
  assert.equal((await lapor(jaringan, isian(), '10.0.0.9')).body.kode, 'terlalu_sering');
});

test('tempat dibekukan / > 10 laporan per jam: balasan sukses biasa, tapi tidak disimpan', async () => {
  const beku = dbTiruan({ tempat: [{ ...TEMPAT_A, dibekukan: true }] });
  const h = await lapor(beku, isian());
  assert.equal(h.status, 200);
  assert.equal(h.body.pesan, PESAN_SUKSES);
  assert.equal(beku.l.length, 0);

  const ramai = dbTiruan({ laporan: Array.from({ length: 10 }, (_, i) => ({ titik_id: 1, reporter_key: `r${i}`, ip_hash: `i${i}`, dibuat: new Date().toISOString() })) });
  const h2 = await lapor(ramai, isian());
  assert.equal(h2.status, 200);
  assert.equal(ramai.l.length, 10);
});

test('GPS terlalu sempurna → tetap diterima dengan balasan sama, bobot 0,2 diam-diam', async () => {
  const db = dbTiruan();
  const h = await lapor(db, isian({ akurasi_m: 1 }));
  assert.equal(h.status, 200);
  assert.deepEqual({ ...h.body, koin: h.body.koin?.koin }, { ok: true, pesan: PESAN_SUKSES, titik: { id: 1, nama: 'Indomaret Perintis' },
    laporan_id: 1, koin: 15 });
  assert.equal(db.l[0].bobot_manual, 0.2);
  // Koin tampil sama dengan laporan sah (pelapor tidak tahu), tetapi tidak masuk peringkat.
  assert.equal(db.harian[0].tampil, 15);
  assert.equal(db.harian[0].sah, 0);
  assert.equal(db.l[0].koin_sah, undefined);
});

test('isian rusak ditolak sebelum menyentuh database', async () => {
  let disentuh = false;
  const db = new Proxy({}, { get: () => async () => { disentuh = true; return 0; } });
  const h = await prosesLapor({ body: { perangkat: 'perangkat-uji-1' }, ip: null, garam, db });
  assert.equal(h.status, 400);
  assert.equal(disentuh, false);
});
