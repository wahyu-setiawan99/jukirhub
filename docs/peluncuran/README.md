# Peluncuran JukirHub — checklist (M3)

Dibuat 30 Sept 2026, pola `docs/peluncuran` Adami. Sesuaikan dengan kondisi lapangan.

Materi di folder ini:

- [teks-whatsapp.md](teks-whatsapp.md): pesan untuk grup warga, driver ojol, pemilik usaha, dan jawaban pertanyaan umum
- [poster.html](poster.html): dua poster A5 siap cetak (buka di browser → Cetak → A5, margin minimum,
  aktifkan "Grafik latar"). Halaman 1 ajakan melapor; halaman 2 "Parkir di sini gratis, tanpa jukir" untuk usaha.
- [iklan.md](iklan.md): rencana iklan Facebook (utama), Instagram, TikTok: struktur kampanye, naskah video, UTM,
  jadwal 4 minggu, balasan komentar. Hasil per iklan: `npm run kampanye`.
- `qr-jukirhub.svg` (cetak) / `.png` (chat) → https://jukirhub.vercel.app/peta (buat ulang: `npm run qr`)

---

## 1. Syarat sebelum tautan disebar

Peta kosong atau fitur rusak di hari pertama membuat orang langsung pergi.

- [ ] **Uji HP di lapangan:** di tempat parkir sungguhan → izin lokasi → cari / ketuk tempat → kirim laporan
      "Ada jukir" → layar sukses → penanda muncul di peta (abu-abu bergaris) → lembar tempat menampilkan ringkasan.
- [ ] **Uji "Tidak ada jukir"** di tempat tanpa jukir (mis. cafe sendiri) → penanda ✓ setelah laporan terbanyak
      tanpa jukir.
- [ ] **Uji tempat baru:** "Laporkan di lokasi saya" → pesan 📍 masuk ke Telegram pemilik → coba 🙈 Sembunyikan lalu
      ↩️ Tampilkan lagi.
- [ ] **Cold start:** laporkan sendiri 5–10 tempat yang benar-benar Anda kunjungi (minimarket, warung, cafe) supaya
      peta tidak kosong. Hanya laporan sungguhan; jangan membuat laporan palsu.
- [ ] **Tarif resmi (opsional):** bila ingin JukirHub membandingkan dengan Perda, isi tarif retribusi parkir tepi
      jalan Makassar beserta nomor Perda-nya (AGENTS.md bagian 5).
- [ ] **Domain (opsional):** tetap `jukirhub.vercel.app` atau domain sendiri. Bila domain berubah: `npm run qr` ulang
      dan cetak ulang poster.

## 2. Urutan penyebaran (usulan)

| Tahap | Sasaran | Pesan | Tujuan |
|---|---|---|---|
| 1 | Teman & keluarga di Makassar | teks §1 | 10–20 laporan pertama, cek alur di banyak HP |
| 2 | Grup driver ojol / kurir | teks §2 | laporan tersebar di banyak tempat |
| 3 | Usaha dengan parkir gratis | teks §3 + poster hal. 2 | penanda ✓ "tanpa jukir", sekaligus menyebar QR |
| 4 | Grup warga per kecamatan | teks §1 + poster hal. 1 | laporan berulang di tempat yang sama → indikasi mulai tampil |

## 3. Selama berjalan

- Pantau pesan 📍 di Telegram: sembunyikan nama tempat yang tidak pantas atau bukan parkir luar gedung.
- Kalau ada keberatan dari pemilik tempat atau pihak lain: tanggapi tenang; tempat bisa disembunyikan.
- Setiap rilis: `git push` lalu `npm run cek:tayang` (AGENTS.md bagian 9).
