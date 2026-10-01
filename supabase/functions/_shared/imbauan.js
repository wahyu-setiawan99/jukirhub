// Imbauan parkir per wilayah (AGENTS.md 1.5, fase N2): kalimat netral dari angka agregat view imbauan_publik
// (30 hari, per kab/kota). Hanya tampil bila cukup laporan dari cukup banyak perangkat, tidak menyebut tempat atau
// orang tertentu, dan bukan tuduhan. ESM murni: dipakai web dan tes.

export const AMBANG_IMBAUAN = { laporan: 30, perangkat: 10 };

// Indikasi → batas persentase & kalimat ajakan. Urutan = prioritas bila persentasenya sama.
const ATURAN = [
  { kode: 'tanpa_karcis', batas: 0.25, label: 'tidak diberi karcis', ajakan: 'Minta karcis saat membayar parkir.' },
  { kode: 'kemahalan', batas: 0.25, label: 'tarif dirasa kemahalan', ajakan: 'Tanyakan tarif sebelum membayar dan laporkan bila tidak wajar.' },
  { kode: 'tanda_gratis', batas: 0.15, label: 'dipungut di tempat bertuliskan parkir gratis', ajakan: 'Perhatikan tanda parkir gratis di lokasi.' },
  { kode: 'memaksa', batas: 0.15, label: 'jukir memaksa atau marah', ajakan: 'Tetap tenang, utamakan keselamatan, lalu laporkan pengalaman Anda.' }
];

const KOLOM = ['laporan', 'perangkat', 'tanpa_karcis', 'kemahalan', 'memaksa', 'tanda_gratis', 'bantu_pergi'];

// Baris view per kab/kota → jumlah untuk satu wilayah (kab/kota atau provinsi). `perangkat` dijumlah per kab/kota
// (orang yang melapor di dua kab/kota terhitung dua kali; cukup untuk ambang tampil).
export function gabungImbauan(baris, kabupaten) {
  const pilih = new Set(kabupaten);
  const total = Object.fromEntries(KOLOM.map(k => [k, 0]));
  for (const b of baris ?? []) {
    if (!pilih.has(b.kabupaten)) continue;
    for (const k of KOLOM) total[k] += Number(b[k]) || 0;
  }
  return total;
}

// → { judul, kalimat[] } atau null bila belum cukup data. `wilayah` = nama yang ditampilkan (mis. "Kota Makassar").
export function imbauanWilayah(agregat, wilayah) {
  if (!agregat || agregat.laporan < AMBANG_IMBAUAN.laporan || agregat.perangkat < AMBANG_IMBAUAN.perangkat) return null;
  const persen = (n) => Math.round((n / agregat.laporan) * 100);
  const temuan = ATURAN
    .map(a => ({ ...a, porsi: agregat[a.kode] / agregat.laporan }))
    .filter(a => a.porsi >= a.batas)
    .sort((a, b) => b.porsi - a.porsi)
    .slice(0, 2);
  const kalimat = temuan.map(a => `${persen(agregat[a.kode])}% laporan di ${wilayah} 30 hari terakhir: ${a.label}. ${a.ajakan}`);
  if (!kalimat.length) {
    kalimat.push(`Laporan di ${wilayah} 30 hari terakhir umumnya tanpa indikasi pungli. Tetap laporkan pengalaman parkir Anda.`);
  }
  if (agregat.bantu_pergi / agregat.laporan >= 0.6) {
    kalimat.push(`${persen(agregat.bantu_pergi)}% pelapor merasa jukir membantu saat mau pergi.`);
  }
  return { judul: `Imbauan parkir · ${wilayah}`, kalimat, laporan: agregat.laporan };
}
