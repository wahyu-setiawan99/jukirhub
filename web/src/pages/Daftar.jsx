import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../state.jsx';
import { CATATAN_KAKI, HALAMAN } from '../lib/konten-beranda.js';
import { dataProvinsi } from '@shared/wilayah.js';
import { tempatDiZona, urutkanTempat } from '../lib/tempat.js';
import { ringkasWilayah, wilayahProv } from '../lib/halaman-wilayah.js';
import { pesanGalatLokasi } from '../lib/lokasi.js';
import BarisTempat from '../components/BarisTempat.jsx';
import PilihZona from '../components/PilihZona.jsx';
import TautanSitus from '../components/TautanSitus.jsx';

// Daftar tempat yang sudah dilaporkan (AGENTS.md 6.3): terdekat dulu bila lokasi diizinkan, laporan terbaru dulu bila tidak.
export default function Daftar() {
  const { daftar: semua, statusData, muatUlang, posisi, izinLokasi, galatLokasi, mintaPosisi, zona } = useApp();
  const daftar = useMemo(() => tempatDiZona(semua, zona), [semua, zona]);
  const navigate = useNavigate();
  const h = HALAMAN['/daftar'];
  const urut = useMemo(() => urutkanTempat(daftar, posisi), [daftar, posisi]);
  // Tautan ke halaman wilayah: provinsi zona aktif + kab/kota yang sudah punya laporan.
  const daerah = useMemo(() => {
    const prov = ringkasWilayah(semua, wilayahProv(zona));
    return prov.jumlahLaporan ? [prov, ...prov.kabupaten.filter(k => k.jumlahLaporan > 0)] : [];
  }, [semua, zona]);

  return (
    <div className="halaman daftar">
      <section className="kepala-halaman">
        <h1>{h.h1}</h1>
        <p className="redup">{h.intro}</p>
        <PilihZona />
      </section>

      {!posisi && izinLokasi !== 'ditolak' && daftar.length > 1 && (
        <button type="button" className="tombol-sekunder lebar-penuh" disabled={izinLokasi === 'meminta'}
          onClick={() => mintaPosisi().catch(() => {})}>
          {izinLokasi === 'meminta' ? 'Mencari lokasi…' : 'Urutkan dari yang terdekat'}
        </button>
      )}
      {galatLokasi && <p className="redup">{pesanGalatLokasi(galatLokasi, navigator.userAgent)}</p>}

      {statusData === 'memuat' && <p className="redup memuat-blok" role="status">Memuat daftar tempat…</p>}
      {statusData === 'galat' && (
        <p className="kotak-galat" role="alert">
          Daftar belum bisa dimuat. <button type="button" className="tautan" onClick={muatUlang}>Coba lagi</button>
        </p>
      )}
      {statusData === 'siap' && (urut.length > 0 ? (
        <ul className="daftar-tempat">
          {urut.map(t => <BarisTempat key={t.id} t={t} />)}
        </ul>
      ) : (
        <div className="kosong">
          <strong>Belum ada tempat parkir yang dilaporkan di {dataProvinsi(zona)?.nama}.</strong>
          <span>Tempat muncul di sini setelah warga melapor dari lokasi. Baru parkir? Buka Peta dan ketuk tempat Anda parkir.</span>
          <button type="button" className="tombol-sekunder" onClick={() => navigate('/peta', { state: { pilihTempat: true } })}>
            Buka peta
          </button>
        </div>
      ))}
      {statusData === 'siap' && daerah.length > 0 && (
        <section className="kartu" aria-labelledby="judul-daerah">
          <h2 id="judul-daerah">Ringkasan per daerah</h2>
          <ul className="daftar-sekitar">
            {daerah.map(r => (
              <li key={r.wilayah.jalur}>
                <Link to={r.wilayah.jalur}>{r.wilayah.nama}</Link>
                <span className="redup kecil jarak-sekitar">{r.jumlahLaporan} laporan</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <TautanSitus />
      <p className="disclaimer">{CATATAN_KAKI}</p>
    </div>
  );
}
