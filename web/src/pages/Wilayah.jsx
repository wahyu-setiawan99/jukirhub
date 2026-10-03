import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { kabupatenDiProvinsi } from '@shared/wilayah.js';
import { KONFIGURASI, useApp } from '../state.jsx';
import { CATATAN_KAKI } from '../lib/konten-beranda.js';
import { KOLOM_IMBAUAN, ambilView } from '../lib/data.js';
import { muatBerita } from '../lib/berita.js';
import { jalurTempat } from '../lib/halaman-tempat.js';
import {
  angkaWilayah, deskripsiWilayah, judulWilayah, remahWilayah, ringkasWilayah, tetangga, wilayahDariSlug
} from '../lib/halaman-wilayah.js';
import { labelLevel } from '../lib/tempat.js';
import { useMetaHalaman } from '../lib/meta-halaman.js';
import { KartuImbauan } from '../components/Imbauan.jsx';
import { CATATAN_AI, DaftarBerita } from '../components/KartuBerita.jsx';
import Remah from '../components/Remah.jsx';
import TautanSitus from '../components/TautanSitus.jsx';

const MAKS_TEMPAT = 20;
const MAKS_BERITA = 3;

// Halaman wilayah (/wilayah/<provinsi>[/<kab-kota>], AGENTS.md 1.8 B): ringkasan agregat dari laporan warga untuk
// pencarian lokal. HTML statisnya dibuat saat build (lib/seo.js); halaman ini menggantinya dengan data terbaru.
// Tempat diurutkan menurut jumlah laporan, bukan menurut indikasi pungli (bukan daftar "terburuk").
export default function Wilayah() {
  const { provinsi, kabupaten } = useParams();
  const w = useMemo(() => wilayahDariSlug(provinsi, kabupaten ?? null), [provinsi, kabupaten]);
  const { daftar, statusData, pilihZona } = useApp();
  const navigate = useNavigate();
  const [barisImbauan, setBarisImbauan] = useState([]);
  const [berita, setBerita] = useState([]);

  useEffect(() => {
    if (!KONFIGURASI) return undefined;
    let batal = false;
    ambilView(fetch, KONFIGURASI, 'imbauan_publik', KOLOM_IMBAUAN)
      .then(b => { if (!batal) setBarisImbauan(b); })
      .catch(err => console.warn('[wilayah] imbauan gagal dimuat:', err.message));
    muatBerita()
      .then(b => { if (!batal) setBerita(b); })
      .catch(err => console.warn('[wilayah] berita gagal dimuat:', err.message));
    return () => { batal = true; };
  }, []);

  const r = useMemo(() => (w ? ringkasWilayah(daftar, w, barisImbauan) : null), [daftar, w, barisImbauan]);
  const beritaWilayah = useMemo(() => {
    if (!w) return [];
    const kab = new Set(w.jenis === 'kabupaten' ? [w.kode] : kabupatenDiProvinsi(w.kode));
    return berita.filter(b => (b.kabupaten ?? []).some(k => kab.has(k))
      || (w.jenis === 'provinsi' && (b.provinsi ?? []).includes(w.kode))).slice(0, MAKS_BERITA);
  }, [berita, w]);

  useMetaHalaman(r && statusData === 'siap'
    ? { judul: judulWilayah(w), deskripsi: deskripsiWilayah(r), jalur: w.jalur, indeks: r.indeks }
    : null);

  if (!w) {
    return (
      <div className="halaman halaman-wilayah">
        <div className="kosong">
          <strong>Wilayah tidak ditemukan.</strong>
          <span>JukirHub saat ini mencakup provinsi-provinsi di pulau Sulawesi.</span>
          <Link className="tombol-sekunder tombol-tautan" to="/daftar">Lihat daftar tempat</Link>
        </div>
      </div>
    );
  }

  const bukaPeta = () => {
    pilihZona(w.provinsi);
    navigate('/peta');
  };

  return (
    <div className="halaman halaman-wilayah">
      <Remah remah={remahWilayah(w)} />
      <section className="kepala-halaman">
        <h1>Parkir &amp; juru parkir di {w.nama}</h1>
        <p className="redup">{deskripsiWilayah(r)}</p>
      </section>

      {statusData === 'memuat' && <p className="redup memuat-blok" role="status">Memuat data wilayah…</p>}
      {statusData !== 'memuat' && (
        <>
          <dl className="angka-wilayah">
            {angkaWilayah(r).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>

          {r.imbauan && <KartuImbauan imbauan={r.imbauan} />}

          <section className="kartu" aria-labelledby="judul-tempat-wilayah">
            <h2 id="judul-tempat-wilayah">Tempat paling banyak dilaporkan</h2>
            {r.tempat.length > 0 ? (
              <ul className="daftar-sekitar">
                {r.tempat.slice(0, MAKS_TEMPAT).map(t => (
                  <li key={t.id}>
                    <Link to={jalurTempat(t)}>{t.nama}</Link>
                    <span className="redup kecil jarak-sekitar">
                      {t.ringkasan.jumlah} laporan{t.ringkasan.dataCukup ? ` · ${labelLevel(t.ringkasan)}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="redup">
                Belum ada tempat parkir yang dilaporkan di {w.nama}. Tempat muncul setelah warga melapor dari lokasi.
              </p>
            )}
          </section>

          {r.kabupaten ? (
            <section className="kartu" aria-labelledby="judul-kab">
              <h2 id="judul-kab">Kabupaten/kota</h2>
              {r.kabupaten.some(k => k.jumlahLaporan) && (
                <ul className="daftar-sekitar">
                  {r.kabupaten.filter(k => k.jumlahLaporan).map(k => (
                    <li key={k.wilayah.kode}>
                      <Link to={k.wilayah.jalur}>{k.wilayah.nama}</Link>
                      <span className="redup kecil jarak-sekitar">{k.jumlahTempat} tempat · {k.jumlahLaporan} laporan</span>
                    </li>
                  ))}
                </ul>
              )}
              {r.kabupaten.some(k => !k.jumlahLaporan) && (
                <>
                  <p className="redup kecil">Belum ada laporan:</p>
                  <p className="tautan-wilayah">
                    {r.kabupaten.filter(k => !k.jumlahLaporan).map(k => <Link key={k.wilayah.kode} to={k.wilayah.jalur}>{k.wilayah.nama}</Link>)}
                  </p>
                </>
              )}
            </section>
          ) : (
            <section className="kartu" aria-labelledby="judul-tetangga">
              <h2 id="judul-tetangga">Daerah lain di {remahWilayah(w)[0][0]}</h2>
              <p className="tautan-wilayah">
                {tetangga(w).map(x => <Link key={x.kode} to={x.jalur}>{x.nama}</Link>)}
              </p>
            </section>
          )}

          {beritaWilayah.length > 0 && (
            <section className="kartu" aria-labelledby="judul-berita-wilayah">
              <h2 id="judul-berita-wilayah">Berita parkir di {w.nama}</h2>
              <DaftarBerita berita={beritaWilayah} />
              <p className="redup kecil">{CATATAN_AI} <Link to="/berita">Semua berita parkir</Link></p>
            </section>
          )}
        </>
      )}

      <div className="aksi-beranda">
        <button type="button" className="tombol-sekunder" onClick={bukaPeta}>Buka peta</button>
        <Link className="tombol-sekunder tombol-tautan" to="/daftar">Daftar tempat</Link>
      </div>
      <TautanSitus />
      <p className="disclaimer">Laporan warga, belum diverifikasi pihak berwenang. Indikasi bukan tuduhan. {CATATAN_KAKI}</p>
    </div>
  );
}
