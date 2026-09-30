// Konstanta domain JukirHub (alur sederhana, AGENTS.md 1.2): SATU sumber untuk web (alias @shared), Edge Function,
// dan tes. Daftar kode di sini juga dicek database (constraint di supabase/migrations): mengubah daftar butuh
// migrasi, dan tests/konstanta-db.test.js gagal bila keduanya tidak sama. ESM murni, tanpa impor.

export const KENDARAAN = ['motor', 'mobil'];
export const LABEL_KENDARAAN = { motor: 'Motor', mobil: 'Mobil' };

export const STATUS_TITIK = ['aktif', 'disembunyikan'];

// Pertanyaan "saat datang" & "saat mau pergi" di form lapor (AGENTS.md 1.2 poin 3).
export const LABEL_BANTU = { true: 'Membantu', false: 'Tidak membantu' };

// Indikasi pungli yang bisa dipilih pelapor (boleh kosong) + poin skor (AGENTS.md 6.1–6.2).
export const INDIKASI_PUNGLI = [
  { kode: 'tanpa_karcis', label: 'Tidak diberi karcis', poin: 30 },
  { kode: 'kemahalan', label: 'Tarif kemahalan', poin: 25 },
  { kode: 'memaksa', label: 'Memaksa / marah', poin: 30 },
  { kode: 'tanda_gratis', label: 'Ada tulisan "parkir gratis"', poin: 30 }
];

// Tombol cepat "bayar berapa" (rupiah); "Lainnya" diketik.
export const BAYAR_CEPAT = [0, 1000, 2000, 3000, 5000];
export const MAKS_BAYAR = 100000;

// Level indikasi pungli: batas bawah skor tiap level (AGENTS.md 6.2).
export const LEVEL_PUNGLI = [
  { kode: 'rendah', label: 'Rendah', mulai: 0 },
  { kode: 'sedang', label: 'Sedang', mulai: 30 },
  { kode: 'tinggi', label: 'Tinggi', mulai: 60 }
];
// Level baru tampil setelah cukup data.
export const AMBANG_TAMPIL = { laporan: 3, perangkat: 2 };

export const BATAS = {
  radiusLaporM: 250,
  akurasiMaksM: 250,
  radiusTempatSamaM: 30,
  jedaPerTempatJam: 24,
  laporanPerPerangkatPerHari: 10,
  laporanPerIpPerJam: 10,
  laporanPerTempatPerJam: 10,
  panjangNamaTempatMaks: 60,
  panjangKomentarMaks: 200,
  aduanSembunyikan: 3,          // aduan dari perangkat berbeda → komentar disembunyikan otomatis (AGENTS.md 1.3.1)
  aduanPerIpPerJam: 20
};
