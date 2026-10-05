import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  bacaJawabanTarif, hitungUlangRingkasanKota, pesanUsulanTarif, petaTarif, pilihKotaDicek, promptTarif, usulanBaru
} from '../supabase/functions/_shared/tarif.js';
import { prosesTarif } from '../supabase/functions/tarif/proses.js';
import { prosesTelegram } from '../supabase/functions/telegram/proses.js';
import { bacaTombol } from '../supabase/functions/_shared/kabar-pemilik.js';
import { skorLaporan } from '../supabase/functions/_shared/skor-pungli.js';
import { buatModulPetunjuk } from '../scripts/sumber-tarif.js';

const JAWAB = (o) => `Berikut hasilnya:\n\`\`\`json\n${JSON.stringify(o)}\n\`\`\``;
const SAH = {
  motor: 2000, mobil: '4.000', dasar_hukum: 'Perda Kota Makassar No. 1 Tahun 2024',
  sumber_url: 'https://peraturan.bpk.go.id/Details/1/x', kutipan: 'Sepeda motor Rp2.000 sekali parkir; mobil Rp4.000',
  berlaku_sejak: '2024-01-05', catatan: null
};

test('jadwal cek: belum pernah dulu, lalu yang jatuh tempo (6 bulan bila ketemu, 30 hari bila tidak, 3 hari bila galat)', () => {
  const t = Date.parse('2026-10-05T00:00:00Z');
  const hari = (n) => new Date(t - n * 86_400_000).toISOString();
  const cek = new Map([
    ['A', { terakhir: hari(10), hasil: 'usulan' }],        // belum jatuh tempo
    ['B', { terakhir: hari(200), hasil: 'sama' }],          // jatuh tempo
    ['C', { terakhir: hari(31), hasil: 'tidak_ketemu' }],   // jatuh tempo (30 hari)
    ['D', { terakhir: hari(2), hasil: 'galat' }],           // belum (3 hari)
    ['E', { terakhir: hari(4), hasil: 'galat' }]            // jatuh tempo
  ]);
  assert.deepEqual(pilihKotaDicek(['A', 'B', 'C', 'D', 'E', 'F'], cek, t, 3), ['F', 'B', 'C']);
  assert.deepEqual(pilihKotaDicek(['A', 'D'], cek, t), []);
});

test('jawaban AI: angka wajar, sumber dari domain hasil pencarian / .go.id, wajib dasar hukum & kutipan', () => {
  const u = bacaJawabanTarif(JAWAB(SAH), ['peraturan.bpk.go.id']);
  assert.equal(u.motor, 2000);
  assert.equal(u.mobil, 4000, '"4.000" dibaca 4000');
  assert.equal(u.berlaku_sejak, '2024-01-05');
  assert.equal(bacaJawabanTarif(JAWAB({ ...SAH, sumber_url: 'https://contoh.com/x' }), ['peraturan.bpk.go.id']).galat, 'sumber_tidak_valid');
  assert.ok(!bacaJawabanTarif(JAWAB({ ...SAH, sumber_url: 'https://pasal.id/x' }), ['pasal.id']).galat, 'domain hasil pencarian boleh');
  assert.ok(!bacaJawabanTarif(JAWAB({ ...SAH, sumber_url: 'https://jdih.gowakab.go.id/x' }), []).galat, '.go.id boleh');
  assert.equal(bacaJawabanTarif(JAWAB({ ...SAH, motor: 100, mobil: 900000 }), []).galat, 'tidak_ketemu', 'di luar Rp500–50.000');
  assert.equal(bacaJawabanTarif(JAWAB({ ...SAH, motor: null, mobil: null }), []).galat, 'tidak_ketemu');
  assert.equal(bacaJawabanTarif(JAWAB({ ...SAH, kutipan: '' }), ['peraturan.bpk.go.id']).galat, 'tanpa_dasar');
  assert.equal(bacaJawabanTarif('maaf, tidak tahu', []).galat, 'bukan_json');
  assert.ok(promptTarif({ kota: 'Makassar', provinsi: 'Sulawesi Selatan', petunjuk: 'Perda 1/2024' }).pengguna.includes('Perda 1/2024'));
  assert.equal(usulanBaru(u, { motor: 2000, mobil: 4000 }), false);
  assert.equal(usulanBaru(u, { motor: 2000, mobil: 3000 }), true);
  assert.equal(usulanBaru(u, null), true);
});

test('pesan usulan: angka, kutipan, tautan, tarif lama; HTML di-escape', () => {
  const p = pesanUsulanTarif({ id: 9, kota: 'Makassar', ...SAH, mobil: 4000, kutipan: 'Motor <Rp2.000>' }, { motor: 1000, mobil: null });
  assert.match(p, /Motor <b>Rp 2\.000<\/b> · Mobil <b>Rp 4\.000<\/b>/);
  assert.match(p, /Tarif terpakai sekarang: motor Rp 1\.000 · mobil tidak disebut/);
  assert.match(p, /«Motor &lt;Rp2\.000&gt;»/);
  assert.match(p, /href="https:\/\/peraturan\.bpk\.go\.id/);
});

function sistemTarif({ jawaban = JAWAB(SAH), domain = ['peraturan.bpk.go.id'], lama = null, jatah = true, aiGagal = false } = {}) {
  const catat = [], usulan = [], kirim = [];
  return {
    catat, usulan, kirim,
    ai: async () => { if (aiGagal) throw new Error('Gemini 503'); return { teks: jawaban, domain }; },
    db: {
      waktuCek: async () => new Map(),
      catatCek: async (k, h) => { catat.push([k, h]); },
      ambilJatahAi: async (jenis) => { assert.equal(jenis, 'tarif'); return jatah; },
      tarifSekarang: async () => lama,
      simpanUsulan: async (u) => { usulan.push(u); return 40 + usulan.length; }
    },
    tg: { kirim: async (teks, tombol) => { kirim.push({ teks, data: tombol.inline_keyboard.flat().map(b => b.callback_data) }); } }
  };
}

test('proses tarif: usulan baru → disimpan & dikirim ke Telegram dengan tombol Pakai / Abaikan', async () => {
  const s = sistemTarif();
  const h = await prosesTarif({ ...s, kota: ['Makassar', 'Bandung'] });
  assert.deepEqual(h.dicek, [{ kota: 'Makassar', hasil: 'usulan' }], 'label tak dikenal dibuang');
  assert.equal(s.usulan[0].kota, 'Makassar');
  assert.deepEqual(s.kirim[0].data, ['jh:tp:41', 'jh:tx:41']);
  assert.deepEqual(s.catat, [['Makassar', 'usulan']]);
});

test('proses tarif: sama dengan tarif terpakai / tidak ketemu / galat / jatah habis / tanpa kunci', async () => {
  const sama = sistemTarif({ lama: { motor: 2000, mobil: 4000 } });
  assert.deepEqual((await prosesTarif({ ...sama, kota: ['Gowa'] })).dicek, [{ kota: 'Gowa', hasil: 'sama' }]);
  assert.equal(sama.kirim.length, 0);
  const kosong = sistemTarif({ jawaban: JAWAB({ ...SAH, motor: null, mobil: null }) });
  assert.deepEqual((await prosesTarif({ ...kosong, kota: ['Gowa'] })).dicek, [{ kota: 'Gowa', hasil: 'tidak_ketemu' }]);
  const gagal = sistemTarif({ aiGagal: true });
  assert.deepEqual((await prosesTarif({ ...gagal, kota: ['Gowa'] })).dicek, [{ kota: 'Gowa', hasil: 'galat' }]);
  const habis = sistemTarif({ jatah: false });
  assert.deepEqual((await prosesTarif({ ...habis, kota: ['Gowa', 'Maros'] })).dicek, [{ kota: 'Gowa', hasil: 'jatah_habis' }]);
  assert.equal(habis.catat.length, 0, 'jatah habis tidak dicatat sebagai sudah dicek');
  assert.equal((await prosesTarif({ ...sistemTarif(), ai: null })).dilewati, 'tanpa_kunci_ai');
});

test('telegram: tombol tarif Pakai → putuskan + hitung ulang kota; Abaikan tanpa hitung ulang', async () => {
  assert.deepEqual(bacaTombol('jh:tp:7'), { jenis: 'tarif', aksi: 'pakai', id: 7 });
  assert.deepEqual(bacaTombol('jh:tx:7'), { jenis: 'tarif', aksi: 'abaikan', id: 7 });
  const jalan = async (data) => {
    const log = { putus: [], hitung: [], jawab: [], ubah: [] };
    const db = {
      putuskanTarif: async (id, pakai) => { log.putus.push([id, pakai]); return { kota: 'Makassar' }; },
      hitungUlangKota: async (k) => { log.hitung.push(k); return 7; }
    };
    const tg = {
      jawabTombol: async (_id, t) => log.jawab.push(t),
      ubahPesan: async (_c, _m, teks) => log.ubah.push(teks),
      kirim: async () => {}
    };
    await prosesTelegram({
      update: { callback_query: { id: 'c', from: { id: 1 }, data, message: { chat: { id: 1 }, message_id: 2, text: 'Usulan' } } },
      rahasiaHeader: 'r', rahasia: 'r', chatPemilik: '1', db, tg
    });
    return log;
  };
  const pakai = await jalan('jh:tp:7');
  assert.deepEqual(pakai.putus, [[7, true]]);
  assert.deepEqual(pakai.hitung, ['Makassar']);
  assert.match(pakai.jawab[0], /7 tempat dihitung ulang/);
  assert.match(pakai.ubah[0], /Tarif dipakai/);
  const abai = await jalan('jh:tx:7');
  assert.deepEqual(abai.putus, [[7, false]]);
  assert.deepEqual(abai.hitung, []);
  assert.match(abai.ubah[0], /Usulan diabaikan/);
});

test('kemahalan per kendaraan & hitung ulang ringkasan kota', async () => {
  const motor = { bayar: 3000, pungli: [], kendaraan: 'motor' };
  const mobil = { bayar: 3000, pungli: [], kendaraan: 'mobil' };
  const tarif = { motor: 2000, mobil: 4000 };
  assert.ok(skorLaporan(motor, { tarifResmi: tarif }) > 0, 'motor bayar 3.000 > 2.000');
  assert.equal(skorLaporan(mobil, { tarifResmi: tarif }), 0, 'mobil bayar 3.000 < 4.000');
  assert.equal(skorLaporan({ ...mobil, kendaraan: 'mobil' }, { tarifResmi: { motor: 2000, mobil: null } }), 0);

  const simpan = new Map();
  const n = await hitungUlangRingkasanKota({
    kota: 'Makassar',
    sekarang: Date.parse('2026-10-05T00:00:00Z'),
    db: {
      tarifKota: async () => tarif,
      titikDiKota: async () => [1, 2],
      laporanTitik: async () => [{ ...motor, ada_jukir: true, reporter_key: 'a', dibuat: '2026-10-01T00:00:00Z' }],
      simpanRingkasan: async (id, r) => simpan.set(id, r)
    }
  });
  assert.equal(n, 2);
  assert.match(simpan.get(1).alasan_pungli, /kemahalan/);
});

test('peta tarif dari view publik & modul petunjuk selaras dengan lembar isian', async () => {
  const p = petaTarif([
    { kota: 'Makassar', kendaraan: 'motor', tarif: 2000, dasar_hukum: 'Perda 1/2024', sumber_url: 'https://x.go.id' },
    { kota: 'Makassar', kendaraan: 'mobil', tarif: '4000' },
    { kota: 'Gowa', kendaraan: 'truk', tarif: 9000 }
  ]);
  assert.deepEqual(p, { Makassar: { motor: 2000, mobil: 4000, dasar_hukum: 'Perda 1/2024', sumber_url: 'https://x.go.id' } });
  const lembar = JSON.parse(fs.readFileSync(new URL('../scripts/data/tarif-resmi.json', import.meta.url), 'utf8'));
  const modul = fs.readFileSync(new URL('../supabase/functions/_shared/sumber-tarif.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(modul, buatModulPetunjuk(lembar), 'jalankan `npm run tarif:sumber` setelah mengubah lembar isian');
  assert.ok(!/\b(motor|mobil)\b"?\s*:\s*\d/.test(modul), 'modul petunjuk tanpa angka tarif');
});

test('halaman wilayah statis menampilkan tarif resmi bila sudah disetujui', async () => {
  const { buatIsiWilayah } = await import('../web/src/lib/seo.js');
  const { ringkasWilayah, wilayahKab } = await import('../web/src/lib/halaman-wilayah.js');
  const r = ringkasWilayah([], wilayahKab('Makassar'));
  const isi = buatIsiWilayah(r, { motor: 2000, mobil: 4000, dasar_hukum: 'Perda <1>/2024' });
  assert.match(isi, /Tarif resmi parkir tepi jalan umum/);
  assert.match(isi, /<dt>Motor<\/dt><dd>Rp 2\.000 sekali parkir/);
  assert.match(isi, /Perda &lt;1&gt;\/2024/);
  assert.ok(!/Tarif resmi/.test(buatIsiWilayah(r, null)));
});
