import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { KENDARAAN, LABEL_KENDARAAN } from '@shared/konstanta.js';
import { useApp } from './state.jsx';
import Beranda from './pages/Beranda.jsx';
import { koneksiLambat, muatBagian, muatModulPeta, pramuatBagianSaatSenggang } from './lib/koneksi.js';
import { HALAMAN, SITUS } from './lib/konten-beranda.js';
import { svgLogoInline } from './lib/logo.js';
import { useTema } from './lib/tema.js';
import { cocokkanTempat } from './lib/tempat.js';
import { PROFIL_LOKASI } from './lib/lokasi.js';
import { Ikon } from './components/Ikon.jsx';
import CariTempat from './components/CariTempat.jsx';
import LembarTempat from './components/LembarTempat.jsx';
import { LegendaIndikasi } from './components/Legenda.jsx';

// Halaman & layar yang tidak dibutuhkan saat app dibuka dimuat terpisah (unduhan awal lebih kecil),
// lalu dipramuat saat perangkat senggang agar tetap tersedia offline (lib/koneksi.js).
const Daftar = lazy(muatBagian.daftar);
const Info = lazy(muatBagian.info);
const LaporLayar = lazy(muatBagian.lapor);

// Pustaka peta (MapLibre + worker + CSS) jauh lebih besar dari sisa app: dimuat terpisah saat tab Peta dibuka.
const muatKomponenPeta = () => lazy(muatModulPeta);

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

      {/* Laporan selalu dimulai dari tempat di peta (AGENTS.md 1.2): tombol ini membuka Peta + petunjuk memilih tempat.
          Di tab Peta sendiri tidak ditampilkan (tombolnya ada di lembar tempat); baris grid tetap ada, isinya kosong. */}
      <div className="wadah-aksi">
        {pathname !== '/peta' && (
          <div className="aksi">
            <button type="button" className="tombol-lapor" onClick={() => navigate('/peta', { state: { pilihTempat: true } })}>
              Laporkan parkir
            </button>
          </div>
        )}
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


// Gagal mengunduh bagian peta (mis. sinyal putus) → pesan + coba lagi, bukan layar kosong.
class BatasGalatPeta extends Component {
  constructor(props) {
    super(props);
    this.state = { galat: false };
  }

  static getDerivedStateFromError() {
    return { galat: true };
  }

  componentDidCatch(err) {
    console.warn('[peta] gagal dimuat:', err);
  }

  render() {
    if (!this.state.galat) return this.props.children;
    return (
      <div className="peta-pengganti" role="alert">
        <p><strong>Peta gagal dimuat.</strong></p>
        <p className="redup">Periksa koneksi Anda. Daftar tempat tetap bisa dipakai.</p>
        <div className="baris-tombol">
          <button type="button" className="tombol-utama" onClick={this.props.onCobaLagi}>Coba lagi</button>
          <button type="button" className="tombol-sekunder" onClick={this.props.onKeDaftar}>Lihat daftar tempat</button>
        </div>
      </div>
    );
  }
}

// Panel kiri bawah peta. "Arti warna" terbuka → panel hanya berisi legenda dengan judul + tombol ✕; tertutup lagi
// lewat ✕, Esc, atau ketukan di luar panel (mis. di peta). Ditutup sendiri saat tempat dipilih (panel dilepas).
function InfoPeta({ children }) {
  const [legenda, setLegenda] = useState(false);
  const panel = useRef(null);

  useEffect(() => {
    if (!legenda) return undefined;
    const luar = (e) => { if (!panel.current?.contains(e.target)) setLegenda(false); };
    const esc = (e) => { if (e.key === 'Escape') setLegenda(false); };
    document.addEventListener('pointerdown', luar);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', luar);
      document.removeEventListener('keydown', esc);
    };
  }, [legenda]);

  if (legenda) {
    return (
      <div className="info-peta legenda-peta" ref={panel} role="dialog" aria-labelledby="judul-legenda">
        <div className="kepala-legenda">
          <strong id="judul-legenda">Arti warna</strong>
          <button type="button" className="tombol-ikon" onClick={() => setLegenda(false)} aria-label="Tutup arti warna" autoFocus>
            <Ikon nama="silang" ukuran={18} />
          </button>
        </div>
        <LegendaIndikasi />
      </div>
    );
  }
  return (
    <div className="info-peta">
      {children}
      <button type="button" className="buka-legenda" aria-expanded="false" onClick={() => setLegenda(true)}>
        Arti warna <Ikon nama="bawah" ukuran={16} />
      </button>
    </div>
  );
}

// Pilihan "Muat peta" di koneksi lambat berlaku selama tab terbuka.
let petaDiizinkanSesiIni = false;

// Tab Peta (AGENTS.md 1.2): pilih tempat (ketuk nama tempat / cari / tekan lama) → lembar tempat.
function HalamanPeta() {
  const { daftar, statusData, muatUlang, mintaPosisi } = useApp();
  const lokasi = useLocation();
  const navigate = useNavigate();
  const [pilihanMentah, setPilihanMentah] = useState(null);
  const [fokus, setFokus] = useState(null);
  const [petunjuk, setPetunjuk] = useState(false);
  const [laporTempat, setLaporTempat] = useState(null);
  // Di koneksi sangat lambat peta ditanya dulu, kecuali datang untuk melihat satu tempat.
  const [muatPeta, setMuatPeta] = useState(
    () => petaDiizinkanSesiIni || !koneksiLambat() || lokasi.state?.fokusTempat != null
  );
  // React.lazy menyimpan kegagalan impor; percobaan ulang butuh instance baru.
  const [Peta, setPeta] = useState(() => muatKomponenPeta());
  const [kunciPeta, setKunciPeta] = useState(0);

  // Penanda diketuk → { id }; tempat di peta / hasil cari / pin → dicocokkan dulu dengan tempat terlapor (≤ 30 m).
  const pilihan = useMemo(() => {
    if (!pilihanMentah) return null;
    if (pilihanMentah.id != null) return daftar.find(t => t.id === pilihanMentah.id) ?? null;
    return cocokkanTempat(pilihanMentah, daftar) ?? pilihanMentah;
  }, [pilihanMentah, daftar]);

  const pilih = useCallback((p) => {
    setPilihanMentah(p);
    if (p) setPetunjuk(false);
  }, []);
  const pilihDanFokus = useCallback((p) => {
    pilih(p);
    setFokus({ lat: p.lat, lng: p.lng, kunci: Date.now() });
  }, [pilih]);
  const tutup = useCallback(() => setPilihanMentah(null), []);
  const tutupLapor = useCallback(() => setLaporTempat(null), []);
  // "Tidak ada di peta? Laporkan di lokasi saya": pin di posisi GPS pengguna (melapor memang wajib dari lokasi),
  // nama dari kolom cari. Tempat terlapor ≤ 30 m dengan nama mirip dipakai ulang. Galat lokasi tampil di peta.
  const [mencariLokasiLapor, setMencariLokasiLapor] = useState(false);
  const laporDiLokasi = useCallback(async (nama = '') => {
    setMencariLokasiLapor(true);
    try {
      const p = await mintaPosisi(PROFIL_LOKASI.lapor);
      const pin = { nama, lat: p.lat, lng: p.lng, osm_ref: null, sumber: 'pin' };
      const sama = nama ? cocokkanTempat(pin, daftar) : null;
      setPetunjuk(false);
      setPilihanMentah(sama ? { id: sama.id } : pin);
      setFokus({ lat: p.lat, lng: p.lng, kunci: Date.now() });
      setLaporTempat(sama ?? pin);
    } catch { /* pesan lokasi tampil di peta */ } finally {
      setMencariLokasiLapor(false);
    }
  }, [mintaPosisi, daftar]);
  // Laporan terkirim: ambil ringkasan terbaru, lalu tampilkan tempat itu (penanda baru / warna berubah).
  const selesaiLapor = useCallback(async (titik) => {
    setLaporTempat(null);
    await muatUlang();
    if (titik?.id != null) setPilihanMentah({ id: titik.id });
  }, [muatUlang]);

  // Datang dari Daftar/Beranda ({ fokusTempat }) atau tombol "Laporkan parkir" ({ pilihTempat }).
  // Tangani sekali, lalu bersihkan state agar tombol Kembali tidak memicu ulang.
  useEffect(() => {
    const s = lokasi.state;
    if (!s) return;
    if (s.fokusTempat != null) {
      const t = daftar.find(x => x.id === s.fokusTempat);
      if (!t) return;   // tunggu data termuat
      pilihDanFokus({ id: t.id, lat: t.lat, lng: t.lng });
    } else if (s.pilihTempat) {
      setPilihanMentah(null);
      setPetunjuk(true);
      mintaPosisi().catch(() => { /* pesan lokasi tampil di peta */ });
    }
    navigate(lokasi.pathname, { replace: true, state: null });
  }, [lokasi.state, lokasi.pathname, navigate, daftar, pilihDanFokus, mintaPosisi]);

  return (
    <>
      <h1 className="judul-tersembunyi">{HALAMAN['/peta'].h1}</h1>
      {muatPeta ? (
        <BatasGalatPeta key={kunciPeta} onKeDaftar={() => navigate('/daftar')}
          onCobaLagi={() => { setPeta(() => muatKomponenPeta()); setKunciPeta(k => k + 1); }}>
          <Suspense fallback={<div className="peta-pengganti" role="status"><p>Memuat peta…</p></div>}>
            <Peta pilihan={pilihan} onPilih={pilih} fokus={fokus}
              petunjukPilih={petunjuk} onTutupPetunjuk={() => setPetunjuk(false)} />
          </Suspense>
        </BatasGalatPeta>
      ) : (
        <div className="peta-pengganti" role="region" aria-label="Peta belum dimuat">
          <p><strong>Koneksi lambat atau mode hemat data terdeteksi.</strong></p>
          <p className="redup">Peta butuh unduhan cukup besar. Daftar tempat lebih ringan.</p>
          <div className="baris-tombol">
            <button type="button" className="tombol-utama" onClick={() => { petaDiizinkanSesiIni = true; setMuatPeta(true); }}>
              Muat peta
            </button>
            <button type="button" className="tombol-sekunder" onClick={() => navigate('/daftar')}>Lihat daftar tempat</button>
          </div>
        </div>
      )}

      <CariTempat onPilih={pilihDanFokus} onLaporDiLokasi={laporDiLokasi} />

      {!pilihan && (
        <InfoPeta>
          {statusData === 'memuat' && <span>Memuat data…</span>}
          {statusData === 'galat' && (
            <span className="galat">
              Data belum bisa dimuat. <button type="button" className="tautan" onClick={muatUlang}>Coba lagi</button>
            </span>
          )}
          {statusData === 'siap' && (
            <span className="ringkas-peta">
              {daftar.length ? `${daftar.length} tempat sudah dilaporkan` : 'Belum ada tempat yang dilaporkan'}
            </span>
          )}
          <button type="button" className="tautan tautan-kiri" onClick={() => laporDiLokasi('')} disabled={mencariLokasiLapor}>
            {mencariLokasiLapor ? 'Mencari lokasi Anda…' : 'Tempat tidak ada di peta? Laporkan di lokasi saya'}
          </button>
          <span className="kecil redup">atau tekan lama di peta</span>
        </InfoPeta>
      )}

      <LembarTempat tempat={laporTempat ? null : pilihan} onTutup={tutup} onLapor={setLaporTempat} />
      {laporTempat && (
        <BatasGalatMuat>
          <Suspense fallback={<div className="lapor" role="status"><p className="redup lapor-memuat">Membuka form lapor…</p></div>}>
            <LaporLayar tempat={laporTempat} onTutup={tutupLapor} onSelesai={selesaiLapor} />
          </Suspense>
        </BatasGalatMuat>
      )}
    </>
  );
}
