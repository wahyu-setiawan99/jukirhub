import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buangMetadataJpeg } from '../supabase/functions/_shared/foto.js';
import { prosesFoto } from '../supabase/functions/foto/proses.js';
import { sha256 } from '../supabase/functions/lapor/proses.js';
import {
  kabupatenDariAlamat, kabupatenDisebut, semuaKabupaten, urlKabupatenNominatim
} from '../supabase/functions/_shared/kabupaten.js';
import {
  bacaJawabanBerita, bacaRss, relevanAwal, urlSah, urutkanBerita, validasiRingkasan
} from '../supabase/functions/_shared/berita.js';
import { prosesBerita } from '../supabase/functions/berita/proses.js';
import { bacaTombol, keteranganFoto, pesanBeritaBaru } from '../supabase/functions/_shared/kabar-pemilik.js';
import { prosesTelegram } from '../supabase/functions/telegram/proses.js';
import { daerahDariPosisi, daerahManual, pilihDaerahManual } from '../web/src/lib/daerah.js';

// ------------------------------------------------ foto bukti

// JPEG mini: SOI, APP0 (JFIF), APP1 (Exif berisi "GPS"), SOS + data, EOI.
const segmen = (penanda, isi) => [0xff, penanda, 0, isi.length + 2, ...isi];
const JPEG = Uint8Array.from([0xff, 0xd8, ...segmen(0xe0, [74, 70, 73, 70, 0]), ...segmen(0xe1, [71, 80, 83, 1, 2, 3]),
  0xff, 0xda, 0, 2, 9, 9, 9, 0xff, 0xd9]);
const base64 = (b) => Buffer.from(b).toString('base64');

test('foto: segmen Exif (lokasi GPS) dibuang, JFIF & data gambar tetap; bukan JPEG → null', () => {
  const bersih = buangMetadataJpeg(JPEG);
  assert.ok(bersih.length < JPEG.length);
  assert.ok(!Buffer.from(bersih).includes(Buffer.from('GPS')));
  assert.ok(Buffer.from(bersih).includes(Buffer.from('JFIF')));
  assert.equal(buangMetadataJpeg(Uint8Array.from([0x89, 0x50, 0x4e, 0x47])), null);
});

function dbFoto(laporan) {
  const foto = [];
  return {
    foto,
    async laporan(id) { return laporan.find(l => l.id === id) ?? null; },
    async adaFoto(id) { return foto.some(f => f.laporan_id === id); },
    async hitungFotoPerangkat(key) { return foto.filter(f => f.reporter_key === key).length; },
    async simpanFoto(f) { foto.push(f); }
  };
}

test('foto: hanya laporan sendiri ≤ 30 menit, satu per laporan, maks 3 per hari; diteruskan ke Telegram tanpa Exif', async () => {
  const garam = { reporter: 'r' };
  const key = await sha256('r:perangkat-uji-1');
  const sekarang = Date.parse('2026-10-01T03:00:00Z');
  const lap = (id, menitLalu = 5, o = {}) => ({ id, reporter_key: key, dibuat: new Date(sekarang - menitLalu * 60_000).toISOString(),
    bobot_manual: 1, ada_jukir: true, kendaraan: 'motor', bayar: 2000, pungli: ['tanpa_karcis'], bintang: 2, nama: 'Cafe', ...o });
  const db = dbFoto([lap(1), lap(2, 45), lap(3), lap(4), lap(5), { ...lap(6), reporter_key: 'orang-lain' }]);
  const terkirim = [];
  const tg = { async kirimFoto(jpeg, ket) { terkirim.push({ jpeg, ket }); return true; } };
  const kirim = (laporan_id, foto = base64(JPEG)) => prosesFoto({ body: { perangkat: 'perangkat-uji-1', laporan_id, foto }, garam, db, tg, sekarang });

  const ok = await kirim(1);
  assert.equal(ok.status, 200);
  assert.ok(!Buffer.from(terkirim[0].jpeg).includes(Buffer.from('GPS')));
  assert.match(terkirim[0].ket, /Cafe/);
  assert.match(terkirim[0].ket, /Tidak diberi karcis/);
  assert.equal((await kirim(1)).body.kode, 'sudah_ada');
  assert.equal((await kirim(2)).body.kode, 'bukan_milik', 'lebih dari 30 menit');
  assert.equal((await kirim(6)).body.kode, 'bukan_milik', 'laporan orang lain');
  assert.equal((await kirim(3, 'bukan base64!')).body.kode, 'format');
  await kirim(3); await kirim(4);
  assert.equal((await kirim(5)).body.kode, 'batas_harian');
  assert.equal(db.foto.length, 3);
});

test('keterangan foto: "tidak ada jukir" dan peringatan GPS mencurigakan untuk pemilik', () => {
  assert.match(keteranganFoto({ id: 1, nama: 'A&B', ada_jukir: false }), /Tidak ada jukir/);
  assert.match(keteranganFoto({ id: 1, nama: 'A&B', ada_jukir: false }), /A&amp;B/);
  assert.match(keteranganFoto({ id: 1, nama: 'X', ada_jukir: true, bobot_manual: 0.2 }), /mencurigakan/);
});

// ------------------------------------------------ kabupaten / daerah

test('kabupaten Sulsel: 24 daerah, alias ibu kota, Luwu Timur ≠ Luwu, Bone Bolango bukan Bone', () => {
  assert.equal(semuaKabupaten().length, 24);
  assert.deepEqual(kabupatenDisebut('Jukir liar ditertibkan di Watansoppeng'), ['Soppeng']);
  assert.deepEqual(kabupatenDisebut('Parkir di Malili, Luwu Timur'), ['Luwu Timur']);
  assert.deepEqual(kabupatenDisebut('Retribusi parkir Kabupaten Luwu naik'), ['Luwu']);
  assert.deepEqual(kabupatenDisebut('Parkir di Bone Bolango'), []);
  assert.deepEqual(kabupatenDisebut('Sengkang dan Makassar'), ['Makassar', 'Wajo']);
  assert.equal(kabupatenDariAlamat({ county: 'Kabupaten Soppeng', state: 'Sulawesi Selatan' }), 'Soppeng');
  assert.equal(kabupatenDariAlamat({ city: 'Makassar', state: 'Sulawesi Selatan' }), 'Makassar');
  assert.equal(kabupatenDariAlamat({ city: 'Jakarta Selatan', state: 'DKI Jakarta' }), null);
  const u = new URL(urlKabupatenNominatim(-4.346981, 119.885941));
  assert.equal(u.searchParams.get('lat'), '-4.35', 'dibulatkan ±1 km');
  assert.equal(u.searchParams.get('zoom'), '8');
});

function simpanTiruan() {
  const m = new Map();
  return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
}

test('daerah pengguna: dari posisi lewat Nominatim, disimpan per sel; pilihan manual diingat', async () => {
  const simpan = simpanTiruan();
  let panggil = 0;
  const fetchFn = async () => { panggil++; return { ok: true, json: async () => ({ address: { county: 'Soppeng', state: 'Sulawesi Selatan' } }) }; };
  const posisi = { lat: -4.3470, lng: 119.8859 };
  assert.equal(await daerahDariPosisi(fetchFn, posisi, { simpan }), 'Soppeng');
  assert.equal(await daerahDariPosisi(fetchFn, { lat: -4.3471, lng: 119.8860 }, { simpan }), 'Soppeng');
  assert.equal(panggil, 1, 'sel ±1 km yang sama tidak bertanya ulang');
  pilihDaerahManual('Bone', simpan);
  assert.equal(daerahManual(simpan), 'Bone');
  pilihDaerahManual('Atlantis', simpan);
  assert.equal(daerahManual(simpan), null);
});

// ------------------------------------------------ berita

const RSS = (item) => `<rss><channel>${item}</channel></rss>`;
const ITEM = ({ judul, url, waktu = 'Wed, 01 Oct 2026 01:00:00 GMT', isi = '' }) =>
  `<item><title><![CDATA[${judul}]]></title><link>${url}</link><pubDate>${waktu}</pubDate><description>${isi}</description></item>`;

test('berita: RSS dibaca, tautan harus ke domain sumber, hanya yang menyebut parkir/jukir', () => {
  const [b] = bacaRss(RSS(ITEM({ judul: 'Dishub &amp; jukir', url: 'https://fajar.co.id/a', isi: '&lt;p&gt;Parkir liar&lt;/p&gt;' })));
  assert.equal(b.judul, 'Dishub & jukir');
  assert.equal(b.cuplikan, 'Parkir liar');
  assert.equal(urlSah('https://fajar.co.id/a', 'fajar.co.id'), true);
  assert.equal(urlSah('https://penipu.com/fajar.co.id', 'fajar.co.id'), false);
  assert.equal(relevanAwal({ judul: 'Tarif parkir tepi jalan naik' }), true);
  assert.equal(relevanAwal({ judul: 'Harga cabai naik', cuplikan: 'pasar Terong' }), false);
  assert.equal(relevanAwal({ judul: 'Pesawat parkir di bandara' }), true, 'disaring lagi oleh AI');
});

test('berita: ringkasan AI dengan angka karangan atau tautan ditolak', () => {
  const b = { judul: 'Retribusi parkir Rp2.000 di Soppeng', cuplikan: '' };
  assert.equal(validasiRingkasan('Pemkab Soppeng menetapkan retribusi parkir Rp2.000 untuk motor di pusat kota.', b).ok, true);
  assert.equal(validasiRingkasan('Pemkab Soppeng menetapkan retribusi parkir Rp5.000 untuk motor di pusat kota.', b).alasan, 'angka_mengarang');
  assert.equal(validasiRingkasan('Lihat https://x.com untuk detail retribusi parkir di Soppeng ya.', b).alasan, 'format');
  assert.deepEqual(bacaJawabanBerita([{ no: 1, relevan: false, ringkasan: '' }], [b]), [{ relevan: false, ringkasan: null }]);
});

test('berita: alur fungsi (feed → AI → simpan → kabar pemilik); tanpa kunci AI dilewati; jatah habis berhenti', async () => {
  const sekarang = Date.parse('2026-10-01T03:00:00Z');
  const feed = {
    'https://www.detik.com/sulsel/rss': RSS(ITEM({ judul: 'Jukir liar di Watansoppeng ditertibkan', url: 'https://www.detik.com/sulsel/1' }) +
      ITEM({ judul: 'Harga beras naik', url: 'https://www.detik.com/sulsel/2' }) +
      ITEM({ judul: 'Parkir lama', url: 'https://www.detik.com/sulsel/3', waktu: 'Mon, 01 Jun 2026 01:00:00 GMT' })),
    'https://fajar.co.id/feed/': RSS(ITEM({ judul: 'Parkir pesawat di bandara', url: 'https://fajar.co.id/9' }))
  };
  const tersimpan = [];
  const db = {
    async sudahAda() { return new Set(); },
    async ambilJatahAi() { return true; },
    async simpan(baris) { return baris.map((b, i) => { const r = { ...b, id: tersimpan.length + i + 1 }; return r; }).map(r => (tersimpan.push(r), r)); }
  };
  const ai = async (batch) => batch.map(b => (/jukir/i.test(b.judul)
    ? { relevan: true, ringkasan: 'Petugas menertibkan juru parkir liar di Watansoppeng.' } : { relevan: false, ringkasan: null }));
  const kabar = [];
  const h = await prosesBerita({ ambilFeed: async (url) => { if (!feed[url]) throw new Error('HTTP 404'); return feed[url]; },
    ai, db, kabar: { beritaBaru: (b) => kabar.push(b) }, sekarang });
  assert.equal(h.kandidat, 2, 'berita > 30 hari & tanpa kata parkir dibuang');
  assert.equal(h.relevan, 1);
  assert.deepEqual(tersimpan.find(b => b.relevan).kabupaten, ['Soppeng']);
  assert.equal(kabar.length, 1);
  assert.ok(h.sumber.some(s => s.galat), 'sumber gagal dicatat, yang lain jalan');
  assert.equal((await prosesBerita({ ambilFeed: async () => '', ai: null, db })).dilewati, 'GEMINI_API_KEY belum dipasang');
  const habis = await prosesBerita({ ambilFeed: async (u) => feed[u] ?? '', ai, db: { ...db, async ambilJatahAi() { return false; } }, sekarang });
  assert.deepEqual(habis.galat_ai, ['batas_harian']);
});

test('berita di web: daerah pengguna dulu, lalu terbaru', () => {
  const b = [
    { id: 1, terbit: '2026-10-01T01:00:00Z', kabupaten: ['Makassar'] },
    { id: 2, terbit: '2026-09-20T01:00:00Z', kabupaten: ['Soppeng'] },
    { id: 3, terbit: '2026-09-30T01:00:00Z', kabupaten: [] }
  ];
  assert.deepEqual(urutkanBerita(b, 'Soppeng').map(x => x.id), [2, 1, 3]);
  assert.deepEqual(urutkanBerita(b, null).map(x => x.id), [1, 3, 2]);
});

test('telegram: tombol berita Sembunyikan / Tampilkan lagi hanya untuk pemilik', async () => {
  assert.deepEqual(bacaTombol('jh:bs:12'), { jenis: 'berita', aksi: 'sembunyikan', id: 12 });
  assert.match(pesanBeritaBaru({ id: 3, sumber: 'FAJAR', judul: '<b>x</b>', ringkasan: 'r', url: 'https://fajar.co.id/1', kabupaten: ['Bone'] }),
    /· Bone\n<b>&lt;b&gt;x&lt;\/b&gt;<\/b>/);
  const status = new Map([[12, false]]);
  const panggilan = [];
  const db = { async ubahStatusBerita(id, s) { status.set(id, s); return { judul: 'x' }; } };
  const tg = { async jawabTombol(id, t) { panggilan.push(t); }, async ubahPesan(c, m, teks, tombol) { panggilan.push(tombol.inline_keyboard[0][0].callback_data); }, async kirim() {} };
  const tekan = (data, dari = 7) => ({ callback_query: { id: 'c', from: { id: dari }, data, message: { message_id: 1, chat: { id: 7 }, text: '📰 Berita' } } });
  await prosesTelegram({ update: tekan('jh:bs:12', 99), rahasiaHeader: 'r', rahasia: 'r', chatPemilik: '7', db, tg });
  assert.equal(status.get(12), false, 'bukan pemilik');
  await prosesTelegram({ update: tekan('jh:bs:12'), rahasiaHeader: 'r', rahasia: 'r', chatPemilik: '7', db, tg });
  assert.equal(status.get(12), true);
  assert.ok(panggilan.includes('jh:bt:12'));
});
