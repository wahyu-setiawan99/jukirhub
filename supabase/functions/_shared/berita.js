// Berita parkir per daerah (M5, keputusan pemilik 1 Okt 2026): berita tentang parkir/jukir dari media di pulau
// Sulawesi (fase N2, AGENTS.md 1.5), dikelompokkan per kab/kota & provinsi yang disebut, ditampilkan sesuai daerah
// pengguna (mis. di Soppeng → berita Soppeng dulu, lalu Sulsel, lalu provinsi lain).
// Pola feed berita Adami (10.6). ESM murni: dipakai Edge Function `berita`, web (@shared), dan tes.
//
// Hak cipta: hanya judul, nama media, tanggal, ringkasan buatan AI (1–2 kalimat dari judul & cuplikan), dan tautan.
// Isi artikel & cuplikan TIDAK disimpan.

import { kabupatenDisebut, provinsiDisebut } from './wilayah.js';

// Feed RSS yang sudah dicek (mengizinkan akses otomatis): media Sulsel dari Adami + ANTARA tiap provinsi Sulawesi
// (dicek 1 Okt 2026; Sulawesi Barat belum punya feed ANTARA sendiri, tercakup media Sulsel). `provinsi` = provinsi
// liputan utama media itu (dipakai bila berita tidak menyebut daerah). Sumber baru dicek dulu.
export const SUMBER_BERITA = [
  { id: 'antara-sulsel', nama: 'ANTARA Sulsel', url: 'https://makassar.antaranews.com/rss/terkini.xml', domain: 'makassar.antaranews.com', provinsi: 'sulsel' },
  { id: 'detik-sulsel', nama: 'detikSulsel', url: 'https://www.detik.com/sulsel/rss', domain: 'detik.com', provinsi: 'sulsel' },
  { id: 'herald', nama: 'Herald.id', url: 'https://herald.id/feed/', domain: 'herald.id', provinsi: 'sulsel' },
  { id: 'fajar', nama: 'FAJAR', url: 'https://fajar.co.id/feed/', domain: 'fajar.co.id', provinsi: 'sulsel' },
  { id: 'terkini', nama: 'Terkini.id', url: 'https://makassar.terkini.id/feed/', domain: 'terkini.id', provinsi: 'sulsel' },
  { id: 'antara-sulut', nama: 'ANTARA Sulut', url: 'https://manado.antaranews.com/rss/terkini.xml', domain: 'manado.antaranews.com', provinsi: 'sulut' },
  { id: 'antara-gorontalo', nama: 'ANTARA Gorontalo', url: 'https://gorontalo.antaranews.com/rss/terkini.xml', domain: 'gorontalo.antaranews.com', provinsi: 'gorontalo' },
  { id: 'antara-sulteng', nama: 'ANTARA Sulteng', url: 'https://sulteng.antaranews.com/rss/terkini.xml', domain: 'sulteng.antaranews.com', provinsi: 'sulteng' },
  { id: 'antara-sultra', nama: 'ANTARA Sultra', url: 'https://sultra.antaranews.com/rss/terkini.xml', domain: 'sultra.antaranews.com', provinsi: 'sultra' }
];

export const BATAS_BERITA = {
  hariTampil: 30,         // berita parkir jarang; lebih lama dari ini tidak tampil
  hariSimpan: 90,         // baris lebih lama dihapus (cron bersihkan-berita)
  maksPerPutaran: 20,     // berita baru yang dinilai AI per putaran
  ukuranBatch: 10,        // berita per panggilan AI
  maksAiPerHari: 60,      // panggilan Gemini per hari (WITA)
  cuplikanMaks: 300,      // huruf cuplikan feed yang dikirim ke AI (tidak disimpan)
  ringkasanMin: 30,
  ringkasanMaks: 240,
  tampilAwal: 3           // kartu di Beranda; sisanya lewat "Tampilkan semua"
};

export const MODEL_BAWAAN = 'gemini-3.5-flash-lite';
export const USER_AGENT = 'Mozilla/5.0 (compatible; JukirHubBot/1.0; +https://jukirhub.vercel.app)';

// ------------------------------------------------------------------ baca RSS

const ENTITAS = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”' };

export function bersihkanTeks(teks) {
  return String(teks ?? '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITAS[n.toLowerCase()] ?? m)
    .replace(/<[^>]*>/g, ' ')          // tag yang baru muncul setelah entitas diurai (&lt;p&gt;)
    .replace(/\s+/g, ' ')
    .trim();
}

const isiTag = (blok, nama) => {
  const m = new RegExp(`<${nama}\\b[^>]*>([\\s\\S]*?)</${nama}>`, 'i').exec(blok);
  return m ? m[1] : '';
};

// RSS 2.0 → [{ judul, url, terbit (ISO | null), cuplikan }]. Tanpa pustaka XML (cukup untuk feed berita).
export function bacaRss(xml) {
  const hasil = [];
  for (const m of String(xml ?? '').matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const blok = m[1];
    const judul = bersihkanTeks(isiTag(blok, 'title'));
    const url = bersihkanTeks(isiTag(blok, 'link')) || bersihkanTeks(isiTag(blok, 'guid'));
    const waktu = Date.parse(bersihkanTeks(isiTag(blok, 'pubDate')) || bersihkanTeks(isiTag(blok, 'dc:date')));
    const cuplikan = bersihkanTeks(isiTag(blok, 'description')).slice(0, BATAS_BERITA.cuplikanMaks);
    if (judul && url) hasil.push({ judul, url, terbit: Number.isFinite(waktu) ? new Date(waktu).toISOString() : null, cuplikan });
  }
  return hasil;
}

// Tautan hanya ke situs sumber itu sendiri (feed tidak bisa menyisipkan tautan ke tempat lain).
export function urlSah(url, domain) {
  if (typeof url !== 'string' || url.length > 600) return false;
  try {
    const u = new URL(url);
    return (u.protocol === 'https:' || u.protocol === 'http:') && (u.hostname === domain || u.hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

// Penyaring awal sebelum AI (hemat jatah): hanya berita yang menyebut parkir / jukir.
const KATA_KUNCI = /(^|[^\p{L}])(parkir|perparkiran|jukir|juru parkir|tukang parkir)(?=[^\p{L}]|$)/iu;
export const relevanAwal = ({ judul, cuplikan = '' }) => KATA_KUNCI.test(`${judul} ${cuplikan}`);

export { kabupatenDisebut, provinsiDisebut };

// Provinsi berita: yang disebut (langsung / lewat kab-kota), atau provinsi liputan media bila tidak menyebut daerah.
export function provinsiBerita(teks, sumber) {
  const disebut = provinsiDisebut(teks);
  return disebut.length ? disebut : (sumber?.provinsi ? [sumber.provinsi] : []);
}

// ------------------------------------------------------------------ AI (Gemini)

export function promptBerita(daftar) {
  const sistem = [
    'Anda menyaring dan merangkum berita untuk JukirHub, aplikasi laporan warga tentang juru parkir (jukir) dan',
    'parkir di pinggir jalan / depan toko di pulau Sulawesi. Untuk setiap berita tentukan "relevan": true HANYA bila',
    'berita membahas parkir di Sulawesi: juru parkir, parkir liar, tarif atau retribusi parkir, karcis,',
    'penertiban, kebijakan parkir, atau keluhan warga soal parkir. relevan false untuk: berita di luar pulau Sulawesi,',
    'parkir pesawat/kapal, kecelakaan atau kriminal yang hanya kebetulan terjadi di tempat parkir, iklan/promosi/lowongan,',
    'dan topik lain. Bila relevan, tulis "ringkasan" netral 1–2 kalimat',
    `(maks. ${BATAS_BERITA.ringkasanMaks - 20} karakter) dalam bahasa Indonesia HANYA dari judul dan cuplikan: jangan`,
    'menambah fakta, angka, nama, atau tanggal yang tidak ada; jangan menyebut nama orang biasa (jukir, warga, pelaku);',
    'jangan menyalin kalimat sumber utuh; jangan menghakimi; tanpa tautan dan emoji. Bila tidak relevan, ringkasan',
    'kosong. Jawab satu objek per berita dengan "no" yang sama.'
  ].join(' ');
  const pengguna = `Berita (judul & cuplikan dari feed RSS):\n${JSON.stringify(
    daftar.map((b, i) => ({ no: i + 1, sumber: b.sumber, judul: b.judul, cuplikan: b.cuplikan })))}`;
  return { sistem, pengguna };
}

export const SKEMA_BERITA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: { no: { type: 'INTEGER' }, relevan: { type: 'BOOLEAN' }, ringkasan: { type: 'STRING' } },
    required: ['no', 'relevan', 'ringkasan']
  }
};

// Ringkasan AI → { ok: true, teks } atau { ok: false, alasan }. Angka hanya boleh yang ada di judul/cuplikan.
export function validasiRingkasan(ringkasan, { judul, cuplikan = '' }) {
  const teks = typeof ringkasan === 'string' ? ringkasan.replace(/\s+/g, ' ').trim() : '';
  if (teks.length < BATAS_BERITA.ringkasanMin || teks.length > BATAS_BERITA.ringkasanMaks) return { ok: false, alasan: 'panjang' };
  if (/https?:|www\.|[<>]|\p{Extended_Pictographic}/u.test(teks)) return { ok: false, alasan: 'format' };
  const angkaSumber = new Set(`${judul} ${cuplikan}`.match(/\d+/g) ?? []);
  if ((teks.match(/\d+/g) ?? []).some(a => !angkaSumber.has(a))) return { ok: false, alasan: 'angka_mengarang' };
  return { ok: true, teks };
}

// Jawaban AI (larik) → hasil per berita, urutan sama dengan `daftar`: { relevan, ringkasan, alasan? }.
// Berita relevan dengan ringkasan tidak lolos validasi disimpan tidak tampil (tidak dinilai ulang).
export function bacaJawabanBerita(jawaban, daftar) {
  const perNo = new Map((Array.isArray(jawaban) ? jawaban : []).map(j => [Number(j?.no), j]));
  return daftar.map((b, i) => {
    const j = perNo.get(i + 1);
    if (!j) return { relevan: false, ringkasan: null, alasan: 'tanpa_jawaban' };
    if (j.relevan !== true) return { relevan: false, ringkasan: null };
    const cek = validasiRingkasan(j.ringkasan, b);
    return cek.ok ? { relevan: true, ringkasan: cek.teks } : { relevan: false, ringkasan: null, alasan: cek.alasan };
  });
}

// ------------------------------------------------------------------ tampilan (web)

// Berita kab/kota pengguna dulu, lalu provinsi zona aktif, lalu Sulawesi lainnya; masing-masing terbaru dulu.
// `daerah` = label kab/kota atau null; `zona` = kode provinsi atau null.
export function urutkanBerita(berita, daerah, zona = null) {
  const skor = (b) => (daerah && (b.kabupaten ?? []).includes(daerah) ? 0 : zona && (b.provinsi ?? []).includes(zona) ? 1 : 2);
  return [...berita].sort((a, b) => skor(a) - skor(b) || Date.parse(b.terbit) - Date.parse(a.terbit));
}

export const adaBeritaDaerah = (berita, daerah) => Boolean(daerah) && berita.some(b => (b.kabupaten ?? []).includes(daerah));
