import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BATAS_LAPORAN_BERKOIN_HARIAN, HARI_PEMBUKA, HARI_PERINGKAT, KOIN, kemajuanLencana
} from '@shared/koin.js';
import { LABEL_KENDARAAN } from '@shared/konstanta.js';
import { PROVINSI, kabupatenDiProvinsi } from '@shared/wilayah.js';
import { useApp } from '../state.jsx';
import { ambilKontribusi } from '../lib/kontribusi.js';
import { waktuRelatif } from '../lib/riwayat.js';
import { formatRupiah } from '../lib/util.js';
import { SITUS } from '../lib/konten-beranda.js';
import { Ikon } from '../components/Ikon.jsx';
import TautanSitus from '../components/TautanSitus.jsx';

// Tab "Saya" (keputusan pemilik 1 Okt 2026, pola Adami): koin, lencana, peringkat 30 hari per kabupaten, laporan
// terakhir dari HP ini, dan cara dapat koin. Tanpa akun: data milik perangkat ini saja, jadi tidak diindeks mesin
// pencari (noindex) dan tidak masuk sitemap. "Cara dapat koin" tetap tampil walau koin gagal dimuat.
export default function Saya() {
  const [kabupaten, setKabupaten] = useState(undefined);   // undefined = kabupaten saya (dari server)
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('memuat');           // memuat | siap | galat
  const [sibuk, setSibuk] = useState(false);

  useMetaPribadi();

  const muat = useCallback(async (aksi = 'lihat', kab = kabupaten) => {
    if (aksi === 'lihat') setStatus(s => (s === 'siap' ? s : 'memuat'));
    setSibuk(true);
    const r = await ambilKontribusi(aksi, kab);
    setSibuk(false);
    if (r.ok) { setData(r.data); setStatus('siap'); } else setStatus('galat');
  }, [kabupaten]);

  useEffect(() => { muat('lihat', kabupaten); }, [kabupaten]);   // eslint-disable-line react-hooks/exhaustive-deps

  const saya = data?.saya ?? null;
  const peringkat = data?.peringkat ?? null;
  const kabAktif = kabupaten === undefined ? (peringkat?.kabupaten ?? 'semua') : kabupaten;

  return (
    <div className="halaman halaman-saya">
      <section className="kepala-halaman">
        <h1>Saya</h1>
        <p className="redup">Koin, lencana, dan peringkat dari laporan Anda. Tanpa akun: tersimpan di HP ini.</p>
      </section>

      {status === 'memuat' && <p className="redup" role="status">Memuat koin & peringkat…</p>}
      {status === 'galat' && (
        <div className="kotak-galat" role="alert">
          <p>Koin & peringkat belum bisa dimuat. Periksa koneksi Anda.</p>
          <button type="button" className="tautan" onClick={() => muat()}>Coba lagi</button>
        </div>
      )}

      {status === 'siap' && !saya && (
        <section className="kartu">
          <h2>Belum ada koin</h2>
          {/* Tanpa tombol sendiri: tombol "Laporkan parkir" sudah ada di bilah bawah (satu tombol per layar). */}
          <p>
            Saat berada di tempat parkir, tekan <strong>Laporkan parkir</strong> di bawah. Setiap laporan memberi koin,
            ditambah bonus saat Anda pelapor pertama di tempat itu atau melapor beberapa hari berturut-turut.
          </p>
        </section>
      )}

      {saya && (
        <section className="kartu" aria-labelledby="judul-saya">
          <div className="kepala-seksi">
            <span className="redup kecil">Nama samaran</span>
            <button type="button" className="tautan kecil" disabled={sibuk} onClick={() => muat('ganti_nama')}>Ganti</button>
          </div>
          <h2 id="judul-saya" className="nama-samaran">{saya.nama_samaran}</h2>
          <dl className="angka-saya">
            <div><dt>koin</dt><dd className="angka angka-koin">{saya.koin}</dd></div>
            <div><dt>laporan</dt><dd>{saya.laporan}</dd></div>
            <div><dt>hari seri</dt><dd>{saya.seri}</dd></div>
            <div><dt>{saya.kabupaten ? `di ${saya.kabupaten}` : 'peringkat'}</dt><dd>{saya.posisi ? `#${saya.posisi}` : '–'}</dd></div>
          </dl>
        </section>
      )}

      {saya && (
        <section className="kartu" aria-labelledby="judul-lencana">
          <h2 id="judul-lencana">Lencana</h2>
          <ul className="daftar-lencana">
            {kemajuanLencana(saya.statistik).map(l => (
              <li key={l.id} className={l.dapat ? 'dapat' : ''}>
                <Ikon nama={l.ikon} ukuran={22} />
                <strong>{l.nama}</strong>
                <span className="redup kecil">{l.dapat ? l.ket : `${l.nilai}/${l.ambang} · ${l.ket}`}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {saya && <LaporanTerakhir laporan={data?.laporan_terakhir ?? []} />}

      {peringkat && (
        <section className="kartu" aria-labelledby="judul-peringkat">
          <div className="kepala-seksi">
            <h2 id="judul-peringkat">Peringkat pelapor</h2>
            <span className="redup kecil">{HARI_PERINGKAT} hari</span>
          </div>
          <label className="pilih-daerah">
            <span className="redup kecil">Wilayah</span>
            <select value={kabAktif} onChange={e => setKabupaten(e.target.value)}>
              <option value="semua">Semua Sulawesi</option>
              {PROVINSI.map(p => (
                <optgroup key={p.kode} label={p.nama}>
                  {kabupatenDiProvinsi(p.kode).map(k => <option key={k} value={k}>{k}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
          {peringkat.daftar.length ? (
            <ol className="daftar-peringkat">
              {peringkat.daftar.map((p, i) => (
                <li key={`${p.nama}-${i}`} className={p.saya ? 'saya' : ''}>
                  <span className="urut">{i + 1}</span>
                  <span>{p.nama}{p.saya ? ' (Anda)' : ''}</span>
                  <span className="lencana-koin"><Ikon nama="koin" ukuran={14} />{p.koin}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="redup">Belum ada pelapor di peringkat ini. Jadilah yang pertama.</p>
          )}
          {saya && (
            <button type="button" className="tautan kecil" disabled={sibuk}
              onClick={() => muat(saya.tampil_di_peringkat ? 'sembunyikan' : 'tampilkan')}>
              {saya.tampil_di_peringkat ? 'Sembunyikan saya dari peringkat' : 'Tampilkan saya di peringkat'}
            </button>
          )}
        </section>
      )}

      <CaraDapatKoin />

      <TautanSitus />
      <p className="disclaimer">Koin belum bisa ditukar dengan uang atau hadiah; hanya untuk lencana dan peringkat.</p>
    </div>
  );
}

function LaporanTerakhir({ laporan }) {
  const { daftar } = useApp();
  const perId = useMemo(() => new Map(daftar.map(t => [t.id, t])), [daftar]);
  return (
    <section className="kartu" aria-labelledby="judul-laporan-saya">
      <h2 id="judul-laporan-saya">Laporan terakhir saya</h2>
      {laporan.length ? (
        <ul className="daftar-saya">
          {laporan.map((l, i) => {
            const t = perId.get(Number(l.titik_id));
            const nama = t?.nama ?? l.nama ?? 'Tempat parkir';
            const rincian = l.ada_jukir === false
              ? ['Tidak ada jukir']
              : [LABEL_KENDARAAN[l.kendaraan], formatRupiah(l.bayar), l.bintang ? `${l.bintang}★` : null];
            return (
              <li key={`${l.waktu}-${i}`}>
                {t
                  ? <Link to="/peta" state={{ fokusTempat: t.id }}>{nama}</Link>
                  : <span>{nama}</span>}
                <span className="redup kecil">{[...rincian, waktuRelatif(l.waktu)].filter(Boolean).join(' · ')}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="redup">Belum ada laporan dari HP ini.</p>
      )}
      <p className="redup kecil">Hanya laporan dari HP dan browser ini (maks. 10 terakhir).</p>
    </section>
  );
}

function CaraDapatKoin() {
  return (
    <section className="kartu" aria-labelledby="judul-cara-koin">
      <h2 id="judul-cara-koin">Cara dapat koin</h2>
      <ul className="poin">
        <li><strong>+{KOIN.diLokasi} koin</strong> setiap laporan parkir dari lokasi.</li>
        <li>
          <strong>+{KOIN.pembukaData} koin</strong> bila belum ada laporan siapa pun di tempat itu dalam {HARI_PEMBUKA} hari
          terakhir, termasuk tempat yang baru Anda tambahkan (pembuka data).
        </li>
        <li>
          <strong>Seri harian:</strong> melapor hari ke-2 berturut-turut +{KOIN.seriPerHari}, hari ke-3 +{KOIN.seriPerHari * 2},
          dan seterusnya (maks. +{KOIN.seriMaks}), sekali sehari.
        </li>
        <li>Maksimal {BATAS_LAPORAN_BERKOIN_HARIAN} laporan berkoin per hari. Laporan berikutnya tetap diterima, tanpa koin.</li>
        <li>Foto bukti dan komentar tidak memberi koin.</li>
      </ul>
      <h3>Koin tersimpan di HP ini</h3>
      <p>
        Tanpa akun, koin terikat pada <strong>HP dan browser</strong> yang Anda pakai. Ganti HP, ganti browser, mode
        penyamaran, atau menghapus data browser membuat koin mulai dari nol lagi.
      </p>
      <p className="redup">
        Peringkat memakai nama samaran (hewan khas Sulawesi + kabupaten), tanpa identitas. Kabupaten peringkat mengikuti
        lokasi tempat parkir yang Anda laporkan.
      </p>
    </section>
  );
}

// Halaman pribadi: judul sendiri dan noindex selama halaman terbuka.
function useMetaPribadi() {
  useEffect(() => {
    document.title = `Saya · ${SITUS.nama}`;
    let robots = document.querySelector('meta[name="robots"]');
    const lama = robots?.getAttribute('content') ?? null;
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    robots.setAttribute('content', 'noindex, nofollow');
    return () => {
      if (lama) robots.setAttribute('content', lama);
      else robots.remove();
    };
  }, []);
}
