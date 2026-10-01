import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// Font tampilan Radar dari situs sendiri (tanpa Google Fonts), latin saja, font-display: swap:
// Space Grotesk 400/600 untuk teks & judul, JetBrains Mono 400/500 untuk angka & label data.
import '@fontsource/space-grotesk/latin-400.css';
import '@fontsource/space-grotesk/latin-600.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import './app.css';
import App from './App.jsx';
import { AppProvider } from './state.jsx';
import { daftarkanServiceWorker } from './lib/sw.js';
import { tangkapKampanye } from './lib/kampanye.js';
import { muatBerita } from './lib/berita.js';

// Klik iklan (?utm_…): simpan kode kampanye di perangkat lalu bersihkan alamat, sebelum router membaca URL.
tangkapKampanye();

// Halaman /berita: unduh data berita bersamaan dengan bagian halamannya (berita = isi utama halaman itu).
if (window.location.pathname === '/berita') muatBerita().catch(() => { /* ditampilkan oleh halaman */ });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </StrictMode>
);

daftarkanServiceWorker();
