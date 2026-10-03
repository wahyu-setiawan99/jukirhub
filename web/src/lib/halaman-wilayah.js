// Halaman wilayah (AGENTS.md 1.8 B, disetujui pemilik 3 Okt 2026): /wilayah/<provinsi> dan /wilayah/<provinsi>/<kab-kota>
// untuk 6 provinsi & 81 kab/kota Sulawesi. Ringkasan agregat tanpa orang: jumlah tempat & laporan, bayar median,
// imbauan 30 hari, tempat yang paling banyak dilaporkan (BUKAN diurutkan menurut indikasi pungli).
// Dipakai halaman React (pages/Wilayah.jsx), HTML statis saat build (lib/seo.js), dan sitemap. JavaScript murni;
// hanya impor relatif supaya bisa dimuat Node (vite.config.js & tes).

import {
  KABUPATEN, PROVINSI, dataProvinsi, kabupatenDiProvinsi, kabupatenSah, provinsiKabupaten, provinsiTempat
} from '../../../supabase/functions/_shared/wilayah.js';
import { gabungImbauan, imbauanWilayah } from '../../../supabase/functions/_shared/imbauan.js';
import { formatRupiah } from '../../../supabase/functions/_shared/format.js';
import { jalurTempat, layakIndeks, slugNama } from './halaman-tempat.js';

// Halaman tipis tidak diindeks (SEO & AdSense): kab/kota diindeks bila 30 hari terakhir ≥ 10 laporan dari ≥ 3 perangkat
// (view imbauan_publik), ATAU ≥ 2 tempatnya lolos aturan indeks halaman tempat. Provinsi: bila ≥ 1 kab/kota-nya terindeks.
export const AMBANG_INDEKS_WILAYAH = { laporan30: 10, perangkat30: 3, tempatLayak: 2 };

export const jalurProvinsi = (kode) => `/wilayah/${slugNama(dataProvinsi(kode)?.nama)}`;
export const jalurKabupaten = (label) => `${jalurProvinsi(provinsiKabupaten(label))}/${slugNama(label)}`;

const wilayahProvinsi = (p) => ({ jenis: 'provinsi', kode: p.kode, provinsi: p.kode, nama: p.nama, jalur: jalurProvinsi(p.kode) });
const wilayahKabupaten = (k) => ({ jenis: 'kabupaten', kode: k.label, provinsi: k.provinsi, nama: k.label, jalur: jalurKabupaten(k.label) });

// Semua 87 halaman wilayah (provinsi dulu, lalu kab/kota), urutan tetap.
export const semuaWilayah = () => [...PROVINSI.map(wilayahProvinsi), ...KABUPATEN.map(wilayahKabupaten)];

export const wilayahKab = (label) => (kabupatenSah(label) ? wilayahKabupaten(KABUPATEN.find(k => k.label === label)) : null);
export const wilayahProv = (kode) => (dataProvinsi(kode) ? wilayahProvinsi(dataProvinsi(kode)) : null);

// "/wilayah/sulawesi-selatan/makassar" → wilayah, atau null bila tidak dikenal.
export function wilayahDariSlug(slugProvinsi, slugKabupaten = null) {
  const p = PROVINSI.find(x => slugNama(x.nama) === slugProvinsi);
  if (!p) return null;
  if (!slugKabupaten) return wilayahProvinsi(p);
  const label = kabupatenDiProvinsi(p.kode).find(l => slugNama(l) === slugKabupaten);
  return label ? wilayahKab(label) : null;
}

// Remah roti: [[nama, jalur], …] dari provinsi sampai wilayah ini (Beranda ditambahkan pemakai).
export const remahWilayah = (w) => (w.jenis === 'kabupaten'
  ? [[dataProvinsi(w.provinsi).nama, jalurProvinsi(w.provinsi)], [w.nama, w.jalur]]
  : [[w.nama, w.jalur]]);

// Remah roti halaman tempat: provinsi › kab/kota (bila diketahui) › tempat.
export function remahTempat(t) {
  const awal = kabupatenSah(t.kota) ? remahWilayah(wilayahKab(t.kota))
    : provinsiTempat(t) ? remahWilayah(wilayahProv(provinsiTempat(t))) : [];
  return [...awal, [t.nama, jalurTempat(t)]];
}

// Tempat di wilayah: kab/kota = `kota` tempat; provinsi = kab/kota tempat atau perkiraan kotak provinsi.
export const tempatDiWilayah = (daftar, w) => daftar.filter(t => (w.jenis === 'kabupaten' ? t.kota === w.kode : provinsiTempat(t) === w.kode));

// Median tertimbang dari median per tempat (bobot = jumlah laporan kendaraan itu); null bila belum ada laporan.
function medianTertimbang(pasangan) {
  const isi = pasangan.filter(([m, n]) => Number.isFinite(m) && n > 0).sort((a, b) => a[0] - b[0]);
  const total = isi.reduce((s, [, n]) => s + n, 0);
  if (!total) return null;
  let jalan = 0;
  for (const [m, n] of isi) {
    jalan += n;
    if (jalan * 2 >= total) return m;
  }
  return null;
}

const urutLaporan = (a, b) => b.ringkasan.jumlah - a.ringkasan.jumlah
  || String(b.ringkasan.terakhir ?? '').localeCompare(String(a.ringkasan.terakhir ?? '')) || a.nama.localeCompare(b.nama, 'id');

function ringkasDasar(daftar, w, barisImbauan) {
  const tempat = tempatDiWilayah(daftar, w).filter(t => t.ringkasan.jumlah > 0).sort(urutLaporan);
  const kab = w.jenis === 'kabupaten' ? [w.kode] : kabupatenDiProvinsi(w.kode);
  const agregat30 = gabungImbauan(barisImbauan ?? [], kab);
  const bayar = (k) => medianTertimbang(tempat.map(t => [t.ringkasan.bayar?.[k]?.median, t.ringkasan.bayar?.[k]?.jumlah ?? 0]));
  const terakhir = tempat.map(t => t.ringkasan.terakhir).filter(Boolean).sort().at(-1) ?? null;
  return {
    wilayah: w,
    tempat,
    jumlahTempat: tempat.length,
    jumlahLaporan: tempat.reduce((s, t) => s + t.ringkasan.jumlah, 0),
    laporan30: agregat30.laporan,
    bayarMotor: bayar('motor'),
    bayarMobil: bayar('mobil'),
    imbauan: imbauanWilayah(agregat30, w.nama),
    terakhir,
    indeks: (agregat30.laporan >= AMBANG_INDEKS_WILAYAH.laporan30 && agregat30.perangkat >= AMBANG_INDEKS_WILAYAH.perangkat30)
      || tempat.filter(layakIndeks).length >= AMBANG_INDEKS_WILAYAH.tempatLayak
  };
}

// Ringkasan satu wilayah. `daftar` = tempat dari gabungTempat, `barisImbauan` = baris view imbauan_publik (boleh kosong).
// Provinsi juga memuat `kabupaten` (ringkasan tiap kab/kota, terbanyak laporan dulu) dan indeks dari kab/kota-nya.
export function ringkasWilayah(daftar, w, barisImbauan = []) {
  const r = ringkasDasar(daftar, w, barisImbauan);
  if (w.jenis === 'kabupaten') return r;
  const kabupaten = kabupatenDiProvinsi(w.kode)
    .map(label => ringkasDasar(daftar, wilayahKab(label), barisImbauan))
    .sort((a, b) => b.jumlahLaporan - a.jumlahLaporan || b.laporan30 - a.laporan30
      || a.wilayah.nama.localeCompare(b.wilayah.nama, 'id'));
  return { ...r, kabupaten, indeks: kabupaten.some(k => k.indeks) };
}

// Kab/kota lain di provinsi yang sama (tautan antarhalaman).
export const tetangga = (w) => (w.jenis === 'kabupaten'
  ? kabupatenDiProvinsi(w.provinsi).filter(l => l !== w.kode).map(wilayahKab)
  : []);

// Judul ≤ 70 karakter.
export const judulWilayah = (w) => `Parkir & juru parkir di ${w.nama} · JukirHub`;

// Kalimat utuh saja, total ≤ 160 karakter (meta description & paragraf pembuka).
export function deskripsiWilayah(r) {
  const { wilayah: w } = r;
  const tempat = w.jenis === 'kabupaten' ? `${w.nama}, ${dataProvinsi(w.provinsi).nama}` : w.nama;
  const bagian = [r.jumlahLaporan
    ? `${r.jumlahLaporan} laporan warga soal juru parkir di ${r.jumlahTempat} tempat di ${tempat}.`
    : `Info juru parkir di ${tempat} dari laporan warga.`];
  if (r.bayarMotor) bagian.push(`Biasa dibayar motor ${formatRupiah(r.bayarMotor)}.`);
  if (r.bayarMobil) bagian.push(`Mobil ${formatRupiah(r.bayarMobil)}.`);
  bagian.push(r.jumlahLaporan ? 'Lihat tempat, indikasi pungli, dan imbauan parkir.' : 'Laporkan pengalaman parkir Anda, gratis tanpa akun.');
  let teks = bagian[0];
  for (const k of bagian.slice(1)) if (teks.length + 1 + k.length <= 160) teks += ` ${k}`;
  return teks;
}

// Angka utama (label → isi) untuk kotak ringkasan; sama urutannya di React & HTML statis.
export function angkaWilayah(r) {
  return [
    ['Tempat terlapor', String(r.jumlahTempat)],
    ['Laporan warga', String(r.jumlahLaporan)],
    ['Biasa dibayar motor', r.bayarMotor ? formatRupiah(r.bayarMotor) : '–'],
    ['Biasa dibayar mobil', r.bayarMobil ? formatRupiah(r.bayarMobil) : '–']
  ];
}
