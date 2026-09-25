import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { KENDARAAN } from '@shared/konstanta.js';
import { bacaSimpan, tulisSimpan } from './lib/util.js';

// Context app. M0: kendaraan terpilih (motor/mobil, diingat di perangkat) dan status online.
// Data titik parkir, posisi pengguna, dan snapshot offline ditambahkan di M1.

const KUNCI_KENDARAAN = 'jukirhub_kendaraan';
const AppContext = createContext(null);

function kendaraanAwal() {
  const simpan = bacaSimpan(KUNCI_KENDARAAN, KENDARAAN[0]);
  return KENDARAAN.includes(simpan) ? simpan : KENDARAAN[0];
}

export function AppProvider({ children }) {
  const [kendaraan, setKendaraanState] = useState(kendaraanAwal);
  const [offline, setOffline] = useState(() => navigator.onLine === false);

  const setKendaraan = useCallback((k) => {
    if (!KENDARAAN.includes(k)) return;
    setKendaraanState(k);
    tulisSimpan(KUNCI_KENDARAAN, k);
  }, []);

  useEffect(() => {
    const ubah = () => setOffline(navigator.onLine === false);
    window.addEventListener('online', ubah);
    window.addEventListener('offline', ubah);
    return () => {
      window.removeEventListener('online', ubah);
      window.removeEventListener('offline', ubah);
    };
  }, []);

  const nilai = useMemo(() => ({ kendaraan, setKendaraan, offline }), [kendaraan, setKendaraan, offline]);
  return <AppContext.Provider value={nilai}>{children}</AppContext.Provider>;
}

export function useApp() {
  const nilai = useContext(AppContext);
  if (!nilai) throw new Error('useApp harus dipakai di dalam <AppProvider>');
  return nilai;
}
