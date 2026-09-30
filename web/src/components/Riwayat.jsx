import { useEffect, useState } from 'react';
import { KONFIGURASI } from '../state.jsx';
import { ambilRiwayat } from '../lib/data.js';
import { ringkasBaris } from '../lib/riwayat.js';
import { kunciPerangkat, panggilFungsi } from '../lib/fungsi.js';

const PER_HALAMAN = 10;

// Riwayat laporan di lembar tempat (M4, AGENTS.md 1.3.1): 10 terbaru + "Tampilkan lebih banyak". Penulis selalu
// "Warga"; komentar hanya yang sudah disetujui pemilik, dengan tombol "Laporkan komentar".
export default function Riwayat({ titikId }) {
  const [data, setData] = useState({ status: 'memuat', baris: [], adaLagi: false });
  const [aduan, setAduan] = useState({});   // komentar_id → 'mengirim' | pesan

  const muat = async (offset) => {
    if (!KONFIGURASI) return setData({ status: 'siap', baris: [], adaLagi: false });
    try {
      const h = await ambilRiwayat(fetch, KONFIGURASI, titikId, { offset, batas: PER_HALAMAN });
      setData(d => ({ status: 'siap', baris: offset ? [...d.baris, ...h.baris] : h.baris, adaLagi: h.adaLagi }));
    } catch (err) {
      console.warn('[riwayat] gagal memuat:', err.message);
      setData(d => ({ ...d, status: 'galat' }));
    }
  };

  useEffect(() => {
    setData({ status: 'memuat', baris: [], adaLagi: false });
    setAduan({});
    muat(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titikId]);

  const adukan = async (idKomentar) => {
    setAduan(a => ({ ...a, [idKomentar]: 'mengirim' }));
    const h = await panggilFungsi(fetch, KONFIGURASI, 'aduan', { komentar_id: idKomentar, perangkat: kunciPerangkat() });
    setAduan(a => ({ ...a, [idKomentar]: h.ok ? h.data.pesan : h.pesan }));
  };

  return (
    <section className="riwayat" aria-labelledby="judul-riwayat">
      <h3 id="judul-riwayat">Riwayat laporan</h3>
      {data.status === 'memuat' && <p className="redup">Memuat riwayat…</p>}
      {data.status === 'galat' && !data.baris.length && (
        <p className="redup">Riwayat belum bisa dimuat. <button type="button" className="tautan" onClick={() => muat(0)}>Coba lagi</button></p>
      )}
      {data.status === 'siap' && !data.baris.length && <p className="redup">Belum ada laporan.</p>}
      <ul className="daftar-riwayat">
        {data.baris.map(r => {
          const b = ringkasBaris(r);
          return (
            <li key={r.id}>
              <p className="riwayat-kepala">
                <strong>{b.judul}</strong>
                <span className="redup"> · Warga · {b.waktu}</span>
                {b.bintang && <span className="bintang" aria-label={`${b.bintang} bintang`}> {'★'.repeat(b.bintang)}</span>}
              </p>
              {b.rincian.length > 0 && <p className="riwayat-rincian">{b.rincian.join(' · ')}</p>}
              {b.indikasi.length > 0 && <p className="riwayat-indikasi">{b.indikasi.join(' · ')}</p>}
              {b.komentar && (
                <div className="riwayat-komentar">
                  <p>“{b.komentar}”</p>
                  {aduan[r.komentar_id]
                    ? <p className="kecil redup" role="status">{aduan[r.komentar_id] === 'mengirim' ? 'Mengirim…' : aduan[r.komentar_id]}</p>
                    : <button type="button" className="tautan tautan-kecil-aduan" onClick={() => adukan(r.komentar_id)}>Laporkan komentar</button>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {data.adaLagi && (
        <button type="button" className="tombol-sekunder lebar-penuh" onClick={() => muat(data.baris.length)}>
          Tampilkan lebih banyak
        </button>
      )}
    </section>
  );
}
