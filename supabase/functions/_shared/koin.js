// Koin pelapor (pola Adami 10.4 fase A, keputusan pemilik 1 Okt 2026): koin TANPA nilai uang, lencana, seri harian,
// peringkat 30 hari per kabupaten dengan nama samaran. Tanpa akun: koin terikat HP/browser (kunci perangkat).
// Aturan pasti & murni (tanpa DB) supaya bisa dites; dipakai Edge Function lapor & kontribusi, dan web (label).
//
// Anti-kecurangan diam-diam: laporan GPS palsu (bobot < 1) atau ke tempat yang dibekukan tetap terlihat mendapat koin
// di HP pelapornya (koin_tampil) tetapi tidak masuk peringkat (koin_sah). Jangan pernah mengirim koin_sah ke pelapor.

export const KOIN = {
  diLokasi: 10,        // setiap laporan yang lolos gerbang lokasi (semua laporan JukirHub dari lokasi)
  pembukaData: 5,      // tempat belum dilaporkan siapa pun selama HARI_PEMBUKA (termasuk tempat baru)
  seriPerHari: 2,      // hari ke-2 berturut-turut +2, ke-3 +4, …
  seriMaks: 10
};
export const BATAS_LAPORAN_BERKOIN_HARIAN = 5;
export const HARI_PEMBUKA = 7;
export const HARI_PERINGKAT = 30;
export const PERINGKAT_TAMPIL = 10;

// Urutan = urutan tampil di tab Saya. `kolom` = statistik di reputasi_pelapor.
export const LENCANA = [
  { id: 'pelapor_pertama', nama: 'Pelapor pertama', ket: 'Laporan pertama Anda', ikon: 'bendera', kolom: 'laporan_berkoin', ambang: 1 },
  { id: 'penjelajah', nama: 'Penjelajah', ket: 'Melapor di 5 tempat berbeda', ikon: 'peta', kolom: 'tempat_berbeda', ambang: 5 },
  { id: 'pembuka_data', nama: 'Pembuka data', ket: '3 kali jadi pelapor pertama dalam 7 hari', ikon: 'terbit', kolom: 'pembuka_data', ambang: 3 },
  { id: 'seri_7', nama: 'Seri 7 hari', ket: 'Melapor 7 hari berturut-turut', ikon: 'api', kolom: 'seri_terpanjang', ambang: 7 },
  { id: 'langganan', nama: 'Langganan', ket: '5 laporan di satu tempat', ikon: 'perisai', kolom: 'maks_satu_tempat', ambang: 5 },
  { id: 'rajin', nama: 'Rajin', ket: '25 laporan', ikon: 'bintang', kolom: 'laporan_berkoin', ambang: 25 }
];

// Nama samaran: hewan/burung khas Sulawesi + kabupaten laporan pertama. Tidak terhubung identitas.
export const HEWAN = [
  'Anoa', 'Maleo', 'Tarsius', 'Rangkong', 'Elang', 'Kakatua', 'Babirusa', 'Kuskus',
  'Julang', 'Rusa', 'Kangkareng', 'Srigunting', 'Raja Udang', 'Cekakak', 'Kadalan', 'Serindit'
];

export const REPUTASI_KOSONG = {
  koin_tampil: 0, koin_sah: 0, laporan_berkoin: 0, seri_hari: 0, seri_terpanjang: 0,
  tanggal_terakhir: null, laporan_hari_ini: 0, pembuka_data: 0, tempat_berbeda: 0, maks_satu_tempat: 0,
  lencana: []
};

const OFFSET_WITA_MS = 8 * 3_600_000;   // WITA = UTC+8, tanpa musim panas

// 'YYYY-MM-DD' menurut WITA.
export function tanggalWita(waktu = Date.now()) {
  return new Date(new Date(waktu).getTime() + OFFSET_WITA_MS).toISOString().slice(0, 10);
}

export function hariSebelum(tanggal) {
  const d = new Date(`${tanggal}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function namaSamaran(bibit, kabupaten, putaran = 0) {
  const angka = parseInt(String(bibit ?? '').replace(/[^0-9a-f]/gi, '').slice(0, 8) || '0', 16);
  const hewan = HEWAN[(angka + putaran * 5) % HEWAN.length];
  return kabupaten ? `${hewan} ${kabupaten}` : hewan;
}

export const lencanaDari = (statistik) => LENCANA.filter(l => (statistik[l.kolom] ?? 0) >= l.ambang).map(l => l.id);

// Kemajuan menuju tiap lencana (bilah kemajuan di tab Saya).
export function kemajuanLencana(statistik) {
  return LENCANA.map(l => {
    const nilai = Math.min(statistik?.[l.kolom] ?? 0, l.ambang);
    return { ...l, nilai, dapat: nilai >= l.ambang };
  });
}

/**
 * Koin untuk satu laporan. `lama` = baris reputasi_pelapor sebelumnya (atau null).
 * @param {{ lama: Record<string, any> | null, pembukaData: boolean, sah: boolean,
 *   laporanSebelumnyaDiTempat?: number, waktu?: number }} p
 */
export function hitungKoin({ lama, pembukaData, sah, laporanSebelumnyaDiTempat = 0, waktu = Date.now() }) {
  const r = { ...REPUTASI_KOSONG, ...(lama ?? {}) };
  r.lencana = [...(lama?.lencana ?? [])];
  const tanggal = tanggalWita(waktu);
  const hariSama = r.tanggal_terakhir === tanggal;
  const laporanHariIni = hariSama ? r.laporan_hari_ini : 0;

  if (laporanHariIni >= BATAS_LAPORAN_BERKOIN_HARIAN) {
    return {
      baris: { ...r, laporan_hari_ini: laporanHariIni + 1, tanggal_terakhir: tanggal },
      ringkasan: { koin: 0, rincian: [], batasHarian: true, total: r.koin_tampil, seri: r.seri_hari, lencanaBaru: [] },
      koinSah: 0,
      tanggal
    };
  }

  const seri = hariSama ? r.seri_hari : r.tanggal_terakhir === hariSebelum(tanggal) ? r.seri_hari + 1 : 1;
  const rincian = [{ kode: 'di_lokasi', koin: KOIN.diLokasi }];
  if (pembukaData) rincian.push({ kode: 'pembuka_data', koin: KOIN.pembukaData });
  if (!hariSama && seri >= 2) rincian.push({ kode: 'seri', koin: Math.min(KOIN.seriPerHari * (seri - 1), KOIN.seriMaks) });
  const koin = rincian.reduce((j, x) => j + x.koin, 0);
  const koinSah = sah ? koin : 0;

  const baris = {
    ...r,
    koin_tampil: r.koin_tampil + koin,
    koin_sah: r.koin_sah + koinSah,
    laporan_berkoin: r.laporan_berkoin + 1,
    seri_hari: seri,
    seri_terpanjang: Math.max(r.seri_terpanjang, seri),
    tanggal_terakhir: tanggal,
    laporan_hari_ini: laporanHariIni + 1,
    pembuka_data: r.pembuka_data + (pembukaData ? 1 : 0),
    tempat_berbeda: r.tempat_berbeda + (laporanSebelumnyaDiTempat === 0 ? 1 : 0),
    maks_satu_tempat: Math.max(r.maks_satu_tempat, laporanSebelumnyaDiTempat + 1)
  };
  const lencanaBaru = lencanaDari(baris).filter(id => !r.lencana.includes(id));
  baris.lencana = [...r.lencana, ...lencanaBaru];

  return { baris, ringkasan: { koin, rincian, batasHarian: false, total: baris.koin_tampil, seri, lencanaBaru }, koinSah, tanggal };
}

// Seri yang masih berjalan (putus bila hari terakhir melapor sebelum kemarin).
export const seriBerjalan = (r, waktu = Date.now()) =>
  (r?.tanggal_terakhir && r.tanggal_terakhir >= hariSebelum(tanggalWita(waktu)) ? r.seri_hari : 0);

export const LABEL_RINCIAN = { di_lokasi: 'laporan di lokasi', pembuka_data: 'pembuka data', seri: 'seri harian' };

export const namaLencana = (id) => LENCANA.find(l => l.id === id)?.nama ?? id;
