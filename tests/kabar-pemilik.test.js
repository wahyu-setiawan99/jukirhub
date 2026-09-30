import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bacaTombol, dataTombol, pesanTempatBaru, tombolUntuk } from '../supabase/functions/_shared/kabar-pemilik.js';
import { prosesTelegram, samaAman } from '../supabase/functions/telegram/proses.js';
import { prosesLapor } from '../supabase/functions/lapor/proses.js';

test('pesan tempat baru: nama di-escape, asal nama, tautan OpenStreetMap; tanpa data pelapor', () => {
  const p = pesanTempatBaru({ id: 12, nama: 'Cafe <Kopi> & Teh', sumber: 'pin', lat: -5.14, lng: 119.43 }, 'https://jukirhub.vercel.app');
  assert.match(p, /Cafe &lt;Kopi&gt; &amp; Teh/);
  assert.match(p, /nama diketik warga/);
  assert.match(p, /openstreetmap\.org\/\?mlat=-5\.14&amp;mlon=119\.43/, '& di href di-escape untuk HTML Telegram');
  assert.doesNotMatch(p, /google/i);
});

test('data tombol ≤ 64 byte, bisa dibaca kembali, sampah ditolak', () => {
  assert.equal(dataTombol('sembunyikan', 123456789012345), 'jh:s:123456789012345');
  assert.ok(dataTombol('sembunyikan', 123456789012345).length <= 64);
  assert.deepEqual(bacaTombol('jh:s:12'), { jenis: 'tempat', aksi: 'sembunyikan', id: 12 });
  assert.deepEqual(bacaTombol('jh:t:12'), { jenis: 'tempat', aksi: 'tampilkan', id: 12 });
  assert.deepEqual(bacaTombol('jh:ks:9'), { jenis: 'komentar', aksi: 'tampilkan', id: 9 });
  assert.deepEqual(bacaTombol('jh:kx:9'), { jenis: 'komentar', aksi: 'tolak', id: 9 });
  for (const x of ['jh:x:1', 'jh:s:', 'jh:s:1;drop', null]) assert.equal(bacaTombol(x), null);
  assert.equal(tombolUntuk('aktif', 5).inline_keyboard[0][0].callback_data, 'jh:s:5');
  assert.equal(tombolUntuk('disembunyikan', 5).inline_keyboard[0][0].callback_data, 'jh:t:5');
});

function tiruan() {
  const panggilan = [];
  const status = new Map([[12, 'aktif']]);
  return {
    panggilan, status,
    db: { async ubahStatus(id, s) { if (!status.has(id)) return null; status.set(id, s); return { nama: 'Cafe Kopi' }; } },
    tg: {
      async jawabTombol(id, teks) { panggilan.push(['jawab', teks]); },
      async ubahPesan(chat, idPesan, teks, tombol) { panggilan.push(['ubah', teks, tombol.inline_keyboard[0][0].callback_data]); },
      async kirim(chat, teks) { panggilan.push(['kirim', teks]); }
    }
  };
}
const tekan = (data, dari = 777, teks = '📍 Tempat parkir baru\nCafe Kopi (ID 12)') => ({
  callback_query: { id: 'cb1', from: { id: dari }, data, message: { message_id: 5, chat: { id: dari }, text: teks } }
});

test('webhook: secret salah ditolak 401 tanpa menyentuh database', async () => {
  const t = tiruan();
  const h = await prosesTelegram({ update: tekan('jh:s:12'), rahasiaHeader: 'salah', rahasia: 'benar', chatPemilik: '777', ...t });
  assert.equal(h.status, 401);
  assert.equal(t.status.get(12), 'aktif');
  assert.equal(samaAman('abc', 'abc'), true);
  assert.equal(samaAman('', ''), false);
});

test('pemilik menekan Sembunyikan → tempat disembunyikan, pesan diberi status, tombol jadi Tampilkan lagi', async () => {
  const t = tiruan();
  await prosesTelegram({ update: tekan('jh:s:12'), rahasiaHeader: 'r', rahasia: 'r', chatPemilik: '777', ...t });
  assert.equal(t.status.get(12), 'disembunyikan');
  const ubah = t.panggilan.find(x => x[0] === 'ubah');
  assert.match(ubah[1], /Disembunyikan/);
  assert.equal(ubah[2], 'jh:t:12');
  // dibatalkan: status lama diganti, tidak menumpuk
  await prosesTelegram({ update: tekan('jh:t:12', 777, `${'📍 Tempat parkir baru\nCafe Kopi (ID 12)'}\n\n🙈 Disembunyikan: tidak tampil lagi di JukirHub.`), rahasiaHeader: 'r', rahasia: 'r', chatPemilik: '777', ...t });
  assert.equal(t.status.get(12), 'aktif');
  const terakhir = t.panggilan.filter(x => x[0] === 'ubah').at(-1);
  assert.doesNotMatch(terakhir[1], /Disembunyikan/);
  assert.match(terakhir[1], /Ditampilkan/);
});

test('orang lain menekan tombol → ditolak, status tidak berubah', async () => {
  const t = tiruan();
  await prosesTelegram({ update: tekan('jh:s:12', 999), rahasiaHeader: 'r', rahasia: 'r', chatPemilik: '777', ...t });
  assert.equal(t.status.get(12), 'aktif');
  assert.match(t.panggilan[0][1], /hanya untuk pengelola/);
});

test('lapor: kabar tempat baru dikirim sekali untuk tempat baru, tidak untuk tempat yang sudah ada', async () => {
  const dikabari = [];
  const tempat = [];
  const db = {
    async hitungLaporan() { return 0; },
    async titikDekat() { return tempat.map(({ id, nama }) => ({ id, nama })); },
    async titikDetail({ id }) { return tempat.find(x => x.id === id) ?? null; },
    async buatTitik(t) { tempat.push({ ...t, id: tempat.length + 1, dibekukan: false }); return tempat.length; },
    async riwayatPerangkat() { return []; },
    async simpanLaporan() {},
    async laporanTitik() { return []; },
    async simpanRingkasan() {}
  };
  const kabar = { tempatBaru: (t) => dikabari.push(t) };
  const body = (perangkat) => ({
    perangkat, kendaraan: 'motor', bantu_datang: true, bantu_pergi: true, bayar: 2000, pungli: [], bintang: 5,
    lat: -5.1400, lng: 119.4300, akurasi_m: 15,
    tempat: { nama: 'Cafe Kopi Senja', lat: -5.14001, lng: 119.43001, osm_ref: null, sumber: 'pin' }
  });
  const garam = { reporter: 'a', ip: 'b' };
  assert.equal((await prosesLapor({ body: body('perangkat-satu'), ip: null, garam, db, kabar })).status, 200);
  assert.equal((await prosesLapor({ body: body('perangkat-dua'), ip: null, garam, db, kabar })).status, 200);
  assert.equal(dikabari.length, 1, 'laporan kedua ke tempat yang sama tidak dikabarkan lagi');
  assert.deepEqual({ ...dikabari[0], lat: undefined, lng: undefined }, { id: 1, nama: 'Cafe Kopi Senja', sumber: 'pin', lat: undefined, lng: undefined });
});
