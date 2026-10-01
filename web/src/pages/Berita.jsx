import { BATAS_BERITA } from '@shared/berita.js';
import { CATATAN_KAKI, HALAMAN } from '../lib/konten-beranda.js';
import PilihZona from '../components/PilihZona.jsx';
import { CATATAN_AI, DaftarBerita, PilihDaerahBerita, useBerita } from '../components/KartuBerita.jsx';

// Halaman khusus berita parkir (/berita, masukan pemilik 1 Okt 2026): semua berita parkir di Sulawesi ≤ 30 hari,
// daerah pengguna dulu. Tidak lewat Telegram. Isi lengkap ada di situs media sumber.
export default function Berita() {
  const h = HALAMAN['/berita'];
  const b = useBerita();
  return (
    <div className="halaman halaman-berita">
      <section className="kepala-halaman">
        <h1>{h.h1}</h1>
        <p className="redup">{h.intro}</p>
      </section>

      <section className="kartu berita" aria-label="Pilihan wilayah berita">
        <PilihZona />
        <PilihDaerahBerita b={b} />
      </section>

      {b.status === 'memuat' && <p className="redup" role="status">Memuat berita parkir…</p>}
      {b.status === 'galat' && <p className="kotak-galat" role="alert">Berita belum bisa dimuat. Periksa koneksi Anda.</p>}
      {b.status === 'siap' && (b.urut.length ? (
        <section className="kartu berita" aria-label="Daftar berita parkir">
          {b.daerah && !b.adaDaerah && (
            <p className="redup kecil">Belum ada berita parkir tentang {b.daerah} dalam {BATAS_BERITA.hariTampil} hari terakhir. Berita terdekat lainnya:</p>
          )}
          <DaftarBerita berita={b.urut} />
        </section>
      ) : (
        <div className="kosong">
          <strong>Belum ada berita parkir dalam {BATAS_BERITA.hariTampil} hari terakhir.</strong>
          <span>Berita dari media di Sulawesi diperiksa otomatis tiap 3 jam.</span>
        </div>
      ))}

      <p className="disclaimer">{CATATAN_AI} {CATATAN_KAKI}</p>
    </div>
  );
}
