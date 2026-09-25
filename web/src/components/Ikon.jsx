import { svgIkon } from '../lib/ikon.js';

// Ikon garis dari lib/ikon.js (string statis milik app). Dekoratif: selalu disertai teks atau aria-label.
export function Ikon({ nama, ukuran = 22 }) {
  return <span className="ikon" style={{ display: 'inline-flex' }} dangerouslySetInnerHTML={{ __html: svgIkon(nama, ukuran) }} />;
}
