import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KUNCI_PERANGKAT, kunciPerangkat, panggilFungsi, susunLaporan } from '../web/src/lib/fungsi.js';
import { validasiLaporan } from '../supabase/functions/_shared/lapor.js';

const K = { url: 'https://abc.supabase.co', kunci: 'kunci-anon' };
const isian = { kendaraan: 'mobil', bantuDatang: true, bantuPergi: false, bayar: 5000, pungli: new Set(['memaksa']), bintang: 2, namaTempat: '' };
const posisi = { lat: -5.1352, lng: 119.4902, akurasi: 18.6 };

test('susunLaporan: tempat terlapor → titik_id; body lolos validasi server', () => {
  const b = susunLaporan({ tempat: { id: 7, nama: 'A', lat: -5.135, lng: 119.49 }, isian, posisi, perangkat: 'perangkat-uji-1' });
  assert.equal(b.titik_id, 7);
  assert.equal(b.tempat, undefined);
  assert.deepEqual(b.pungli, ['memaksa']);
  assert.equal(b.akurasi_m, 19);
  assert.equal(validasiLaporan(b).ok, true);
});

test('susunLaporan: tempat baru dari cari (osm_ref) dan pin (nama diketik)', () => {
  const cari = susunLaporan({ tempat: { nama: 'Pasar Terong', osm_ref: 'way/7', lat: -5.13, lng: 119.42 }, isian, posisi, perangkat: 'perangkat-uji-1' });
  assert.deepEqual(cari.tempat, { nama: 'Pasar Terong', osm_ref: 'way/7', lat: -5.13, lng: 119.42 });
  const pin = susunLaporan({ tempat: { nama: '', lat: -5.15, lng: 119.42 }, isian: { ...isian, namaTempat: '  Pinggir Jl. Veteran ' }, posisi, perangkat: 'perangkat-uji-1' });
  assert.equal(pin.tempat.nama, 'Pinggir Jl. Veteran');
  assert.equal(pin.tempat.osm_ref, null);
  assert.equal(validasiLaporan(pin).ok, true);
});

test('isian belum lengkap → validasi menunjuk pertanyaan yang belum dijawab', () => {
  const b = susunLaporan({ tempat: { id: 7 }, isian: { ...isian, bantuDatang: null }, posisi, perangkat: 'perangkat-uji-1' });
  assert.equal(validasiLaporan(b).kode, 'bantu_datang');
  const tanpaLokasi = susunLaporan({ tempat: { id: 7 }, isian, posisi: null, perangkat: 'perangkat-uji-1' });
  assert.equal(validasiLaporan(tanpaLokasi).kode, 'lokasi');
});

test('panggilFungsi: POST ke /functions/v1/<nama> dengan apikey; pesan server diteruskan', async () => {
  let kiriman;
  const ok = await panggilFungsi(async (url, opsi) => { kiriman = { url, opsi }; return { ok: true, status: 200, json: async () => ({ ok: true, titik: { id: 1 } }) }; }, K, 'lapor', { a: 1 });
  assert.equal(ok.ok, true);
  assert.equal(kiriman.url, 'https://abc.supabase.co/functions/v1/lapor');
  assert.equal(kiriman.opsi.method, 'POST');
  assert.equal(kiriman.opsi.headers.apikey, 'kunci-anon');
  assert.equal(JSON.parse(kiriman.opsi.body).a, 1);
  const tolak = await panggilFungsi(async () => ({ ok: false, status: 422, json: async () => ({ ok: false, kode: 'jauh', pesan: 'Anda sekitar 1 km…' }) }), K, 'lapor', {});
  assert.deepEqual([tolak.kode, tolak.pesan], ['jauh', 'Anda sekitar 1 km…']);
  const putus = await panggilFungsi(async () => { throw new Error('offline'); }, K, 'lapor', {});
  assert.equal(putus.kode, 'jaringan');
  assert.equal((await panggilFungsi(async () => ({}), null, 'lapor', {})).kode, 'konfigurasi');
});

test('kunci perangkat dibuat sekali lalu dipakai ulang; penyimpanan diblokir tetap jalan', () => {
  const peta = new Map();
  const simpan = { getItem: k => peta.get(k) ?? null, setItem: (k, v) => peta.set(k, v) };
  const a = kunciPerangkat(simpan);
  assert.ok(a.length >= 8);
  assert.equal(kunciPerangkat(simpan), a);
  assert.equal(peta.get(KUNCI_PERANGKAT), a);
  const rusak = { getItem() { throw new Error('diblokir'); } };
  assert.equal(kunciPerangkat(rusak), kunciPerangkat(rusak));
});
