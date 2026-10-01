import { Link } from 'react-router-dom';
import { TAUTAN_SITUS } from '../lib/konten-beranda.js';

// Tautan halaman situs (Tentang, Berita, Kebijakan Privasi, Syarat, Kontak) di bagian bawah halaman berisi teks.
// Dibutuhkan peninjau Google AdSense dan pengunjung; daftar yang sama dipakai HTML statis (lib/seo.js).
export default function TautanSitus() {
  return (
    <nav className="tautan-situs" aria-label="Tentang situs">
      {TAUTAN_SITUS.map(([ke, label]) => <Link key={ke} to={ke}>{label}</Link>)}
    </nav>
  );
}
