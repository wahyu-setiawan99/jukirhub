// Alur Edge Function `berita` (M5): dipanggil pg_cron tiap 3 jam. JavaScript murni: feed, AI, database, dan kabar ke
// pemilik disuntikkan supaya bisa dites dengan node:test.
//   1. Ambil RSS SUMBER_BERITA bersamaan; saring: tautan ke situs sumber, terbit ≤ 30 hari, menyebut parkir/jukir,
//      belum pernah disimpan.
//   2. Gemini menilai relevansi + menulis ringkasan dari judul & cuplikan saja (jawaban divalidasi), maks. 60 panggilan
//      per hari. Berita tidak relevan tetap dicatat supaya tidak dinilai ulang. AI gagal / jatah habis → dicoba lagi nanti.
//   3. Kab/kota & provinsi Sulawesi yang disebut di judul/cuplikan dicatat (untuk berita per daerah di web).
// Berita TIDAK dikirim ke Telegram pemilik (keputusan pemilik 1 Okt 2026): cukup tampil di web (Beranda & /berita).

import { BATAS_BERITA, SUMBER_BERITA, bacaRss, kabupatenDisebut, provinsiBerita, relevanAwal, urlSah } from '../_shared/berita.js';

/**
 * @param {{ sekarang?: number,
 *   ambilFeed(url: string): Promise<string>,
 *   ai: null | ((batch: Array<Record<string, any>>) => Promise<Array<{ relevan: boolean, ringkasan: string | null }>>),
 *   db: { sudahAda(urls: string[]): Promise<Set<string>>, ambilJatahAi(batas: number): Promise<boolean>,
 *     simpan(baris: Array<Record<string, unknown>>): Promise<Array<{ id: number, judul: string, sumber: string,
 *       relevan: boolean, ringkasan: string | null, kabupaten: string[], url: string }>> } }} p
 */
export async function prosesBerita({ ambilFeed, ai, db, sekarang = Date.now() }) {
  if (!ai) return { ok: true, dilewati: 'GEMINI_API_KEY belum dipasang' };
  const batasLama = sekarang - BATAS_BERITA.hariTampil * 86_400_000;

  const hasilSumber = await Promise.allSettled(SUMBER_BERITA.map(async (s) => bacaRss(await ambilFeed(s.url))
    .filter(b => urlSah(b.url, s.domain) && b.terbit && relevanAwal(b))
    .map(b => {
      // Jam server sumber yang maju tidak boleh membuat berita tampil "dari masa depan".
      const terbit = new Date(Math.min(Date.parse(b.terbit), sekarang)).toISOString();
      return { url: b.url, judul: b.judul.slice(0, 300), cuplikan: b.cuplikan, terbit, sumber: s.nama, sumber_id: s.id,
        kabupaten: kabupatenDisebut(`${b.judul} ${b.cuplikan}`), provinsi: provinsiBerita(`${b.judul} ${b.cuplikan}`, s) };
    })
    .filter(b => Date.parse(b.terbit) >= batasLama)));
  const sumber = SUMBER_BERITA.map((s, i) => {
    const h = hasilSumber[i];
    return h.status === 'fulfilled' ? { id: s.id, kandidat: h.value.length } : { id: s.id, galat: String(h.reason?.message ?? h.reason).slice(0, 120) };
  });

  // Satu berita bisa muncul di dua feed: pertahankan yang pertama.
  const perUrl = new Map();
  for (const h of hasilSumber) if (h.status === 'fulfilled') for (const b of h.value) if (!perUrl.has(b.url)) perUrl.set(b.url, b);
  const ada = await db.sudahAda([...perUrl.keys()]);
  const baru = [...perUrl.values()].filter(b => !ada.has(b.url))
    .sort((a, b) => Date.parse(b.terbit) - Date.parse(a.terbit))
    .slice(0, BATAS_BERITA.maksPerPutaran);

  const disimpan = [];
  const galatAi = [];
  for (let i = 0; i < baru.length; i += BATAS_BERITA.ukuranBatch) {
    const batch = baru.slice(i, i + BATAS_BERITA.ukuranBatch);
    if (!await db.ambilJatahAi(BATAS_BERITA.maksAiPerHari)) { galatAi.push('batas_harian'); break; }
    let nilai;
    try {
      nilai = await ai(batch);
    } catch (err) {
      galatAi.push(String(err?.message ?? err).slice(0, 200));
      continue;
    }
    disimpan.push(...await db.simpan(batch.map((k, j) => ({
      url: k.url, sumber_id: k.sumber_id, sumber: k.sumber, judul: k.judul, terbit: k.terbit,
      kabupaten: k.kabupaten, provinsi: k.provinsi, relevan: nilai[j].relevan, ringkasan: nilai[j].ringkasan
    }))));
  }

  const relevan = disimpan.filter(d => d.relevan).length;
  return { ok: true, sumber, kandidat: perUrl.size, baru: baru.length, disimpan: disimpan.length, relevan, galat_ai: galatAi };
}
