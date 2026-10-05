// Alur Edge Function `tarif` (AGENTS.md 1.8 C): dipanggil pg_cron tiap hari, mengecek ≤ KOTA_PER_JALAN kab/kota yang
// belum dicek ±6 bulan. Per kab/kota: Gemini + Google Search → usulan (angka + dasar hukum + kutipan + tautan) →
// bila berbeda dari tarif terpakai, disimpan 'menunggu' dan dikirim ke Telegram pemilik (Pakai / Abaikan).
// Tidak ada angka yang tayang tanpa tombol Pakai. JavaScript murni: AI, database, Telegram disuntikkan (dites).

import {
  BATAS_AI_TARIF_PER_HARI, bacaJawabanTarif, pesanUsulanTarif, pilihKotaDicek, promptTarif, tombolTarif, usulanBaru
} from '../_shared/tarif.js';
import { PROVINSI, kabupatenSah, semuaKabupaten, provinsiKabupaten } from '../_shared/wilayah.js';
import { PETUNJUK_TARIF } from '../_shared/sumber-tarif.js';

const namaProvinsi = (kota) => PROVINSI.find(p => p.kode === provinsiKabupaten(kota))?.nama ?? 'Sulawesi';

/**
 * @param {{ ai: null | ((p: { sistem: string, pengguna: string }) => Promise<{ teks: string, domain: string[] }>),
 *   db: { waktuCek(): Promise<Map<string, { terakhir: string, hasil: string }>>, catatCek(kota: string, hasil: string): Promise<void>,
 *     ambilJatahAi(jenis: string, batas: number): Promise<boolean>,
 *     tarifSekarang(kota: string): Promise<{ motor: number | null, mobil: number | null } | null>,
 *     simpanUsulan(u: object): Promise<number> },
 *   tg: { kirim(teksHtml: string, tombol: unknown): Promise<unknown> }, sekarang?: number, kota?: string[] }} p
 * @returns {Promise<{ dicek: Array<{ kota: string, hasil: string }> }>}
 */
export async function prosesTarif({ ai, db, tg, sekarang = Date.now(), kota = null }) {
  if (!ai) return { dicek: [], dilewati: 'tanpa_kunci_ai' };
  const daftar = kota ? kota.filter(kabupatenSah) : pilihKotaDicek(semuaKabupaten(), await db.waktuCek(), sekarang);
  const dicek = [];
  for (const k of daftar) {
    let hasil;
    try {
      if (!(await db.ambilJatahAi('tarif', BATAS_AI_TARIF_PER_HARI))) {
        dicek.push({ kota: k, hasil: 'jatah_habis' });
        break;                                        // dicoba lagi besok; kota ini belum dicatat sebagai dicek
      }
      const { teks, domain } = await ai(promptTarif({ kota: k, provinsi: namaProvinsi(k), petunjuk: PETUNJUK_TARIF[k] ?? null }));
      const u = bacaJawabanTarif(teks, domain);
      if (u.galat) {
        hasil = u.galat;
      } else {
        const lama = await db.tarifSekarang(k);
        if (!usulanBaru(u, lama)) {
          hasil = 'sama';
        } else {
          const id = await db.simpanUsulan({ kota: k, ...u });
          await tg.kirim(pesanUsulanTarif({ id, kota: k, ...u }, lama), tombolTarif('menunggu', id));
          hasil = 'usulan';
        }
      }
    } catch (err) {
      console.warn(`[tarif] ${k}:`, err?.message ?? err);
      hasil = 'galat';
    }
    try { await db.catatCek(k, hasil); } catch (err) { console.warn('[tarif] catat cek:', err?.message ?? err); }
    dicek.push({ kota: k, hasil });
  }
  return { dicek };
}
