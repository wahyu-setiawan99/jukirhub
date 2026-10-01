import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AMBANG_IMBAUAN, gabungImbauan, imbauanWilayah } from '../supabase/functions/_shared/imbauan.js';
import { SUMBER_BERITA, provinsiBerita, urutkanBerita } from '../supabase/functions/_shared/berita.js';
import { kabupatenDiProvinsi } from '../supabase/functions/_shared/wilayah.js';
import { tempatDiZona } from '../web/src/lib/tempat.js';
import { pilihZonaManual, wilayahDariPosisi, zonaManual } from '../web/src/lib/daerah.js';

const baris = (kabupaten, o = {}) => ({ kabupaten, laporan: 40, perangkat: 12, tanpa_karcis: 0, kemahalan: 0, memaksa: 0,
  tanda_gratis: 0, bantu_pergi: 10, ...o });

test('imbauan: hanya bila cukup laporan & perangkat; indikasi terbesar dulu, maks 2; nada netral', () => {
  assert.equal(imbauanWilayah(gabungImbauan([baris('Makassar', { laporan: 29 })], ['Makassar']), 'Makassar'), null);
  assert.equal(imbauanWilayah(gabungImbauan([baris('Makassar', { perangkat: 9 })], ['Makassar']), 'Makassar'), null);
  const i = imbauanWilayah(gabungImbauan([baris('Makassar', { tanpa_karcis: 16, kemahalan: 12, memaksa: 7, bantu_pergi: 30 })], ['Makassar']), 'Makassar');
  assert.equal(i.judul, 'Imbauan parkir · Makassar');
  assert.match(i.kalimat[0], /^40% laporan di Makassar 30 hari terakhir: tidak diberi karcis\. Minta karcis/);
  assert.match(i.kalimat[1], /^30% .*kemahalan/);
  assert.equal(i.kalimat.length, 3, '2 indikasi + kalimat membantu (≥ 60%)');
  assert.match(i.kalimat[2], /75% pelapor merasa jukir membantu/);
  const tenang = imbauanWilayah(gabungImbauan([baris('Makassar')], ['Makassar']), 'Makassar');
  assert.match(tenang.kalimat[0], /umumnya tanpa indikasi pungli/);
  assert.equal(AMBANG_IMBAUAN.laporan, 30);
});

test('imbauan provinsi: jumlah kab/kota di provinsi itu saja', () => {
  const data = [baris('Makassar', { laporan: 20, perangkat: 6 }), baris('Gowa', { laporan: 15, perangkat: 5 }), baris('Manado', { laporan: 99, perangkat: 50 })];
  const sulsel = gabungImbauan(data, kabupatenDiProvinsi('sulsel'));
  assert.equal(sulsel.laporan, 35);
  assert.equal(sulsel.perangkat, 11);
  assert.ok(imbauanWilayah(sulsel, 'Sulawesi Selatan'));
});

test('berita per zona: kab/kota pengguna → provinsi zona → lainnya; media provinsi dipakai bila daerah tak disebut', () => {
  const sulut = SUMBER_BERITA.find(s => s.id === 'antara-sulut');
  assert.deepEqual(provinsiBerita('Dishub tertibkan juru parkir di pasar', sulut), ['sulut']);
  assert.deepEqual(provinsiBerita('Parkir liar di Kendari', sulut), ['sultra']);
  const b = [
    { id: 1, terbit: '2026-10-01T01:00:00Z', kabupaten: ['Makassar'], provinsi: ['sulsel'] },
    { id: 2, terbit: '2026-09-29T01:00:00Z', kabupaten: ['Manado'], provinsi: ['sulut'] },
    { id: 3, terbit: '2026-09-20T01:00:00Z', kabupaten: ['Bitung'], provinsi: ['sulut'] },
    { id: 4, terbit: '2026-09-30T01:00:00Z', kabupaten: [], provinsi: ['sulteng'] }
  ];
  assert.deepEqual(urutkanBerita(b, 'Bitung', 'sulut').map(x => x.id), [3, 2, 1, 4]);
  assert.deepEqual(urutkanBerita(b, null, 'sulteng').map(x => x.id), [4, 1, 2, 3]);
});

test('daftar per zona: dari kab/kota tempat, atau kotak provinsi bila kab/kota belum terisi', () => {
  const daftar = [
    { id: 1, kota: 'Makassar', lat: -5.14, lng: 119.43 },
    { id: 2, kota: null, lat: 1.49, lng: 124.84 },
    { id: 3, kota: 'Manado', lat: 1.47, lng: 124.84 },
    { id: 4, kota: null, lat: -5.2, lng: 119.5 }
  ];
  assert.deepEqual(tempatDiZona(daftar, 'sulut').map(t => t.id), [2, 3]);
  assert.deepEqual(tempatDiZona(daftar, 'sulsel').map(t => t.id), [1, 4]);
});

function simpanTiruan() {
  const m = new Map();
  return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
}

test('zona pengguna: provinsi + kab/kota dari Nominatim; gagal → perkiraan kotak; pilihan manual diingat', async () => {
  const simpan = simpanTiruan();
  const fetchOk = async () => ({ ok: true, json: async () => ({ address: { city: 'Manado', 'ISO3166-2-lvl4': 'ID-SA' } }) });
  assert.deepEqual(await wilayahDariPosisi(fetchOk, { lat: 1.4748, lng: 124.8421 }, { simpan }), { provinsi: 'sulut', kabupaten: 'Manado' });
  const fetchGagal = async () => { throw new Error('offline'); };
  assert.deepEqual(await wilayahDariPosisi(fetchGagal, { lat: -3.97, lng: 122.51 }, { simpan: simpanTiruan() }), { provinsi: 'sultra', kabupaten: null });
  pilihZonaManual('gorontalo', simpan);
  assert.equal(zonaManual(simpan), 'gorontalo');
  pilihZonaManual(null, simpan);
  assert.equal(zonaManual(simpan), null);
});

test('teks wilayah SEO sama dengan daftar provinsi zona', async () => {
  const { WILAYAH } = await import('../web/src/lib/konten-beranda.js');
  const { PROVINSI } = await import('../supabase/functions/_shared/wilayah.js');
  assert.deepEqual(WILAYAH.daftar, PROVINSI.map(p => p.nama));
});
