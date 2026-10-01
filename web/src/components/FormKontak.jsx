import { useState } from 'react';
import { BATAS_KONTAK, validasiKontak } from '@shared/kontak.js';
import { KONFIGURASI } from '../state.jsx';
import { panggilFungsi } from '../lib/fungsi.js';

// Formulir kontak: pesan diteruskan ke Telegram pengelola (Edge Function `kontak`), tanpa akun. Kolom `situs`
// tersembunyi = jebakan bot. Pesan galat sama dengan server (_shared/kontak.js).
export default function FormKontak() {
  const [isian, setIsian] = useState({ pesan: '', email: '', situs: '' });
  const [kirim, setKirim] = useState({ status: 'awal', pesan: null });   // awal | mengirim | terkirim | galat

  const ubah = (k) => (e) => setIsian(i => ({ ...i, [k]: e.target.value }));
  const kirimPesan = async (e) => {
    e.preventDefault();
    const cek = validasiKontak(isian);
    if (!cek.ok) { setKirim({ status: 'galat', pesan: cek.pesan }); return; }
    setKirim({ status: 'mengirim', pesan: null });
    const h = await panggilFungsi(fetch, KONFIGURASI, 'kontak', isian);
    setKirim(h.ok ? { status: 'terkirim', pesan: h.data.pesan } : { status: 'galat', pesan: h.pesan });
  };

  if (kirim.status === 'terkirim') {
    return <p className="kartu" role="status"><strong>{kirim.pesan}</strong></p>;
  }

  return (
    <form className="kartu form-kontak" onSubmit={kirimPesan} noValidate>
      <h2>Kirim pesan</h2>
      <label>
        <span>Pesan</span>
        <textarea value={isian.pesan} onChange={ubah('pesan')} rows={5} maxLength={BATAS_KONTAK.pesanMaks} required />
      </label>
      <label>
        <span>Email untuk balasan <span className="redup">(opsional)</span></span>
        <input type="email" inputMode="email" autoComplete="email" value={isian.email} onChange={ubah('email')} maxLength={BATAS_KONTAK.emailMaks} />
      </label>
      {/* Jebakan bot: tidak terlihat & tidak bisa difokus manusia. */}
      <input className="jebakan" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" value={isian.situs} onChange={ubah('situs')} />
      {kirim.status === 'galat' && <p className="kotak-galat" role="alert">{kirim.pesan}</p>}
      <button type="submit" className="tombol-utama" disabled={kirim.status === 'mengirim'}>
        {kirim.status === 'mengirim' ? 'Mengirim…' : 'Kirim pesan'}
      </button>
      <p className="redup kecil">Pesan dibaca pengelola JukirHub. Lihat Kebijakan Privasi untuk cara kami menanganinya.</p>
    </form>
  );
}
