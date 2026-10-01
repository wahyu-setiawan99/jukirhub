import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pesanRingkasanHarian } from '../supabase/functions/_shared/pemantauan.js';
import { KATEGORI_KOMENTAR, bacaJawabanKomentar, promptKomentar, tampilOtomatis } from '../supabase/functions/_shared/periksa-komentar.js';
import { moderasiKomentarBaru } from '../supabase/functions/_shared/moderasi-komentar.js';
import { pesanKomentarBaru } from '../supabase/functions/_shared/kabar-pemilik.js';

// ------------------------------------------------ ringkasan harian

test('ringkasan harian: angka 24 jam, pengingat komentar menunggu, sehat bila tidak ada kegagalan', () => {
  const { teks, sehat } = pesanRingkasanHarian({
    laporan: 12, tanpa_jukir: 3, perangkat: 8, tempat_baru: 2, komentar_baru: 4, komentar_otomatis: 3,
    komentar_menunggu: 1, foto: 1, pesan_kontak: 0, berita_baru: 2, koin: 1500, mencurigakan: 1,
    cron_gagal: [], http_total: 9, http_gagal: 0
  }, { tanggal: '1 Oktober 2026', urlWeb: 'https://jukirhub.site' });
  assert.equal(sehat, true);
  assert.match(teks, /Laporan: <b>12<\/b> \(3 tanpa jukir\) dari 8 perangkat/);
  assert.match(teks, /3 tampil otomatis lewat AI/);
  assert.match(teks, /Koin dibagikan: 1\.500/);
  assert.match(teks, /1 komentar menunggu/);
  assert.match(teks, /lokasi mencurigakan.*1/);
  assert.match(teks, /✅ Semua jadwal berjalan normal/);
});

test('ringkasan harian: jadwal gagal & panggilan fungsi gagal → peringatan, isi pesan galat di-escape', () => {
  const { teks, sehat } = pesanRingkasanHarian({
    laporan: 0, cron_gagal: [{ job: 'berita', jumlah: 2, pesan: 'ERROR: <url> null' }], http_total: 8, http_gagal: 2
  });
  assert.equal(sehat, false);
  assert.match(teks, /Perlu dicek/);
  assert.match(teks, /Jadwal <b>berita<\/b> gagal 2×: ERROR: &lt;url&gt; null/);
  assert.match(teks, /gagal 2 dari 8/);
  assert.ok(!/komentar menunggu/.test(teks), 'tanpa pengingat bila 0');
});

// ------------------------------------------------ pemeriksaan komentar oleh AI

test('AI komentar: hanya kategori dikenal; hanya "layak" tampil otomatis; prompt memuat komentar apa adanya', () => {
  assert.equal(bacaJawabanKomentar({ kategori: 'layak' }), 'layak');
  assert.equal(bacaJawabanKomentar({ kategori: 'aman_kok' }), null);
  assert.equal(bacaJawabanKomentar(null), null);
  assert.equal(tampilOtomatis('layak'), true);
  for (const k of Object.keys(KATEGORI_KOMENTAR).filter(k => k !== 'layak')) assert.equal(tampilOtomatis(k), false, k);
  assert.equal(tampilOtomatis(null), false);
  const p = promptKomentar('Jukir "ramah"', 'Cafe Senja');
  assert.match(p.pengguna, /Komentar: "Jukir \\"ramah\\""/);
});

function sistem({ kategori = 'layak', jatah = true, aiGagal = false, sudahDiputuskan = false } = {}) {
  const terkirim = [];
  const status = { tampil: false };
  return {
    terkirim, status,
    ai: async () => { if (aiGagal) throw new Error('Gemini 500'); return kategori; },
    db: {
      async ambilJatahAi(jenis, batas) { assert.equal(jenis, 'komentar'); assert.ok(batas > 0); return jatah; },
      async tampilkanOtomatis() { if (sudahDiputuskan) return false; status.tampil = true; return true; }
    },
    tg: { async kirim(teks, tombol) { terkirim.push({ teks, data: tombol.inline_keyboard[0].map(b => b.callback_data) }); } }
  };
}
const komentar = { id: 7, isi: 'Jukir membantu menyeberangkan motor', namaTempat: 'Cafe Senja' };

test('moderasi: AI "layak" → tampil otomatis, pemilik dapat tombol Sembunyikan', async () => {
  const s = sistem();
  assert.deepEqual(await moderasiKomentarBaru({ komentar, ...s }), { kategori: 'layak', tampil: true });
  assert.equal(s.status.tampil, true);
  assert.match(s.terkirim[0].teks, /Tampil otomatis/);
  assert.deepEqual(s.terkirim[0].data, ['jh:kx:7']);
});

test('moderasi: kategori lain / AI gagal / jatah habis / pemilik sudah memutuskan → tetap menunggu tombol pemilik', async () => {
  const kasus = [
    [sistem({ kategori: 'menyebut_identitas' }), 'menyebut_identitas', /AI: <b>menyebut identitas/],
    [sistem({ aiGagal: true }), null, /Tampil hanya bila Anda tekan Tampilkan/],
    [sistem({ jatah: false }), null, /Tampil hanya bila/],
    [{ ...sistem(), ai: null }, null, /Tampil hanya bila/]
  ];
  for (const [s, kategori, pola] of kasus) {
    const h = await moderasiKomentarBaru({ komentar, ...s });
    assert.deepEqual(h, { kategori, tampil: false });
    assert.match(s.terkirim[0].teks, pola);
    assert.deepEqual(s.terkirim[0].data, ['jh:ks:7', 'jh:kx:7'], 'tombol Tampilkan & Tolak');
  }
  const diputuskan = sistem({ sudahDiputuskan: true });
  assert.deepEqual(await moderasiKomentarBaru({ komentar, ...diputuskan }), { kategori: 'layak', tampil: false });
});

test('pesan komentar lama (tanpa hasil AI) tetap sama', () => {
  assert.match(pesanKomentarBaru({ id: 3, isi: 'x', namaTempat: 'A' }), /Tampil hanya bila Anda tekan Tampilkan\. Tolak bila/);
});
