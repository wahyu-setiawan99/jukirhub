import { useEffect, useMemo, useState } from 'react';
import { gabungImbauan, imbauanWilayah } from '@shared/imbauan.js';
import { dataProvinsi, kabupatenDiProvinsi, provinsiKabupaten } from '@shared/wilayah.js';
import { KONFIGURASI, useApp } from '../state.jsx';
import { KOLOM_IMBAUAN, ambilView } from '../lib/data.js';
import { setelahGambarPertama } from '../lib/koneksi.js';
import { Ikon } from './Ikon.jsx';

// "Imbauan parkir" per wilayah (AGENTS.md 1.5, fase N2): kalimat netral dari angka agregat 30 hari (view
// imbauan_publik). Kab/kota pengguna bila datanya cukup, selain itu provinsi zona aktif. Tidak tampil bila belum
// cukup laporan (lihat AMBANG_IMBAUAN) atau view belum ada.
export default function Imbauan() {
  const { kabupatenSaya, zona } = useApp();
  const [baris, setBaris] = useState(null);

  useEffect(() => {
    if (!KONFIGURASI) return undefined;
    return setelahGambarPertama(() => ambilView(fetch, KONFIGURASI, 'imbauan_publik', KOLOM_IMBAUAN)
      .then(setBaris)
      .catch(err => console.warn('[imbauan] gagal memuat:', err.message)));
  }, []);

  const imbauan = useMemo(() => {
    if (!baris?.length) return null;
    if (kabupatenSaya && provinsiKabupaten(kabupatenSaya) === zona) {
      const kab = imbauanWilayah(gabungImbauan(baris, [kabupatenSaya]), kabupatenSaya);
      if (kab) return kab;
    }
    return imbauanWilayah(gabungImbauan(baris, kabupatenDiProvinsi(zona)), dataProvinsi(zona)?.nama ?? 'wilayah ini');
  }, [baris, kabupatenSaya, zona]);

  if (!imbauan) return null;
  return <KartuImbauan imbauan={imbauan} />;
}

// Tampilan satu imbauan ({ judul, kalimat[], laporan } dari imbauanWilayah), dipakai juga halaman wilayah.
export function KartuImbauan({ imbauan }) {
  return (
    <section className="kartu-beranda imbauan" aria-labelledby="judul-imbauan">
      <h2 id="judul-imbauan"><Ikon nama="perisai" ukuran={18} /> {imbauan.judul}</h2>
      <ul className="poin">
        {imbauan.kalimat.map(k => <li key={k}>{k}</li>)}
      </ul>
      <p className="redup kecil">Dari {imbauan.laporan} laporan warga, bukan tuduhan kepada siapa pun.</p>
    </section>
  );
}
