import { useEffect, useMemo, useState } from 'react';
import { BATAS_BERITA, adaBeritaDaerah, urutkanBerita } from '@shared/berita.js';
import { PROVINSI, dataProvinsi, kabupatenDiProvinsi } from '@shared/wilayah.js';
import { KONFIGURASI, useApp } from '../state.jsx';
import { KOLOM_BERITA, ambilView } from '../lib/data.js';
import { daerahManual, pilihDaerahManual } from '../lib/daerah.js';
import { Ikon } from './Ikon.jsx';

const FORMAT_TANGGAL = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Makassar' });

// "Berita parkir" (M5, fase N2 Sulawesi): berita kab/kota pengguna dulu, lalu provinsi zona aktif, lalu Sulawesi
// lainnya. Daerah: pilihan manual, atau kab/kota otomatis dari posisi yang sudah diizinkan (state.jsx → lib/daerah.js).
// Ringkasan dibuat AI dari judul & cuplikan; isi lengkap di situs sumber. Kartu tidak tampil bila belum ada berita.
export default function Berita() {
  const { kabupatenSaya, zona } = useApp();
  const [berita, setBerita] = useState(null);       // null = memuat / gagal (kartu disembunyikan)
  const [manual, setManual] = useState(() => daerahManual());
  const [semua, setSemua] = useState(false);

  useEffect(() => {
    if (!KONFIGURASI) return;
    ambilView(fetch, KONFIGURASI, 'berita_publik', KOLOM_BERITA)
      .then(setBerita)
      .catch(err => console.warn('[berita] gagal memuat:', err.message));
  }, []);

  const daerah = manual ?? kabupatenSaya;
  const urut = useMemo(() => urutkanBerita(berita ?? [], daerah, zona), [berita, daerah, zona]);
  if (!berita?.length) return null;

  const tampil = semua ? urut : urut.slice(0, BATAS_BERITA.tampilAwal);
  const ganti = (e) => {
    const nilai = e.target.value || null;
    pilihDaerahManual(nilai);
    setManual(nilai);
  };

  return (
    <section className="kartu-beranda berita" aria-labelledby="judul-berita">
      <div className="kepala-seksi">
        <h2 id="judul-berita"><Ikon nama="koran" ukuran={18} /> Berita parkir · {daerah ?? dataProvinsi(zona)?.singkat}</h2>
      </div>
      <label className="pilih-daerah">
        <span className="redup kecil">Daerah</span>
        <select value={manual ?? ''} onChange={ganti}>
          <option value="">{kabupatenSaya ? `Otomatis (${kabupatenSaya})` : 'Otomatis dari lokasi'}</option>
          {PROVINSI.map(p => (
            <optgroup key={p.kode} label={p.nama}>
              {kabupatenDiProvinsi(p.kode).map(k => <option key={k} value={k}>{k}</option>)}
            </optgroup>
          ))}
        </select>
      </label>
      {daerah && !adaBeritaDaerah(berita, daerah) && (
        <p className="redup kecil">Belum ada berita parkir tentang {daerah} dalam {BATAS_BERITA.hariTampil} hari terakhir. Berita terdekat lainnya:</p>
      )}
      <ul className="daftar-berita">
        {tampil.map(b => (
          <li key={b.id}>
            <a href={b.url} target="_blank" rel="noopener noreferrer nofollow">{b.judul}</a>
            <p>{b.ringkasan}</p>
            <span className="label-data">{[b.sumber, FORMAT_TANGGAL.format(Date.parse(b.terbit)), ...(b.kabupaten ?? []).slice(0, 2)].join(' · ')}</span>
          </li>
        ))}
      </ul>
      {urut.length > BATAS_BERITA.tampilAwal && (
        <button type="button" className="tautan" onClick={() => setSemua(s => !s)}>
          {semua ? 'Tampilkan lebih sedikit' : `Tampilkan semua (${urut.length})`}
        </button>
      )}
      <p className="redup kecil">Ringkasan dibuat otomatis oleh AI dari judul berita dan bisa keliru; baca selengkapnya di sumbernya.</p>
    </section>
  );
}
