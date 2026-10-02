// Foto bukti opsional (keputusan pemilik 1 Okt 2026): foto TIDAK tampil publik dan TIDAK disimpan di server
// JukirHub; hanya diteruskan ke Telegram pemilik sebagai bukti laporan. Tanpa koin (supaya warga tidak terdorong
// memotret jukir). ESM murni: dipakai web (@shared), Edge Function `foto`, dan tes. Pola foto.js Adami.
//
// Alur: setelah lapor sukses → HP mengecilkan foto (sisi terpanjang 1280 px, JPEG ±70%; kanvas tidak menyalin EXIF)
// → Edge Function `foto` membuang lagi segmen metadata JPEG (lokasi GPS, kamera) → sendPhoto ke pemilik.

export const BATAS_FOTO = {
  sisiMaks: 1280,          // px, dikecilkan di HP
  kualitas: 0.7,           // JPEG di HP
  maksByte: 500_000,       // setelah dikecilkan
  maksPerHari: 3,          // per perangkat per 24 jam
  menitSetelahLapor: 30    // foto hanya untuk laporan sendiri yang baru dikirim
};

// Petunjuk sumber foto (bukan bukti): hanya dua nilai ini yang ditulis ke keterangan Telegram.
const SUMBER_FOTO = new Set(['kamera', 'galeri']);
const MAKS_UMUR_DETIK = 10 * 365 * 24 * 3600;
export const KUNCI_FOTO_TERTUNDA = 'jukirhub_foto_tertunda';

// Nilai lain diabaikan (foto tetap dikirim). Tidak disimpan di database.
export function bacaPetunjukFoto(body) {
  const b = body && typeof body === 'object' ? body : {};
  const sumber = SUMBER_FOTO.has(b.sumber) ? b.sumber : null;
  const umur = Number.isSafeInteger(b.umur_detik) && b.umur_detik >= 0 && b.umur_detik <= MAKS_UMUR_DETIK
    ? b.umur_detik : null;
  return { sumber, umur_detik: umur };
}

// lastModified file (ms) → detik, atau null bila jam tidak masuk akal. Selisih kecil ke masa depan dianggap baru.
export function umurFileDetik(terakhirDiubah, sekarang = Date.now()) {
  if (!Number.isFinite(terakhirDiubah) || terakhirDiubah <= 0) return null;
  const detik = Math.round((sekarang - terakhirDiubah) / 1000);
  if (detik < -120 || detik > MAKS_UMUR_DETIK) return null;
  return Math.max(0, detik);
}

export function teksUmurFile(detik) {
  if (!Number.isSafeInteger(detik) || detik < 0) return null;
  if (detik < 90) return 'baru saja';
  const menit = Math.round(detik / 60);
  if (menit < 60) return `±${menit} menit lalu`;
  const jam = Math.round(detik / 3600);
  if (jam < 48) return `±${jam} jam lalu`;
  return `±${Math.round(detik / 86400)} hari lalu`;
}

// Satu baris keterangan Telegram, atau null bila sumber tidak dikenal.
export function barisSumberFoto(sumber, umurDetik) {
  if (sumber === 'kamera') return '📷 Diambil dari kamera';
  if (sumber !== 'galeri') return null;
  const umur = teksUmurFile(umurDetik);
  return umur ? `🖼 Dari galeri, file ${umur}` : '🖼 Dari galeri';
}

// sessionStorage (atau tiruan): kartu foto tetap ada bila Android menutup tab saat kamera terbuka.
// `nama` = nama tempat (opsional) supaya kartu pemulihan bisa menyebut laporan yang mana.
export function tulisFotoTertunda(simpan, laporanId, waktu = Date.now(), nama = null) {
  if (!simpan || !Number.isSafeInteger(laporanId) || laporanId <= 0 || !Number.isFinite(waktu)) return false;
  try {
    simpan.setItem(KUNCI_FOTO_TERTUNDA, JSON.stringify({ laporan_id: laporanId, waktu, nama: namaTertunda(nama) }));
    return true;
  } catch {
    return false;
  }
}

const namaTertunda = (nama) => (typeof nama === 'string' && nama.trim() ? nama.trim().slice(0, 80) : null);

export function hapusFotoTertunda(simpan) {
  try { simpan?.removeItem(KUNCI_FOTO_TERTUNDA); } catch { /* penyimpanan diblokir */ }
}

export function bacaFotoTertunda(simpan, sekarang = Date.now()) {
  let mentah = null;
  try { mentah = simpan?.getItem(KUNCI_FOTO_TERTUNDA) ?? null; } catch { return null; }
  if (!mentah) return null;
  let data;
  try { data = JSON.parse(mentah); } catch { hapusFotoTertunda(simpan); return null; }
  const id = data?.laporan_id;
  const waktu = data?.waktu;
  const berlaku = Number.isSafeInteger(id) && id > 0 && typeof waktu === 'number' && Number.isFinite(waktu)
    && waktu <= sekarang + 120_000
    && sekarang - waktu <= BATAS_FOTO.menitSetelahLapor * 60_000;
  if (!berlaku) { hapusFotoTertunda(simpan); return null; }
  return { laporanId: id, waktu, nama: namaTertunda(data?.nama) };
}

// JPEG: FF D8 … Segmen APP1 (Exif/XMP: lokasi GPS, waktu, kamera), APP13 (IPTC), dan COM (komentar) dibuang;
// APP0 (JFIF) & APP14 (Adobe, warna) dipertahankan. Mengembalikan Uint8Array baru, atau null bila bukan JPEG sah.
const DIBUANG = new Set([0xe1, 0xed, 0xfe]);
export function buangMetadataJpeg(masuk) {
  const b = masuk instanceof Uint8Array ? masuk : new Uint8Array(masuk);
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  const potongan = [b.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return null;
    const penanda = b[i + 1];
    if (penanda === 0xda) {                     // SOS: sisa file adalah data gambar
      potongan.push(b.subarray(i));
      return gabung(potongan);
    }
    const panjang = (b[i + 2] << 8) | b[i + 3];
    if (panjang < 2 || i + 2 + panjang > b.length) return null;
    if (!DIBUANG.has(penanda)) potongan.push(b.subarray(i, i + 2 + panjang));
    i += 2 + panjang;
  }
  return null;
}

function gabung(bagian) {
  const hasil = new Uint8Array(bagian.reduce((n, x) => n + x.length, 0));
  let p = 0;
  for (const x of bagian) { hasil.set(x, p); p += x.length; }
  return hasil;
}

// Base64 (boleh berawalan data:image/jpeg;base64,) → Uint8Array, atau null bila bukan base64.
export function dariBase64(teks) {
  const bersih = String(teks ?? '').replace(/^data:image\/jpeg;base64,/, '');
  if (!bersih || !/^[A-Za-z0-9+/]+={0,2}$/.test(bersih)) return null;
  try {
    return Uint8Array.from(atob(bersih), c => c.charCodeAt(0));
  } catch {
    return null;
  }
}
