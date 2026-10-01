// Formulir kontak (halaman /kontak, persiapan AdSense 1 Okt 2026): pesan diteruskan ke Telegram pengelola, tidak
// disimpan di database. ESM murni: dipakai web (pesan galat sama) dan Edge Function `kontak`, dites node:test.

export const BATAS_KONTAK = {
  pesanMin: 10,
  pesanMaks: 1000,
  emailMaks: 120,
  perIpPerJam: 3,
  perIpPerHari: 10,
  tautanMaks: 2
};

const POLA_EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

// body → { ok: true, data: { pesan, email } } atau { ok: false, kode, pesan }. `situs` = kolom jebakan bot (harus kosong).
export function validasiKontak(body) {
  const b = body && typeof body === 'object' ? body : {};
  if (typeof b.situs === 'string' && b.situs.trim()) return { ok: false, kode: 'bot', pesan: 'Pesan tidak bisa dikirim.' };
  const pesan = String(b.pesan ?? '').replace(/\s+\n/g, '\n').trim();
  if (pesan.length < BATAS_KONTAK.pesanMin || pesan.length > BATAS_KONTAK.pesanMaks) {
    return { ok: false, kode: 'pesan', pesan: `Pesan ${BATAS_KONTAK.pesanMin}–${BATAS_KONTAK.pesanMaks} huruf.` };
  }
  if ((pesan.match(/https?:\/\/|www\./gi) ?? []).length > BATAS_KONTAK.tautanMaks) {
    return { ok: false, kode: 'tautan', pesan: `Maksimal ${BATAS_KONTAK.tautanMaks} tautan dalam satu pesan.` };
  }
  const email = String(b.email ?? '').trim();
  if (email && (email.length > BATAS_KONTAK.emailMaks || !POLA_EMAIL.test(email))) {
    return { ok: false, kode: 'email', pesan: 'Format email belum benar. Kosongkan bila tidak perlu dibalas.' };
  }
  return { ok: true, data: { pesan, email: email || null } };
}
