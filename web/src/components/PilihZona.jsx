import { PROVINSI } from '@shared/wilayah.js';
import { useApp } from '../state.jsx';
import { Ikon } from './Ikon.jsx';

// Zona aktif (provinsi, AGENTS.md 1.5) di dalam halaman yang memakainya (Beranda, Peta, Daftar, Berita), bukan di
// header (masukan pemilik 1 Okt 2026: mengganggu). Otomatis dari lokasi; pilihan manual diingat di HP.
// `ringkas` = nama singkat (Sulsel) untuk panel peta yang sempit.
export default function PilihZona({ ringkas = false }) {
  const { zona, zonaManual, zonaOtomatis, pilihZona } = useApp();
  return (
    <label className="pilih-zona">
      <Ikon nama="peta" ukuran={16} />
      <span className="judul-tersembunyi">Zona provinsi</span>
      <select value={zona} onChange={e => pilihZona(e.target.value === 'otomatis' ? null : e.target.value)}>
        {PROVINSI.map(p => <option key={p.kode} value={p.kode}>{ringkas ? p.singkat : p.nama}</option>)}
        {zonaManual && <option value="otomatis">Otomatis dari lokasi</option>}
      </select>
      {!zonaManual && zonaOtomatis && <span className="redup kecil">otomatis</span>}
    </label>
  );
}
