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
