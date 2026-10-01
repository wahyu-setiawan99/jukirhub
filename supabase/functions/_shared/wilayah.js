// Zonasi wilayah (AGENTS.md 1.5, fase N2 pulau Sulawesi, keputusan pemilik 1 Okt 2026): 6 provinsi, 81 kab/kota.
// SATU sumber untuk zona aktif di web (peta, cari, daftar, imbauan), kabupaten tempat parkir (peringkat koin),
// dan daerah yang disebut berita (M5). ESM murni (web lewat impor relatif / @shared, Deno, Node untuk tes).
//
// Label kab/kota unik di seluruh Sulawesi dan dipakai apa adanya di database (titik_parkir.kota, koin_harian,
// berita.kabupaten): label Sulsel sama dengan versi sebelumnya. Alias = sebutan lain di alamat OpenStreetMap / berita
// (ibu kota kabupaten ikut). Urutan penting: yang lebih spesifik dulu ("Luwu Timur" sebelum "Luwu").
// bbox = [barat, selatan, timur, utara] perkiraan (untuk pusat peta & batas pencarian, bukan batas hukum).

export const PULAU = { sulawesi: 'Sulawesi' };

export const PROVINSI = [
  { kode: 'sulsel', nama: 'Sulawesi Selatan', singkat: 'Sulsel', iso: 'ID-SN', pusat: [119.4327, -5.1477],
    bbox: [118.7, -7.8, 122.0, -1.85], alias: ['sulawesi selatan', 'sulsel'] },
  { kode: 'sulbar', nama: 'Sulawesi Barat', singkat: 'Sulbar', iso: 'ID-SR', pusat: [118.8885, -2.6744],
    bbox: [118.7, -3.65, 119.9, -0.85], alias: ['sulawesi barat', 'sulbar'] },
  { kode: 'sulteng', nama: 'Sulawesi Tengah', singkat: 'Sulteng', iso: 'ID-ST', pusat: [119.8707, -0.8950],
    bbox: [119.4, -3.7, 124.3, 1.45], alias: ['sulawesi tengah', 'sulteng'] },
  { kode: 'sultra', nama: 'Sulawesi Tenggara', singkat: 'Sultra', iso: 'ID-SG', pusat: [122.5150, -3.9720],
    bbox: [120.8, -6.3, 124.7, -2.75], alias: ['sulawesi tenggara', 'sultra'] },
  { kode: 'gorontalo', nama: 'Gorontalo', singkat: 'Gorontalo', iso: 'ID-GO', pusat: [123.0595, 0.5435],
    bbox: [121.1, 0.3, 123.6, 1.1], alias: ['provinsi gorontalo'] },
  { kode: 'sulut', nama: 'Sulawesi Utara', singkat: 'Sulut', iso: 'ID-SA', pusat: [124.8421, 1.4748],
    bbox: [123.1, 0.3, 127.2, 4.9], alias: ['sulawesi utara', 'sulut'] }
].map(p => ({ ...p, pulau: 'sulawesi', zonaWaktu: 'Asia/Makassar' }));

const KAB = {
  sulsel: [
    ['Makassar', 'makassar'], ['Gowa', 'gowa', 'sungguminasa'], ['Maros', 'maros'], ['Takalar', 'takalar'],
    ['Pangkep', 'pangkep', 'pangkajene dan kepulauan', 'pangkajene kepulauan'], ['Barru', 'barru'],
    ['Parepare', 'parepare', 'pare-pare', 'pare pare'], ['Sidrap', 'sidrap', 'sidenreng rappang', 'sidenreng'],
    ['Pinrang', 'pinrang'], ['Enrekang', 'enrekang'], ['Tana Toraja', 'tana toraja', 'tator', 'makale'],
    ['Toraja Utara', 'toraja utara', 'torut', 'rantepao'], ['Luwu Timur', 'luwu timur', 'lutim', 'malili'],
    ['Luwu Utara', 'luwu utara', 'lutra', 'masamba'], ['Luwu', 'luwu(?!\\s*(timur|utara))', 'belopa'],
    ['Palopo', 'palopo'], ['Wajo', 'wajo', 'sengkang'], ['Soppeng', 'soppeng', 'watansoppeng'],
    // "Bone Bolango" (Gorontalo) bukan Kabupaten Bone.
    ['Bone', 'bone(?!\\s*bolango)', 'watampone'], ['Sinjai', 'sinjai'], ['Bulukumba', 'bulukumba'],
    ['Bantaeng', 'bantaeng'], ['Jeneponto', 'jeneponto'], ['Kepulauan Selayar', 'selayar', 'kepulauan selayar']
  ],
  sulbar: [
    ['Mamuju Tengah', 'mamuju tengah', 'mateng', 'tobadak'], ['Pasangkayu', 'pasangkayu', 'mamuju utara'],
    ['Mamuju', 'mamuju(?!\\s*(tengah|utara))'], ['Majene', 'majene'], ['Polewali Mandar', 'polewali mandar', 'polman', 'polewali'],
    ['Mamasa', 'mamasa']
  ],
  sulteng: [
    ['Palu', 'palu'], ['Donggala', 'donggala'], ['Sigi', 'sigi'], ['Parigi Moutong', 'parigi moutong', 'parimo', 'parigi'],
    ['Poso', 'poso'], ['Tojo Una-Una', 'tojo una-una', 'tojo una una', 'touna', 'ampana'],
    ['Morowali Utara', 'morowali utara', 'morut', 'kolonodale'], ['Morowali', 'morowali(?!\\s*utara)', 'bungku'],
    ['Banggai Kepulauan', 'banggai kepulauan', 'bangkep', 'salakan'], ['Banggai Laut', 'banggai laut', 'balut'],
    ['Banggai', 'banggai(?!\\s*(kepulauan|laut))', 'luwuk'], ['Toli-Toli', 'toli-toli', 'tolitoli', 'toli toli'],
    ['Buol', 'buol']
  ],
  sultra: [
    ['Kendari', 'kendari'], ['Baubau', 'baubau', 'bau-bau'], ['Bombana', 'bombana'], ['Wakatobi', 'wakatobi', 'wangi-wangi'],
    ['Kolaka Utara', 'kolaka utara', 'kolut', 'lasusua'], ['Kolaka Timur', 'kolaka timur', 'koltim'],
    ['Kolaka', 'kolaka(?!\\s*(utara|timur))'], ['Konawe Selatan', 'konawe selatan', 'konsel', 'andoolo'],
    ['Konawe Utara', 'konawe utara', 'konut', 'wanggudu'], ['Konawe Kepulauan', 'konawe kepulauan', 'konkep', 'wawonii'],
    ['Konawe', 'konawe(?!\\s*(selatan|utara|kepulauan))', 'unaaha'], ['Buton Utara', 'buton utara', 'butur'],
    ['Buton Tengah', 'buton tengah', 'buteng'], ['Buton Selatan', 'buton selatan', 'busel'],
    ['Buton', 'buton(?!\\s*(utara|tengah|selatan))', 'pasarwajo'], ['Muna Barat', 'muna barat', 'mubar'],
    ['Muna', 'muna(?!\\s*barat)', 'raha']
  ],
  gorontalo: [
    // "Gorontalo" saja di berita = provinsi; kabupaten disebut lengkap atau lewat ibu kotanya (Limboto).
    ['Kota Gorontalo', 'kota gorontalo'], ['Gorontalo Utara', 'gorontalo utara', 'gorut', 'kwandang'],
    ['Gorontalo', 'kabupaten gorontalo', 'kab\\. gorontalo', 'limboto'], ['Boalemo', 'boalemo', 'tilamuta'],
    ['Pohuwato', 'pohuwato'], ['Bone Bolango', 'bone bolango', 'bonebol', 'suwawa']
  ],
  sulut: [
    ['Manado', 'manado'], ['Bitung', 'bitung'], ['Tomohon', 'tomohon'], ['Kotamobagu', 'kotamobagu'],
    ['Minahasa Utara', 'minahasa utara', 'minut', 'airmadidi'], ['Minahasa Selatan', 'minahasa selatan', 'minsel', 'amurang'],
    ['Minahasa Tenggara', 'minahasa tenggara', 'ratahan'], ['Minahasa', 'minahasa(?!\\s*(utara|selatan|tenggara))', 'tondano'],
    ['Bolaang Mongondow Utara', 'bolaang mongondow utara', 'bolmut', 'boroko'],
    ['Bolaang Mongondow Timur', 'bolaang mongondow timur', 'boltim'],
    ['Bolaang Mongondow Selatan', 'bolaang mongondow selatan', 'bolsel'],
    ['Bolaang Mongondow', 'bolaang mongondow(?!\\s*(utara|timur|selatan))', 'bolmong'],
    ['Kepulauan Sangihe', 'sangihe', 'tahuna'], ['Kepulauan Talaud', 'talaud'],
    ['Kepulauan Sitaro', 'sitaro', 'siau tagulandang biaro']
  ]
};

export const KABUPATEN = PROVINSI.flatMap(p => KAB[p.kode].map(([label, ...alias]) => ({ label, provinsi: p.kode, alias })));

const PER_LABEL = new Map(KABUPATEN.map(k => [k.label, k]));
const PER_KODE = new Map(PROVINSI.map(p => [p.kode, p]));

export const semuaKabupaten = () => KABUPATEN.map(k => k.label);
export const kabupatenSah = (label) => typeof label === 'string' && PER_LABEL.has(label);
export const provinsiSah = (kode) => typeof kode === 'string' && PER_KODE.has(kode);
export const dataProvinsi = (kode) => PER_KODE.get(kode) ?? null;
export const provinsiKabupaten = (label) => PER_LABEL.get(label)?.provinsi ?? null;
export const kabupatenDiProvinsi = (kode) => KABUPATEN.filter(k => k.provinsi === kode).map(k => k.label);

const pola = (alias) => new RegExp(`(^|[^\\p{L}])(${alias.join('|')})(?=[^\\p{L}]|$)`, 'iu');
/** @type {Array<[string, RegExp]>} */
const POLA_KAB = KABUPATEN.map(k => [k.label, pola(k.alias)]);
/** @type {Array<[string, RegExp]>} */
const POLA_PROV = PROVINSI.map(p => [p.kode, pola(p.alias)]);

// Semua kab/kota yang disebut dalam teks (judul + cuplikan berita), tanpa duplikat, urutan daftar.
export function kabupatenDisebut(teks) {
  const t = String(teks ?? '');
  return POLA_KAB.filter(([, p]) => p.test(t)).map(([k]) => k);
}

// Provinsi yang disebut langsung atau lewat kab/kotanya. "Gorontalo" saja = Provinsi Gorontalo.
export function provinsiDisebut(teks) {
  const t = String(teks ?? '');
  const hasil = new Set(POLA_PROV.filter(([, p]) => p.test(t)).map(([k]) => k));
  if (/(^|[^\p{L}])gorontalo(?=[^\p{L}]|$)/iu.test(t)) hasil.add('gorontalo');
  for (const k of kabupatenDisebut(t)) hasil.add(provinsiKabupaten(k));
  return PROVINSI.map(p => p.kode).filter(k => hasil.has(k));
}

// ------------------------------------------------------------------ alamat Nominatim → wilayah

const rapikan = (s) => String(s ?? '').toLowerCase().replace(/^(kabupaten|kab\.)\s+/, '').replace(/\s+regency$/, '').trim();

// Alamat Nominatim (reverse, `address`) → { provinsi, kabupaten } (masing-masing bisa null) untuk Sulawesi.
// Provinsi dari kode ISO (paling pasti) atau nama provinsi; kab/kota dicari hanya di provinsi itu.
export function wilayahDariAlamat(alamat) {
  if (!alamat || typeof alamat !== 'object') return { provinsi: null, kabupaten: null };
  const iso = alamat['ISO3166-2-lvl4'];
  const prov = PROVINSI.find(p => p.iso === iso)
    ?? PROVINSI.find(p => p.nama.toLowerCase() === String(alamat.state ?? '').toLowerCase()) ?? null;
  if (!prov) return { provinsi: null, kabupaten: null };
  const daftar = KABUPATEN.filter(k => k.provinsi === prov.kode);
  for (const kolom of ['city', 'county', 'municipality', 'state_district', 'regency', 'town']) {
    const nilai = alamat[kolom];
    if (!nilai) continue;
    const nama = rapikan(nilai);
    const kota = nama.startsWith('kota ') ? nama.slice(5) : nama;
    // "Kota Gorontalo" vs Kabupaten Gorontalo: kolom city / awalan "Kota" mendahulukan label "Kota …".
    const pas = ((kolom === 'city' || nama.startsWith('kota ')) && daftar.find(k => k.label.toLowerCase() === `kota ${kota}`))
      || daftar.find(k => k.label.toLowerCase() === kota)
      || daftar.find(k => pola(k.alias).test(String(nilai)));
    if (pas) return { provinsi: prov.kode, kabupaten: pas.label };
  }
  return { provinsi: prov.kode, kabupaten: null };
}

// Kompatibel dengan versi Sulsel: alamat → label kab/kota atau null.
export const kabupatenDariAlamat = (alamat) => wilayahDariAlamat(alamat).kabupaten;

// Koordinat → kode provinsi dari bbox (perkiraan, untuk tempat yang belum punya kab/kota). Provinsi dengan kotak
// terkecil dicek dulu karena kotak provinsi bertumpuk.
const URUT_LUAS = [...PROVINSI].sort((a, b) => luas(a.bbox) - luas(b.bbox));
function luas([b, s, t, u]) { return (t - b) * (u - s); }
export const dalamBbox = ({ lat, lng }, [b, s, t, u]) => lng >= b && lng <= t && lat >= s && lat <= u;
export function provinsiDariKoordinat(titik) {
  if (!Number.isFinite(titik?.lat) || !Number.isFinite(titik?.lng)) return null;
  return URUT_LUAS.find(p => dalamBbox(titik, p.bbox))?.kode ?? null;
}

// Provinsi satu tempat parkir: dari kab/kotanya, atau perkiraan dari koordinat.
export const provinsiTempat = (t) => provinsiKabupaten(t?.kota) ?? provinsiDariKoordinat(t);

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
