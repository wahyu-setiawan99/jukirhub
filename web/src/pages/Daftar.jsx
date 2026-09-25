import { LABEL_KENDARAAN } from '@shared/konstanta.js';
import { useApp } from '../state.jsx';
import { CATATAN_KAKI, HALAMAN } from '../lib/konten-beranda.js';

// Daftar tempat yang sudah dilaporkan, terdekat dulu. M0: keadaan kosong; data dari view titik_publik mulai M1.
export default function Daftar() {
  const { kendaraan } = useApp();
  const h = HALAMAN['/daftar'];
  return (
    <div className="halaman daftar">
      <section className="kepala-halaman">
        <h1>{h.h1}</h1>
        <p className="redup">{h.intro}</p>
      </section>
      <div className="kosong">
        <strong>Belum ada tempat parkir yang dilaporkan.</strong>
        <span>
          Tempat muncul di sini setelah warga melapor dari lokasi. Tarif yang ditampilkan mengikuti pilihan{' '}
          {LABEL_KENDARAAN[kendaraan].toLowerCase()} di bagian atas.
        </span>
      </div>
      <p className="disclaimer">{CATATAN_KAKI}</p>
    </div>
  );
}
