import { useEffect, useRef, useState } from 'react';
import { BATAS, BAYAR_CEPAT, INDIKASI_PUNGLI, KENDARAAN, LABEL_KENDARAAN, MAKS_BAYAR } from '@shared/konstanta.js';
import { periksaNamaTempat, validasiLaporan } from '@shared/lapor.js';
import { KONFIGURASI, useApp } from '../state.jsx';
import { PROFIL_LOKASI, kodeGalatLokasi, pesanGalatLokasi } from '../lib/lokasi.js';
import { formatJarak, formatRupiah, jarakM } from '../lib/util.js';
import { kunciPerangkat, panggilFungsi, susunLaporan } from '../lib/fungsi.js';
import { Ikon } from './Ikon.jsx';

// Form laporan satu layar (AGENTS.md 1.2 poin 3): datang/pergi membantu, bayar, indikasi pungli (boleh kosong),
// bintang. Lokasi diambil saat layar dibuka; server yang memutuskan (gerbang 250 m, batas, GPS palsu).
export default function LaporLayar({ tempat, onTutup, onSelesai }) {
  const { kendaraan: kendaraanHeader, mintaPosisi } = useApp();
  const [lokasi, setLokasi] = useState({ status: 'mencari', posisi: null, kode: null });
  const [isian, setIsian] = useState({
    adaJukir: null,   // pertanyaan pertama; "Tidak ada" → laporan tanpa jukir (AGENTS.md 1.2 poin 3)
    kendaraan: kendaraanHeader,
    bantuDatang: null,
    bantuPergi: null,
    bayar: null,
    bayarLain: false,
    pungli: new Set(),
    bintang: 0,
    // Pin: nama bisa sudah terisi dari kolom cari ("Laporkan di lokasi saya"), tetap bisa diubah.
    namaTempat: tempat.sumber === 'pin' ? (tempat.nama ?? '') : ''
  });
  const [kirim, setKirim] = useState({ status: 'diam', pesan: null, hasil: null });   // diam | mengirim | galat | sukses
  const judul = useRef(null);
  const perluNama = tempat.id == null && (tempat.sumber === 'pin' || !tempat.nama);

  const ambilLokasi = () => {
    setLokasi(l => ({ ...l, status: 'mencari', kode: null }));
    mintaPosisi(PROFIL_LOKASI.lapor)
      .then(posisi => setLokasi({ status: 'siap', posisi, kode: null }))
      .catch(err => setLokasi({ status: 'galat', posisi: null, kode: kodeGalatLokasi(err) }));
  };

  useEffect(() => {
    judul.current?.focus();
    ambilLokasi();
    const tekan = (e) => { if (e.key === 'Escape') onTutup(); };
    window.addEventListener('keydown', tekan);
    return () => window.removeEventListener('keydown', tekan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ubah = (kunci, nilai) => setIsian(s => ({ ...s, [kunci]: nilai }));
  const aturPungli = (kode) => setIsian(s => {
    const p = new Set(s.pungli);
    p.has(kode) ? p.delete(kode) : p.add(kode);
    return { ...s, pungli: p };
  });

  const jarak = lokasi.posisi ? jarakM(lokasi.posisi, tempat) : null;
  const terlaluJauh = jarak != null && jarak > BATAS.radiusLaporM;

  const kirimLaporan = async (e) => {
    e.preventDefault();
    if (kirim.status === 'mengirim') return;
    if (!lokasi.posisi) {
      setKirim({ status: 'galat', pesan: 'Lokasi Anda belum terdeteksi. Melapor hanya bisa dari lokasi parkir.' });
      return;
    }
    if (perluNama) {
      const pesan = periksaNamaTempat(isian.namaTempat);
      if (pesan) { setKirim({ status: 'galat', pesan }); return; }
    }
    if (isian.adaJukir == null) { setKirim({ status: 'galat', pesan: 'Jawab dulu: ada jukir di tempat ini?' }); return; }
    const body = susunLaporan({ tempat, isian, posisi: lokasi.posisi, perangkat: kunciPerangkat() });
    // Pesan yang sama dengan server, sebelum dikirim (server tetap memeriksa ulang).
    const cek = validasiLaporan(body);
    if (!cek.ok) { setKirim({ status: 'galat', pesan: cek.pesan }); return; }
    setKirim({ status: 'mengirim', pesan: null });
    const h = await panggilFungsi(fetch, KONFIGURASI, 'lapor', body);
    if (h.ok) setKirim({ status: 'sukses', pesan: h.data.pesan, hasil: h.data.titik });
    else setKirim({ status: 'galat', pesan: h.pesan });
  };

  if (kirim.status === 'sukses') {
    return (
      <div className="lapor" role="dialog" aria-modal="true" aria-labelledby="judul-lapor">
        <div className="lapor-sukses">
          <p className="sukses-ikon" aria-hidden="true">✓</p>
          <h2 id="judul-lapor" ref={judul} tabIndex={-1}>{kirim.pesan}</h2>
          <p className="redup">
            Laporan Anda ikut dihitung di {kirim.hasil?.nama}. Indikasi pungli baru tampil setelah cukup laporan dari warga lain.
          </p>
          <button type="button" className="tombol-utama lebar-penuh" onClick={() => onSelesai(kirim.hasil)}>Lihat di peta</button>
        </div>
      </div>
    );
  }

  const nama = perluNama ? 'Tempat baru di lokasi yang Anda tandai' : tempat.nama;

  return (
    <div className="lapor" role="dialog" aria-modal="true" aria-labelledby="judul-lapor">
      <div className="lapor-kepala">
        <div>
          <h2 id="judul-lapor" ref={judul} tabIndex={-1}>Laporkan parkir</h2>
          <p className="redup">{nama}</p>
        </div>
        <button type="button" className="tombol-ikon" onClick={onTutup} aria-label="Tutup">
          <Ikon nama="silang" ukuran={18} />
        </button>
      </div>

      <form className="lapor-isi" onSubmit={kirimLaporan} noValidate>
        <p className={`status-lokasi${lokasi.status === 'galat' || terlaluJauh ? ' peringatan' : ''}`} role="status">
          {lokasi.status === 'mencari' && 'Mencari lokasi Anda… (melapor hanya bisa dari lokasi parkir)'}
          {lokasi.status === 'siap' && !terlaluJauh && `Lokasi terdeteksi, ${formatJarak(jarak)} dari tempat ini.`}
          {lokasi.status === 'siap' && terlaluJauh &&
            `Anda sekitar ${formatJarak(jarak)} dari tempat ini. Melapor hanya bisa dari dekat tempat (±${BATAS.radiusLaporM} m).`}
          {lokasi.status === 'galat' && pesanGalatLokasi(lokasi.kode, navigator.userAgent, { lapor: true })}
          {lokasi.status !== 'mencari' && (
            <button type="button" className="tautan" onClick={ambilLokasi}>Perbarui lokasi</button>
          )}
        </p>

        {perluNama && (
          <label className="blok">
            <span className="tanya">Nama tempat <span className="redup">(tempat ini belum ada di peta)</span></span>
            <input type="text" className="isian-teks" value={isian.namaTempat} maxLength={BATAS.panjangNamaTempatMaks}
              onChange={e => ubah('namaTempat', e.target.value)} placeholder="Mis. Pinggir Jl. Veteran depan warung coto" />
          </label>
        )}

        <fieldset className="blok">
          <legend className="tanya">Ada jukir di tempat ini?</legend>
          <div className="pilihan-2">
            <button type="button" aria-pressed={isian.adaJukir === true} onClick={() => ubah('adaJukir', true)}>Ada jukir</button>
            <button type="button" aria-pressed={isian.adaJukir === false} onClick={() => ubah('adaJukir', false)}>Tidak ada jukir</button>
          </div>
          {isian.adaJukir === false && (
            <p className="redup">Laporan mencatat bahwa tidak ada juru parkir di tempat ini saat Anda di sini. Langsung kirim.</p>
          )}
        </fieldset>

        {isian.adaJukir === true && (<>
        <fieldset className="blok">
          <legend className="tanya">Kendaraan</legend>
          <div className="pilihan-2">
            {KENDARAAN.map(k => (
              <button key={k} type="button" aria-pressed={isian.kendaraan === k} onClick={() => ubah('kendaraan', k)}>
                {LABEL_KENDARAAN[k]}
              </button>
            ))}
          </div>
        </fieldset>

        <PilihanBantu judul="Saat datang, jukir…" nilai={isian.bantuDatang} onPilih={v => ubah('bantuDatang', v)} />
        <PilihanBantu judul="Saat mau pergi, jukir…" nilai={isian.bantuPergi} onPilih={v => ubah('bantuPergi', v)} />

        <fieldset className="blok">
          <legend className="tanya">Bayar berapa?</legend>
          <div className="pilihan-chip">
            {BAYAR_CEPAT.map(n => (
              <button key={n} type="button" aria-pressed={!isian.bayarLain && isian.bayar === n}
                onClick={() => setIsian(s => ({ ...s, bayar: n, bayarLain: false }))}>
                {n === 0 ? 'Gratis' : formatRupiah(n).replace('Rp ', '')}
              </button>
            ))}
            <button type="button" aria-pressed={isian.bayarLain}
              onClick={() => setIsian(s => ({ ...s, bayarLain: true, bayar: null }))}>Lainnya</button>
          </div>
          {isian.bayarLain && (
            <input type="number" inputMode="numeric" min="0" max={MAKS_BAYAR} step="500" className="isian-teks"
              aria-label="Jumlah yang dibayar (rupiah)" placeholder="Jumlah dalam rupiah, mis. 4000"
              value={isian.bayar ?? ''} onChange={e => ubah('bayar', e.target.value === '' ? null : Number(e.target.value))} />
          )}
        </fieldset>

        <fieldset className="blok">
          <legend className="tanya">Ada indikasi pungli? <span className="redup">(pilih yang dialami, boleh kosong)</span></legend>
          <div className="pilihan-chip">
            {INDIKASI_PUNGLI.map(i => (
              <button key={i.kode} type="button" aria-pressed={isian.pungli.has(i.kode)} onClick={() => aturPungli(i.kode)}>
                {i.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="blok">
          <legend className="tanya">Rating</legend>
          <div className="pilihan-bintang">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" aria-pressed={isian.bintang === n} aria-label={`${n} bintang`}
                className={isian.bintang >= n ? 'penuh' : ''} onClick={() => ubah('bintang', n)}>★</button>
            ))}
          </div>
        </fieldset>
        </>)}

        {kirim.status === 'galat' && <p className="kotak-galat" role="alert">{kirim.pesan}</p>}

        <div className="lapor-bawah">
          <button type="submit" className="tombol-utama lebar-penuh" disabled={kirim.status === 'mengirim'}>
            {kirim.status === 'mengirim' ? 'Mengirim…' : 'Kirim laporan'}
          </button>
          <p className="kecil redup">Tanpa akun dan tanpa identitas. Lokasi hanya untuk memastikan Anda di tempat, dihapus setelah 7 hari.</p>
        </div>
      </form>
    </div>
  );
}

function PilihanBantu({ judul, nilai, onPilih }) {
  return (
    <fieldset className="blok">
      <legend className="tanya">{judul}</legend>
      <div className="pilihan-2">
        <button type="button" aria-pressed={nilai === true} onClick={() => onPilih(true)}>Membantu</button>
        <button type="button" aria-pressed={nilai === false} onClick={() => onPilih(false)}>Tidak membantu</button>
      </div>
    </fieldset>
  );
}
