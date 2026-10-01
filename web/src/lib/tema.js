import { useEffect, useState } from 'react';
import { tulisSimpan } from './util.js';

// Tema tampilan (AGENTS.md 6.3): GELAP bawaan, TERANG pilihan lewat ikon di header (untuk terik matahari).
// Atribut data-tema="terang" pada <html> dipasang skrip kecil di index.html SEBELUM halaman digambar supaya
// tidak berkedip; modul ini hanya mengubahnya saat pengguna memilih. Warna ada di app.css (:root).

export const KUNCI_TEMA = 'jukirhub_tema';
// Warna bilah status HP (meta theme-color) = warna header (--permukaan) tiap tema.
export const WARNA_BILAH = { gelap: '#0b1324', terang: '#ffffff' };
const PERISTIWA = 'jukirhub-tema';

export const temaAktif = () => (document.documentElement.dataset.tema === 'terang' ? 'terang' : 'gelap');

export function pasangTema(tema) {
  const terang = tema === 'terang';
  if (terang) document.documentElement.dataset.tema = 'terang';
  else delete document.documentElement.dataset.tema;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', WARNA_BILAH[terang ? 'terang' : 'gelap']);
  tulisSimpan(KUNCI_TEMA, terang ? 'terang' : 'gelap');
  window.dispatchEvent(new Event(PERISTIWA));
}

export function useTema() {
  const [tema, setTema] = useState(temaAktif);
  useEffect(() => {
    const ubah = () => setTema(temaAktif());
    window.addEventListener(PERISTIWA, ubah);
    return () => window.removeEventListener(PERISTIWA, ubah);
  }, []);
  return [tema, pasangTema];
}
