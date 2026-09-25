import { Component, Suspense, lazy, useEffect } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { KENDARAAN, LABEL_KENDARAAN } from '@shared/konstanta.js';
import { useApp } from './state.jsx';
import Beranda from './pages/Beranda.jsx';
import { muatBagian, pramuatBagianSaatSenggang } from './lib/koneksi.js';
import { HALAMAN, SITUS } from './lib/konten-beranda.js';
import { svgLogoInline } from './lib/logo.js';
import { useTema } from './lib/tema.js';
import { Ikon } from './components/Ikon.jsx';

// Halaman & layar yang tidak dibutuhkan saat app dibuka dimuat terpisah (unduhan awal lebih kecil),
// lalu dipramuat saat perangkat senggang agar tetap tersedia offline (lib/koneksi.js).
const Daftar = lazy(muatBagian.daftar);
const Info = lazy(muatBagian.info);

// Teks statis dari lib/logo.js (bukan masukan pengguna), aman ditempel sebagai SVG.
const LOGO_HEADER = svgLogoInline(28);

const URL_SITUS = (import.meta.env.VITE_SITE_URL || SITUS.urlBawaan).replace(/\/+$/, '');

const MENU_BAWAH = [
  ['/', 'Beranda', 'rumah'],
  ['/peta', 'Peta', 'peta'],
  ['/daftar', 'Daftar', 'daftar'],
  ['/info', 'Info', 'info']
];

export default function App() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const h = HALAMAN[pathname];
    document.title = h?.judul ?? SITUS.nama;
    // Selaras dengan HTML statis per halaman: deskripsi, canonical, og:url ikut berganti saat berpindah halaman.
    if (h) {
      const url = `${URL_SITUS}${pathname === '/' ? '/' : pathname}`;
      document.querySelector('meta[name="description"]')?.setAttribute('content', h.deskripsi);
      document.querySelector('link[rel="canonical"]')?.setAttribute('href', url);
      document.querySelector('meta[property="og:url"]')?.setAttribute('content', url);
    }
  }, [pathname]);

  useEffect(() => pramuatBagianSaatSenggang(), []);

  return (
    <div className="app">
      <header className="atas">
        <Link to="/" className="merek" aria-label={`${SITUS.nama}, ke Beranda`}>
          <span className="logo" dangerouslySetInnerHTML={{ __html: LOGO_HEADER }} />
          <span>{SITUS.nama}</span>
        </Link>
        <div className="atas-kanan">
          <PilihKendaraan />
          <TombolTema />
        </div>
      </header>

      {/* Selalu dirender (baris grid tetap), isinya kosong saat online. */}
      <div className="wadah-banner">
        <BannerOffline />
      </div>

      <main className="isi">
        <BatasGalatMuat key={pathname}>
          <Suspense fallback={<div className="halaman" role="status"><p className="redup">Memuat…</p></div>}>
            <Routes>
              <Route path="/" element={<Beranda />} />
              <Route path="/peta" element={<HalamanPeta />} />
              <Route path="/daftar" element={<Daftar />} />
              <Route path="/info" element={<Info />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BatasGalatMuat>
      </main>

      {/* Laporan selalu dimulai dari tempat di peta (AGENTS.md 1.2): tombol ini membuka Peta + petunjuk memilih tempat. */}
      <div className="aksi">
        <button type="button" className="tombol-lapor" onClick={() => navigate('/peta', { state: { pilihTempat: true } })}>
          Laporkan parkir
        </button>
      </div>

      <nav className="bawah" aria-label="Navigasi utama">
        {/* Ikon + label teks (ikon saja sulit ditebak pengguna baru dan pembaca layar). */}
        {MENU_BAWAH.map(([ke, label, ikon]) => (
          <NavLink key={ke} to={ke} end={ke === '/'}>
            <Ikon nama={ikon} ukuran={22} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function BannerOffline() {
  const { offline } = useApp();
  if (!offline) return null;
  return (
    <p className="banner-offline" role="status">
      <strong>Offline</strong> · data terbaru belum bisa dimuat. Periksa sinyal Anda.
    </p>
  );
}

// Ganti tema (gelap bawaan / terang): ikon menunjukkan tema tujuan, pilihan diingat di HP (lib/tema.js).
function TombolTema() {
  const [tema, pasangTema] = useTema();
  const keTerang = tema === 'gelap';
  const label = keTerang ? 'Ganti ke tema terang' : 'Ganti ke tema gelap';
  return (
    <button type="button" className="tombol-tema" aria-label={label} title={label}
      onClick={() => pasangTema(keTerang ? 'terang' : 'gelap')}>
      <Ikon nama={keTerang ? 'matahari' : 'bulan'} ukuran={20} />
    </button>
  );
}

// Motor / Mobil: menentukan tarif yang ditampilkan di seluruh app (pengganti Pertalite/Solar di Adami).
function PilihKendaraan() {
  const { kendaraan, setKendaraan } = useApp();
  return (
    <div className="pilih-kendaraan" role="radiogroup" aria-label="Jenis kendaraan">
      {KENDARAAN.map(k => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={kendaraan === k}
          className={kendaraan === k ? 'aktif' : ''}
          onClick={() => setKendaraan(k)}
        >
          {LABEL_KENDARAAN[k]}
        </button>
      ))}
    </div>
  );
}

// Gagal mengunduh halaman/layar yang dimuat terpisah (mis. sinyal putus sebelum sempat tersimpan).
class BatasGalatMuat extends Component {
  constructor(props) {
    super(props);
    this.state = { galat: false };
  }

  static getDerivedStateFromError() {
    return { galat: true };
  }

  componentDidCatch(err) {
    console.warn('[app] bagian gagal dimuat:', err);
  }

  render() {
    if (!this.state.galat) return this.props.children;
    return (
      <div className="halaman">
        <div className="kotak-galat" role="alert">
          <p><strong>Bagian ini gagal dimuat.</strong></p>
          <p>Periksa koneksi Anda, lalu muat ulang.</p>
          <button type="button" className="tombol-utama" onClick={() => window.location.reload()}>Muat ulang</button>
        </div>
      </div>
    );
  }
}

// Peta MapLibre (dimuat belakangan), cari tempat, dan lembar tempat dibuat di M1 (AGENTS.md 1.2).
// Sementara: pengganti yang jujur. Datang dari tombol "Laporkan parkir" → tampilkan petunjuk memilih tempat.
function HalamanPeta() {
  const navigate = useNavigate();
  const { state } = useLocation();
  return (
    <>
      <h1 className="judul-tersembunyi">{HALAMAN['/peta'].h1}</h1>
      <div className="peta-pengganti" role="region" aria-label="Peta belum tersedia">
        <Ikon nama="peta" ukuran={32} />
        {state?.pilihTempat && (
          <p className="kotak-info" role="status">Ketuk tempat Anda parkir di peta, lalu tekan Laporkan parkir.</p>
        )}
        <p><strong>Peta tempat parkir sedang disiapkan.</strong></p>
        <p className="redup">
          Nanti Anda bisa mengetuk tempat di peta atau mencari namanya untuk melihat laporan parkir dan melapor.
          Tempat yang sudah dilaporkan diberi warna indikasi pungli.
        </p>
        <div className="baris-tombol">
          <button type="button" className="tombol-sekunder" onClick={() => navigate('/info')}>Arti tanda di peta</button>
        </div>
      </div>
    </>
  );
}
