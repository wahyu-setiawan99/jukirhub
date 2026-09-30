// Validasi isian laporan & nama tempat (AGENTS.md 1.2 poin 3, 4, 6.1). Dipakai Edge Function `lapor` (server
// yang menentukan) dan web (supaya pesan sama sebelum dikirim). ESM murni (Node & Deno).

import { BATAS, INDIKASI_PUNGLI, KENDARAAN, MAKS_BAYAR } from './konstanta.js';

const KODE_PUNGLI = new Set(INDIKASI_PUNGLI.map(i => i.kode));
const REF_OSM = /^(node|way|relation)\/[0-9]{1,15}$/;
const angka = (v) => typeof v === 'number' && Number.isFinite(v);
const galat = (kode, pesan) => ({ ok: false, kode, pesan });

// Kata kasar dasar (utuh per kata). Daftar sengaja pendek; moderasi pemilik menangkap sisanya.
const KASAR = ['anjing', 'anjir', 'bangsat', 'babi', 'bajingan', 'kontol', 'memek', 'ngentot', 'jancuk', 'jancok',
  'goblok', 'goblog', 'tolol', 'kampret', 'asu', 'tai', 'setan', 'keparat'];
const POLA_KASAR = new RegExp(`(^|[^\\p{L}])(${KASAR.join('|')})([^\\p{L}]|$)`, 'iu');

// Nama tempat (satu-satunya teks bebas di versi 1.2): 2–60 huruf, tanpa nomor HP, tautan, email, plat, kata kasar.
// null = boleh; string = pesan untuk pengguna.
export function periksaNamaTempat(nama) {
  const n = String(nama ?? '').trim();
  if (n.length < 2 || n.length > BATAS.panjangNamaTempatMaks) {
    return `Nama tempat 2–${BATAS.panjangNamaTempatMaks} huruf, mis. "Pinggir Jl. Veteran depan warung".`;
  }
  if (/\d[\d\s.-]{7,}\d/.test(n)) return 'Nama tempat tidak boleh memuat nomor telepon atau angka panjang.';
  if (/https?:|www\.|\.(com|id|net|org)\b|@/i.test(n)) return 'Nama tempat tidak boleh memuat tautan atau email.';
  if (/\b[A-Z]{1,2}\s?\d{1,4}\s?[A-Z]{1,3}\b/.test(n)) return 'Nama tempat tidak boleh memuat nomor plat kendaraan.';
  if (POLA_KASAR.test(n)) return 'Nama tempat tidak boleh memuat kata kasar.';
  return null;
}

// Body permintaan → { ok: true, data } atau { ok: false, kode, pesan }. Tidak ada validasi yang dipercayakan ke client.
export function validasiLaporan(body) {
  if (!body || typeof body !== 'object') return galat('format', 'Format laporan tidak valid.');
  const b = body;
  if (typeof b.perangkat !== 'string' || b.perangkat.length < 8 || b.perangkat.length > 100) {
    return galat('perangkat', 'Identitas perangkat tidak valid.');
  }
  if (!KENDARAAN.includes(b.kendaraan)) return galat('kendaraan', 'Pilih motor atau mobil.');
  if (typeof b.bantu_datang !== 'boolean') return galat('bantu_datang', 'Jawab: saat datang, jukir membantu atau tidak?');
  if (typeof b.bantu_pergi !== 'boolean') return galat('bantu_pergi', 'Jawab: saat mau pergi, jukir membantu atau tidak?');
  if (!Number.isInteger(b.bayar) || b.bayar < 0 || b.bayar > MAKS_BAYAR) {
    return galat('bayar', `Isi berapa yang Anda bayar (0–${MAKS_BAYAR.toLocaleString('id-ID')} rupiah).`);
  }
  const pungli = Array.isArray(b.pungli) ? [...new Set(b.pungli)] : null;
  if (!pungli || pungli.some(k => !KODE_PUNGLI.has(k))) return galat('pungli', 'Pilihan indikasi pungli tidak valid.');
  if (!Number.isInteger(b.bintang) || b.bintang < 1 || b.bintang > 5) return galat('bintang', 'Beri rating 1–5 bintang.');
  if (!angka(b.lat) || !angka(b.lng) || Math.abs(b.lat) > 90 || Math.abs(b.lng) > 180) {
    return galat('lokasi', 'Melapor hanya bisa dari lokasi parkir. Aktifkan lokasi lalu coba lagi.');
  }
  if (!angka(b.akurasi_m) || b.akurasi_m < 0) return galat('lokasi', 'Lokasi belum terdeteksi. Coba lagi.');

  // Tempat: yang sudah terlapor (titik_id) atau tempat baru dari peta / cari / pin.
  let tempat = null;
  if (b.titik_id != null) {
    if (!Number.isInteger(b.titik_id) || b.titik_id <= 0) return galat('tempat', 'Tempat tidak valid.');
  } else {
    const t = b.tempat;
    if (!t || !angka(t.lat) || !angka(t.lng) || Math.abs(t.lat) > 90 || Math.abs(t.lng) > 180) {
      return galat('tempat', 'Pilih tempat di peta dulu.');
    }
    const pesanNama = periksaNamaTempat(t.nama);
    if (pesanNama) return galat('nama_tempat', pesanNama);
    if (t.osm_ref != null && !REF_OSM.test(String(t.osm_ref))) return galat('tempat', 'Tempat tidak valid.');
    tempat = { nama: String(t.nama).trim(), osm_ref: t.osm_ref ?? null, lat: t.lat, lng: t.lng };
  }

  return {
    ok: true,
    data: {
      perangkat: b.perangkat,
      titik_id: b.titik_id ?? null,
      tempat,
      kendaraan: b.kendaraan,
      bantu_datang: b.bantu_datang,
      bantu_pergi: b.bantu_pergi,
      bayar: b.bayar,
      pungli,
      bintang: b.bintang,
      lat: b.lat,
      lng: b.lng,
      akurasi_m: b.akurasi_m
    }
  };
}
