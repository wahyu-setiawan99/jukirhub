import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// Poppins dari situs sendiri (tanpa Google Fonts): latin saja, 3 ketebalan, font-display: swap.
import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-600.css';
import '@fontsource/poppins/latin-700.css';
import './app.css';
import App from './App.jsx';
import { AppProvider } from './state.jsx';
import { daftarkanServiceWorker } from './lib/sw.js';

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
