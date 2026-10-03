import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  angkaWilayah, deskripsiWilayah, judulWilayah, remahWilayah, ringkasWilayah, semuaWilayah, tetangga, wilayahDariSlug,
  wilayahKab, wilayahProv
} from '../web/src/lib/halaman-wilayah.js';
import { buatIsiWilayah, buatKepalaSeo, buatSitemap, khususWilayah } from '../web/src/lib/seo.js';

const tempat = (id, kota, jumlah, o = {}) => ({
  id, nama: `Tempat ${id}`, kota, lat: -5.14, lng: 119.42,
  ringkasan: {
    jumlah, tanpaJukir: 0, dataCukup: jumlah >= 3, layakIndeks: false, level: 'rendah',
    bantuDatangYa: 0, bantuPergiYa: 0,
    bayar: { motor: { median: 2000, jumlah }, mobil: { median: null, jumlah: 0 } },
    bintang: null, terakhir: `2026-10-0${id % 9 + 1}T03:00:00Z`, ...o
  }
});

test('87 halaman wilayah dengan alamat unik; slug bolak-balik', () => {
  const semua = semuaWilayah();
  assert.equal(semua.length, 6 + 81);
  assert.equal(new Set(semua.map(w => w.jalur)).size, 87);
  assert.equal(wilayahProv('sulsel').jalur, '/wilayah/sulawesi-selatan');
  assert.equal(wilayahKab('Makassar').jalur, '/wilayah/sulawesi-selatan/makassar');
  assert.equal(wilayahKab('Kepulauan Selayar').jalur, '/wilayah/sulawesi-selatan/kepulauan-selayar');
  for (const w of semua) {
    const [, , p, k] = w.jalur.split('/');
    assert.deepEqual(wilayahDariSlug(p, k ?? null), w, w.jalur);
  }
  assert.equal(wilayahDariSlug('jawa-barat'), null);
  assert.equal(wilayahDariSlug('sulawesi-selatan', 'bandung'), null);
  assert.deepEqual(remahWilayah(wilayahKab('Makassar')).map(([n]) => n), ['Sulawesi Selatan', 'Makassar']);
  assert.ok(tetangga(wilayahKab('Makassar')).every(w => w.provinsi === 'sulsel' && w.kode !== 'Makassar'));
});

test('ringkasan kab/kota: urut menurut jumlah laporan (bukan indikasi), median tertimbang, judul & deskripsi', () => {
  const daftar = [
    tempat(1, 'Makassar', 2, { level: 'tinggi' }),
    tempat(2, 'Makassar', 6, { bayar: { motor: { median: 3000, jumlah: 6 }, mobil: { median: 5000, jumlah: 2 } } }),
    tempat(3, 'Gowa', 4),
    tempat(4, 'Makassar', 0)
  ];
  const r = ringkasWilayah(daftar, wilayahKab('Makassar'));
  assert.deepEqual(r.tempat.map(t => t.id), [2, 1], 'tanpa laporan tidak ikut; terbanyak dulu');
  assert.equal(r.jumlahLaporan, 8);
  assert.equal(r.bayarMotor, 3000, 'median tertimbang: 6 laporan Rp 3.000 vs 2 laporan Rp 2.000');
  assert.equal(r.bayarMobil, 5000);
  assert.ok(judulWilayah(r.wilayah).length <= 70);
  const d = deskripsiWilayah(r);
  assert.ok(d.length <= 160 && d.endsWith('.'), d);
  assert.match(d, /^8 laporan warga soal juru parkir di 2 tempat di Makassar, Sulawesi Selatan\./);
  assert.ok(!/pelaku|preman|terburuk/i.test(d));
  assert.deepEqual(angkaWilayah(r).map(([k]) => k), ['Tempat terlapor', 'Laporan warga', 'Biasa dibayar motor', 'Biasa dibayar mobil']);
  const kosong = ringkasWilayah([], wilayahKab('Bone'));
  assert.match(deskripsiWilayah(kosong), /^Info juru parkir di Bone, Sulawesi Selatan dari laporan warga\./);
});

test('aturan indeks wilayah: 30 hari ≥ 10 laporan dari ≥ 3 perangkat, atau ≥ 2 tempat layak; provinsi ikut kab/kota', () => {
  const sedikit = [tempat(1, 'Makassar', 5), tempat(2, 'Makassar', 5)];
  assert.equal(ringkasWilayah(sedikit, wilayahKab('Makassar')).indeks, false, 'tempat belum lolos aturan indeks tempat');
  const layak = [tempat(1, 'Makassar', 5, { layakIndeks: true }), tempat(2, 'Makassar', 3, { layakIndeks: true })];
  assert.equal(ringkasWilayah(layak, wilayahKab('Makassar')).indeks, true);
  const imbauan = [{ kabupaten: 'Gowa', laporan: 12, perangkat: 3 }];
  assert.equal(ringkasWilayah([], wilayahKab('Gowa'), imbauan).indeks, true);
  assert.equal(ringkasWilayah([], wilayahKab('Gowa'), [{ kabupaten: 'Gowa', laporan: 12, perangkat: 2 }]).indeks, false);
  const prov = ringkasWilayah(layak, wilayahProv('sulsel'), imbauan);
  assert.equal(prov.indeks, true);
  assert.deepEqual(prov.kabupaten.slice(0, 2).map(k => k.wilayah.nama), ['Makassar', 'Gowa']);
  assert.equal(prov.kabupaten.length, 24);
  assert.equal(ringkasWilayah([], wilayahProv('sulbar')).indeks, false);
});

test('HTML statis & sitemap wilayah: noindex bila tipis, remah roti JSON-LD, tautan ke tempat', () => {
  const layak = [tempat(1, 'Makassar', 5, { layakIndeks: true }), tempat(2, 'Makassar', 3, { layakIndeks: true })];
  const r = ringkasWilayah(layak, wilayahKab('Makassar'));
  const kepala = buatKepalaSeo('https://jukirhub.site', { jalur: r.wilayah.jalur, khusus: khususWilayah(r) });
  assert.match(kepala, /index, follow, max-image/);
  assert.match(kepala, /"BreadcrumbList".*"Sulawesi Selatan".*"Makassar"/);
  assert.match(kepala, /<link rel="canonical" href="https:\/\/jukirhub.site\/wilayah\/sulawesi-selatan\/makassar" \/>/);
  const isi = buatIsiWilayah(r);
  assert.match(isi, /<h1>Parkir &amp; juru parkir di Makassar<\/h1>/);
  assert.match(isi, /href="\/tempat\/tempat-1-1"/);
  assert.match(isi, /href="\/wilayah\/sulawesi-selatan"/);
  const tipis = ringkasWilayah([], wilayahKab('Bone'));
  assert.match(buatKepalaSeo('https://jukirhub.site', { jalur: tipis.wilayah.jalur, khusus: khususWilayah(tipis) }), /noindex, follow/);
  const sm = buatSitemap('https://jukirhub.site', new Date('2026-10-03'), undefined, layak, [r, tipis]);
  assert.ok(sm.includes('<loc>https://jukirhub.site/wilayah/sulawesi-selatan/makassar</loc>'));
  assert.ok(!sm.includes('/wilayah/sulawesi-selatan/bone'));
});

test('skrip isi-kota: hanya label kab/kota sah, hanya baris yang kotanya masih kosong, tanda kutip aman', async () => {
  const { sqlIsiKota } = await import('../scripts/isi-kota.js');
  const sql = sqlIsiKota([{ id: 3, kota: 'Makassar' }, { id: 4, kota: "Bandung'; drop table x; --" }, { id: -1, kota: 'Gowa' }]);
  assert.match(sql, /update titik_parkir set kota = 'Makassar' where id = 3 and kota is null;/);
  assert.ok(!/Bandung|drop|id = -1/.test(sql));
  assert.equal(sqlIsiKota([]), null);
});
