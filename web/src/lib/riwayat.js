// Kalimat satu baris riwayat laporan (M4, AGENTS.md 1.3.1). Tanpa React/DOM (dites dengan node:test).
// Hanya impor relatif (tanpa alias @shared) supaya bisa dimuat Node.

import { INDIKASI_PUNGLI, LABEL_KENDARAAN } from '../../../supabase/functions/_shared/konstanta.js';
import { formatRupiah } from '../../../supabase/functions/_shared/format.js';

const LABEL_INDIKASI = Object.fromEntries(INDIKASI_PUNGLI.map(i => [i.kode, i.label]));

// Waktu relatif dari waktu yang sudah dibulatkan ke jam oleh view: "baru saja" (jam ini), "3 jam lalu", "kemarin",
// "5 hari lalu", lalu tanggal.
export function waktuRelatif(waktu, sekarang = Date.now()) {
  const t = Date.parse(waktu);
  if (!Number.isFinite(t)) return '';
  const jam = Math.floor((sekarang - t) / 3_600_000);
  if (jam < 1) return 'baru saja';
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  if (hari === 1) return 'kemarin';
  if (hari < 30) return `${hari} hari lalu`;
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Makassar' })
    .format(new Date(t));
}

function kalimatBantuBaris(datang, pergi) {
  if (datang && pergi) return 'Membantu saat datang & pergi';
  if (!datang && !pergi) return 'Tidak membantu saat datang & pergi';
  return datang ? 'Membantu saat datang, tidak saat pergi' : 'Tidak membantu saat datang, membantu saat pergi';
}

// Baris view riwayat_publik → teks yang ditampilkan. Penulis selalu "Warga" (tanpa identitas).
export function ringkasBaris(r, sekarang) {
  const waktu = waktuRelatif(r.waktu, sekarang);
  if (r.ada_jukir === false) {
    return { waktu, judul: 'Tidak ada jukir', rincian: [], indikasi: [], bintang: null, komentar: r.komentar ?? null };
  }
  return {
    waktu,
    judul: LABEL_KENDARAAN[r.kendaraan] ?? '',
    rincian: [kalimatBantuBaris(r.bantu_datang, r.bantu_pergi), r.bayar > 0 ? `bayar ${formatRupiah(r.bayar)}` : 'gratis'],
    indikasi: (r.pungli ?? []).map(k => LABEL_INDIKASI[k]).filter(Boolean),
    bintang: Number.isFinite(Number(r.bintang)) && r.bintang ? Number(r.bintang) : null,
    komentar: r.komentar ?? null
  };
}
