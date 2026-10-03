import { Fragment } from 'react';
import { Link } from 'react-router-dom';

// Remah roti: Beranda › … › halaman ini (item terakhir bukan tautan). Sama dengan remahStatis() di lib/seo.js.
export default function Remah({ remah }) {
  const isi = [['Beranda', '/'], ...remah];
  return (
    <nav className="remah redup kecil" aria-label="Remah roti">
      {isi.map(([nama, jalur], i) => (
        <Fragment key={jalur}>
          {i > 0 && ' › '}
          {i === isi.length - 1 ? <span aria-current="page">{nama}</span> : <Link to={jalur}>{nama}</Link>}
        </Fragment>
      ))}
    </nav>
  );
}
