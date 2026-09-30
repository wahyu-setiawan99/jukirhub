// Skor indikasi pungli & ringkasan per tempat (AGENTS.md 6.2). SATU sumber untuk Edge Function dan tes.
// ESM murni (Node & Deno), tanpa impor selain konstanta.

import { INDIKASI_PUNGLI, LEVEL_PUNGLI } from './konstanta.js';

export const HARI_RINGKASAN = 180;
const POIN = Object.fromEntries(INDIKASI_PUNGLI.map(i => [i.kode, i.poin]));
// Indikasi ini hanya bermakna bila pelapor memang membayar.
const BUTUH_BAYAR = new Set(['tanpa_karcis', 'tanda_gratis']);

// Indikasi yang dihitung dari satu laporan (dipakai skor & alasan). `tarifResmi` (angka, opsional) hanya diisi
// bila tarif daerah sudah diperiksa pemilik: bayar di atasnya dihitung sebagai "kemahalan".
export function indikasiEfektif({ bayar = 0, pungli = [] }, { tarifResmi = null } = {}) {
  const hasil = new Set((pungli ?? []).filter(k => k in POIN && (!BUTUH_BAYAR.has(k) || bayar > 0)));
  if (Number.isFinite(tarifResmi) && tarifResmi > 0 && bayar > tarifResmi) hasil.add('kemahalan');
  return [...hasil];
}

export function skorLaporan(laporan, opsi) {
  return Math.min(100, indikasiEfektif(laporan, opsi).reduce((s, k) => s + POIN[k], 0));
}

export function levelDariSkor(skor) {
  let level = LEVEL_PUNGLI[0].kode;
  for (const l of LEVEL_PUNGLI) if (skor >= l.mulai) level = l.kode;
  return level;
}

const FRASA_ALASAN = {
  tanpa_karcis: 'tidak diberi karcis',
  kemahalan: 'menyebut tarif kemahalan',
  memaksa: 'menyebut jukir memaksa atau marah',
  tanda_gratis: 'menyebut ada tulisan "parkir gratis"'
};

// Indikasi yang paling sering dilaporkan, dengan jumlahnya: "3 dari 4 laporan tidak diberi karcis".
export function alasanUtama(laporan, opsi) {
  const n = laporan.length;
  if (!n) return null;
  const hitung = new Map();
  for (const l of laporan) for (const k of indikasiEfektif(l, opsi)) hitung.set(k, (hitung.get(k) ?? 0) + 1);
  if (!hitung.size) return 'Tidak ada indikasi pungli yang dilaporkan';
  // Terbanyak; seri → urutan INDIKASI_PUNGLI (karcis dulu).
  const urutan = INDIKASI_PUNGLI.map(i => i.kode);
  const [kode, jumlah] = [...hitung].sort((a, b) => b[1] - a[1] || urutan.indexOf(a[0]) - urutan.indexOf(b[0]))[0];
  return `${jumlah} dari ${n} laporan ${FRASA_ALASAN[kode]}`;
}

export function median(angka) {
  const a = angka.filter(Number.isFinite).sort((x, y) => x - y);
  if (!a.length) return null;
  const t = Math.floor(a.length / 2);
  return a.length % 2 ? a[t] : Math.round((a[t - 1] + a[t]) / 2);
}

// Laporan satu tempat → baris tabel ringkasan_titik. Jumlah, "x dari y", dan median memakai semua laporan
// (pelapor melihat laporannya ikut terhitung); skor & bintang memakai bobot (GPS palsu 0,2, bagian 4).
export function ringkasTempat(laporan, { sekarang = Date.now(), tarifResmi = null } = {}) {
  const batas = sekarang - HARI_RINGKASAN * 24 * 3_600_000;
  const l = (laporan ?? []).filter(x => Date.parse(x.dibuat) >= batas);
  const opsi = { tarifResmi };
  const bobot = (x) => (Number.isFinite(Number(x.bobot_manual)) ? Number(x.bobot_manual) : 1);
  const totalBobot = l.reduce((s, x) => s + bobot(x), 0);
  const rataBerbobot = (nilai) => (totalBobot > 0 ? l.reduce((s, x) => s + nilai(x) * bobot(x), 0) / totalBobot : null);
  const skor = rataBerbobot(x => skorLaporan(x, opsi));
  const per = (k) => l.filter(x => x.kendaraan === k);
  const bintang = rataBerbobot(x => Number(x.bintang));
  return {
    jumlah_laporan: l.length,
    jumlah_perangkat: new Set(l.map(x => x.reporter_key)).size,
    skor_pungli: skor == null ? null : Math.round(skor * 10) / 10,
    level_pungli: skor == null ? null : levelDariSkor(skor),
    alasan_pungli: alasanUtama(l, opsi),
    bantu_datang_ya: l.filter(x => x.bantu_datang).length,
    bantu_pergi_ya: l.filter(x => x.bantu_pergi).length,
    bayar_median_motor: median(per('motor').map(x => Number(x.bayar))),
    jumlah_motor: per('motor').length,
    bayar_median_mobil: median(per('mobil').map(x => Number(x.bayar))),
    jumlah_mobil: per('mobil').length,
    bintang_rata: bintang == null ? null : Math.round(bintang * 100) / 100,
    laporan_terakhir: l.length ? l.map(x => x.dibuat).sort().at(-1) : null
  };
}
