import { Link } from 'react-router-dom';
import { LABEL_RINCIAN, namaLencana } from '@shared/koin.js';
import { Ikon } from './Ikon.jsx';

// Koin dari satu laporan (layar sukses lapor). `koin` = ringkasan dari `lapor`, atau null bila fungsi lama /
// pencatatan koin gagal (laporan tetap diterima; tidak ditampilkan apa-apa).
export default function KoinDiterima({ koin }) {
  if (!koin) return null;
  return (
    <section className="koin-diterima" aria-label="Koin laporan ini">
      {koin.batasHarian ? (
        <p className="redup">Batas koin harian tercapai. Laporan tetap diterima; koin bisa didapat lagi besok.</p>
      ) : (
        <>
          <p className="koin-baris">
            <span className="lencana-koin"><Ikon nama="koin" ukuran={16} /> +{koin.koin} koin</span>
            <span className="redup">total {koin.total}</span>
          </p>
          <p className="redup kecil">{koin.rincian.map(r => `+${r.koin} ${LABEL_RINCIAN[r.kode] ?? r.kode}`).join(' · ')}</p>
          {koin.seri >= 2 && <p className="koin-baris"><Ikon nama="api" ukuran={16} /> Seri {koin.seri} hari berturut-turut</p>}
          {koin.lencanaBaru.map(id => (
            <p key={id} className="koin-baris"><Ikon nama="piala" ukuran={16} /> Lencana baru: <strong>{namaLencana(id)}</strong></p>
          ))}
          {/* Koin pertama di browser ini: beri tahu bahwa koin terikat HP & browser (tanpa akun). */}
          {koin.total === koin.koin && (
            <p className="redup kecil">Koin tersimpan di HP & browser ini. Lapor selalu dari HP dan browser yang sama.</p>
          )}
        </>
      )}
      <Link className="tautan kecil" to="/saya">Lihat koin & peringkat di tab Saya</Link>
    </section>
  );
}
