import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BATAS_LAPORAN_BERKOIN_HARIAN, KOIN, hitungKoin, kemajuanLencana, namaSamaran, seriBerjalan, tanggalWita
} from '../supabase/functions/_shared/koin.js';
import { prosesKontribusi } from '../supabase/functions/kontribusi/proses.js';
import { prosesLapor, sha256 } from '../supabase/functions/lapor/proses.js';

const JAM = 3_600_000;
const HARI1 = Date.parse('2026-10-01T03:00:00Z');   // 11.00 WITA

test('koin: +10 di lokasi, +5 pembuka data, seri harian +2/hari (maks +10), tanggal menurut WITA', () => {
  const a = hitungKoin({ lama: null, pembukaData: true, sah: true, waktu: HARI1 });
  assert.equal(a.ringkasan.koin, KOIN.diLokasi + KOIN.pembukaData);
  assert.deepEqual(a.ringkasan.lencanaBaru, ['pelapor_pertama']);
  assert.equal(a.baris.tempat_berbeda, 1);
  // hari yang sama: tanpa bonus seri
  const b = hitungKoin({ lama: a.baris, pembukaData: false, sah: true, laporanSebelumnyaDiTempat: 1, waktu: HARI1 + JAM });
  assert.equal(b.ringkasan.koin, 10);
  assert.equal(b.baris.tempat_berbeda, 1);
  assert.equal(b.baris.maks_satu_tempat, 2);
  // besoknya: seri 2 → +2
  const c = hitungKoin({ lama: b.baris, pembukaData: false, sah: true, waktu: HARI1 + 24 * JAM });
  assert.equal(c.ringkasan.seri, 2);
  assert.equal(c.ringkasan.koin, 12);
  // seri panjang dibatasi +10
  let r = c.baris;
  for (let h = 2; h < 9; h++) r = hitungKoin({ lama: r, pembukaData: false, sah: true, waktu: HARI1 + h * 24 * JAM }).baris;
  const d = hitungKoin({ lama: r, pembukaData: false, sah: true, waktu: HARI1 + 9 * 24 * JAM });
  assert.equal(d.ringkasan.koin, 10 + KOIN.seriMaks);
  assert.ok(d.baris.lencana.includes('seri_7'));
  // 16.30 UTC = 00.30 WITA hari berikutnya
  assert.equal(tanggalWita(Date.parse('2026-10-01T16:30:00Z')), '2026-10-02');
});

test('koin: batas 5 laporan berkoin per hari; GPS palsu → koin tampil, tidak sah', () => {
  let r = null;
  for (let i = 0; i < BATAS_LAPORAN_BERKOIN_HARIAN; i++) r = hitungKoin({ lama: r, pembukaData: false, sah: true, waktu: HARI1 + i }).baris;
  const lewat = hitungKoin({ lama: r, pembukaData: true, sah: true, waktu: HARI1 + 10 });
  assert.equal(lewat.ringkasan.batasHarian, true);
  assert.equal(lewat.ringkasan.koin, 0);
  const palsu = hitungKoin({ lama: null, pembukaData: false, sah: false, waktu: HARI1 });
  assert.equal(palsu.ringkasan.koin, 10, 'pelapor melihat koin seperti biasa');
  assert.equal(palsu.koinSah, 0);
  assert.equal(palsu.baris.koin_sah, 0);
});

test('lencana & nama samaran & seri berjalan', () => {
  const k = kemajuanLencana({ laporan_berkoin: 3, tempat_berbeda: 5 });
  assert.equal(k.find(l => l.id === 'penjelajah').dapat, true);
  assert.deepEqual(k.find(l => l.id === 'rajin'), { ...k.find(l => l.id === 'rajin'), nilai: 3, dapat: false });
  assert.equal(namaSamaran('ab12', 'Soppeng'), namaSamaran('ab12', 'Soppeng'));
  assert.match(namaSamaran('ab12', 'Soppeng'), / Soppeng$/);
  assert.notEqual(namaSamaran('ab12', null, 1), namaSamaran('ab12', null, 0));
  assert.equal(seriBerjalan({ tanggal_terakhir: '2026-09-30', seri_hari: 4 }, HARI1), 4);
  assert.equal(seriBerjalan({ tanggal_terakhir: '2026-09-28', seri_hari: 4 }, HARI1), 0);
});

// ------------------------------------------------ lapor → koin

function dbLapor({ kota = null, laporan = [] } = {}) {
  const t = [{ id: 1, nama: 'Cafe Senja', osm_ref: null, dibekukan: false, lat: -4.3470, lng: 119.8859, kota }];
  const l = [...laporan];
  const db = {
    t, l, reputasi: new Map(), harian: [],
    async hitungLaporan(filter, sejakMenit) {
      const batas = Date.now() - sejakMenit * 60_000;
      return l.filter(x => Date.parse(x.dibuat) >= batas && Object.entries(filter).every(([k, v]) => x[k] === v)).length;
    },
    async titikDekat() { return []; },
    async titikDetail({ id }) { return t.find(x => x.id === id) ?? null; },
    async buatTitik({ nama, lat, lng }) { t.push({ id: 2, nama, lat, lng, kota: null }); return 2; },
    async riwayatPerangkat() { return []; },
    async simpanLaporan(b) { l.push({ ...b, id: l.length + 1, dibuat: new Date().toISOString() }); return l.length; },
    async laporanTitik() { return []; },
    async simpanRingkasan() {},
    async kotaTitik(id) { return t.find(x => x.id === id)?.kota ?? null; },
    async isiKota(id, k) { t.find(x => x.id === id).kota = k; },
    async bacaReputasi(k) { return db.reputasi.get(k) ?? null; },
    async simpanReputasi(b) { db.reputasi.set(b.reporter_key, { ...db.reputasi.get(b.reporter_key), ...b }); },
    async catatKoinHarian(k) { db.harian.push(k); },
    async catatKoinSahLaporan(id, n) { l.find(x => x.id === id).koin_sah = n; }
  };
  return db;
}
const garam = { reporter: 'r', ip: 'i' };
const isian = (o = {}) => ({ perangkat: 'perangkat-uji-1', titik_id: 1, kendaraan: 'motor', ada_jukir: false,
  lat: -4.3471, lng: 119.8860, akurasi_m: 15, ...o });

test('lapor: kabupaten tempat dicari sekali lewat geo lalu disimpan; koin dicatat per kabupaten', async () => {
  const db = dbLapor();
  const panggilan = [];
  const geo = { async kabupaten(lat, lng) { panggilan.push([lat, lng]); return 'Soppeng'; } };
  const h = await prosesLapor({ body: isian(), ip: null, garam, db, geo });
  assert.equal(h.body.koin.koin, 15);
  assert.equal(h.body.laporan_id, 1);
  assert.equal(db.t[0].kota, 'Soppeng');
  assert.deepEqual(db.harian.map(x => [x.kabupaten, x.tampil, x.sah]), [['Soppeng', 15, 15]]);
  assert.equal(db.l[0].koin_sah, 15);
  const r = db.reputasi.get(await sha256('r:perangkat-uji-1'));
  assert.match(r.nama_samaran, / Soppeng$/);
  // laporan kedua (perangkat lain): kota sudah ada → geo tidak dipanggil lagi; bukan pembuka data lagi
  const h2 = await prosesLapor({ body: isian({ perangkat: 'perangkat-uji-2' }), ip: null, garam, db, geo });
  assert.equal(panggilan.length, 1);
  assert.equal(h2.body.koin.koin, 10);
});

test('lapor: galat koin tidak menggagalkan laporan', async () => {
  const db = dbLapor({ kota: 'Makassar' });
  db.bacaReputasi = async () => { throw new Error('tabel belum ada'); };
  const h = await prosesLapor({ body: isian(), ip: null, garam, db });
  assert.equal(h.status, 200);
  assert.equal(h.body.koin, null);
  assert.equal(db.l.length, 1);
});

// ------------------------------------------------ kontribusi (tab Saya)

function dbKontribusi() {
  const rep = new Map();
  const harian = [];   // { key, kabupaten, tampil, sah }
  return {
    rep, harian,
    async bacaReputasi(k) { return rep.get(k) ?? null; },
    async ubahReputasi(k, u) { rep.set(k, { ...rep.get(k), ...u }); },
    async koinSaya(k) {
      const per = new Map();
      for (const x of harian.filter(x => x.key === k)) per.set(x.kabupaten, (per.get(x.kabupaten) ?? 0) + x.tampil);
      return [...per].map(([kabupaten, koin]) => ({ kabupaten, koin })).sort((a, b) => b.koin - a.koin);
    },
    async peringkat(kab) {
      const per = new Map();
      for (const x of harian.filter(x => (kab == null || x.kabupaten === kab) && rep.get(x.key)?.tampil_di_peringkat)) {
        per.set(x.key, (per.get(x.key) ?? 0) + x.sah);
      }
      return [...per].filter(([, k]) => k > 0).sort((a, b) => b[1] - a[1])
        .map(([key, koin]) => ({ reporter_key: key, nama_samaran: rep.get(key).nama_samaran, koin }));
    },
    async posisi(k, kab, nilai) { return 1 + (await this.peringkat(kab)).filter(x => x.reporter_key !== k && x.koin > nilai).length; },
    async laporanTerakhir() { return [{ titik_id: 1, nama: 'Cafe', ada_jukir: false, waktu: '2026-10-01T03:00:00Z' }]; }
  };
}

test('tab Saya: pelapor dicurigai tetap melihat koin tampil & dirinya di peringkat; orang lain melihat koin sah', async () => {
  const db = dbKontribusi();
  const saya = await sha256('r:perangkat-uji-1');
  const lain = await sha256('r:perangkat-uji-2');
  const dasar = { putaran_nama: 0, kabupaten_asal: 'Soppeng', tampil_di_peringkat: true, laporan_berkoin: 3, seri_hari: 1,
    tanggal_terakhir: '2026-10-01', tempat_berbeda: 2, pembuka_data: 1, seri_terpanjang: 1, maks_satu_tempat: 1, lencana: [] };
  db.rep.set(saya, { ...dasar, nama_samaran: 'Anoa Soppeng', koin_tampil: 40 });
  db.rep.set(lain, { ...dasar, nama_samaran: 'Maleo Soppeng', koin_tampil: 25 });
  db.harian.push({ key: saya, kabupaten: 'Soppeng', tampil: 40, sah: 0 }, { key: lain, kabupaten: 'Soppeng', tampil: 25, sah: 25 });

  const h = await prosesKontribusi({ body: { perangkat: 'perangkat-uji-1' }, garam, db, sekarang: HARI1 });
  assert.equal(h.body.saya.koin, 40);
  assert.equal(h.body.saya.kabupaten, 'Soppeng');
  assert.deepEqual(h.body.peringkat.daftar.map(x => [x.nama, x.koin, x.saya]), [['Anoa Soppeng', 40, true], ['Maleo Soppeng', 25, false]]);
  assert.equal(h.body.laporan_terakhir.length, 1);
  assert.ok(!JSON.stringify(h.body).includes(saya), 'hash pelapor tidak dikirim');

  const orangLain = await prosesKontribusi({ body: { perangkat: 'perangkat-uji-2' }, garam, db, sekarang: HARI1 });
  assert.deepEqual(orangLain.body.peringkat.daftar.map(x => x.nama), ['Maleo Soppeng'], 'koin tidak sah tidak masuk peringkat');

  const sembunyi = await prosesKontribusi({ body: { perangkat: 'perangkat-uji-2', aksi: 'sembunyikan' }, garam, db, sekarang: HARI1 });
  assert.equal(sembunyi.body.saya.tampil_di_peringkat, false);
  assert.deepEqual(sembunyi.body.peringkat.daftar, []);
  const ganti = await prosesKontribusi({ body: { perangkat: 'perangkat-uji-2', aksi: 'ganti_nama' }, garam, db, sekarang: HARI1 });
  assert.notEqual(ganti.body.saya.nama_samaran, 'Maleo Soppeng');
  assert.equal((await prosesKontribusi({ body: { perangkat: 'perangkat-uji-1', kabupaten: 'Jakarta' }, garam, db })).status, 400);
  assert.equal((await prosesKontribusi({ body: { perangkat: 'perangkat-baru-9', aksi: 'ganti_nama' }, garam, db })).status, 404);
  const baru = await prosesKontribusi({ body: { perangkat: 'perangkat-baru-9' }, garam, db });
  assert.equal(baru.body.saya, null);
});
