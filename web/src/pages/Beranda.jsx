import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LABEL_KENDARAAN } from '@shared/konstanta.js';
import { useApp } from '../state.jsx';
import { CATATAN_KAKI, FAQ, HERO, LANGKAH, TENTANG, WILAYAH } from '../lib/konten-beranda.js';
import { dataProvinsi } from '@shared/wilayah.js';
import { tempatDiZona, urutkanTempat } from '../lib/tempat.js';
import { pramuatPetaSaatSenggang } from '../lib/koneksi.js';
import BarisTempat from '../components/BarisTempat.jsx';
import KartuBerita from '../components/KartuBerita.jsx';
import Imbauan from '../components/Imbauan.jsx';
import PilihZona from '../components/PilihZona.jsx';
import TautanSitus from '../components/TautanSitus.jsx';

const JUMLAH_SOROTAN = 3;

// Layar pertama: ringan (tanpa peta), tempat terlapor terdekat/terbaru + penjelasan app untuk pengunjung baru &
// mesin pencari. Teks penjelasan juga ditanam statis saat build (lib/seo.js).
export default function Beranda() {
  const { kendaraan, daftar: semua, statusData, posisi, zona } = useApp();
  const daftar = useMemo(() => tempatDiZona(semua, zona), [semua, zona]);
  const namaZona = dataProvinsi(zona)?.nama;
  const navigate = useNavigate();

  useEffect(() => pramuatPetaSaatSenggang(), []);

  const sorotan = useMemo(() => urutkanTempat(daftar, posisi).slice(0, JUMLAH_SOROTAN), [daftar, posisi]);

  return (
    <div className="halaman beranda">
      <section className="beranda-pembuka">
        <h1>{HERO.judul}</h1>
        <p className="redup">{HERO.sub}</p>
        <p className="beranda-status" role="status">
          {statusData === 'memuat' && 'Memuat data tempat parkir…'}
          {statusData === 'galat' && 'Data belum bisa dimuat.'}
          {statusData === 'siap' && (daftar.length
            ? `${daftar.length} tempat parkir sudah dilaporkan warga di ${namaZona}`
            : `Belum ada tempat parkir yang dilaporkan di ${namaZona}.`)}
        </p>
        <PilihZona />
      </section>

      <section className="kartu-beranda" aria-labelledby="judul-sorotan">
        <div className="kepala-seksi">
          <h2 id="judul-sorotan">
            {posisi ? 'Tempat parkir terdekat' : 'Laporan terbaru'} · {LABEL_KENDARAAN[kendaraan]}
          </h2>
        </div>
        {sorotan.length > 0 ? (
          <ul className="daftar-tempat">
            {sorotan.map(t => <BarisTempat key={t.id} t={t} />)}
          </ul>
        ) : (
          <div className="kosong">
            <strong>Belum ada laporan di sekitar Anda.</strong>
            <span>Baru parkir di depan toko atau pinggir jalan? Buka Peta, ketuk tempat Anda parkir, lalu laporkan supaya warga lain tahu.</span>
          </div>
        )}
        <div className="aksi-beranda">
          <button type="button" className="tombol-sekunder" onClick={() => navigate('/peta')}>Buka peta</button>
          <button type="button" className="tombol-sekunder" onClick={() => navigate('/daftar')}>Lihat daftar</button>
        </div>
      </section>

      <Imbauan />

      <KartuBerita />

      <KontenBeranda />
    </div>
  );
}

// Harus sejalan dengan buatIsiStatis() di lib/seo.js (sumber teks sama: konten-beranda.js).
function KontenBeranda() {
  return (
    <>
      <section className="seksi-beranda" aria-labelledby="judul-tentang">
        <h2 id="judul-tentang">{TENTANG.judul}</h2>
        {TENTANG.paragraf.map(p => <p key={p}>{p}</p>)}
      </section>

      <section className="seksi-beranda" aria-labelledby="judul-langkah">
        <h2 id="judul-langkah">{LANGKAH.judul}</h2>
        <ol className="langkah-beranda">
          {LANGKAH.butir.map(b => (
            <li key={b.judul}><strong>{b.judul}</strong><span>{b.teks}</span></li>
          ))}
        </ol>
      </section>

      <section className="seksi-beranda" aria-labelledby="judul-wilayah">
        <h2 id="judul-wilayah">{WILAYAH.judul}</h2>
        <p>{WILAYAH.teks}</p>
      </section>

      <section className="seksi-beranda" aria-labelledby="judul-faq">
        <h2 id="judul-faq">{FAQ.judul}</h2>
        <div className="faq">
          {FAQ.butir.map(f => (
            <details key={f.tanya}>
              <summary>{f.tanya}</summary>
              <p>{f.jawab}</p>
            </details>
          ))}
        </div>
      </section>

      <TautanSitus />
      <p className="disclaimer">{CATATAN_KAKI}</p>
    </>
  );
}
