// Koin, lencana, peringkat, dan laporan terakhir perangkat ini (Edge Function `kontribusi`, tab Saya).
// aksi: 'lihat' | 'sembunyikan' | 'tampilkan' | 'ganti_nama'; kabupaten: label, 'semua', atau undefined
// (= kabupaten tempat pelapor paling banyak mendapat koin).

import { KONFIGURASI } from '../state.jsx';
import { kunciPerangkat, panggilFungsi } from './fungsi.js';

export const ambilKontribusi = (aksi = 'lihat', kabupaten) =>
  panggilFungsi(fetch, KONFIGURASI, 'kontribusi', { perangkat: kunciPerangkat(), aksi, ...(kabupaten ? { kabupaten } : {}) });
