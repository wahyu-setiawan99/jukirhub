import { useLocation } from 'react-router-dom';
import { CATATAN_KAKI, HALAMAN } from '../lib/konten-beranda.js';
import { BERLAKU_SEJAK, ISI_LEGAL } from '../lib/konten-legal.js';
import FormKontak from '../components/FormKontak.jsx';
import TautanSitus from '../components/TautanSitus.jsx';

// Halaman situs: /tentang, /privasi, /syarat, /kontak (persiapan Google AdSense, 1 Okt 2026). Teks dari
// lib/konten-legal.js, sama dengan HTML statis untuk mesin pencari (lib/seo.js).
export default function Legal() {
  const { pathname } = useLocation();
  const h = HALAMAN[pathname];
  const isi = ISI_LEGAL[pathname];
  if (!h || !isi) return null;
  return (
    <div className="halaman halaman-legal">
      <section className="kepala-halaman">
        <h1>{h.h1}</h1>
        <p className="redup">{h.intro}</p>
        {pathname !== '/kontak' && pathname !== '/tentang' && <p className="redup kecil">Berlaku sejak {BERLAKU_SEJAK}.</p>}
      </section>

      {pathname === '/kontak' && <FormKontak />}

      {isi.bagian.map(b => (
        <section key={b.judul} className="kartu">
          <h2>{b.judul}</h2>
          {b.paragraf?.map(p => <p key={p}>{p}</p>)}
          {b.poin && <ul className="poin">{b.poin.map(p => <li key={p}>{p}</li>)}</ul>}
        </section>
      ))}

      <TautanSitus />
      <p className="disclaimer">{CATATAN_KAKI}</p>
    </div>
  );
}
