import { useEffect, useMemo, useState } from 'react';
import { BATAS_BERITA, adaBeritaDaerah, urutkanBerita } from '@shared/berita.js';
import { semuaKabupaten } from '@shared/kabupaten.js';
import { KONFIGURASI, useApp } from '../state.jsx';
import { KOLOM_BERITA, ambilView } from '../lib/data.js';
import { daerahDariPosisi, daerahManual, pilihDaerahManual } from '../lib/daerah.js';
import { Ikon } from './Ikon.jsx';

const FORMAT_TANGGAL = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Makassar' });

// "Berita parkir di daerah Anda" (M5): berita dari media Sulsel yang menyebut kabupaten pengguna didahulukan.
// Daerah: pilihan manual, atau otomatis dari posisi yang sudah diizinkan (lib/daerah.js). Ringkasan dibuat AI dari
// judul & cuplikan; isi lengkap di situs sumber. Kartu tidak tampil bila belum ada berita sama sekali.
export default function Berita() {
  const { posisi } = useApp();
  const [berita, setBerita] = useState(null);       // null = memuat / gagal (kartu disembunyikan)
  const [manual, setManual] = useState(() => daerahManual());
  const [otomatis, setOtomatis] = useState(null);
  const [semua, setSemua] = useState(false);

  useEffect(() => {
    if (!KONFIGURASI) return;
    ambilView(fetch, KONFIGURASI, 'berita_publik', KOLOM_BERITA)
      .then(setBerita)
      .catch(err => console.warn('[berita] gagal memuat:', err.message));
  }, []);

  useEffect(() => {
    if (manual || !posisi) return;
    let batal = false;
    daerahDariPosisi(fetch, posisi).then(d => { if (!batal) setOtomatis(d); });
    return () => { batal = true; };
  }, [manual, posisi]);

  const daerah = manual ?? otomatis;
  const urut = useMemo(() => urutkanBerita(berita ?? [], daerah), [berita, daerah]);
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
        <h2 id="judul-berita"><Ikon nama="koran" ukuran={18} /> Berita parkir{daerah ? ` · ${daerah}` : ' · Sulsel'}</h2>
      </div>
      <label className="pilih-daerah">
        <span className="redup kecil">Daerah</span>
        <select value={manual ?? ''} onChange={ganti}>
          <option value="">{otomatis ? `Otomatis (${otomatis})` : 'Otomatis dari lokasi'}</option>
          {semuaKabupaten().map(k => <option key={k} value={k}>{k}</option>)}
        </select>
      </label>
      {daerah && !adaBeritaDaerah(berita, daerah) && (
        <p className="redup kecil">Belum ada berita parkir tentang {daerah} dalam {BATAS_BERITA.hariTampil} hari terakhir. Berita Sulsel lainnya:</p>
      )}
      <ul className="daftar-berita">
        {tampil.map(b => (
          <li key={b.id}>
            <a href={b.url} target="_blank" rel="noopener noreferrer nofollow">{b.judul}</a>
            <p>{b.ringkasan}</p>
            <span className="redup kecil">{[b.sumber, FORMAT_TANGGAL.format(Date.parse(b.terbit)), ...(b.kabupaten ?? []).slice(0, 2)].join(' · ')}</span>
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
