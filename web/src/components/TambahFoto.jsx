import { useEffect, useRef, useState } from 'react';
import {
  fotoTertundaSekarang, kecilkanFoto, lupakanFotoTertunda, pantauFotoTertunda, simpanFotoTertunda, umurDariFile, unggahFoto
} from '../lib/foto.js';
import { Ikon } from './Ikon.jsx';

const layarSentuh = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

// Foto bukti opsional setelah lapor: hanya dikirim ke pengelola (Telegram), tidak tampil di JukirHub, tanpa koin.
// `laporanId` null (laporan pura-pura diterima di server) → pura-pura terkirim tanpa mengunggah.
export default function TambahFoto({ laporanId, onTerkirim }) {
  const inputKamera = useRef(null);
  const inputGaleri = useRef(null);
  const [sentuh] = useState(layarSentuh);
  const [tahap, setTahap] = useState('awal');   // awal | proses | terkirim | selesai
  const [pesan, setPesan] = useState(null);

  // Simpan sebelum kamera terbuka: Android bisa menutup tab, lalu kartu ini dipasang lagi dari sessionStorage.
  const buka = (sumber) => {
    if (tahap === 'proses') return;
    if (sumber === 'kamera' && laporanId) simpanFotoTertunda(laporanId);
    (sumber === 'kamera' ? inputKamera : inputGaleri).current?.click();
  };

  const pilih = async (e, sumber) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setTahap('proses');
    setPesan(null);
    const foto = await kecilkanFoto(file);
    if (!foto) {
      setPesan('Foto tidak bisa dibaca. Coba foto lain.');
      setTahap('awal');
      return;
    }
    if (!laporanId) {
      await new Promise(ok => setTimeout(ok, 800));
      lupakanFotoTertunda();
      onTerkirim?.();
      setTahap('terkirim');
      return;
    }
    const r = await unggahFoto(laporanId, foto, { sumber, umurDetik: umurDariFile(file) });
    if (r.ok) {
      lupakanFotoTertunda();
      onTerkirim?.();
      setTahap('terkirim');
    } else {
      setPesan(r.pesan);
      const selesai = ['batas_harian', 'sudah_ada', 'bukan_milik'].includes(r.kode);
      if (selesai) lupakanFotoTertunda();
      setTahap(selesai ? 'selesai' : 'awal');
    }
  };

  if (tahap === 'terkirim') {
    return (
      <p className="tambah-foto-hasil" role="status">
        <Ikon nama="centang" ukuran={18} /> Foto bukti terkirim ke pengelola. Terima kasih.
      </p>
    );
  }

  const proses = tahap === 'proses';
  return (
    <section className="tambah-foto" aria-label="Foto bukti">
      {tahap !== 'selesai' && (
        <>
          {sentuh ? (
            <div className="baris-tombol">
              <button type="button" className="tombol-sekunder lebar-penuh tombol-foto" disabled={proses} onClick={() => buka('kamera')}>
                <Ikon nama="kamera" ukuran={20} />
                {proses ? 'Mengirim foto…' : 'Ambil foto'}
              </button>
              <button type="button" className="tombol-sekunder lebar-penuh tombol-foto" disabled={proses} onClick={() => buka('galeri')}>
                {proses ? 'Mengirim foto…' : 'Pilih dari galeri'}
              </button>
            </div>
          ) : (
            <button type="button" className="tombol-sekunder lebar-penuh tombol-foto" disabled={proses} onClick={() => buka('galeri')}>
              <Ikon nama="kamera" ukuran={20} />
              {proses ? 'Mengirim foto…' : 'Pilih foto'}
            </button>
          )}
          <input ref={inputKamera} type="file" accept="image/*" capture="environment" hidden tabIndex={-1} onChange={e => pilih(e, 'kamera')} />
          <input ref={inputGaleri} type="file" accept="image/*" hidden tabIndex={-1} onChange={e => pilih(e, 'galeri')} />
          <p className="redup kecil">
            Mis. karcis, papan tarif, atau tulisan "parkir gratis". Hanya dilihat pengelola, tidak ditampilkan di
            JukirHub. Jangan memotret wajah orang atau pelat nomor.
          </p>
        </>
      )}
      {pesan && <p className="kotak-galat" role="alert">{pesan}</p>}
    </section>
  );
}

// Setelah tab dimuat ulang: kartu yang sama, selama sessionStorage masih ≤ 30 menit.
export function KartuFotoTertunda({ diPeta = false }) {
  const [tertunda, setTertunda] = useState(() => fotoTertundaSekarang());
  const [terkirim, setTerkirim] = useState(false);
  const [tutup, setTutup] = useState(false);

  useEffect(() => pantauFotoTertunda((t) => {
    setTertunda(t);
    if (t) setTutup(false);
  }), []);

  const tutupKartu = () => {
    lupakanFotoTertunda();
    setTertunda(null);
    setTerkirim(false);
    setTutup(true);
  };

  if (tutup || (!tertunda && !terkirim)) return null;

  return (
    <div className={`foto-tertunda${diPeta ? ' di-peta' : ''}`} role="region" aria-label="Tambah foto bukti">
      <div className="foto-tertunda-kepala">
        <strong>{terkirim ? 'Foto bukti' : 'Tambah foto bukti'}</strong>
        <button type="button" className="tombol-ikon" aria-label="Tutup" onClick={tutupKartu}>
          <Ikon nama="silang" ukuran={18} />
        </button>
      </div>
      {terkirim
        ? <p className="tambah-foto-hasil" role="status"><Ikon nama="centang" ukuran={18} /> Foto bukti terkirim ke pengelola. Terima kasih.</p>
        : <TambahFoto laporanId={tertunda.laporanId} onTerkirim={() => setTerkirim(true)} />}
    </div>
  );
}
