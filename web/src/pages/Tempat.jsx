import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../state.jsx';
import { CATATAN_KAKI, SITUS } from '../lib/konten-beranda.js';
import { deskripsiTempat, idDariJalur, jalurTempat, judulTempat, layakIndeks } from '../lib/halaman-tempat.js';
import { jarakM } from '../lib/util.js';
import RingkasanTempat from '../components/RingkasanTempat.jsx';
import Riwayat from '../components/Riwayat.jsx';
import TautanSitus from '../components/TautanSitus.jsx';

const URL_SITUS = (import.meta.env.VITE_SITE_URL || SITUS.urlBawaan).replace(/\/+$/, '');
const FORMAT_TANGGAL = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Makassar' });

// Halaman satu tempat (/tempat/<slug>-<id>, permintaan pemilik 1 Okt 2026): ringkasan & riwayat yang sama dengan
// lembar tempat di peta, untuk mesin pencari dan dibagikan. HTML statisnya dibuat saat build (lib/seo.js); halaman ini
// menggantinya dengan data terbaru. Tempat dengan < 3 laporan: noindex (halaman tipis).
export default function Tempat() {
  const { slug } = useParams();
  const { daftar, statusData, kendaraan } = useApp();
  const navigate = useNavigate();
  const id = idDariJalur(slug);
  const t = useMemo(() => daftar.find(x => x.id === id) ?? null, [daftar, id]);

  // Tempat lain terdekat (≤ 5): tautan antarhalaman untuk pengunjung & mesin pencari.
  const sekitar = useMemo(() => (t
    ? daftar.filter(x => x.id !== t.id).map(x => ({ ...x, jarak: jarakM(t, x) })).sort((a, b) => a.jarak - b.jarak).slice(0, 5)
    : []), [daftar, t]);

  useMetaTempat(t);

  if (!t) {
    return (
      <div className="halaman halaman-tempat">
        {statusData === 'memuat'
          ? <p className="redup memuat-blok" role="status">Memuat tempat…</p>
          : (
            <div className="kosong">
              <strong>Tempat tidak ditemukan.</strong>
              <span>Tempat ini mungkin sudah disembunyikan atau alamatnya salah.</span>
              <Link className="tombol-sekunder tombol-tautan" to="/peta">Buka peta</Link>
            </div>
          )}
      </div>
    );
  }

  const urlArah = `https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lng}`;
  return (
    <div className="halaman halaman-tempat">
      <section className="kepala-halaman">
        <h1>Parkir di {t.nama}</h1>
        <p className="redup">
          {[t.kota, `${t.ringkasan.jumlah} laporan warga`,
            t.ringkasan.terakhir ? `terakhir ${FORMAT_TANGGAL.format(Date.parse(t.ringkasan.terakhir))}` : null]
            .filter(Boolean).join(' · ')}
        </p>
      </section>

      <div className="aksi-lembar">
        <button type="button" className="tombol-aksi utama" onClick={() => navigate('/peta', { state: { fokusTempat: t.id } })}>
          Lihat di peta
        </button>
        <a className="tombol-aksi" href={urlArah} target="_blank" rel="noopener noreferrer">Petunjuk arah</a>
      </div>

      <section className="kartu">
        <RingkasanTempat r={t.ringkasan} kendaraan={kendaraan} />
      </section>

      <section className="kartu">
        <Riwayat titikId={t.id} />
      </section>

      {sekitar.length > 0 && (
        <section className="kartu" aria-labelledby="judul-sekitar">
          <h2 id="judul-sekitar">Tempat parkir lain di sekitar</h2>
          <ul className="daftar-sekitar">
            {sekitar.map(x => (
              <li key={x.id}><Link to={jalurTempat(x)}>{x.nama}</Link><span className="redup kecil jarak-sekitar">{(Math.round(x.jarak / 100) / 10).toLocaleString('id-ID')} km</span></li>
            ))}
          </ul>
        </section>
      )}

      <TautanSitus />
      <p className="disclaimer">Laporan warga, belum diverifikasi pihak berwenang. Indikasi bukan tuduhan. {CATATAN_KAKI}</p>
    </div>
  );
}

// Judul, deskripsi, canonical, dan robots mengikuti tempat yang dibuka (sama dengan HTML statis).
function useMetaTempat(t) {
  useEffect(() => {
    if (!t) return undefined;
    const set = (sel, attr, nilai) => document.querySelector(sel)?.setAttribute(attr, nilai);
    const url = `${URL_SITUS}${jalurTempat(t)}`;
    document.title = judulTempat(t);
    set('meta[name="description"]', 'content', deskripsiTempat(t));
    set('link[rel="canonical"]', 'href', url);
    set('meta[property="og:url"]', 'content', url);
    const robots = document.querySelector('meta[name="robots"]');
    const lama = robots?.getAttribute('content');
    if (!layakIndeks(t)) robots?.setAttribute('content', 'noindex, follow');
    return () => { if (robots && lama) robots.setAttribute('content', lama); };
  }, [t]);
}
