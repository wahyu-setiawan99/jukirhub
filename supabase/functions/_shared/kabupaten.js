// 24 kabupaten/kota Sulawesi Selatan: satu sumber untuk peringkat koin per kabupaten (kota tempat parkir),
// berita parkir per daerah (M5), dan pilihan daerah di web. ESM murni (web lewat @shared, Deno, Node untuk tes).
//
// Label pendek dipakai di layar & database (titik_parkir.kota, koin_harian.kabupaten, berita.kabupaten).
// Alias = sebutan lain di alamat OpenStreetMap / judul berita (ibu kota kabupaten ikut, mis. Sengkang → Wajo).
// Urutan penting: yang lebih spesifik dulu ("Luwu Timur" sebelum "Luwu").

export const KABUPATEN_SULSEL = [
  { label: 'Makassar', alias: ['makassar'] },
  { label: 'Gowa', alias: ['gowa', 'sungguminasa'] },
  { label: 'Maros', alias: ['maros'] },
  { label: 'Takalar', alias: ['takalar'] },
  { label: 'Pangkep', alias: ['pangkep', 'pangkajene dan kepulauan', 'pangkajene kepulauan'] },
  { label: 'Barru', alias: ['barru'] },
  { label: 'Parepare', alias: ['parepare', 'pare-pare', 'pare pare'] },
  { label: 'Sidrap', alias: ['sidrap', 'sidenreng rappang', 'sidenreng'] },
  { label: 'Pinrang', alias: ['pinrang'] },
  { label: 'Enrekang', alias: ['enrekang'] },
  { label: 'Tana Toraja', alias: ['tana toraja', 'tator', 'makale'] },
  { label: 'Toraja Utara', alias: ['toraja utara', 'torut', 'rantepao'] },
  { label: 'Luwu Timur', alias: ['luwu timur', 'lutim', 'malili'] },
  { label: 'Luwu Utara', alias: ['luwu utara', 'lutra', 'masamba'] },
  { label: 'Luwu', alias: ['luwu(?!\\s*(timur|utara))', 'belopa'] },
  { label: 'Palopo', alias: ['palopo'] },
  { label: 'Wajo', alias: ['wajo', 'sengkang'] },
  { label: 'Soppeng', alias: ['soppeng', 'watansoppeng'] },
  // "Bone Bolango" (Gorontalo) bukan Kabupaten Bone.
  { label: 'Bone', alias: ['bone(?!\\s*bolango)', 'watampone'] },
  { label: 'Sinjai', alias: ['sinjai'] },
  { label: 'Bulukumba', alias: ['bulukumba'] },
  { label: 'Bantaeng', alias: ['bantaeng'] },
  { label: 'Jeneponto', alias: ['jeneponto'] },
  { label: 'Kepulauan Selayar', alias: ['selayar', 'kepulauan selayar'] }
];

export const semuaKabupaten = () => KABUPATEN_SULSEL.map(k => k.label);
const LABEL = new Set(semuaKabupaten());
export const kabupatenSah = (label) => typeof label === 'string' && LABEL.has(label);

/** @type {Array<[string, RegExp]>} */
const POLA = KABUPATEN_SULSEL.map(k => [k.label, new RegExp(`(^|[^\\p{L}])(${k.alias.join('|')})(?=[^\\p{L}]|$)`, 'iu')]);

// Semua kabupaten yang disebut dalam teks (judul + cuplikan berita), tanpa duplikat, urutan daftar di atas.
export function kabupatenDisebut(teks) {
  const t = String(teks ?? '');
  return POLA.filter(([, p]) => p.test(t)).map(([k]) => k);
}

// Alamat Nominatim (reverse, `address`) → label kabupaten, atau null bila di luar Sulsel / tidak dikenali.
// Kolom yang lebih kasar (county/city) dicek lebih dulu daripada nama desa/jalan yang bisa kebetulan mirip.
const KOLOM_ALAMAT = ['county', 'city', 'municipality', 'state_district', 'regency', 'town', 'region'];
export function kabupatenDariAlamat(alamat) {
  if (!alamat || typeof alamat !== 'object') return null;
  const provinsi = String(alamat.state ?? '');
  if (provinsi && !/sulawesi selatan|south sulawesi/i.test(provinsi)) return null;
  for (const kolom of KOLOM_ALAMAT) {
    const [k] = kabupatenDisebut(alamat[kolom]);
    if (k) return k;
  }
  return null;
}

// URL Nominatim reverse tingkat kabupaten (zoom 8). Koordinat dibulatkan ±1 km: cukup untuk kabupaten, tidak
// mengirim posisi persis pengguna ke OpenStreetMap.
export function urlKabupatenNominatim(lat, lng) {
  const p = new URLSearchParams({
    lat: (Math.round(lat * 100) / 100).toFixed(2),
    lon: (Math.round(lng * 100) / 100).toFixed(2),
    format: 'jsonv2',
    zoom: '8',
    addressdetails: '1',
    'accept-language': 'id'
  });
  return `https://nominatim.openstreetmap.org/reverse?${p}`;
}
