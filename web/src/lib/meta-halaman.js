import { useEffect } from 'react';
import { SITUS } from './konten-beranda.js';

const URL_SITUS = (import.meta.env.VITE_SITE_URL || SITUS.urlBawaan).replace(/\/+$/, '');

// Judul, deskripsi, canonical, og:url, dan robots halaman dinamis (/tempat/…, /wilayah/…), sama dengan HTML statisnya.
// `meta` = { judul, deskripsi, jalur, indeks } atau null (belum ada data). Robots dikembalikan saat halaman ditinggal;
// judul & deskripsi halaman berikutnya diatur App.
export function useMetaHalaman(meta) {
  const { judul, deskripsi, jalur, indeks } = meta ?? {};
  useEffect(() => {
    if (!jalur) return undefined;
    const set = (sel, attr, nilai) => document.querySelector(sel)?.setAttribute(attr, nilai);
    const url = `${URL_SITUS}${jalur}`;
    document.title = judul;
    set('meta[name="description"]', 'content', deskripsi);
    set('link[rel="canonical"]', 'href', url);
    set('meta[property="og:url"]', 'content', url);
    const robots = document.querySelector('meta[name="robots"]');
    const lama = robots?.getAttribute('content');
    if (!indeks) robots?.setAttribute('content', 'noindex, follow');
    return () => { if (robots && lama) robots.setAttribute('content', lama); };
  }, [judul, deskripsi, jalur, indeks]);
}
