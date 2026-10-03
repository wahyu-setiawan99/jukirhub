// Halaman per tempat (/tempat/<slug>-<id>, permintaan pemilik 1 Okt 2026): alamat, judul, deskripsi, dan aturan indeks.
// Dipakai halaman React (pages/Tempat.jsx), HTML statis saat build (lib/seo.js), dan sitemap. JavaScript murni;
// hanya impor relatif (tanpa alias @shared) supaya bisa dimuat Node.

import {
  jumlahAdaJukir, kalimatBantu, kalimatTanpaJukir, labelLevel, teksBintang, teksTarif
} from './tempat.js';

// Di bawah ambang ini halaman tetap bisa dibuka, tapi "noindex" & tidak masuk sitemap: halaman tipis merugikan SEO
// dan penilaian AdSense ("konten bernilai rendah"), dan satu perangkat tidak boleh membuat tempat terindeks.
// Syarat lengkap (>= 3 laporan dari >= 2 perangkat) dihitung server: kolom layak_indeks di ringkasan_titik_publik.
export const MIN_LAPORAN_INDEKS = 3;

// "Indomaret Jl. Perintis (24 Jam)" → "indomaret-jl-perintis-24-jam". Aksen dibuang, maks. 60 huruf.
export function slugNama(nama) {
  const s = String(nama ?? '')
    .normalize('NFKD').replace(/\p{M}/gu, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 60).replace(/-+$/, '');
  return s || 'tempat';
}

export const jalurTempat = (t) => `/tempat/${slugNama(t.nama)}-${t.id}`;

// "/tempat/indomaret-perintis-12" atau "indomaret-perintis-12" → 12 (id di akhir; nama boleh berubah).
export function idDariJalur(jalur) {
  const m = /-(\d{1,15})\/?$/.exec(String(jalur ?? ''));
  return m ? Number(m[1]) : null;
}

export const layakIndeks = (t) => t?.ringkasan?.layakIndeks === true && (t.ringkasan.jumlah ?? 0) >= MIN_LAPORAN_INDEKS;

// Judul ≤ 70 karakter: "Parkir di Indomaret Perintis, Makassar · JukirHub" (nama dipotong bila terlalu panjang).
export function judulTempat(t) {
  const akhir = `${t.kota ? `, ${t.kota}` : ''} · JukirHub`;
  const ruang = 70 - 'Parkir di '.length - akhir.length;
  const nama = t.nama.length > ruang ? `${t.nama.slice(0, ruang - 1).trimEnd()}…` : t.nama;
  return `Parkir di ${nama}${akhir}`;
}

// Kalimat ringkas tempat (meta description & isi statis), tanpa menuduh siapa pun. 70–170 karakter bila bisa.
export function deskripsiTempat(t, kendaraan = 'motor') {
  const r = t.ringkasan;
  const bagian = [`${r.jumlah} laporan warga soal juru parkir di ${t.nama}${t.kota ? `, ${t.kota}` : ''}.`];
  const tanpa = kalimatTanpaJukir(r);
  if (tanpa) bagian.push(`${tanpa}.`);
  if (jumlahAdaJukir(r) > 0) {
    bagian.push(`Saat pergi: ${kalimatBantu(r.bantuPergiYa, jumlahAdaJukir(r))}.`);
    const tarif = teksTarif(r, kendaraan);
    if (tarif) bagian.push(`Biasa dibayar ${tarif}.`);
    bagian.push(`${labelLevel(r)}.`); // semua laporan tanpa jukir → label "Tanpa jukir" mengulang kalimat di atas
  }
  // Kalimat utuh saja (tidak dipotong di tengah kata), selama total ≤ 160 karakter.
  let teks = bagian[0];
  for (const k of bagian.slice(1)) if (teks.length + 1 + k.length <= 160) teks += ` ${k}`;
  return teks;
}

// Baris ringkasan untuk HTML statis (judul label → isi), sama urutannya dengan halaman React.
export function barisRingkasTempat(t, kendaraan = 'motor') {
  const r = t.ringkasan;
  const n = jumlahAdaJukir(r);
  const baris = [['Indikasi', labelLevel(r)]];
  if (kalimatTanpaJukir(r)) baris.push(['Tanpa jukir', kalimatTanpaJukir(r)]);
  if (n > 0) {
    baris.push(['Saat datang', kalimatBantu(r.bantuDatangYa, n)]);
    baris.push(['Saat pergi', kalimatBantu(r.bantuPergiYa, n)]);
    baris.push(['Biasa dibayar', teksTarif(r, kendaraan) ?? `belum ada laporan ${kendaraan}`]);
    if (teksBintang(r)) baris.push(['Rating', `★ ${teksBintang(r)}`]);
  }
  return baris;
}
