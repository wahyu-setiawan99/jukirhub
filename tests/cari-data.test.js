import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JEDA_MIN_MS, buatPencari, dalamKotak, hasilNominatim, urlNominatim } from '../web/src/lib/cari.js';
import { KOLOM_TITIK, ambilView, konfigurasiData, urlView } from '../web/src/lib/data.js';
import { KUNCI_SNAPSHOT, MAKS_UMUR_SNAPSHOT_MS, bacaSnapshot, buatSnapshot } from '../web/src/lib/offline.js';

test('URL Nominatim dibatasi Makassar Raya, maks. 5 hasil, bahasa Indonesia', () => {
  const u = new URL(urlNominatim('  Indomaret Perintis '));
  assert.equal(u.hostname, 'nominatim.openstreetmap.org');
  assert.equal(u.searchParams.get('q'), 'Indomaret Perintis');
  assert.equal(u.searchParams.get('bounded'), '1');
  assert.equal(u.searchParams.get('limit'), '5');
  assert.equal(u.searchParams.get('viewbox'), '119.3,-4.75,119.95,-5.65');
});

test('hasil Nominatim: nama, alamat ringkas, osm_ref sah, di luar kotak dibuang', () => {
  const hasil = hasilNominatim([
    { name: 'Indomaret Perintis', display_name: 'Indomaret Perintis, Jalan Perintis Kemerdekaan, Tamalanrea, Makassar, Sulawesi Selatan', lat: '-5.135', lon: '119.49', osm_type: 'node', osm_id: 123 },
    { name: '', display_name: 'Jalan Veteran Selatan, Mamajang, Makassar', lat: '-5.16', lon: '119.42', osm_type: 'way', osm_id: 9 },
    { name: 'Indomaret Jakarta', display_name: 'Indomaret, Jakarta', lat: '-6.2', lon: '106.8', osm_type: 'node', osm_id: 5 },
    { name: 'Aneh', lat: 'x', lon: '1' },
    { name: 'Tanpa ref', display_name: 'Tanpa ref, Makassar', lat: '-5.14', lon: '119.43', osm_type: 'google', osm_id: 1 }
  ]);
  assert.deepEqual(hasil.map(h => h.nama), ['Indomaret Perintis', 'Jalan Veteran Selatan', 'Tanpa ref']);
  assert.equal(hasil[0].osm_ref, 'node/123');
  assert.equal(hasil[0].alamat, 'Jalan Perintis Kemerdekaan, Tamalanrea, Makassar');
  assert.equal(hasil[2].osm_ref, null);
  assert.ok(dalamKotak({ lat: -5.14, lng: 119.43 }));
  assert.deepEqual(hasilNominatim({ bukan: 'array' }), []);
});

test('pencari: kueri pendek tidak dikirim, hasil disimpan, jeda ≥ 1 detik antar permintaan', async () => {
  const panggilan = [];
  let jam = 10_000;
  const fetchPalsu = async (url) => {
    panggilan.push({ url, jam });
    return { ok: true, json: async () => [{ name: 'Pasar Terong', display_name: 'Pasar Terong, Makassar', lat: '-5.13', lon: '119.42', osm_type: 'way', osm_id: 7 }] };
  };
  const cari = buatPencari(fetchPalsu, () => jam);
  assert.deepEqual(await cari('ab'), []);
  const satu = await cari('Pasar Terong');
  assert.equal(satu[0].osm_ref, 'way/7');
  await cari('pasar terong');
  assert.equal(panggilan.length, 1, 'kueri sama diambil dari simpanan');
  jam += 100;
  const mulai = Date.now();
  await cari('pasar sentral');
  assert.ok(Date.now() - mulai >= JEDA_MIN_MS - 150, 'menunggu jeda Nominatim');
});

test('konfigurasi data: tanpa URL/kunci → null (app jalan tanpa data)', () => {
  assert.equal(konfigurasiData({}), null);
  assert.equal(konfigurasiData({ VITE_SUPABASE_URL: 'https://abc.supabase.co' }), null);
  const k = konfigurasiData({ VITE_SUPABASE_URL: 'https://abc.supabase.co/', VITE_SUPABASE_ANON_KEY: 'kunci' });
  assert.deepEqual(k, { url: 'https://abc.supabase.co', kunci: 'kunci' });
  assert.equal(urlView(k, 'titik_publik', KOLOM_TITIK), 'https://abc.supabase.co/rest/v1/titik_publik?select=id%2Cnama%2Cosm_ref%2Ckota%2Clat%2Clng');
});

test('ambilView hanya membaca view publik dengan header apikey; galat HTTP dilempar', async () => {
  let kiriman;
  const k = { url: 'https://abc.supabase.co', kunci: 'kunci-anon' };
  const hasil = await ambilView(async (url, opsi) => { kiriman = { url, opsi }; return { ok: true, json: async () => [1] }; }, k, 'titik_publik', 'id');
  assert.deepEqual(hasil, [1]);
  assert.equal(kiriman.opsi.headers.apikey, 'kunci-anon');
  assert.ok(!('Authorization' in kiriman.opsi.headers));
  await assert.rejects(ambilView(async () => ({ ok: false, status: 404 }), k, 'titik_publik', 'id'), /HTTP 404/);
});

test('snapshot offline: dibaca kembali, dibuang bila rusak / terlalu lama', () => {
  const t = [{ id: 1, nama: 'A', lat: -5.1, lng: 119.4, ringkasan: { jumlah: 1 } }, { id: 'x' }];
  const teks = buatSnapshot({ tempat: t, diambil: 1000 });
  assert.equal(bacaSnapshot(teks, 2000).tempat.length, 1);
  assert.equal(bacaSnapshot(teks, 1000 + MAKS_UMUR_SNAPSHOT_MS + 1), null);
  assert.equal(bacaSnapshot('{rusak', 2000), null);
  assert.equal(bacaSnapshot(null, 2000), null);
  assert.match(KUNCI_SNAPSHOT, /^jukirhub_/);
});
