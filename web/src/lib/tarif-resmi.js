// Tarif resmi per kab/kota (view tarif_resmi_publik, hanya yang disetujui pemilik, AGENTS.md 1.8 C). Diambil SEKALI per
// kunjungan setelah gambar pertama, dipakai lembar tempat, halaman tempat, dan halaman wilayah. Gagal / view belum ada
// → tanpa tarif (tidak ada yang ditampilkan).

import { useEffect, useState } from 'react';
import { petaTarif } from '@shared/tarif-peta.js';
import { KONFIGURASI } from '../state.jsx';
import { KOLOM_TARIF, ambilView } from './data.js';
import { setelahGambarPertama } from './koneksi.js';

let janji = null;
let cache = null;

export function muatTarifResmi() {
  if (!KONFIGURASI) return Promise.resolve({});
  janji ??= ambilView(fetch, KONFIGURASI, 'tarif_resmi_publik', KOLOM_TARIF)
    .then(baris => (cache = petaTarif(baris)))
    .catch((err) => {
      console.warn('[tarif] gagal memuat:', err.message);
      return (cache = {});
    });
  return janji;
}

// → { [kota]: { motor, mobil, dasar_hukum, sumber_url } } (kosong sampai termuat).
export function useTarifResmi() {
  const [peta, setPeta] = useState(() => cache ?? {});
  useEffect(() => {
    if (cache) return undefined;
    let batal = false;
    const henti = setelahGambarPertama(() => muatTarifResmi().then(p => { if (!batal) setPeta(p); }));
    return () => { batal = true; henti?.(); };
  }, []);
  return peta;
}
