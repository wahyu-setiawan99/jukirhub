// Logika tempat parkir tanpa React/DOM (dites dengan node:test): menggabungkan data view publik, mencocokkan
// tempat yang diketuk/dicari dengan tempat yang sudah dilaporkan, dan kalimat ringkasan di lembar tempat.
// Hanya impor relatif (tanpa alias @shared) supaya bisa dimuat Node.

import { BATAS, LEVEL_PUNGLI } from '../../../supabase/functions/_shared/konstanta.js';
import { formatRupiah } from '../../../supabase/functions/_shared/format.js';
import { jarakM, namaMirip, normalisasiNama } from '../../../supabase/functions/_shared/geo.js';

export { jarakM, namaMirip };

const angka = (x) => (x == null || x === '' ? null : Number(x));

// Baris titik_publik + ringkasan_titik_publik → daftar tempat untuk app. Baris rusak dibuang.
export function gabungTempat(titik, ringkasan) {
  const perTitik = new Map((ringkasan ?? []).map(r => [Number(r.titik_id), r]));
  return (titik ?? [])
    .filter(t => Number.isFinite(Number(t?.id)) && Number.isFinite(Number(t?.lat)) && Number.isFinite(Number(t?.lng))
      && typeof t.nama === 'string')
    .map(t => {
      const r = perTitik.get(Number(t.id)) ?? {};
      return {
        id: Number(t.id),
        nama: t.nama,
        osm_ref: t.osm_ref ?? null,
        kota: t.kota ?? null,
        lat: Number(t.lat),
        lng: Number(t.lng),
        ringkasan: {
          jumlah: angka(r.jumlah_laporan) ?? 0,
          tanpaJukir: angka(r.jumlah_tanpa_jukir) ?? 0,
          dataCukup: r.data_cukup === true,
          level: r.data_cukup === true ? (r.level_pungli ?? null) : null,
          alasan: r.data_cukup === true ? (r.alasan_pungli ?? null) : null,
          bantuDatangYa: angka(r.bantu_datang_ya) ?? 0,
          bantuPergiYa: angka(r.bantu_pergi_ya) ?? 0,
          bayar: {
            motor: { median: angka(r.bayar_median_motor), jumlah: angka(r.jumlah_motor) ?? 0 },
            mobil: { median: angka(r.bayar_median_mobil), jumlah: angka(r.jumlah_mobil) ?? 0 }
          },
          bintang: angka(r.bintang_rata),
          terakhir: r.laporan_terakhir ?? null
        }
      };
    });
}

// Laporan yang ADA jukirnya (dasar "x dari y" membantu, tarif, pungli).
export const jumlahAdaJukir = (r) => Math.max(0, (r?.jumlah ?? 0) - (r?.tanpaJukir ?? 0));
// Sebagian besar laporan menyebut tidak ada jukir (AGENTS.md 1.2 poin 3).
export const kebanyakanTanpaJukir = (r) => (r?.tanpaJukir ?? 0) * 2 > (r?.jumlah ?? 0);

export function kalimatTanpaJukir(r) {
  if (!r?.tanpaJukir) return null;
  return kebanyakanTanpaJukir(r)
    ? `Dilaporkan tidak ada jukir (${r.tanpaJukir} dari ${r.jumlah} laporan)`
    : `Pernah dilaporkan tanpa jukir (${r.tanpaJukir} dari ${r.jumlah} laporan)`;
}

// Kelas warna penanda / lencana: 'tanpa' (kebanyakan tanpa jukir), level pungli, atau 'kurang' bila data belum cukup.
export function kodeLevel(ringkasan) {
  if (kebanyakanTanpaJukir(ringkasan)) return 'tanpa';
  return ringkasan?.dataCukup && LEVEL_PUNGLI.some(l => l.kode === ringkasan.level) ? ringkasan.level : 'kurang';
}

export function labelLevel(ringkasan) {
  const kode = kodeLevel(ringkasan);
  if (kode === 'tanpa') return 'Tanpa jukir';
  // Ambangnya (AMBANG_TAMPIL) dijelaskan di legenda; di sini cukup jumlah laporan yang ada jukirnya (AGENTS.md 6.2).
  if (kode === 'kurang') return `Data belum cukup (${jumlahAdaJukir(ringkasan)} laporan)`;
  return `Indikasi pungli ${LEVEL_PUNGLI.find(l => l.kode === kode).label.toLowerCase()}`;
}

// "membantu (3 dari 4 laporan)" / "tidak membantu (…)" / "berbeda-beda (2 dari 4 bilang membantu)".
export function kalimatBantu(ya, n) {
  if (!n) return null;
  if (ya * 2 === n) return `berbeda-beda (${ya} dari ${n} bilang membantu)`;
  return ya * 2 > n
    ? `membantu (${ya} dari ${n} laporan)`
    : `tidak membantu (${n - ya} dari ${n} laporan)`;
}

// Tarif yang biasa dibayar untuk kendaraan terpilih.
export function teksTarif(ringkasan, kendaraan) {
  const b = ringkasan?.bayar?.[kendaraan];
  if (!b?.jumlah || b.median == null) return null;
  return `${formatRupiah(b.median)} (dari ${b.jumlah} laporan ${kendaraan})`;
}

export function teksBintang(ringkasan) {
  const r = ringkasan?.bintang;
  if (r == null || !jumlahAdaJukir(ringkasan)) return null;
  return `${String(Math.round(r * 10) / 10).replace('.', ',')} (${jumlahAdaJukir(ringkasan)})`;
}

// Tempat yang diketuk di peta / hasil cari / pin → tempat terlapor yang sama bila ada (AGENTS.md bagian 5):
// osm_ref sama, atau dalam radius 30 m dengan nama mirip (pin tanpa nama: yang terdekat dalam radius).
export function cocokkanTempat(pilihan, daftar) {
  if (!pilihan) return null;
  if (pilihan.osm_ref) {
    const sama = daftar.find(t => t.osm_ref && t.osm_ref === pilihan.osm_ref);
    if (sama) return sama;
  }
  let terbaik = null;
  for (const t of daftar) {
    const j = jarakM(pilihan, t);
    if (j > BATAS.radiusTempatSamaM) continue;
    if (pilihan.nama && !namaMirip(pilihan.nama, t.nama)) continue;
    if (!terbaik || j < terbaik.j) terbaik = { t, j };
  }
  return terbaik?.t ?? null;
}

// Pencarian di tempat yang sudah dilaporkan (lokal, instan, tanpa jaringan).
export function cariLokal(daftar, kueri, maks = 5) {
  const k = normalisasiNama(kueri);
  if (k.length < 2) return [];
  const kata = k.split(' ');
  return daftar
    .map(t => ({ t, n: normalisasiNama(t.nama) }))
    .filter(({ n }) => kata.every(w => n.includes(w)))
    .sort((a, b) => (b.n.startsWith(k) - a.n.startsWith(k)) || a.n.length - b.n.length)
    .slice(0, maks)
    .map(({ t }) => t);
}

// Terdekat dulu bila posisi diketahui; tanpa posisi: laporan terbaru dulu.
export function urutkanTempat(daftar, posisi) {
  const arr = daftar.map(t => ({ ...t, jarak: posisi ? jarakM(posisi, t) : null }));
  if (posisi) return arr.sort((a, b) => a.jarak - b.jarak);
  return arr.sort((a, b) => String(b.ringkasan.terakhir ?? '').localeCompare(String(a.ringkasan.terakhir ?? '')));
}
