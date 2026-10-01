import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BATAS_BERITA, adaBeritaDaerah, urutkanBerita } from '@shared/berita.js';
import { PROVINSI, dataProvinsi, kabupatenDiProvinsi } from '@shared/wilayah.js';
import { KONFIGURASI, useApp } from '../state.jsx';
import { muatBerita } from '../lib/berita.js';
import { daerahManual, pilihDaerahManual } from '../lib/daerah.js';
import { setelahGambarPertama } from '../lib/koneksi.js';
import { Ikon } from './Ikon.jsx';

const FORMAT_TANGGAL = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Makassar' });

// Data berita parkir (M5) untuk kartu Beranda & halaman /berita: urutan kab/kota pengguna → provinsi zona aktif →
// Sulawesi lainnya. Daerah = pilihan manual, atau kab/kota otomatis dari posisi yang sudah diizinkan.
// status: memuat | siap | galat. Berita tidak dikirim ke Telegram (keputusan pemilik 1 Okt 2026).
// segera = true di halaman /berita (berita = isi utama); kartu Beranda menunggu gambar pertama dulu.
export function useBerita({ segera = false } = {}) {
  const { kabupatenSaya, zona } = useApp();
  const [data, setData] = useState({ status: KONFIGURASI ? 'memuat' : 'siap', berita: [] });
  const [manual, setManual] = useState(() => daerahManual());

  useEffect(() => {
    if (!KONFIGURASI) return undefined;
    let batal = false;
    const muat = () => muatBerita()
      .then(berita => { if (!batal) setData({ status: 'siap', berita }); })
      .catch(err => {
        console.warn('[berita] gagal memuat:', err.message);
        if (!batal) setData(d => ({ ...d, status: 'galat' }));
      });
    if (segera) muat();
    const henti = segera ? null : setelahGambarPertama(muat);
    return () => { batal = true; henti?.(); };
  }, [segera]);

  const daerah = manual ?? kabupatenSaya;
  const urut = useMemo(() => urutkanBerita(data.berita, daerah, zona), [data.berita, daerah, zona]);
  const pilihDaerah = (nilai) => {
    pilihDaerahManual(nilai || null);
    setManual(nilai || null);
  };
  return {
    status: data.status, berita: data.berita, urut, daerah, manual, kabupatenSaya, zona, pilihDaerah,
    adaDaerah: adaBeritaDaerah(data.berita, daerah)
  };
}

export function PilihDaerahBerita({ b }) {
  return (
    <label className="pilih-daerah">
      <span className="redup kecil">Daerah</span>
      <select value={b.manual ?? ''} onChange={e => b.pilihDaerah(e.target.value)}>
        <option value="">{b.kabupatenSaya ? `Otomatis (${b.kabupatenSaya})` : 'Otomatis dari lokasi'}</option>
        {PROVINSI.map(p => (
          <optgroup key={p.kode} label={p.nama}>
            {kabupatenDiProvinsi(p.kode).map(k => <option key={k} value={k}>{k}</option>)}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

export function DaftarBerita({ berita }) {
  return (
    <ul className="daftar-berita">
      {berita.map(b => (
        <li key={b.id}>
          <a href={b.url} target="_blank" rel="noopener noreferrer nofollow">{b.judul}</a>
          <p>{b.ringkasan}</p>
          <span className="redup kecil">{[b.sumber, FORMAT_TANGGAL.format(Date.parse(b.terbit)), ...(b.kabupaten ?? []).slice(0, 2)].join(' · ')}</span>
        </li>
      ))}
    </ul>
  );
}

export const CATATAN_AI = 'Ringkasan dibuat otomatis oleh AI dari judul berita dan bisa keliru; baca selengkapnya di sumbernya.';

// Kartu ringkas di Beranda: 3 berita teratas + tautan ke halaman /berita. Tidak tampil sampai data termuat.
export default function KartuBerita() {
  const b = useBerita();
  if (b.status !== 'siap') return null;
  const tampil = b.urut.slice(0, BATAS_BERITA.tampilAwal);
  return (
    <section className="kartu-beranda berita" aria-labelledby="judul-berita">
      <div className="kepala-seksi">
        <h2 id="judul-berita"><Ikon nama="koran" ukuran={18} /> Berita parkir · {b.daerah ?? dataProvinsi(b.zona)?.singkat}</h2>
      </div>
      {tampil.length ? <DaftarBerita berita={tampil} /> : (
        <p className="redup">Belum ada berita parkir di Sulawesi dalam {BATAS_BERITA.hariTampil} hari terakhir.</p>
      )}
      <Link className="tombol-sekunder tombol-tautan" to="/berita">
        {b.urut.length > tampil.length ? `Semua berita parkir (${b.urut.length})` : 'Halaman berita parkir'}
      </Link>
    </section>
  );
}
