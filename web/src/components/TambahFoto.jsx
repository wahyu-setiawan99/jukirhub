import { useRef, useState } from 'react';
import { kecilkanFoto, unggahFoto } from '../lib/foto.js';
import { Ikon } from './Ikon.jsx';

// Foto bukti opsional setelah lapor: hanya dikirim ke pengelola (Telegram), tidak tampil di JukirHub, tanpa koin.
// `laporanId` null (laporan pura-pura diterima di server) → pura-pura terkirim tanpa mengunggah.
export default function TambahFoto({ laporanId }) {
  const input = useRef(null);
  const [tahap, setTahap] = useState('awal');   // awal | proses | terkirim | selesai
  const [pesan, setPesan] = useState(null);

  const pilih = async (e) => {
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
      setTahap('terkirim');
      return;
    }
    const r = await unggahFoto(laporanId, foto);
    if (r.ok) setTahap('terkirim');
    else {
      setPesan(r.pesan);
      setTahap(['batas_harian', 'sudah_ada', 'bukan_milik'].includes(r.kode) ? 'selesai' : 'awal');
    }
  };

  if (tahap === 'terkirim') {
    return (
      <p className="tambah-foto-hasil" role="status">
        <Ikon nama="centang" ukuran={18} /> Foto bukti terkirim ke pengelola. Terima kasih.
      </p>
    );
  }

  return (
    <section className="tambah-foto" aria-label="Foto bukti">
      {tahap !== 'selesai' && (
        <>
          <button type="button" className="tombol-sekunder lebar-penuh tombol-foto" disabled={tahap === 'proses'}
            onClick={() => input.current?.click()}>
            <Ikon nama="kamera" ukuran={20} />
            {tahap === 'proses' ? 'Mengirim foto…' : 'Tambah foto bukti (opsional)'}
          </button>
          <input ref={input} type="file" accept="image/*" hidden onChange={pilih} />
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
