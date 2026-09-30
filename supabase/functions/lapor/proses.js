// Alur Edge Function `lapor` (AGENTS.md 1.2 poin 3, 6.1–6.2). Satu-satunya jalur tulis laporan.
// JavaScript murni: akses database disuntikkan lewat `db` (index.ts memakai supabase-js), supaya seluruh alur bisa
// dites dengan node:test. Tidak ada validasi yang dipercayakan ke client.

import { BATAS } from '../_shared/konstanta.js';
import { validasiLaporan } from '../_shared/lapor.js';
import { jarakM, namaMirip } from '../_shared/geo.js';
import { formatJarak } from '../_shared/format.js';
import { HARI_RINGKASAN, ringkasTempat } from '../_shared/skor-pungli.js';
import { periksaKecurigaan } from '../_shared/deteksi-gps.js';

export const PESAN_SUKSES = 'Terima kasih, laporan Anda sudah masuk.';

export async function sha256(teks) {
  const buf = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(teks));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

const tolak = (status, kode, pesan) => ({ status, body: { ok: false, kode, pesan } });
const sukses = (titik) => ({ status: 200, body: { ok: true, pesan: PESAN_SUKSES, titik: { id: titik.id, nama: titik.nama } } });

/**
 * @param {{ body: unknown, ip: string | null, garam: { reporter: string, ip: string }, sekarang?: number, db: {
 *   hitungLaporan(filter: Record<string, string | number>, sejakMenit: number): Promise<number>,
 *   titikDekat(lat: number, lng: number, radiusM: number): Promise<Array<{ id: number, nama: string }>>,
 *   titikDetail(p: { id?: number, osm_ref?: string }): Promise<{ id: number, nama: string, osm_ref: string | null,
 *     dibekukan: boolean, lat: number, lng: number } | null>,
 *   buatTitik(t: { nama: string, osm_ref: string | null, lat: number, lng: number, dibuat_oleh: string }): Promise<number>,
 *   riwayatPerangkat(reporterKey: string): Promise<Array<{ lat: number | null, lng: number | null, akurasi_m: number | null, dibuat: string }>>,
 *   simpanLaporan(baris: Record<string, unknown>): Promise<void>,
 *   laporanTitik(titikId: number, sejakHari: number): Promise<Array<Record<string, unknown>>>,
 *   simpanRingkasan(titikId: number, ringkasan: Record<string, unknown>): Promise<void>
 * } }} p
 * @returns {Promise<{ status: number, body: Record<string, unknown> }>}
 */
export async function prosesLapor({ body, ip, garam, db, sekarang = Date.now() }) {
  const v = validasiLaporan(body);
  if (!v.ok) return tolak(v.kode === 'lokasi' ? 422 : 400, v.kode, v.pesan);
  const d = v.data;

  if (d.akurasi_m > BATAS.akurasiMaksM) {
    return tolak(422, 'akurasi', `Sinyal GPS masih lemah (±${Math.round(d.akurasi_m)} m). Coba di tempat lebih terbuka lalu kirim lagi.`);
  }

  const reporterKey = await sha256(`${garam.reporter}:${d.perangkat}`);
  const ipHash = ip ? await sha256(`${garam.ip}:${ip}`) : null;

  if (ipHash && await db.hitungLaporan({ ip_hash: ipHash }, 60) >= BATAS.laporanPerIpPerJam) {
    return tolak(429, 'terlalu_sering', 'Terlalu banyak laporan dari jaringan Anda. Coba lagi nanti.');
  }
  if (await db.hitungLaporan({ reporter_key: reporterKey }, 24 * 60) >= BATAS.laporanPerPerangkatPerHari) {
    return tolak(429, 'terlalu_sering', `Batas ${BATAS.laporanPerPerangkatPerHari} laporan per hari sudah tercapai. Terima kasih, coba lagi besok.`);
  }

  // Tempat yang sama (AGENTS.md bagian 5): titik_id → osm_ref → tempat aktif ≤ 30 m dengan nama mirip → tempat baru.
  let titik = null;
  if (d.titik_id != null) {
    titik = await db.titikDetail({ id: d.titik_id });
    if (!titik) return tolak(404, 'tempat', 'Tempat ini sudah tidak tersedia. Pilih tempat lain di peta.');
  } else {
    if (d.tempat.osm_ref) titik = await db.titikDetail({ osm_ref: d.tempat.osm_ref });
    if (!titik) {
      const dekat = await db.titikDekat(d.tempat.lat, d.tempat.lng, BATAS.radiusTempatSamaM);
      const sama = dekat.find(t => namaMirip(t.nama, d.tempat.nama));
      if (sama) titik = await db.titikDetail({ id: sama.id });
    }
  }

  // Gerbang lokasi: pelapor ≤ 250 m dari tempat (AGENTS.md 6.1).
  const tujuan = titik ?? d.tempat;
  const jarak = jarakM({ lat: d.lat, lng: d.lng }, tujuan);
  if (jarak > BATAS.radiusLaporM) {
    return tolak(422, 'jauh',
      `Anda sekitar ${formatJarak(jarak)} dari ${tujuan.nama}. Melapor hanya bisa dari dekat tempat (±${BATAS.radiusLaporM} m).`);
  }

  if (titik) {
    if (await db.hitungLaporan({ reporter_key: reporterKey, titik_id: titik.id }, BATAS.jedaPerTempatJam * 60) > 0) {
      return tolak(429, 'sudah_lapor', `Anda sudah melaporkan tempat ini. Bisa melapor lagi setelah ${BATAS.jedaPerTempatJam} jam.`);
    }
    // Circuit breaker: tempat dibekukan / terlalu banyak laporan per jam → pura-pura diterima, tidak disimpan.
    if (titik.dibekukan || await db.hitungLaporan({ titik_id: titik.id }, 60) >= BATAS.laporanPerTempatPerJam) {
      return sukses(titik);
    }
  }

  // Pola GPS palsu → tetap diterima, bobot diturunkan diam-diam (balasan ke pelapor tidak berubah).
  const gps = periksaKecurigaan({
    baru: { lat: d.lat, lng: d.lng, akurasi_m: d.akurasi_m, source: 'web' },
    riwayat: await db.riwayatPerangkat(reporterKey),
    sekarang
  });

  if (!titik) {
    const id = await db.buatTitik({
      nama: d.tempat.nama, osm_ref: d.tempat.osm_ref, lat: d.tempat.lat, lng: d.tempat.lng, dibuat_oleh: reporterKey
    });
    titik = { id, nama: d.tempat.nama };
  }

  await db.simpanLaporan({
    titik_id: titik.id,
    kendaraan: d.kendaraan,
    bantu_datang: d.bantu_datang,
    bantu_pergi: d.bantu_pergi,
    bayar: d.bayar,
    pungli: d.pungli,
    bintang: d.bintang,
    reporter_key: reporterKey,
    ip_hash: ipHash,
    lat: d.lat,
    lng: d.lng,
    akurasi_m: d.akurasi_m,
    jarak_m: Math.round(jarak),
    bobot_manual: gps.bobotManual
  });

  // Ringkasan publik tempat ini dihitung ulang langsung (AGENTS.md 6.2).
  const laporan = await db.laporanTitik(titik.id, HARI_RINGKASAN);
  await db.simpanRingkasan(titik.id, ringkasTempat(laporan, { sekarang }));

  return sukses(titik);
}
