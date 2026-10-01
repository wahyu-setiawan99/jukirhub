// Penanda kampanye iklan TANPA Meta Pixel (pola Adami, versi sederhana; rencana pemasaran docs/peluncuran/iklan.md).
// Tautan iklan membawa ?utm_source=…&utm_campaign=…&utm_content=…; app menyimpan ketiganya di perangkat 30 hari,
// menghapusnya dari alamat, lalu menyertakan "sumber/kampanye/konten" pada laporan. Hasil: `npm run kampanye`
// (jumlah laporan & pelapor per kampanye). Tanpa ID perangkat, IP, atau lokasi tambahan; fbclid tidak disimpan.

export const KUNCI_KAMPANYE = 'jukirhub_kampanye';
export const HARI_ATRIBUSI = 30;
const PANJANG_MAKS = 40;
const PARAMETER = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];

// "Makassar Uji (Okt)" → "makassar-uji-okt". Sama dengan pola constraint laporan_kampanye_valid.
export function normalKode(teks) {
  if (typeof teks !== 'string') return null;
  const kode = teks.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, PANJANG_MAKS)
    .replace(/-+$/, '');
  return kode || null;
}

// URLSearchParams → { sumber, kampanye, konten } atau null (bukan dari tautan kampanye).
export function bacaKampanye(param) {
  const sumber = normalKode(param.get('utm_source'));
  const kampanye = normalKode(param.get('utm_campaign'));
  if (sumber || kampanye) {
    return { sumber: sumber ?? 'lain', kampanye: kampanye ?? 'tanpa-nama', konten: normalKode(param.get('utm_content')) ?? '-' };
  }
  if (param.get('fbclid')) return { sumber: 'facebook', kampanye: 'tanpa-utm', konten: '-' };
  return null;
}

// Catatan tersimpan → "sumber/kampanye/konten" bila masih dalam 30 hari, selain itu null.
export function tagKampanye(catatan, sekarang = Date.now()) {
  if (!catatan || !Number.isFinite(catatan.sejak) || sekarang - catatan.sejak > HARI_ATRIBUSI * 86_400_000) return null;
  const bagian = [catatan.sumber, catatan.kampanye, catatan.konten];
  return bagian.every(b => typeof b === 'string' && /^[a-z0-9_-]{1,40}$/.test(b)) ? bagian.join('/') : null;
}

// ------------------------------------------------------------------ browser

function baca() {
  try { return JSON.parse(localStorage.getItem(KUNCI_KAMPANYE) ?? 'null'); } catch { return null; }
}

// Dipanggil sekali saat app dibuka (main.jsx). Klik iklan baru menimpa catatan lama.
export function tangkapKampanye() {
  if (typeof window === 'undefined') return;
  const param = new URLSearchParams(window.location.search);
  const dariUrl = bacaKampanye(param);
  if (!dariUrl) return;
  try { localStorage.setItem(KUNCI_KAMPANYE, JSON.stringify({ ...dariUrl, sejak: Date.now() })); } catch { /* abaikan */ }
  for (const p of PARAMETER) param.delete(p);
  const sisa = param.toString();
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${sisa ? `?${sisa}` : ''}${window.location.hash}`);
}

export const kampanyeAktif = () => tagKampanye(baca());
