import { useEffect, useRef } from 'react';
import { useApp } from '../state.jsx';
import { formatJarak, jarakM } from '../lib/util.js';
import {
  jumlahAdaJukir, kalimatBantu, kalimatTanpaJukir, kodeLevel, labelLevel, teksBintang, teksTarif
} from '../lib/tempat.js';
import { LencanaIndikasi } from './Legenda.jsx';
import Riwayat from './Riwayat.jsx';
import { Ikon } from './Ikon.jsx';

// Indeks pungli 0–100 + bilah 10 ruas (tampilan Radar). Angka dari ringkasan server, bukan tuduhan.
function IndeksPungli({ nilai, level }) {
  const isi = Math.round(nilai / 10);
  return (
    <div className={`indeks-pungli indikasi-${level}`} role="img" aria-label={`Indeks indikasi pungli ${nilai} dari 100`}>
      <p><span className="angka indeks-angka">{nilai}</span><span className="label-data"> /100 indeks indikasi pungli</span></p>
      <div className="ruas" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => <span key={i} className={i < isi ? 'isi' : ''} />)}
      </div>
    </div>
  );
}

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
  const tarif = terlapor ? teksTarif(r, kendaraan) : null;
  const bintang = terlapor ? teksBintang(r) : null;

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
        <div className="ringkas-tempat">
          <p><LencanaIndikasi level={kodeLevel(r)} label={labelLevel(r)} /></p>
          {r.indeks != null && <IndeksPungli nilai={r.indeks} level={kodeLevel(r)} />}
          {kalimatTanpaJukir(r) && <p>{kalimatTanpaJukir(r)}</p>}
          {r.alasan && <p>{r.alasan}</p>}
          {/* Ringkasan jukir hanya dari laporan yang ada jukirnya. */}
          {jumlahAdaJukir(r) > 0 && (
            <dl className="baris-ringkas">
              <dt>Saat datang</dt><dd>{kalimatBantu(r.bantuDatangYa, jumlahAdaJukir(r))}</dd>
              <dt>Saat pergi</dt><dd>{kalimatBantu(r.bantuPergiYa, jumlahAdaJukir(r))}</dd>
              <dt>Biasa dibayar</dt><dd>{tarif ?? `belum ada laporan ${kendaraan}`}</dd>
              {bintang && <><dt>Rating</dt><dd><span className="bintang" aria-hidden="true">★</span> {bintang}</dd></>}
            </dl>
          )}
        </div>
      ) : (
        <p className="ajakan">Belum ada laporan parkir di sini. Jadilah yang pertama melapor.</p>
      )}

      {terlapor && <Riwayat titikId={tempat.id} />}

      <p className="disclaimer">Laporan warga, belum diverifikasi pihak berwenang. Indikasi bukan tuduhan.</p>
    </section>
  );
}
