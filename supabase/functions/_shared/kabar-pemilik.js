// Kabar ke pemilik lewat Telegram saat tempat baru tercatat (AGENTS.md bagian 5): pemilik tidak perlu membuka
// halaman moderasi; tempat yang tidak disembunyikan dianggap sah. ESM murni (Node & Deno), dites dengan node:test.
// Pesan tidak memuat identitas, IP, atau koordinat PELAPOR; hanya tempat (yang memang publik).

export const LABEL_SUMBER = {
  pin: 'nama diketik warga (tempat tidak ada di peta)',
  peta: 'nama dari peta OpenStreetMap',
  cari: 'hasil pencarian OpenStreetMap'
};

export const escapeHtml = (teks) =>
  String(teks ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Data tombol Telegram (maks. 64 byte): "jh:s:<id>" sembunyikan, "jh:t:<id>" tampilkan lagi.
export const dataTombol = (aksi, id) => `jh:${aksi === 'sembunyikan' ? 's' : 't'}:${id}`;

export function bacaTombol(data) {
  const m = /^jh:([st]):([0-9]{1,15})$/.exec(String(data ?? ''));
  return m ? { aksi: m[1] === 's' ? 'sembunyikan' : 'tampilkan', id: Number(m[2]) } : null;
}

export const tombolUntuk = (status, id) => ({
  inline_keyboard: [[status === 'disembunyikan'
    ? { text: '↩️ Tampilkan lagi', callback_data: dataTombol('tampilkan', id) }
    : { text: '🙈 Sembunyikan', callback_data: dataTombol('sembunyikan', id) }]]
});

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

// Baris status yang ditambahkan ke pesan setelah tombol ditekan.
export const barisStatus = (status) => (status === 'disembunyikan'
  ? '\n\n🙈 <b>Disembunyikan</b>: tidak tampil lagi di JukirHub.'
  : '\n\n✅ <b>Ditampilkan</b> di JukirHub.');
