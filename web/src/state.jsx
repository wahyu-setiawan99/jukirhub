import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { KENDARAAN } from '@shared/konstanta.js';
import { bacaSimpan, tulisSimpan } from './lib/util.js';
import { KOLOM_RINGKASAN, KOLOM_TITIK, ambilView, konfigurasiData } from './lib/data.js';
import { gabungTempat } from './lib/tempat.js';
import { KUNCI_SNAPSHOT, bacaSnapshot, buatSnapshot } from './lib/offline.js';
import { PROFIL_LOKASI, ambilPosisi, kodeGalatLokasi } from './lib/lokasi.js';
import { ZONA_BAWAAN, pilihZonaManual, wilayahDariPosisi, zonaManual } from './lib/daerah.js';

// Context app (pola Adami): tempat terlapor + ringkasannya, posisi pengguna, zona (provinsi) aktif, kendaraan
// terpilih, status online.

const KUNCI_KENDARAAN = 'jukirhub_kendaraan';
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const tempat = useTempat();
  const posisi = usePosisi();
  const zona = useZona(posisi.posisi);
  const [kendaraan, setKendaraanState] = useState(() => {
    const k = bacaSimpan(KUNCI_KENDARAAN, KENDARAAN[0]);
    return KENDARAAN.includes(k) ? k : KENDARAAN[0];
  });
  const setKendaraan = useCallback((k) => {
    if (!KENDARAAN.includes(k)) return;
    setKendaraanState(k);
    tulisSimpan(KUNCI_KENDARAAN, k);
  }, []);

  const nilai = useMemo(
    () => ({ ...tempat, ...posisi, ...zona, kendaraan, setKendaraan }),
    [tempat, posisi, zona, kendaraan, setKendaraan]
  );
  return <AppContext.Provider value={nilai}>{children}</AppContext.Provider>;
}

export function useApp() {
  const nilai = useContext(AppContext);
  if (!nilai) throw new Error('useApp harus dipakai di dalam <AppProvider>');
  return nilai;
}

// ------------------------------------------------------------------ data tempat
// Dibaca dari view titik_publik + ringkasan_titik_publik. Data hanya berubah saat ada laporan, jadi cukup diambil
// saat app dibuka, saat tab kembali terlihat / sinyal kembali (paling cepat tiap 60 detik), dan setelah melapor.
// Data terakhir disimpan di perangkat (lib/offline.js) supaya langsung tampil dan tetap ada saat sinyal putus.

// Dipakai juga untuk memanggil Edge Function (components/LaporLayar.jsx).
export const KONFIGURASI = konfigurasiData(import.meta.env);
const JEDA_MIN_REFRESH_MS = 60_000;

function useTempat() {
  const snapAwal = useRef(undefined);
  if (snapAwal.current === undefined) snapAwal.current = bacaSnapshot(bacaSimpan(KUNCI_SNAPSHOT, null), Date.now());
  const snap = snapAwal.current;

  const [daftar, setDaftar] = useState(() => snap?.tempat ?? []);
  const [diperbarui, setDiperbarui] = useState(() => snap?.diambil ?? null);
  // memuat | siap | galat. Tanpa konfigurasi (env belum diisi) → siap dengan daftar kosong.
  const [status, setStatus] = useState(() => (snap || !KONFIGURASI ? 'siap' : 'memuat'));
  const [offline, setOffline] = useState(() => navigator.onLine === false);
  const daftarRef = useRef(daftar);
  daftarRef.current = daftar;
  const terakhirAmbil = useRef(0);

  const muat = useCallback(async ({ paksa = false } = {}) => {
    if (!KONFIGURASI) {
      if (import.meta.env.DEV) console.warn('[data] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum diisi; data kosong.');
      return;
    }
    if (!paksa && Date.now() - terakhirAmbil.current < JEDA_MIN_REFRESH_MS) return;
    terakhirAmbil.current = Date.now();
    try {
      const [titik, ringkasan] = await Promise.all([
        ambilView(fetch, KONFIGURASI, 'titik_publik', KOLOM_TITIK),
        ambilView(fetch, KONFIGURASI, 'ringkasan_titik_publik', KOLOM_RINGKASAN)
      ]);
      const tempat = gabungTempat(titik, ringkasan);
      const diambil = Date.now();
      setDaftar(tempat);
      setDiperbarui(diambil);
      setOffline(false);
      setStatus('siap');
      tulisSimpan(KUNCI_SNAPSHOT, buatSnapshot({ tempat, diambil }));
    } catch (err) {
      console.warn('[data] gagal memuat:', err.message);
      setOffline(navigator.onLine === false);
      // Masih ada data terakhir → tetap pakai; benar-benar kosong → tampilkan galat.
      setStatus(daftarRef.current.length ? 'siap' : 'galat');
    }
  }, []);

  useEffect(() => { muat({ paksa: true }); }, [muat]);

  useEffect(() => {
    const saatTerlihat = () => { if (!document.hidden) muat(); };
    const saatOnline = () => { setOffline(false); muat({ paksa: true }); };
    const saatOffline = () => setOffline(true);
    document.addEventListener('visibilitychange', saatTerlihat);
    window.addEventListener('online', saatOnline);
    window.addEventListener('offline', saatOffline);
    return () => {
      document.removeEventListener('visibilitychange', saatTerlihat);
      window.removeEventListener('online', saatOnline);
      window.removeEventListener('offline', saatOffline);
    };
  }, [muat]);

  const muatUlang = useCallback(() => muat({ paksa: true }), [muat]);
  return useMemo(
    () => ({ daftar, statusData: status, diperbarui, offline, muatUlang }),
    [daftar, status, diperbarui, offline, muatUlang]
  );
}

// ------------------------------------------------------------------ zona aktif (AGENTS.md 1.5, fase N2)
// zona = pilihan manual ?? provinsi dari posisi (bila izin lokasi sudah ada) ?? Sulawesi Selatan.
// kabupatenSaya = kab/kota dari posisi (berita per daerah), null bila belum diketahui.

function useZona(posisi) {
  const [manual, setManual] = useState(() => zonaManual());
  const [otomatis, setOtomatis] = useState({ provinsi: null, kabupaten: null });

  useEffect(() => {
    if (!posisi) return undefined;
    let batal = false;
    wilayahDariPosisi(fetch, posisi).then(w => { if (!batal) setOtomatis(w); });
    return () => { batal = true; };
  }, [posisi]);

  const pilihZona = useCallback((kode) => {
    pilihZonaManual(kode);
    setManual(zonaManual());
  }, []);

  return useMemo(() => ({
    zona: manual ?? otomatis.provinsi ?? ZONA_BAWAAN,
    zonaManual: manual,
    zonaOtomatis: otomatis.provinsi,
    kabupatenSaya: otomatis.kabupaten,
    pilihZona
  }), [manual, otomatis, pilihZona]);
}

// ------------------------------------------------------------------ posisi pengguna
// Izin lokasi hanya diminta lewat aksi pengguna (tombol), kecuali browser sudah memberi izin sebelumnya.

function usePosisi() {
  const [posisi, setPosisi] = useState(null);       // { lat, lng, akurasi }
  const [izinLokasi, setIzin] = useState('belum');  // belum | meminta | diberikan | ditolak
  const [galatLokasi, setGalatLokasi] = useState(null);
  const terakhir = useRef(null);  // { hasil, waktu }
  const sedang = useRef(null);    // { janji, cukupM }

  const mintaPosisi = useCallback((profil = PROFIL_LOKASI.umum) => {
    const t = terakhir.current;
    if (t && Date.now() - t.waktu <= profil.umurMaksMs && t.hasil.akurasi <= profil.cukupM) {
      return Promise.resolve(t.hasil);
    }
    if (sedang.current && sedang.current.cukupM <= profil.cukupM) return sedang.current.janji;

    setIzin(i => (i === 'diberikan' ? i : 'meminta'));
    setGalatLokasi(null);
    const janji = ambilPosisi(navigator.geolocation, profil)
      .then((hasil) => {
        terakhir.current = { hasil, waktu: Date.now() };
        setPosisi(hasil);
        setIzin('diberikan');
        return hasil;
      })
      .catch((err) => {
        const kode = kodeGalatLokasi(err);
        setIzin(kode === 'ditolak' || kode === 'tidak_didukung' ? 'ditolak' : 'belum');
        setGalatLokasi(kode);
        throw err;
      })
      .finally(() => { if (sedang.current?.janji === janji) sedang.current = null; });
    sedang.current = { janji, cukupM: profil.cukupM };
    return janji;
  }, []);

  useEffect(() => {
    navigator.permissions?.query({ name: 'geolocation' })
      .then(s => { if (s.state === 'granted') mintaPosisi().catch(() => {}); })
      .catch(() => {});
  }, [mintaPosisi]);

  return useMemo(
    () => ({ posisi, izinLokasi, galatLokasi, mintaPosisi }),
    [posisi, izinLokasi, galatLokasi, mintaPosisi]
  );
}
