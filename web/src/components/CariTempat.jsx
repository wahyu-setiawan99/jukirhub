import { useMemo, useRef, useState } from 'react';
import { useApp } from '../state.jsx';
import { buatPencari } from '../lib/cari.js';
import { cariLokal, kodeLevel, labelLevel } from '../lib/tempat.js';
import { Ikon } from './Ikon.jsx';

// Satu pencari per app: simpanan hasil & jeda 1 detik berlaku untuk semua pencarian (aturan Nominatim).
const cariNominatim = buatPencari((...a) => fetch(...a));

// Kolom cari di atas peta (AGENTS.md 1.2 poin 1): tempat terlapor dicari langsung saat mengetik (lokal),
// tempat lain di Nominatim OpenStreetMap hanya saat menekan Cari.
export default function CariTempat({ onPilih }) {
  const { daftar } = useApp();
  const [kueri, setKueri] = useState('');
  const [terbuka, setTerbuka] = useState(false);
  const [osm, setOsm] = useState({ status: 'diam', hasil: [], kueri: '' });   // diam | mencari | siap | galat
  const input = useRef(null);

  const lokal = useMemo(() => cariLokal(daftar, kueri), [daftar, kueri]);

  const kirim = async (e) => {
    e.preventDefault();
    const k = kueri.trim();
    setTerbuka(true);
    if (k.length < 3) return;
    setOsm({ status: 'mencari', hasil: [], kueri: k });
    try {
      const hasil = await cariNominatim(k);
      setOsm(o => (o.kueri === k ? { status: 'siap', hasil, kueri: k } : o));
    } catch (err) {
      console.warn('[cari] gagal:', err.message);
      setOsm(o => (o.kueri === k ? { status: 'galat', hasil: [], kueri: k } : o));
    }
  };

  const pilih = (tempat) => {
    setTerbuka(false);
    input.current?.blur();
    onPilih(tempat);
  };

  const tampil = terbuka && kueri.trim().length >= 2;
  const osmBerlaku = osm.kueri === kueri.trim();

  return (
    <div className="cari-peta">
      <form className="baris-cari" role="search" onSubmit={kirim}>
        <input
          ref={input}
          type="search"
          value={kueri}
          onChange={(e) => { setKueri(e.target.value); setTerbuka(true); }}
          onFocus={() => setTerbuka(true)}
          onKeyDown={(e) => { if (e.key === 'Escape') setTerbuka(false); }}
          placeholder="Cari nama tempat, mis. Indomaret Perintis"
          aria-label="Cari nama tempat"
          enterKeyHint="search"
          maxLength={80}
        />
        <button type="submit" className="tombol-cari" aria-label="Cari">
          <Ikon nama="cari" ukuran={20} />
        </button>
      </form>

      {tampil && (
        <div className="hasil-cari" role="region" aria-label="Hasil pencarian">
          {lokal.length > 0 && (
            <>
              <p className="kepala-hasil">Sudah dilaporkan</p>
              <ul>
                {lokal.map(t => (
                  <li key={`l${t.id}`}>
                    <button type="button" onClick={() => pilih(t)}>
                      <strong>{t.nama}</strong>
                      <span className="redup">{labelLevel(t.ringkasan)}</span>
                      <span className={`titik-warna indikasi-${kodeLevel(t.ringkasan)}`} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {osmBerlaku && osm.status === 'mencari' && <p className="redup pesan-hasil">Mencari di OpenStreetMap…</p>}
          {osmBerlaku && osm.status === 'galat' && (
            <p className="pesan-hasil">Pencarian gagal. Periksa sinyal, lalu tekan Cari lagi.</p>
          )}
          {osmBerlaku && osm.status === 'siap' && (osm.hasil.length > 0 ? (
            <>
              <p className="kepala-hasil">Tempat di peta</p>
              <ul>
                {osm.hasil.map(h => (
                  <li key={h.osm_ref ?? `${h.lat},${h.lng}`}>
                    <button type="button" onClick={() => pilih({ ...h, sumber: 'cari' })}>
                      <strong>{h.nama}</strong>
                      {h.alamat && <span className="redup">{h.alamat}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="redup pesan-hasil">Tidak ditemukan di Makassar Raya. Coba nama lain, atau tekan lama di peta.</p>
          ))}
          {!osmBerlaku && osm.status !== 'mencari' && kueri.trim().length >= 3 && (
            <p className="redup pesan-hasil">Tekan Cari untuk mencari tempat lain di peta.</p>
          )}
          <p className="kecil redup atribusi-cari">Pencarian: Nominatim © kontributor OpenStreetMap</p>
        </div>
      )}
    </div>
  );
}
