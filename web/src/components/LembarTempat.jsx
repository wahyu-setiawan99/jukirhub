import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../state.jsx';
import { formatJarak, jarakM } from '../lib/util.js';
import { jalurTempat } from '../lib/halaman-tempat.js';
import RingkasanTempat from './RingkasanTempat.jsx';
import Riwayat from './Riwayat.jsx';
import { Ikon } from './Ikon.jsx';

// Lembar tempat di tab Peta (AGENTS.md 1.2 poin 2): setengah layar supaya peta tetap terlihat.
// `tempat` = tempat terlapor ({ id, …, ringkasan }) atau tempat yang baru diketuk/dicari/dipin ({ nama, lat, lng }).
export default function LembarTempat({ tempat, onTutup, onLapor }) {
  const { posisi, kendaraan } = useApp();
  const wadah = useRef(null);
  const judul = useRef(null);
  const kunci = tempat ? `${tempat.id ?? ''}|${tempat.lat}|${tempat.lng}` : null;

  // Tempat lain dipilih: mulai dari atas, fokus ke nama tempat.
  useEffect(() => {
    if (!kunci) return;
    if (wadah.current) wadah.current.scrollTop = 0;
    judul.current?.focus({ preventScroll: true });
  }, [kunci]);

  useEffect(() => {
    if (!kunci) return;
    const tekan = (e) => { if (e.key === 'Escape') onTutup(); };
    window.addEventListener('keydown', tekan);
    return () => window.removeEventListener('keydown', tekan);
  }, [kunci, onTutup]);

  if (!tempat) return null;

  const r = tempat.ringkasan;
  const terlapor = tempat.id != null && r?.jumlah > 0;
  const nama = tempat.nama || 'Tempat tanpa nama di peta';
  const jarak = posisi ? formatJarak(jarakM(posisi, tempat)) : null;
  // Tautan universal Google Maps: membuka aplikasi peta di HP, tanpa API key.
  const urlArah = `https://www.google.com/maps/dir/?api=1&destination=${tempat.lat},${tempat.lng}`;

  return (
    <section ref={wadah} className="lembar lembar-peta" role="dialog" aria-labelledby="lembar-judul">
      <div className="lembar-kepala">
        <div>
          <h2 id="lembar-judul" ref={judul} tabIndex={-1}>{nama}</h2>
          <p className="redup">
            {[tempat.alamat || tempat.kota, jarak ? `${jarak} dari Anda` : null].filter(Boolean).join(' · ') ||
              (tempat.sumber === 'pin' ? 'Titik yang Anda tandai di peta' : 'Dari peta OpenStreetMap')}
          </p>
        </div>
        <button type="button" className="tombol-ikon" onClick={onTutup} aria-label="Tutup">
          <Ikon nama="silang" ukuran={18} />
        </button>
      </div>

      {/* Aksi tepat di bawah nama (pola lembar SPBU Adami): tetap terlihat tanpa gulir di HP 360×640. */}
      <div className="aksi-lembar">
        <button type="button" className="tombol-aksi utama" onClick={() => onLapor(tempat)}>
          Laporkan parkir
        </button>
        <a className="tombol-aksi" href={urlArah} target="_blank" rel="noopener noreferrer">Petunjuk arah</a>
      </div>

      {terlapor ? (
        <RingkasanTempat r={r} kendaraan={kendaraan} />
      ) : (
        <p className="ajakan">Belum ada laporan parkir di sini. Jadilah yang pertama melapor.</p>
      )}

      {terlapor && <Riwayat titikId={tempat.id} />}
      {terlapor && <Link className="tautan tautan-kiri" to={jalurTempat(tempat)}>Buka halaman tempat ini (untuk dibagikan)</Link>}

      <p className="disclaimer">Laporan warga, belum diverifikasi pihak berwenang. Indikasi bukan tuduhan.</p>
    </section>
  );
}
