import { useNavigate } from 'react-router-dom';
import { useApp } from '../state.jsx';
import { formatJarak } from '../lib/util.js';
import { kodeLevel, labelLevel, teksTarif } from '../lib/tempat.js';

// Satu baris tempat terlapor di Beranda & Daftar. Ketuk → Peta, fokus ke tempat itu + lembar tempat.
export default function BarisTempat({ t }) {
  const { kendaraan } = useApp();
  const navigate = useNavigate();
  const tarif = teksTarif(t.ringkasan, kendaraan);
  return (
    <li>
      <button type="button" className="baris-tempat" onClick={() => navigate('/peta', { state: { fokusTempat: t.id } })}>
        <span className={`titik-warna besar indikasi-${kodeLevel(t.ringkasan)}`} aria-hidden="true" />
        <span className="baris-teks">
          <strong>{t.nama}</strong>
          <span className="redup">
            {[labelLevel(t.ringkasan).replace(/ \(.*\)$/, ''), tarif?.replace(/ \(.*\)$/, ''), t.jarak != null ? formatJarak(t.jarak) : null]
              .filter(Boolean).join(' · ')}
          </span>
        </span>
      </button>
    </li>
  );
}
