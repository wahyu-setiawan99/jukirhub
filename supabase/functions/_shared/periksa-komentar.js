// Pemeriksaan komentar oleh AI (AGENTS.md 1.3.1, permintaan pemilik 1 Okt 2026). Komentar sudah lolos saringan server
// (periksaKomentar); Gemini lalu menggolongkannya. Hanya `layak` yang boleh tampil otomatis; selain itu tetap menunggu
// tombol pemilik di Telegram. Gagal / jatah habis / jawaban aneh → tetap menunggu (tidak pernah tampil otomatis).
// ESM murni: dipakai Edge Function `lapor` dan tes.

export const KATEGORI_KOMENTAR = {
  layak: 'layak',
  menyebut_identitas: 'menyebut identitas / ciri orang',
  tuduhan_pidana: 'menuduh tindak pidana orang tertentu',
  kasar: 'kasar / menghina',
  spam: 'spam / promosi',
  tidak_relevan: 'tidak relevan dengan parkir'
};

export const BATAS_AI_KOMENTAR_PER_HARI = 100;

export function promptKomentar(isi, namaTempat = '') {
  const sistem = [
    'Anda memeriksa komentar warga di JukirHub, aplikasi laporan pengalaman parkir dan juru parkir (jukir) di Indonesia.',
    'Golongkan komentar ke SATU kategori:',
    '"layak" = pengalaman parkir yang sopan, termasuk keluhan atau pujian umum (mis. "jukir tidak memberi karcis",',
    '"bayar 5.000 padahal biasanya 2.000", "jukir membantu menyeberangkan motor");',
    '"menyebut_identitas" = menyebut nama, julukan, ciri fisik, pakaian, nomor, atau hal lain yang bisa mengenali orang;',
    '"tuduhan_pidana" = menuduh orang tertentu melakukan kejahatan (memeras, mencuri, preman, mengancam, dsb.);',
    '"kasar" = kata kasar, menghina, merendahkan, SARA; "spam" = promosi, tautan, tidak bermakna;',
    '"tidak_relevan" = tidak membahas parkir atau tempat itu. Bila ragu antara layak dan lainnya, pilih yang lainnya.'
  ].join(' ');
  const pengguna = `Tempat: ${JSON.stringify(String(namaTempat).slice(0, 60))}\nKomentar: ${JSON.stringify(String(isi).slice(0, 200))}`;
  return { sistem, pengguna };
}

export const SKEMA_KOMENTAR = {
  type: 'OBJECT',
  properties: { kategori: { type: 'STRING', enum: Object.keys(KATEGORI_KOMENTAR) } },
  required: ['kategori']
};

// Jawaban AI → kode kategori, atau null bila tidak dikenali.
export function bacaJawabanKomentar(jawaban) {
  const k = jawaban && typeof jawaban === 'object' ? jawaban.kategori : null;
  return typeof k === 'string' && Object.hasOwn(KATEGORI_KOMENTAR, k) ? k : null;
}

export const tampilOtomatis = (kategori) => kategori === 'layak';
