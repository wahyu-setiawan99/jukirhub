import {
  jumlahAdaJukir, kalimatBantu, kalimatTanpaJukir, kodeLevel, labelLevel, teksBintang, teksTarif
} from '../lib/tempat.js';
import { LencanaIndikasi } from './Legenda.jsx';

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

// Ringkasan laporan satu tempat: dipakai lembar tempat di peta dan halaman /tempat/… (sama persis).
export default function RingkasanTempat({ r, kendaraan }) {
  const tarif = teksTarif(r, kendaraan);
  const bintang = teksBintang(r);
  return (
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
  );
}
