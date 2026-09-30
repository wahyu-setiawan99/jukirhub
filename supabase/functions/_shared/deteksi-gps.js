// Deteksi pola GPS palsu pada laporan (disalin dari Adami; AGENTS.md bagian 4).
// Browser tidak bisa mengenali lokasi palsu secara langsung; yang bisa dilakukan hanyalah mengenali
// POLA dari riwayat perangkat yang sama. Laporan yang dicurigai TIDAK ditolak: bobotnya diturunkan
// diam-diam supaya pelaku tidak sadar lalu mencari cara lain.
// Riwayat hanya 7 hari (koordinat laporan dihapus otomatis setelah itu). ESM murni (Node & Deno).

export const BATAS_GPS = {
  kecepatanMaksKmj: 150,      // perpindahan antar-laporan lebih cepat dari ini = lompatan mustahil
  jarakMinLompatanM: 2_000,   // perpindahan pendek diabaikan (akurasi GPS, tempat bersebelahan)
  jendelaLompatanJam: 6,
  akurasiJanggalM: 2,         // GPS HP nyaris tidak pernah < 2 m; aplikasi GPS palsu sering
  kembarMin: 2,               // koordinat persis sama ≥ 2 kali sebelumnya (tanpa getar GPS alami)
  jedaKembarMenit: 10,        // laporan beruntun boleh berbagi posisi yang sama
  maksHarian: 8,              // laporan per perangkat per 24 jam, lintas tempat
  bobotCuriga: 0.2
};

export const LABEL_KECURIGAAN = {
  lompatan_mustahil: 'lompatan lokasi mustahil',
  koordinat_kembar: 'koordinat kembar berulang',
  akurasi_janggal: 'akurasi GPS terlalu sempurna',
  terlalu_banyak_harian: 'terlalu banyak laporan sehari'
};

const JAM_MS = 3_600_000;

function jarakM(a, b) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const adaKoordinat = (r) => Number.isFinite(r?.lat) && Number.isFinite(r?.lng);

// baru: { lat, lng, akurasi_m, source }; riwayat: laporan perangkat yang sama
// [{ lat, lng, akurasi_m, dibuat }] (lat/lng boleh null). Mengembalikan { curiga, alasan, bobotManual }.
/**
 * @param {{ baru: { lat?: number | null, lng?: number | null, akurasi_m?: number | null, source?: string },
 *   riwayat?: Array<{ lat?: number | null, lng?: number | null, akurasi_m?: number | null, dibuat: string }>,
 *   sekarang?: number, batas?: typeof BATAS_GPS }} p
 * @returns {{ curiga: boolean, alasan: string[], bobotManual: number }}
 */
export function periksaKecurigaan({ baru, riwayat = [], sekarang = Date.now(), batas = BATAS_GPS }) {
  const alasan = [];
  const lampau = riwayat
    .map(r => ({ ...r, waktu: Date.parse(r.dibuat) }))
    .filter(r => Number.isFinite(r.waktu) && r.waktu <= sekarang)
    .sort((a, b) => b.waktu - a.waktu);

  if (adaKoordinat(baru)) {
    const terakhir = lampau.find(r => adaKoordinat(r) && sekarang - r.waktu <= batas.jendelaLompatanJam * JAM_MS);
    if (terakhir) {
      const jarak = jarakM(terakhir, baru);
      const jam = Math.max((sekarang - terakhir.waktu) / JAM_MS, 1 / 60);
      if (jarak >= batas.jarakMinLompatanM && jarak / 1000 / jam > batas.kecepatanMaksKmj) {
        alasan.push('lompatan_mustahil');
      }
    }

    const kembar = lampau.filter(r =>
      r.lat === baru.lat && r.lng === baru.lng && sekarang - r.waktu >= batas.jedaKembarMenit * 60_000
    ).length;
    if (kembar >= batas.kembarMin) alasan.push('koordinat_kembar');

    const akurasi = Number(baru.akurasi_m);
    if (baru.source === 'web' && Number.isFinite(akurasi) && akurasi < batas.akurasiJanggalM) {
      alasan.push('akurasi_janggal');
    }
  }

  const hariIni = lampau.filter(r => sekarang - r.waktu <= 24 * JAM_MS).length;
  if (hariIni >= batas.maksHarian) alasan.push('terlalu_banyak_harian');

  return { curiga: alasan.length > 0, alasan, bobotManual: alasan.length ? batas.bobotCuriga : 1 };
}
