// Kabar ke pemilik lewat Telegram (AGENTS.md bagian 5 & 1.3.1): pemilik tidak perlu membuka halaman moderasi.
// - Tempat baru: dianggap sah selama tidak disembunyikan (tombol Sembunyikan / Tampilkan lagi).
// - Komentar: baru tampil setelah pemilik menekan Tampilkan (tombol Tampilkan / Tolak).
// ESM murni (Node & Deno), dites dengan node:test. Pesan tidak memuat identitas, IP, atau koordinat PELAPOR.

import { INDIKASI_PUNGLI } from './konstanta.js';
import { barisSumberFoto } from './foto.js';
import { KATEGORI_KOMENTAR } from './periksa-komentar.js';

export const LABEL_SUMBER = {
  pin: 'nama diketik warga (tempat tidak ada di peta)',
  peta: 'nama dari peta OpenStreetMap',
  cari: 'hasil pencarian OpenStreetMap'
};

export const escapeHtml = (teks) =>
  String(teks ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Data tombol Telegram (maks. 64 byte). Tempat: "jh:s:<id>" sembunyikan, "jh:t:<id>" tampilkan.
// Komentar: "jh:ks:<id>" tampilkan, "jh:kx:<id>" tolak / sembunyikan. Usulan tarif (_shared/tarif.js): "jh:tp:<id>" pakai,
// "jh:tx:<id>" abaikan. (Berita tidak lewat Telegram.)
export const dataTombol = (aksi, id) => `jh:${aksi === 'sembunyikan' ? 's' : 't'}:${id}`;
export const dataTombolKomentar = (aksi, id) => `jh:${aksi === 'tampilkan' ? 'ks' : 'kx'}:${id}`;

export function bacaTombol(data) {
  const m = /^jh:(s|t|ks|kx|tp|tx):([0-9]{1,15})$/.exec(String(data ?? ''));
  if (!m) return null;
  const id = Number(m[2]);
  if (m[1] === 's') return { jenis: 'tempat', aksi: 'sembunyikan', id };
  if (m[1] === 't') return { jenis: 'tempat', aksi: 'tampilkan', id };
  if (m[1] === 'tp' || m[1] === 'tx') return { jenis: 'tarif', aksi: m[1] === 'tp' ? 'pakai' : 'abaikan', id };
  return { jenis: 'komentar', aksi: m[1] === 'ks' ? 'tampilkan' : 'tolak', id };
}

// Pesan formulir kontak (halaman /kontak). Email pengirim hanya bila diisi sendiri.
export function pesanKontak({ pesan, email }) {
  return [
    '✉️ <b>Pesan dari halaman Kontak</b>',
    email ? `Balas ke: ${escapeHtml(email)}` : 'Tanpa email balasan.',
    '',
    escapeHtml(pesan)
  ].join('\n');
}

// Keterangan foto bukti (Edge Function foto). Tanpa identitas/koordinat pelapor.
// `sumber` + `umur_detik` hanya petunjuk (kamera/galeri); tidak memengaruhi koin atau bobot.
export function keteranganFoto({ id, nama, ada_jukir, kendaraan, bayar, pungli = [], bintang, bobot_manual = 1, sumber = null, umur_detik = null }) {
  const label = Object.fromEntries(INDIKASI_PUNGLI.map(i => [i.kode, i.label]));
  const isi = ada_jukir === false
    ? ['Tidak ada jukir']
    : [
      kendaraan === 'mobil' ? 'Mobil' : 'Motor',
      `bayar Rp ${Number(bayar ?? 0).toLocaleString('id-ID')}`,
      bintang ? `${bintang}★` : null,
      ...(pungli ?? []).map(k => label[k] ?? k)
    ].filter(Boolean);
  const asal = barisSumberFoto(sumber, umur_detik);
  return [
    `📷 <b>Foto bukti</b> · <b>${escapeHtml(nama)}</b> (laporan ${id})`,
    escapeHtml(isi.join(' · ')),
    ...(asal ? [escapeHtml(asal)] : []),
    ...(bobot_manual < 1 ? ['⚠️ Lokasi pelapor mencurigakan (bobot laporan diturunkan).'] : []),
    'Foto hanya untuk Anda; tidak tampil di JukirHub.'
  ].join('\n');
}

export const tombolUntuk = (status, id) => ({
  inline_keyboard: [[status === 'disembunyikan'
    ? { text: '↩️ Tampilkan lagi', callback_data: dataTombol('tampilkan', id) }
    : { text: '🙈 Sembunyikan', callback_data: dataTombol('sembunyikan', id) }]]
});

export function tombolKomentar(status, id) {
  const tampil = { text: '✅ Tampilkan', callback_data: dataTombolKomentar('tampilkan', id) };
  const tolak = { text: status === 'tampil' ? '🙈 Sembunyikan' : '🚫 Tolak', callback_data: dataTombolKomentar('tolak', id) };
  if (status === 'menunggu') return { inline_keyboard: [[tampil, tolak]] };
  return { inline_keyboard: [[status === 'tampil' ? tolak : { ...tampil, text: '↩️ Tampilkan' }]] };
}

export function pesanTempatBaru({ id, nama, sumber, lat, lng }, urlWeb = '') {
  const osm = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=19/${lat}/${lng}`;
  return [
    '📍 <b>Tempat parkir baru</b>',
    `<b>${escapeHtml(nama)}</b> (ID ${id})`,
    `Asal: ${escapeHtml(LABEL_SUMBER[sumber] ?? 'tidak diketahui')}`,
    `<a href="${escapeHtml(osm)}">Lihat lokasinya di peta</a>${urlWeb ? ` · <a href="${escapeHtml(urlWeb)}/peta">JukirHub</a>` : ''}`,
    '',
    'Biarkan saja bila benar. Tekan Sembunyikan bila nama/lokasi tidak pantas atau bukan parkir luar gedung.'
  ].join('\n');
}

// `kategori` = hasil pemeriksaan AI (_shared/periksa-komentar.js) atau null; `tampil` = sudah tampil otomatis (AI: layak).
export function pesanKomentarBaru({ id, isi, namaTempat }, { kategori = null, tampil = false } = {}) {
  const ai = tampil
    ? '✅ <b>Tampil otomatis</b> (diperiksa AI: layak). Tekan Sembunyikan bila keliru.'
    : kategori
      ? `🤖 AI: <b>${escapeHtml(KATEGORI_KOMENTAR[kategori] ?? kategori)}</b>. Tampil hanya bila Anda tekan Tampilkan.`
      : 'Tampil hanya bila Anda tekan Tampilkan. Tolak bila menyebut nama/ciri orang, menuduh orang tertentu, kasar, atau spam.';
  return [
    `💬 <b>Komentar baru</b> di <b>${escapeHtml(namaTempat)}</b> (komentar ${id})`,
    '',
    `«${escapeHtml(isi)}»`,
    '',
    ai
  ].join('\n');
}

export function pesanKomentarDiadukan({ id, isi, namaTempat, jumlah }) {
  return [
    `🚩 <b>Komentar disembunyikan otomatis</b> di <b>${escapeHtml(namaTempat)}</b> (komentar ${id})`,
    `Diadukan oleh ${jumlah} perangkat berbeda.`,
    '',
    `«${escapeHtml(isi)}»`,
    '',
    'Tekan Tampilkan bila menurut Anda komentar ini layak.'
  ].join('\n');
}

// Baris status yang ditambahkan ke pesan setelah tombol ditekan.
export const barisStatus = (status) => (status === 'disembunyikan'
  ? '\n\n🙈 <b>Disembunyikan</b>: tidak tampil lagi di JukirHub.'
  : '\n\n✅ <b>Ditampilkan</b> di JukirHub.');

export const barisStatusKomentar = (status) => (status === 'tampil'
  ? '\n\n✅ <b>Komentar ditampilkan</b> di JukirHub.'
  : '\n\n🚫 <b>Komentar tidak ditampilkan.</b>');
