import { test } from 'node:test';
import assert from 'node:assert/strict';
import { periksaKomentar, validasiLaporan } from '../supabase/functions/_shared/lapor.js';
import { prosesLapor } from '../supabase/functions/lapor/proses.js';
import { PESAN_ADUAN, prosesAduan } from '../supabase/functions/aduan/proses.js';
import { prosesTelegram } from '../supabase/functions/telegram/proses.js';
import { pesanKomentarBaru, tombolKomentar } from '../supabase/functions/_shared/kabar-pemilik.js';
import { ringkasBaris, waktuRelatif } from '../web/src/lib/riwayat.js';
import { urlRiwayat } from '../web/src/lib/data.js';
import { susunLaporan } from '../web/src/lib/fungsi.js';

const garam = { reporter: 'r', ip: 'i' };

test('saringan komentar: kosong boleh; nomor HP, tautan, plat, kasar, terlalu panjang ditolak', () => {
  assert.equal(periksaKomentar(''), null);
  assert.equal(periksaKomentar('   '), null);
  assert.equal(periksaKomentar('Jukir membantu menyeberangkan motor, bayar 2.000'), null);
  assert.match(periksaKomentar('hubungi 0812-3456-7890'), /telepon/);
  assert.match(periksaKomentar('cek www.contoh.com'), /tautan/);
  assert.match(periksaKomentar('motor DD 1234 XY ditarik'), /plat/);
  assert.match(periksaKomentar('jukirnya bangsat'), /kasar/);
  assert.match(periksaKomentar('x'.repeat(201)), /3–200/);
  const v = validasiLaporan({ perangkat: 'perangkat-uji-1', titik_id: 1, kendaraan: 'motor', ada_jukir: false,
    lat: -5.14, lng: 119.43, akurasi_m: 10, komentar: '  Parkir gratis, tidak ada jukir  ' });
  assert.equal(v.data.komentar, 'Parkir gratis, tidak ada jukir');
});

function dbLapor() {
  const t = [{ id: 1, nama: 'Cafe Senja', osm_ref: null, dibekukan: false, lat: -5.14, lng: 119.43 }];
  const komentar = [];
  return {
    komentar,
    async hitungLaporan() { return 0; },
    async titikDekat() { return []; },
    async titikDetail({ id }) { return t.find(x => x.id === id) ?? null; },
    async buatTitik() { return 2; },
    async riwayatPerangkat() { return []; },
    async simpanLaporan() { return 55; },
    async simpanKomentar(k) { komentar.push(k); return 77; },
    async laporanTitik() { return []; },
    async simpanRingkasan() {}
  };
}
const isian = (o = {}) => ({ perangkat: 'perangkat-uji-1', titik_id: 1, kendaraan: 'motor', bantu_datang: true, bantu_pergi: true,
  bayar: 2000, pungli: [], bintang: 5, lat: -5.1401, lng: 119.4301, akurasi_m: 15, ...o });

test('lapor + komentar: disimpan "menunggu", pemilik dikabari, balasan menyebut menunggu', async () => {
  const db = dbLapor();
  const kabar = [];
  const h = await prosesLapor({ body: isian({ komentar: 'Jukir ramah dan membantu' }), ip: null, garam, db,
    kabar: { tempatBaru() {}, komentarBaru: (k) => kabar.push(k) } });
  assert.equal(h.status, 200);
  assert.equal(h.body.komentar, 'menunggu');
  assert.deepEqual(db.komentar, [{ laporan_id: 55, titik_id: 1, isi: 'Jukir ramah dan membantu' }]);
  assert.deepEqual(kabar, [{ id: 77, isi: 'Jukir ramah dan membantu', namaTempat: 'Cafe Senja' }]);
  const tanpa = await prosesLapor({ body: isian(), ip: null, garam, db: dbLapor(), kabar: { tempatBaru() {} } });
  assert.equal(tanpa.body.komentar, undefined);
  const ditolak = await prosesLapor({ body: isian({ komentar: 'wa 081234567890' }), ip: null, garam, db: dbLapor() });
  assert.equal(ditolak.body.kode, 'komentar');
});

test('pesan & tombol komentar ke pemilik: menunggu → Tampilkan/Tolak; tampil → Sembunyikan', () => {
  assert.match(pesanKomentarBaru({ id: 3, isi: '<b>hai</b>', namaTempat: 'Cafe' }), /&lt;b&gt;hai&lt;\/b&gt;/);
  assert.deepEqual(tombolKomentar('menunggu', 3).inline_keyboard[0].map(b => b.callback_data), ['jh:ks:3', 'jh:kx:3']);
  assert.deepEqual(tombolKomentar('tampil', 3).inline_keyboard[0].map(b => b.callback_data), ['jh:kx:3']);
  assert.deepEqual(tombolKomentar('ditolak', 3).inline_keyboard[0].map(b => b.callback_data), ['jh:ks:3']);
});

test('telegram: pemilik menekan Tampilkan / Tolak komentar', async () => {
  const status = new Map([[3, 'menunggu']]);
  const panggilan = [];
  const db = { async ubahStatus() { return null; }, async ubahStatusKomentar(id, s) { status.set(id, s); return { isi: 'x' }; } };
  const tg = { async jawabTombol(id, t) { panggilan.push(t); }, async ubahPesan(c, m, teks, tombol) { panggilan.push(teks, tombol.inline_keyboard[0][0].callback_data); }, async kirim() {} };
  const tekan = (data) => ({ callback_query: { id: 'c', from: { id: 7 }, data, message: { message_id: 1, chat: { id: 7 }, text: '💬 Komentar baru' } } });
  await prosesTelegram({ update: tekan('jh:ks:3'), rahasiaHeader: 'r', rahasia: 'r', chatPemilik: '7', db, tg });
  assert.equal(status.get(3), 'tampil');
  assert.ok(panggilan.some(x => /Komentar ditampilkan/.test(String(x))));
  assert.ok(panggilan.includes('jh:kx:3'));
  await prosesTelegram({ update: tekan('jh:kx:3'), rahasiaHeader: 'r', rahasia: 'r', chatPemilik: '7', db, tg });
  assert.equal(status.get(3), 'ditolak');
});

function dbAduan() {
  const aduan = new Set();
  const s = { status: 'tampil' };
  return {
    s, aduan,
    async hitungAduanIp() { return 0; },
    async komentarTampil(id) { return s.status === 'tampil' ? { id, isi: 'isi', namaTempat: 'Cafe' } : null; },
    async simpanAduan(a) { aduan.add(a.reporter_key); },
    async jumlahAduan() { return aduan.size; },
    async sembunyikanKomentar() { s.status = 'disembunyikan'; }
  };
}

test('aduan: satu perangkat dihitung sekali; 3 perangkat berbeda → disembunyikan + pemilik dikabari; balasan selalu sama', async () => {
  const db = dbAduan();
  const kabar = [];
  const adukan = (perangkat) => prosesAduan({ body: { komentar_id: 3, perangkat }, ip: null, garam, db, kabar: { komentarDiadukan: (k) => kabar.push(k) } });
  for (const p of ['perangkat-aaa1', 'perangkat-aaa1', 'perangkat-bbb2']) assert.equal((await adukan(p)).body.pesan, PESAN_ADUAN);
  assert.equal(db.s.status, 'tampil');
  await adukan('perangkat-ccc3');
  assert.equal(db.s.status, 'disembunyikan');
  assert.equal(kabar[0].jumlah, 3);
  assert.equal((await adukan('perangkat-ddd4')).body.pesan, PESAN_ADUAN, 'setelah disembunyikan balasan tetap sama');
  assert.equal(kabar.length, 1);
  assert.equal((await prosesAduan({ body: { komentar_id: 'x', perangkat: 'perangkat-aaa1' }, ip: null, garam, db })).status, 400);
});

test('riwayat: baris ringkas tanpa identitas; waktu relatif', () => {
  const sekarang = Date.parse('2026-10-01T10:30:00Z');
  const b = ringkasBaris({ waktu: '2026-10-01T07:00:00Z', ada_jukir: true, kendaraan: 'motor', bantu_datang: false, bantu_pergi: true,
    bayar: 2000, pungli: ['tanpa_karcis'], bintang: 3, komentar: 'Cepat dibantu keluar' }, sekarang);
  assert.equal(b.waktu, '3 jam lalu');
  assert.equal(b.judul, 'Motor');
  assert.deepEqual(b.rincian, ['Tidak membantu saat datang, membantu saat pergi', 'bayar Rp 2.000']);
  assert.deepEqual(b.indikasi, ['Tidak diberi karcis']);
  assert.equal(b.bintang, 3);
  assert.equal(ringkasBaris({ waktu: '2026-10-01T10:00:00Z', ada_jukir: false }, sekarang).judul, 'Tidak ada jukir');
  assert.equal(waktuRelatif('2026-09-30T09:00:00Z', sekarang), 'kemarin');
  assert.equal(waktuRelatif('2026-10-01T10:00:00Z', sekarang), 'baru saja');
});

test('URL riwayat: satu tempat, terbaru dulu, ambil satu lebih untuk "tampilkan lebih banyak"', () => {
  const u = new URL(urlRiwayat({ url: 'https://abc.supabase.co' }, 12, { offset: 10, batas: 10 }));
  assert.equal(u.pathname, '/rest/v1/riwayat_publik');
  assert.equal(u.searchParams.get('titik_id'), 'eq.12');
  assert.equal(u.searchParams.get('limit'), '11');
  assert.equal(u.searchParams.get('offset'), '10');
  assert.equal(u.searchParams.get('order'), 'waktu.desc,id.desc');
});

test('form: komentar kosong tidak dikirim, komentar diisi dikirim bersih', () => {
  const dasar = { tempat: { id: 1 }, posisi: { lat: 0, lng: 0, akurasi: 5 }, perangkat: 'perangkat-uji-1' };
  const isianForm = { adaJukir: false, kendaraan: 'motor', pungli: new Set(), komentar: '   ' };
  assert.equal('komentar' in susunLaporan({ ...dasar, isian: isianForm }), false);
  assert.equal(susunLaporan({ ...dasar, isian: { ...isianForm, komentar: ' Gratis ' } }).komentar, 'Gratis');
});
