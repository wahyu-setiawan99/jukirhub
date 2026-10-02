import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  KUNCI_FOTO_TERTUNDA, bacaFotoTertunda, barisSumberFoto, buangMetadataJpeg, hapusFotoTertunda, tulisFotoTertunda, umurFileDetik
} from '../supabase/functions/_shared/foto.js';
import { KUNCI_FOTO_TERTUNDA as KUNCI_FOTO_WEB } from '../web/src/lib/foto-kunci.js';
import { prosesFoto } from '../supabase/functions/foto/proses.js';
import { sha256 } from '../supabase/functions/lapor/proses.js';
import {
  PROVINSI, kabupatenDariAlamat, kabupatenDiProvinsi, kabupatenDisebut, provinsiDariKoordinat, provinsiDisebut,
  semuaKabupaten, urlKabupatenNominatim, wilayahDariAlamat
} from '../supabase/functions/_shared/wilayah.js';
import {
  bacaJawabanBerita, bacaRss, relevanAwal, urlSah, urutkanBerita, validasiRingkasan
} from '../supabase/functions/_shared/berita.js';
import { prosesBerita } from '../supabase/functions/berita/proses.js';
import { bacaTombol, keteranganFoto } from '../supabase/functions/_shared/kabar-pemilik.js';
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
  assert.doesNotMatch(keteranganFoto({ id: 1, nama: 'X', ada_jukir: true }), /Diambil dari kamera|Dari galeri/);
});

test('foto: sumber kamera/galeri hanya petunjuk di keterangan; nilai lain diabaikan', async () => {
  const garam = { reporter: 'r' };
  const key = await sha256('r:perangkat-uji-1');
  const sekarang = Date.parse('2026-10-02T04:00:00Z');
  const lap = (id) => ({ id, reporter_key: key, dibuat: new Date(sekarang - 5 * 60_000).toISOString(),
    bobot_manual: 1, ada_jukir: true, kendaraan: 'motor', bayar: 2000, pungli: [], bintang: 4, nama: 'Cafe' });
  const db = dbFoto([lap(1), lap(2), lap(3)]);
  const terkirim = [];
  const tg = { async kirimFoto(_jpeg, ket) { terkirim.push(ket); return true; } };
  const kirim = (laporan_id, ekstra) => prosesFoto({
    body: { perangkat: 'perangkat-uji-1', laporan_id, foto: base64(JPEG), ...ekstra }, garam, db, tg, sekarang
  });

  assert.equal((await kirim(1, { sumber: 'kamera', umur_detik: 4 })).status, 200);
  assert.match(terkirim[0], /Diambil dari kamera/);
  assert.doesNotMatch(terkirim[0], /hari lalu/);
  assert.equal((await kirim(2, { sumber: 'galeri', umur_detik: 3 * 86400 })).status, 200);
  assert.match(terkirim[1], /Dari galeri, file ±3 hari lalu/);
  assert.equal((await kirim(3, { sumber: 'exif', umur_detik: -5 })).status, 200);
  assert.doesNotMatch(terkirim[2], /Diambil dari kamera|Dari galeri/);
  assert.equal(barisSumberFoto('galeri', 30), '🖼 Dari galeri, file baru saja');
  assert.equal(barisSumberFoto('lain', 30), null);
  assert.equal(umurFileDetik(sekarang - 3 * 86400 * 1000, sekarang), 3 * 86400);
  assert.equal(umurFileDetik(0, sekarang), null);
});

test('foto tertunda: kartu diingat 30 menit, lalu dihapus', () => {
  const m = new Map();
  const simpan = {
    getItem: k => m.get(k) ?? null,
    setItem: (k, v) => m.set(k, v),
    removeItem: k => m.delete(k)
  };
  const t = Date.parse('2026-10-02T04:00:00Z');
  assert.equal(tulisFotoTertunda(simpan, 12, t), true);
  assert.equal(tulisFotoTertunda(simpan, null, t), false);
  assert.deepEqual(bacaFotoTertunda(simpan, t + 29 * 60_000), { laporanId: 12, waktu: t, nama: null });
  tulisFotoTertunda(simpan, 12, t, '  Coto Tamalanrea 1 ');
  assert.equal(bacaFotoTertunda(simpan, t).nama, 'Coto Tamalanrea 1');
  assert.equal(bacaFotoTertunda(simpan, t + 31 * 60_000), null);
  assert.equal(m.size, 0);
  tulisFotoTertunda(simpan, 9, t);
  hapusFotoTertunda(simpan);
  assert.equal(bacaFotoTertunda(simpan, t), null);
  assert.equal(KUNCI_FOTO_WEB, KUNCI_FOTO_TERTUNDA);
});

// ------------------------------------------------ kabupaten / daerah

test('wilayah Sulawesi: 6 provinsi, 81 kab/kota, label unik, alias ibu kota, nama mirip tidak tertukar', () => {
  assert.equal(PROVINSI.length, 6);
  assert.equal(semuaKabupaten().length, 81);
  assert.equal(new Set(semuaKabupaten()).size, 81);
  assert.deepEqual(PROVINSI.map(p => kabupatenDiProvinsi(p.kode).length), [24, 6, 13, 17, 6, 15]);
  assert.deepEqual(kabupatenDisebut('Parkir liar di Bone Bolango'), ['Bone Bolango']);
  assert.deepEqual(kabupatenDisebut('Jukir di Minahasa Utara dan Minahasa'), ['Minahasa Utara', 'Minahasa']);
  assert.deepEqual(kabupatenDisebut('Retribusi parkir Kota Gorontalo'), ['Kota Gorontalo']);
  assert.deepEqual(kabupatenDisebut('Parkir di Luwuk'), ['Banggai']);
  assert.deepEqual(provinsiDisebut('Dishub Gorontalo tertibkan parkir'), ['gorontalo']);
  assert.deepEqual(provinsiDisebut('Parkir di Kendari dan Manado'), ['sultra', 'sulut']);
  assert.deepEqual(wilayahDariAlamat({ city: 'Gorontalo', 'ISO3166-2-lvl4': 'ID-GO' }), { provinsi: 'gorontalo', kabupaten: 'Kota Gorontalo' });
  assert.deepEqual(wilayahDariAlamat({ county: 'Kabupaten Gorontalo', state: 'Gorontalo' }), { provinsi: 'gorontalo', kabupaten: 'Gorontalo' });
  assert.deepEqual(wilayahDariAlamat({ city: 'Manado', 'ISO3166-2-lvl4': 'ID-SA' }), { provinsi: 'sulut', kabupaten: 'Manado' });
  assert.equal(provinsiDariKoordinat({ lat: -2.68, lng: 118.89 }), 'sulbar', 'kotak Sulbar (kecil) didahulukan dari Sulsel');
  assert.equal(provinsiDariKoordinat({ lat: -5.14, lng: 119.43 }), 'sulsel');
  assert.equal(provinsiDariKoordinat({ lat: -6.2, lng: 106.8 }), null);

  assert.deepEqual(kabupatenDisebut('Jukir liar ditertibkan di Watansoppeng'), ['Soppeng']);
  assert.deepEqual(kabupatenDisebut('Parkir di Malili, Luwu Timur'), ['Luwu Timur']);
  assert.deepEqual(kabupatenDisebut('Retribusi parkir Kabupaten Luwu naik'), ['Luwu']);
  assert.deepEqual(kabupatenDisebut('Parkir di Bone Bolango'), ['Bone Bolango'], 'Gorontalo, bukan Kabupaten Bone');
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

test('berita: alur fungsi (feed → AI → simpan, tanpa Telegram); tanpa kunci AI dilewati; jatah habis berhenti', async () => {
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
  const h = await prosesBerita({ ambilFeed: async (url) => { if (!feed[url]) throw new Error('HTTP 404'); return feed[url]; },
    ai, db, sekarang });
  assert.equal(h.kandidat, 2, 'berita > 30 hari & tanpa kata parkir dibuang');
  assert.equal(h.relevan, 1);
  assert.deepEqual(tersimpan.find(b => b.relevan).kabupaten, ['Soppeng']);
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

test('telegram: tombol berita lama (jh:bs/bt) tidak dikenali lagi', () => {
  assert.equal(bacaTombol('jh:bs:12'), null);
  assert.deepEqual(bacaTombol('jh:ks:3'), { jenis: 'komentar', aksi: 'tampilkan', id: 3 });
});
