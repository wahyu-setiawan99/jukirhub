// Ringkasan harian ke Telegram pemilik (pola `pemantauan` Adami, permintaan pemilik 1 Okt 2026): angka 24 jam terakhir
// + peringatan bila ada yang rusak (jadwal pg_cron gagal, panggilan fungsi terjadwal gagal). Dikirim tiap 21.00 WITA.
// ESM murni: dipakai Edge Function `pemantauan` dan tes. Data dari fungsi SQL ringkasan_pemantauan (angka agregat saja).

import { escapeHtml } from './kabar-pemilik.js';

const angka = (n) => Number(n ?? 0).toLocaleString('id-ID');

/**
 * @param {{ laporan?: number, tanpa_jukir?: number, mencurigakan?: number, perangkat?: number, tempat_baru?: number,
 *   komentar_baru?: number, komentar_menunggu?: number, komentar_otomatis?: number, foto?: number, pesan_kontak?: number,
 *   berita_baru?: number, koin?: number, cron_gagal?: Array<{ job: string, jumlah: number, pesan?: string | null }>,
 *   http_total?: number, http_gagal?: number }} d
 * @returns {{ teks: string, sehat: boolean }}
 */
export function pesanRingkasanHarian(d, { tanggal = '', urlWeb = '' } = {}) {
  const peringatan = [];
  for (const c of d.cron_gagal ?? []) {
    peringatan.push(`Jadwal <b>${escapeHtml(c.job)}</b> gagal ${angka(c.jumlah)}×${c.pesan ? `: ${escapeHtml(String(c.pesan).slice(0, 120))}` : ''}`);
  }
  if ((d.http_gagal ?? 0) > 0) {
    peringatan.push(`Panggilan fungsi terjadwal gagal ${angka(d.http_gagal)} dari ${angka(d.http_total)} (cek log fungsi berita di Supabase)`);
  }
  const sehat = peringatan.length === 0;

  const baris = [
    `📊 <b>Ringkasan JukirHub</b>${tanggal ? ` · ${escapeHtml(tanggal)}` : ''} (24 jam)`,
    '',
    `📝 Laporan: <b>${angka(d.laporan)}</b>${d.tanpa_jukir ? ` (${angka(d.tanpa_jukir)} tanpa jukir)` : ''} dari ${angka(d.perangkat)} perangkat`,
    `📍 Tempat baru: ${angka(d.tempat_baru)}`,
    `💬 Komentar baru: ${angka(d.komentar_baru)}${d.komentar_otomatis ? ` (${angka(d.komentar_otomatis)} tampil otomatis lewat AI)` : ''}`,
    `📷 Foto bukti: ${angka(d.foto)} · ✉️ Pesan kontak: ${angka(d.pesan_kontak)}`,
    `📰 Berita baru tampil: ${angka(d.berita_baru)} · 🪙 Koin dibagikan: ${angka(d.koin)}`
  ];
  if (d.mencurigakan) baris.push(`⚠️ Laporan berlokasi mencurigakan (bobot diturunkan): ${angka(d.mencurigakan)}`);
  if (d.komentar_menunggu) baris.push('', `⏳ <b>${angka(d.komentar_menunggu)} komentar menunggu</b> keputusan Anda.`);
  baris.push('', sehat ? '✅ Semua jadwal berjalan normal.' : '🚨 <b>Perlu dicek:</b>');
  for (const p of peringatan) baris.push(`• ${p}`);
  if (urlWeb) baris.push('', `<a href="${escapeHtml(urlWeb)}">${escapeHtml(urlWeb.replace(/^https?:\/\//, ''))}</a>`);
  return { teks: baris.join('\n'), sehat };
}
