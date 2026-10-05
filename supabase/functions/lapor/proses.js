// Alur Edge Function `lapor` (AGENTS.md 1.2 poin 3, 6.1–6.2). Satu-satunya jalur tulis laporan.
// JavaScript murni: akses database disuntikkan lewat `db` (index.ts memakai supabase-js), supaya seluruh alur bisa
// dites dengan node:test. Tidak ada validasi yang dipercayakan ke client.

import { BATAS } from '../_shared/konstanta.js';
import { validasiLaporan } from '../_shared/lapor.js';
import { jarakM, namaMirip } from '../_shared/geo.js';
import { formatJarak } from '../_shared/format.js';
import { HARI_RINGKASAN, ringkasTempat } from '../_shared/skor-pungli.js';
import { periksaKecurigaan } from '../_shared/deteksi-gps.js';
import { HARI_PEMBUKA, hitungKoin, namaSamaran } from '../_shared/koin.js';

export const PESAN_SUKSES = 'Terima kasih, laporan Anda sudah masuk.';
const MENIT_HARI = 24 * 60;

// Kabupaten tempat (peringkat koin per kabupaten): dari titik_parkir.kota; bila kosong dicari sekali lewat `geo`
// (Nominatim di index.ts) lalu disimpan. Gagal → null (koin tetap diberikan, dicatat tanpa kabupaten).
async function kabupatenTitik(titik, db, geo) {
  try {
    let kab = (await db.kotaTitik?.(titik.id)) ?? null;
    if (!kab && geo?.kabupaten && titik.lat != null) {
      kab = await geo.kabupaten(titik.lat, titik.lng);
      if (kab) await db.isiKota?.(titik.id, kab);
    }
    return kab;
  } catch (err) {
    console.warn('[lapor] kabupaten tempat:', err?.message ?? err);
    return null;
  }
}

// Tarif resmi kab/kota { motor, mobil } yang sudah disetujui pemilik, atau null. Galat tidak menggagalkan laporan.
async function tarifKota(db, kabupaten) {
  if (!kabupaten || !db.tarifKota) return null;
  try {
    return await db.tarifKota(kabupaten);
  } catch (err) {
    console.warn('[lapor] tarif resmi:', err?.message ?? err);
    return null;
  }
}

// Koin laporan ini (AGENTS.md 10.4). Galat koin tidak boleh menggagalkan laporan → null.
// Mengembalikan { ringkasan (untuk pelapor), koinSah (hanya server) }.
async function beriKoin({ db, reporterKey, kabupaten, pembukaData, sah, laporanSebelumnyaDiTempat, sekarang }) {
  if (!db.bacaReputasi) return null;
  try {
    const lama = await db.bacaReputasi(reporterKey);
    const { baris, ringkasan, koinSah, tanggal } = hitungKoin({ lama, pembukaData, sah, laporanSebelumnyaDiTempat, waktu: sekarang });
    await db.simpanReputasi({
      ...baris,
      reporter_key: reporterKey,
      nama_samaran: lama?.nama_samaran ?? namaSamaran(reporterKey, kabupaten),
      kabupaten_asal: lama?.kabupaten_asal ?? kabupaten,
      diperbarui: new Date(sekarang).toISOString()
    });
    if (ringkasan.koin > 0) {
      await db.catatKoinHarian({ reporter: reporterKey, tanggal, kabupaten, tampil: ringkasan.koin, sah: koinSah });
    }
    return { ringkasan, koinSah };
  } catch (err) {
    console.warn('[lapor] koin gagal dicatat:', err?.message ?? err);
    return null;
  }
}

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
 *   simpanLaporan(baris: Record<string, unknown>): Promise<number>,
 *   simpanKomentar?(k: { laporan_id: number, titik_id: number, isi: string }): Promise<number>,
 *   laporanTitik(titikId: number, sejakHari: number): Promise<Array<Record<string, unknown>>>,
 *   simpanRingkasan(titikId: number, ringkasan: Record<string, unknown>): Promise<void>,
 *   kotaTitik?(titikId: number): Promise<string | null>,
 *   tarifKota?(kota: string): Promise<{ motor: number | null, mobil: number | null } | null>,
 *   isiKota?(titikId: number, kota: string): Promise<void>,
 *   bacaReputasi?(reporterKey: string): Promise<Record<string, any> | null>,
 *   simpanReputasi?(baris: Record<string, unknown>): Promise<void>,
 *   catatKoinHarian?(k: { reporter: string, tanggal: string, kabupaten: string | null, tampil: number, sah: number }): Promise<void>,
 *   catatKoinSahLaporan?(laporanId: number, koinSah: number): Promise<void>
 * }, kabar?: { tempatBaru(t: { id: number, nama: string, sumber: string, lat: number, lng: number }): void,
 *   komentarBaru?(k: { id: number, isi: string, namaTempat: string }): void },
 *   geo?: { kabupaten(lat: number, lng: number): Promise<string | null> } }} p
 * @returns {Promise<{ status: number, body: Record<string, unknown> }>}
 */
export async function prosesLapor({ body, ip, garam, db, kabar, geo, sekarang = Date.now() }) {
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
    // Koin tetap terlihat bertambah di HP pelapor, tetapi tidak sah (tidak masuk peringkat).
    if (titik.dibekukan || await db.hitungLaporan({ titik_id: titik.id }, 60) >= BATAS.laporanPerTempatPerJam) {
      const koin = await beriKoin({ db, reporterKey, kabupaten: await kabupatenTitik(titik, db, null), pembukaData: false,
        sah: false, laporanSebelumnyaDiTempat: 1, sekarang });
      return { status: 200, body: { ...sukses(titik).body, laporan_id: null, koin: koin?.ringkasan ?? null } };
    }
  }

  // Untuk koin, dihitung SEBELUM laporan ini disimpan: pembuka data = belum ada laporan siapa pun 7 hari terakhir.
  const pembukaData = !titik || await db.hitungLaporan({ titik_id: titik.id }, HARI_PEMBUKA * MENIT_HARI) === 0;
  const laporanSebelumnyaDiTempat = titik
    ? await db.hitungLaporan({ reporter_key: reporterKey, titik_id: titik.id }, 365 * MENIT_HARI)
    : 0;

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
    titik = { id, nama: d.tempat.nama, lat: d.tempat.lat, lng: d.tempat.lng };
    // Kabar ke pemilik (Telegram) dengan tombol Sembunyikan; tidak boleh menahan / menggagalkan laporan.
    try { kabar?.tempatBaru({ id, nama: d.tempat.nama, sumber: d.tempat.sumber, lat: d.tempat.lat, lng: d.tempat.lng }); } catch { /* abaikan */ }
  }

  const laporanId = await db.simpanLaporan({
    titik_id: titik.id,
    ada_jukir: d.ada_jukir,
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
    bobot_manual: gps.bobotManual,
    // Hanya bila ada: laporan tanpa kampanye tetap tersimpan walau migrasi kampanye belum dijalankan.
    ...(d.kampanye ? { kampanye: d.kampanye } : {})
  });

  // Komentar (M4): disimpan 'menunggu', tampil setelah pemilik menekan Tampilkan di Telegram (AGENTS.md 1.3.1).
  if (d.komentar && db.simpanKomentar) {
    const idKomentar = await db.simpanKomentar({ laporan_id: laporanId, titik_id: titik.id, isi: d.komentar });
    try { kabar?.komentarBaru?.({ id: idKomentar, isi: d.komentar, namaTempat: titik.nama }); } catch { /* abaikan */ }
  }

  // Kab/kota tempat (peringkat koin & tarif resmi), lalu ringkasan publik tempat ini dihitung ulang langsung (6.2):
  // bayar di atas tarif resmi yang sudah disetujui pemilik dihitung "kemahalan" (1.8 C).
  const kabupaten = await kabupatenTitik(titik, db, geo);
  const tarifResmi = await tarifKota(db, kabupaten);
  const laporan = await db.laporanTitik(titik.id, HARI_RINGKASAN);
  await db.simpanRingkasan(titik.id, ringkasTempat(laporan, { sekarang, tarifResmi }));

  // Koin (setelah laporan tersimpan). GPS palsu (bobot < 1) → koin tampil saja, diam-diam.
  const koin = await beriKoin({
    db, reporterKey, kabupaten, pembukaData,
    sah: gps.bobotManual >= 1, laporanSebelumnyaDiTempat, sekarang
  });
  if (koin?.koinSah > 0) {
    try { await db.catatKoinSahLaporan?.(laporanId, koin.koinSah); } catch { /* abaikan */ }
  }

  return {
    status: 200,
    body: {
      ...sukses(titik).body,
      laporan_id: laporanId,
      koin: koin?.ringkasan ?? null,
      ...(d.komentar ? { komentar: 'menunggu' } : {})
    }
  };
}
