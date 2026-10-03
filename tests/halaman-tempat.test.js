import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_LAPORAN_INDEKS, deskripsiTempat, idDariJalur, jalurTempat, judulTempat, layakIndeks, slugNama
} from '../web/src/lib/halaman-tempat.js';
import { buatIsiTempat, buatKepalaSeo, buatSitemap, khususTempat } from '../web/src/lib/seo.js';

const tempat = (o = {}) => ({
  id: 12, nama: 'Indomaret Jl. Perintis (24 Jam)', kota: 'Makassar', lat: -5.135, lng: 119.49,
  ringkasan: {
    jumlah: 5, tanpaJukir: 1, dataCukup: true, layakIndeks: true, level: 'sedang', alasan: '2 dari 4 laporan tidak diberi karcis',
    bantuDatangYa: 3, bantuPergiYa: 1, bayar: { motor: { median: 2000, jumlah: 4 }, mobil: { median: null, jumlah: 0 } },
    bintang: 3.25, terakhir: '2026-10-01T03:00:00Z', ...o.ringkasan
  },
  ...o, ringkasan_: undefined
});

test('alamat halaman tempat: slug dari nama + id di akhir; id tetap terbaca walau nama berubah', () => {
  assert.equal(slugNama('Indomaret Jl. Perintis (24 Jam)'), 'indomaret-jl-perintis-24-jam');
  assert.equal(slugNama('Café Señorita'), 'cafe-senorita');
  assert.equal(slugNama('!!!'), 'tempat');
  assert.equal(slugNama('x'.repeat(80)).length, 60);
  assert.equal(jalurTempat(tempat()), '/tempat/indomaret-jl-perintis-24-jam-12');
  assert.equal(idDariJalur('/tempat/indomaret-jl-perintis-24-jam-12'), 12);
  assert.equal(idDariJalur('nama-lama-12'), 12);
  assert.equal(idDariJalur('tanpa-id'), null);
});

test('judul ≤ 70 karakter, deskripsi kalimat utuh ≤ 160, tidak menuduh', () => {
  const t = tempat();
  assert.equal(judulTempat(t), 'Parkir di Indomaret Jl. Perintis (24 Jam), Makassar · JukirHub');
  assert.ok(judulTempat(tempat({ nama: 'Nama tempat yang sangat panjang sekali '.repeat(3) })).length <= 70);
  const d = deskripsiTempat(t);
  assert.ok(d.length >= 70 && d.length <= 160, `${d.length}: ${d}`);
  assert.match(d, /^5 laporan warga soal juru parkir di Indomaret/);
  assert.ok(d.endsWith('.'), 'tidak terpotong di tengah kata');
  assert.ok(!/pelaku|preman|pemeras/i.test(d));
});

test('hanya tempat dengan ≥ 3 laporan dari ≥ 2 perangkat yang diindeks & masuk sitemap', () => {
  assert.equal(MIN_LAPORAN_INDEKS, 3);
  const banyak = tempat();
  const sedikit = tempat({ id: 13, nama: 'Warung Sepi', ringkasan: { jumlah: 1, tanpaJukir: 0, dataCukup: false, layakIndeks: false } });
  // 3 laporan tapi dari satu perangkat: server mengirim layak_indeks = false.
  const satuPerangkat = tempat({ id: 14, nama: 'Kios Satu', ringkasan: { jumlah: 3, layakIndeks: false } });
  // View lama (kolom belum ada) → tidak diindeks.
  const viewLama = tempat({ id: 15, nama: 'Kios Lama', ringkasan: { jumlah: 9, layakIndeks: undefined } });
  assert.equal(layakIndeks(banyak), true);
  assert.equal(layakIndeks(sedikit), false);
  assert.equal(layakIndeks(satuPerangkat), false);
  assert.equal(layakIndeks(viewLama), false);
  assert.match(buatKepalaSeo('https://jukirhub.site', { jalur: jalurTempat(sedikit), khusus: khususTempat(sedikit) }), /noindex, follow/);
  assert.match(buatKepalaSeo('https://jukirhub.site', { jalur: jalurTempat(banyak), khusus: khususTempat(banyak) }), /index, follow, max-image/);
  const sm = buatSitemap('https://jukirhub.site', new Date('2026-10-01'), undefined, [banyak, sedikit, satuPerangkat]);
  assert.ok(sm.includes('https://jukirhub.site/tempat/indomaret-jl-perintis-24-jam-12</loc><lastmod>2026-10-01'));
  assert.ok(!sm.includes('warung-sepi'));
  assert.ok(!sm.includes('kios-satu'));
});

test('HTML statis halaman tempat: satu h1, ringkasan, tautan tempat sekitar, tanpa script', () => {
  const t = tempat();
  const html = buatIsiTempat(t, [tempat({ id: 14, nama: 'Alfamart <Baru>' })]);
  assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1);
  assert.match(html, /Parkir di Indomaret Jl\. Perintis \(24 Jam\)/);
  assert.match(html, /<dt>Saat pergi<\/dt><dd>tidak membantu \(3 dari 4 laporan\)<\/dd>/);
  assert.match(html, /href="\/tempat\/alfamart-baru-14">Alfamart &lt;Baru&gt;</);
  assert.ok(!html.includes('<script'));
  const kepala = buatKepalaSeo('https://jukirhub.site', { jalur: jalurTempat(t), khusus: khususTempat(t) });
  assert.match(kepala, /<link rel="canonical" href="https:\/\/jukirhub\.site\/tempat\/indomaret-jl-perintis-24-jam-12" \/>/);
  assert.match(kepala, /"name":"Indomaret Jl\. Perintis \(24 Jam\)"/);
});
