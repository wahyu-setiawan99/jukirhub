// Tarif resmi parkir tepi jalan umum per kab/kota (AGENTS.md 1.8 C, keputusan pemilik 5 Okt 2026): Gemini dengan
// Google Search membaca Perda / berita terbaru tiap ±6 bulan → USULAN ke Telegram pemilik (✅ Pakai / 🚫 Abaikan).
// Angka baru dipakai aplikasi setelah pemilik menekan Pakai (aturan 1.1: AI tidak mengarang tarif; ia hanya mengutip
// sumber, pemilik yang memutuskan). ESM murni (Node & Deno): dites dengan node:test.

import { escapeHtml } from './kabar-pemilik.js';
import { formatRupiah } from './format.js';
import { HARI_RINGKASAN, ringkasTempat } from './skor-pungli.js';

export { petaTarif } from './tarif-peta.js';

export const HARI_CEK_ULANG = 180;     // tiap kab/kota dicek lagi setelah ±6 bulan
export const KOTA_PER_JALAN = 3;       // dicek per hari (≤ ±150 detik per panggilan fungsi; 81 kab/kota ≈ 27 hari)
export const BATAS_AI_TARIF_PER_HARI = 20;
export const TARIF_WAJAR = { min: 500, maks: 50_000 };  // rupiah per sekali parkir; di luar ini dianggap salah baca

// Jeda sebelum dicek lagi, menurut hasil terakhir: ketemu (usulan / sama) ±6 bulan; tidak ketemu atau jawaban tidak sah
// 30 hari (sumber bisa baru terbit); galat teknis 3 hari.
export const HARI_ULANG = { usulan: HARI_CEK_ULANG, sama: HARI_CEK_ULANG, galat: 3 };
const jedaHari = (hasil) => HARI_ULANG[hasil] ?? 30;

// Kab/kota yang perlu dicek (belum pernah, atau jedanya sudah lewat); yang paling lama dulu.
// `cek` = Map kota → { terakhir: ISO, hasil }.
export function pilihKotaDicek(semuaKota, cek, sekarang = Date.now(), n = KOTA_PER_JALAN) {
  return semuaKota
    .map((kota, urutan) => {
      const c = cek.get(kota);
      const t = c?.terakhir ? Date.parse(c.terakhir) : -Infinity;
      return { kota, urutan, t, jatuhTempo: t + jedaHari(c?.hasil) * 86_400_000 };
    })
    .filter(x => x.jatuhTempo <= sekarang)
    .sort((a, b) => a.t - b.t || a.urutan - b.urutan)
    .slice(0, n)
    .map(x => x.kota);
}

// Prompt: wajib menyebut dasar hukum, tautan, dan kutipan kalimat dari sumber; tidak boleh menebak.
export function promptTarif({ kota, provinsi, petunjuk = null }) {
  const sistem = [
    'Anda membantu mencari TARIF RESMI retribusi parkir di tepi jalan umum di satu kabupaten/kota di Indonesia.',
    'Cari di internet Peraturan Daerah (biasanya Perda Pajak Daerah dan Retribusi Daerah 2023/2024 atau perubahannya),',
    'Peraturan Bupati/Wali Kota, atau berita resmi pemerintah daerah terbaru. Utamakan situs .go.id dan peraturan.bpk.go.id.',
    'Ambil tarif SEKALI PARKIR untuk sepeda motor (roda 2) dan mobil (roda 4) di tepi jalan umum. Bila ada beberapa zona,',
    'ambil zona/kelas yang paling umum dan jelaskan di "catatan". Bila tarif per jam, tulis di catatan dan isi angka per',
    'sekali parkir hanya bila sumber menyebutnya. JANGAN menebak: bila tidak menemukan angka di sumber, isi null.',
    'Jawab HANYA satu objek JSON (tanpa teks lain) dengan kunci: motor (angka rupiah atau null), mobil (angka atau null),',
    'dasar_hukum (nama & nomor peraturan), sumber_url (alamat halaman sumber yang memuat angkanya), kutipan (kalimat/baris',
    'tabel dari sumber yang memuat angkanya, maks. 300 huruf), berlaku_sejak (YYYY-MM-DD atau null), catatan (singkat).'
  ].join(' ');
  const pengguna = [
    `Kabupaten/kota: ${kota}, provinsi ${provinsi}, Indonesia.`,
    petunjuk ? `Petunjuk (belum tentu terbaru): ${petunjuk}.` : null,
    'Berapa tarif resmi retribusi parkir tepi jalan umum untuk motor dan mobil yang berlaku sekarang?'
  ].filter(Boolean).join('\n');
  return { sistem, pengguna };
}

const angkaTarif = (n) => {
  const x = typeof n === 'string' ? Number(n.replace(/[^\d]/g, '')) : n;
  return Number.isInteger(x) && x >= TARIF_WAJAR.min && x <= TARIF_WAJAR.maks ? x : null;
};
const teksPendek = (s, maks) => (typeof s === 'string' && s.trim() ? s.trim().replace(/\s+/g, ' ').slice(0, maks) : null);

function hostDari(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.hostname.toLowerCase().replace(/^www\./, '') : null;
  } catch {
    return null;
  }
}

// Ambil objek JSON pertama dari teks jawaban (model dengan alat pencarian tidak bisa dipaksa responseSchema).
export function ambilJson(teks) {
  const s = String(teks ?? '').replace(/```(?:json)?/gi, '');
  const awal = s.indexOf('{');
  const akhir = s.lastIndexOf('}');
  if (awal < 0 || akhir <= awal) return null;
  try { return JSON.parse(s.slice(awal, akhir + 1)); } catch { return null; }
}

// Jawaban Gemini + domain hasil pencarian (groundingChunks[].web.title) → usulan sah, atau { galat }.
// Tautan sumber harus dari domain yang benar-benar dibuka pencarian, atau situs pemerintah (.go.id).
export function bacaJawabanTarif(teks, domainPencarian = []) {
  const j = ambilJson(teks);
  if (!j || typeof j !== 'object') return { galat: 'bukan_json' };
  const motor = angkaTarif(j.motor);
  const mobil = angkaTarif(j.mobil);
  if (motor == null && mobil == null) return { galat: 'tidak_ketemu' };
  const sumber = typeof j.sumber_url === 'string' ? j.sumber_url.trim() : '';
  const host = hostDari(sumber);
  const domain = new Set(domainPencarian.map(d => String(d).toLowerCase().replace(/^www\./, '')));
  const cocok = host && (host.endsWith('.go.id') || [...domain].some(d => host === d || host.endsWith(`.${d}`)));
  if (!cocok) return { galat: 'sumber_tidak_valid' };
  const dasar = teksPendek(j.dasar_hukum, 200);
  const kutipan = teksPendek(j.kutipan, 300);
  if (!dasar || !kutipan) return { galat: 'tanpa_dasar' };
  const berlaku = typeof j.berlaku_sejak === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(j.berlaku_sejak) ? j.berlaku_sejak : null;
  return { motor, mobil, dasar_hukum: dasar, sumber_url: sumber.slice(0, 500), kutipan, berlaku_sejak: berlaku, catatan: teksPendek(j.catatan, 300) };
}

// Usulan perlu dikabarkan bila belum ada tarif terpakai, atau angkanya berbeda dari yang terpakai sekarang.
export const usulanBaru = (u, sekarang) => !sekarang || (u.motor ?? null) !== (sekarang.motor ?? null) || (u.mobil ?? null) !== (sekarang.mobil ?? null);

// Data tombol Telegram: "jh:tp:<id>" pakai, "jh:tx:<id>" abaikan (dibaca bacaTombol di kabar-pemilik.js).
export const tombolTarif = (status, id) => (status === 'menunggu'
  ? { inline_keyboard: [[{ text: '✅ Pakai tarif ini', callback_data: `jh:tp:${id}` }, { text: '🚫 Abaikan', callback_data: `jh:tx:${id}` }]] }
  : { inline_keyboard: [] });

export function pesanUsulanTarif(u, sekarang = null) {
  const rp = (n) => (n == null ? 'tidak disebut' : formatRupiah(n));
  const lama = sekarang ? `\nTarif terpakai sekarang: motor ${rp(sekarang.motor)} · mobil ${rp(sekarang.mobil)}` : '';
  return [
    `🅿️ <b>Usulan tarif resmi parkir · ${escapeHtml(u.kota)}</b> (dibaca AI, usulan ${u.id})`,
    `Motor <b>${rp(u.motor)}</b> · Mobil <b>${rp(u.mobil)}</b> (sekali parkir, tepi jalan umum)${lama}`,
    `Dasar: ${escapeHtml(u.dasar_hukum)}${u.berlaku_sejak ? ` (berlaku ${escapeHtml(u.berlaku_sejak)})` : ''}`,
    `Kutipan: «${escapeHtml(u.kutipan)}»`,
    ...(u.catatan ? [`Catatan AI: ${escapeHtml(u.catatan)}`] : []),
    `<a href="${escapeHtml(u.sumber_url)}">Buka sumber</a>`,
    '',
    'Cocokkan angka dengan sumber. Tekan Pakai bila benar: tarif tampil di JukirHub dan bayar di atasnya dihitung sebagai indikasi "kemahalan".'
  ].join('\n');
}

export const barisStatusTarif = (dipakai) => (dipakai
  ? '\n\n✅ <b>Tarif dipakai</b> di JukirHub.'
  : '\n\n🚫 <b>Usulan diabaikan.</b>');

// Setelah pemilik menekan Pakai: ringkasan semua tempat aktif di kab/kota itu dihitung ulang dengan tarif baru
// (indikasi "kemahalan"). db disuntikkan: titikDiKota, tarifKota, laporanTitik, simpanRingkasan. → jumlah tempat.
export async function hitungUlangRingkasanKota({ db, kota, sekarang = Date.now() }) {
  const tarifResmi = await db.tarifKota(kota);
  const titik = await db.titikDiKota(kota);
  for (const id of titik) {
    const laporan = await db.laporanTitik(id, HARI_RINGKASAN);
    await db.simpanRingkasan(id, ringkasTempat(laporan, { sekarang, tarifResmi }));
  }
  return titik.length;
}
