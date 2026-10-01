# Rencana pemasaran JukirHub: Facebook (utama), Instagram, TikTok

Dibuat 1 Okt 2026, pola `docs/peluncuran/iklan.md` Adami. Wilayah: Makassar Raya (Makassar, Gowa, Maros, Takalar).
Angka biaya di bawah adalah **perkiraan awal untuk diuji**, bukan janji; ganti dengan angka nyata setelah minggu 1.

---

## 0. Ringkasan dalam 6 baris

1. **Tujuan:** mendapat **pelapor** (orang yang benar-benar mengirim laporan), bukan sekadar klik atau like.
2. **Saluran:** Facebook Ads lewat **Meta Ads Manager** (bukan tombol "Boost"), tayang di FB + IG sekaligus.
   TikTok dan IG organik memakai video yang sama.
3. **Bentuk iklan utama:** video vertikal 9:16, 15–30 detik, teks di layar (kebanyakan orang menonton tanpa suara).
4. **Nada:** info praktis dan adil ("cek dulu sebelum parkir", "jukir yang membantu layak bintang 5"), **bukan**
   kampanye anti-jukir atau tuduhan pungli.
5. **Pengukuran tanpa Meta Pixel:** tautan iklan memakai UTM → laporan dari pengunjung iklan ikut tercatat nama
   kampanyenya → `npm run kampanye` memberi jumlah pelapor per iklan → **biaya per pelapor**.
6. **Anggaran uji:** Rp 50.000/hari × 7 hari, lalu naikkan hanya iklan yang menghasilkan pelapor.

---

## 1. Hal penting sebelum mulai

### 1.1 Melapor hanya bisa dari lokasi parkir

JukirHub menolak laporan bila pelapor tidak berada ≤ 250 m dari tempatnya. Artinya **orang yang melihat iklan di
rumah belum bisa langsung melapor**. Konsekuensinya untuk iklan:

- Ajakan utama: **"Cek dulu sebelum parkir"** (bisa langsung dipakai) dan **"Laporkan saat parkir berikutnya"**.
- Ajak menyimpan app: "Simpan JukirHub di layar utama HP" (menu browser → Tambahkan ke layar utama).
- Kode kampanye disimpan di HP **30 hari**, jadi laporan yang dikirim beberapa hari setelah klik iklan tetap terhitung.
- Waktu tayang terbaik untuk iklan "laporkan sekarang": jam orang sedang keluar rumah (11.00–14.00 dan 16.00–21.00).

### 1.2 Syarat teknis (sekali saja)

- [ ] **Migrasi kampanye + deploy `lapor` sudah dijalankan pemilik** (lihat bagian "Langkah pemilik" di pesan rilis).
- [ ] **Halaman Facebook "JukirHub"**: kategori *Situs web* atau *Layanan komunitas*; foto profil = logo
      (`web/public/ikon-512.png`), sampul = poster halaman 1; tombol aksi "Kunjungi situs" → https://jukirhub.site.
      Isi 3–5 postingan organik dulu sebelum beriklan (Halaman kosong terlihat mencurigakan dan iklan sering ditahan).
- [ ] **Akun Instagram bisnis** dihubungkan ke Halaman (Meta Business Suite → Pengaturan → Akun Instagram).
- [ ] **Akun iklan** di Meta Business Suite, mata uang IDR, zona waktu Asia/Makassar, metode bayar diisi **oleh
      pemilik**. Aktifkan verifikasi 2 langkah di akun Facebook pemilik.
- [ ] **Akun TikTok** "jukirhub" (bisa akun pribadi/creator dulu, organik).
- [ ] Bio IG & TikTok memakai tautan ber-UTM (bagian 4).
- [ ] Uji tautan iklan sendiri: buka tautan ber-UTM di HP → alamat di browser berubah bersih tanpa `?utm_…`.

### 1.3 Yang tidak boleh (aturan iklan Meta & AGENTS.md bagian 4)

| Jangan | Kenapa | Ganti dengan |
|---|---|---|
| Wajah jukir, plat nomor, nama jalan + nama orang | privasi, bisa dianggap mempermalukan; melanggar prinsip JukirHub | tangan memegang karcis, ban motor, rekaman layar app, jukir dari belakang/jauh dan diburamkan |
| "Laporkan jukir liar!", "Basmi pungli!", "Jukir = preman" | menyerang kelompok; berisiko ditolak sebagai konten sosial/politik; memancing komentar panas | "Bantu sesama warga tahu kondisi parkir" |
| "Resmi", "bekerja sama dengan Dishub/Pemkot" | tidak benar, JukirHub independen | "Dari laporan warga" |
| "Kamu pasti sering dipalak jukir?" | menuduh/mengasumsikan pengalaman pribadi penonton | pertanyaan netral: "Pernah bingung bayar parkir berapa?" |
| Logo Pemkot / Dishub / Polri | klaim resmi palsu | logo JukirHub saja |
| Angka tarif "resmi" yang belum dicek | menyesatkan | "lihat tarif yang dibayar warga di app" |

**Kalau iklan ditolak sebagai "isu sosial, pemilu, atau politik":** jangan kirim ulang berkali-kali. Ubah kalimat ke
sisi info praktis (contoh di bagian 3), lalu ajukan banding sekali. Jalan terakhir: pemilik melakukan otorisasi iklan
isu sosial (verifikasi identitas + label "Dibayar oleh"), prosesnya beberapa hari.

---

## 2. Struktur kampanye di Ads Manager

### 2.1 Minggu 1: uji (Rp 50.000/hari, total ±Rp 350.000)

| Bagian | Pengaturan |
|---|---|
| Tujuan kampanye | **Traffic** (Lalu lintas) |
| Kategori iklan khusus | tidak ada (lihat 1.3 bila ditolak) |
| Anggaran | Advantage campaign budget **Rp 50.000/hari**, 7 hari |
| Konversi / lokasi tujuan | Situs web |
| Optimasi | **Klik tautan** (Landing page views butuh Pixel, tidak dipakai) |
| Lokasi | Makassar +15 km, Gowa (Sungguminasa), Maros, Takalar; pilih "Orang yang tinggal atau baru saja di lokasi ini" |
| Usia | 18–55 |
| Bahasa | Indonesia |
| Audiens | Advantage+ audience, tanpa minat tambahan (biarkan Meta mencari) |
| Penempatan | Advantage+ (FB Feed, FB Reels, IG Reels, IG Stories, FB Stories). Matikan Audience Network |
| Iklan | 4 iklan dalam 1 set: V1, V2, V3 (video) + G1 (gambar). Nama iklan = kode di tabel 3 |
| Tautan | `https://jukirhub.site/peta` |
| Parameter URL | `utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}` |
| Nama kampanye | `mks-uji-okt` (huruf kecil, strip, tanpa spasi; muncul apa adanya di `npm run kampanye`) |
| Tombol | **Pelajari selengkapnya** |

Isi *Parameter URL* di kolom "Parameter URL" bagian Pelacakan (bukan ditempel di tautan) supaya `{{ad.name}}` terisi
otomatis.

### 2.2 Minggu 2: perbesar yang berhasil

- Matikan iklan yang **CTR tautan < 0,6%** setelah menghabiskan ≥ Rp 40.000, atau yang **0 pelapor** di
  `npm run kampanye` setelah ≥ Rp 80.000.
- 1–2 iklan terbaik → naikkan anggaran **paling banyak +30% per 2 hari** (kenaikan besar sekaligus membuat Meta
  "belajar ulang").
- Buat 2 variasi baru dari iklan terbaik (hook 3 detik pertama berbeda, isi sama). Nama: `v1b`, `v1c`.

### 2.3 Minggu 3: penonton video → pengingat

Tanpa Pixel tetap bisa: **Audiens kustom → Video** (orang yang menonton ≥ 50% video JukirHub, 30 hari).

| Kampanye | Tujuan | Audiens | Anggaran |
|---|---|---|---|
| `mks-jangkau-okt` | Interaksi → ThruPlay | luas (seperti 2.1) | Rp 30.000/hari, video V1/V3 |
| `mks-ingat-okt` | Traffic → Klik tautan | penonton video ≥ 50% | Rp 20.000/hari, iklan "laporkan saat parkir berikutnya" (V4) |

### 2.4 Minggu 4: evaluasi

Hitung biaya per pelapor (bagian 5), putuskan lanjut / ganti materi / berhenti. Catat hasilnya di AGENTS.md bagian 11.

### 2.5 Tingkat anggaran

| Tingkat | Per hari | Per bulan | Kapan |
|---|---|---|---|
| Uji | Rp 50.000 | ±Rp 1,5 jt | minggu 1–2, materi belum terbukti |
| Tumbuh | Rp 100.000–150.000 | ±Rp 3–4,5 jt | ada iklan dengan biaya per pelapor di bawah target |
| Dorong | Rp 250.000+ | ±Rp 7,5 jt+ | hanya bila peta sudah ramai di banyak kecamatan dan target per pelapor tetap tercapai |

---

## 3. Materi iklan

Semua video: **9:16, 1080×1920, 15–30 detik**, teks di layar sepanjang video, logo JukirHub kecil di pojok, detik
terakhir = rekaman layar app + `jukirhub.site`. Rekam di HP sendiri; potong & beri teks dengan CapCut
(fitur teks otomatis, lalu periksa ejaannya). Musik: pakai pustaka musik bebas lisensi bawaan Meta/CapCut, **bukan**
lagu populer (iklan bisa diturunkan karena hak cipta).

Rekaman layar app: tema gelap (bawaan) lebih kontras di video; matikan notifikasi HP; pakai tempat yang benar-benar
pernah dilaporkan.

### V1 `v1-cek-dulu`: "Cek dulu sebelum parkir" (utama)

| Detik | Gambar | Teks di layar / suara |
|---|---|---|
| 0–3 | tangan memarkir motor di depan minimarket, jukir tidak terlihat jelas | **"Parkir di sini, jukirnya bantu atau cuma duduk?"** |
| 3–8 | rekaman layar: buka JukirHub → peta → ketuk minimarket | "Sekarang bisa dicek dulu." |
| 8–15 | lembar tempat: membantu saat pergi (4 dari 5), tarif yang dibayar, bintang | "Laporan warga: membantu atau tidak, bayar berapa, rating." |
| 15–22 | tombol Laporkan parkir → form terisi cepat → sukses | "Habis parkir? Lapor 20 detik. Tanpa akun." |
| 22–27 | logo + alamat | **"JukirHub. Cek dulu sebelum parkir."** jukirhub.site |

Teks utama iklan:
> Parkir di depan toko, jukirnya membantu atau tidak? Bayar berapa biasanya? Sekarang bisa dicek dari laporan
> warga Makassar di JukirHub. Gratis, tanpa akun, tanpa unduh aplikasi.

Judul: **Cek info parkir sebelum berangkat** · Deskripsi: Laporan warga Makassar Raya

### V2 `v2-tanpa-jukir`: "Parkir di sini gratis" (positif, cocok untuk cafe Anda)

| Detik | Gambar | Teks di layar |
|---|---|---|
| 0–3 | depan cafe, area parkir tanpa jukir | **"Di cafe ini parkirnya gratis. Beneran."** |
| 3–10 | rekaman layar: penanda ✓ "Tanpa jukir" di peta | "Tempat tanpa jukir juga bisa dilaporkan." |
| 10–18 | form "Ada jukir di tempat ini?" → **Tidak ada** → kirim | "Bantu orang lain tahu: parkir di mana yang gratis." |
| 18–24 | logo + alamat | "Cek & laporkan di JukirHub." |

Catatan: cafe pemilik boleh tampil, asalkan laporannya **benar** (memang tanpa jukir) dan dikirim dari lokasi.

### V3 `v3-bintang-lima`: "Jukir yang membantu layak bintang 5" (adil, meredam komentar panas)

| Detik | Gambar | Teks di layar |
|---|---|---|
| 0–3 | jukir dari belakang/jauh menyeberangkan motor (diburamkan) | **"Ada jukir yang benar-benar membantu."** |
| 3–10 | rekaman layar: lapor "Saat pergi: membantu" + ★★★★★ | "Kasih tahu warga lain. Bintang 5 untuk yang membantu." |
| 10–18 | ringkasan tempat dengan rating tinggi | "Yang cuma duduk, juga bisa dilaporkan apa adanya." |
| 18–24 | logo | "JukirHub. Dari warga, untuk warga." |

### V4 `v4-parkir-berikutnya`: pengingat (untuk penonton video, minggu 3)

15 detik. "Sudah lihat JukirHub? Parkir berikutnya, luangkan 20 detik untuk melapor." → rekaman form → "Simpan di
layar utama HP biar gampang dibuka." → menu browser "Tambahkan ke layar utama".

### G1 `g1-peta`: gambar 4:5 (1080×1350) dan 1:1 (1080×1080)

Tangkapan layar peta dengan beberapa penanda + kartu ringkasan, judul besar **"Info parkir dari laporan warga
Makassar"**, sub "Membantu atau tidak · bayar berapa · rating". Teks di gambar sedikit saja (Meta menurunkan jangkauan
gambar yang penuh teks).

### Ide video berikutnya (bila V1–V3 sudah jalan)

- **"Berapa yang biasa dibayar warga di …"**: seri per kawasan (Pettarani, Panakkukang, Somba Opu) dari data asli
  di app. Hanya buat setelah ada cukup laporan di kawasan itu.
- **Wawancara jalanan** tanpa wajah: "Pernah bingung bayar parkir berapa?" (hanya suara + tangan).
- **Duet/stitch TikTok** dengan video viral soal parkir: tanggapi dengan nada tenang, tunjukkan app.

---

## 4. Tautan ber-UTM (selain iklan berbayar)

Gunakan huruf kecil, tanpa spasi. Semua mengarah ke `/peta`.

| Tempat | Tautan |
|---|---|
| Bio Instagram | `https://jukirhub.site/peta?utm_source=instagram&utm_medium=bio&utm_campaign=organik` |
| Bio TikTok | `https://jukirhub.site/peta?utm_source=tiktok&utm_medium=bio&utm_campaign=organik` |
| Postingan Halaman FB | `https://jukirhub.site/peta?utm_source=facebook&utm_medium=organik&utm_campaign=halaman` |
| Grup FB warga | `…?utm_source=facebook&utm_medium=grup&utm_campaign=<nama-grup-singkat>` |
| WhatsApp | `…?utm_source=whatsapp&utm_campaign=<grup-singkat>` |

Klik dari Facebook tanpa UTM tetap tercatat sebagai `facebook/tanpa-utm/-`.

---

## 5. Angka yang dipantau

| Angka | Dari mana | Perkiraan awal untuk diuji |
|---|---|---|
| CTR tautan | Ads Manager | ≥ 1% bagus, < 0,6% ganti materi |
| Biaya per klik tautan (CPC) | Ads Manager | Rp 300–1.500 |
| ThruPlay / tonton 50% | Ads Manager | hook 3 detik pertama berhasil bila tonton 3 detik ≥ 30% tayangan |
| **Pelapor per iklan** | `npm run kampanye` | — |
| **Biaya per pelapor** | biaya iklan ÷ pelapor | target awal ≤ Rp 10.000; sesuaikan setelah minggu 1 |
| Tempat dengan ≥ 3 laporan | peta / tab Daftar | naik tiap minggu (indikasi mulai tampil) |

```bash
npm run kampanye
```

```bash
npm run kampanye -- 7
```

Kolom "pelapor" dihitung per hari lalu dijumlah, jadi orang yang melapor di dua hari berbeda terhitung dua kali
(angka sedikit di atas kenyataan). Laporan dari tautan kampanye tetap lewat semua pemeriksaan biasa (lokasi, batas
per perangkat), jadi angka ini tidak bisa "dipompa" dari rumah.

---

## 6. Instagram & TikTok (organik)

- **Video sama** dengan iklan (9:16), unggah langsung di masing-masing app supaya teks & musik bawaannya dipakai.
- **Frekuensi:** 3 video/minggu di TikTok & IG Reels; 1 carousel IG/minggu ("5 hal yang bisa dicek di JukirHub").
- **Caption pendek + 3–5 tagar:** `#makassar #infomakassar #parkirmakassar #jukir #gowa`.
- **Jam unggah:** 12.00 atau 19.00–21.00 WITA.
- **TikTok Ads:** tunda. Mulai hanya bila video organik TikTok sudah ada yang ditonton > 5.000 kali (itu tanda
  materinya cocok, lalu "Promote" video itu dengan tautan ber-UTM `utm_source=tiktok&utm_medium=paid`).

## 7. Facebook organik & grup

- **Halaman:** 3 postingan/minggu: video (sama dengan iklan), tangkapan layar tempat dengan banyak laporan, ajakan
  "tempat parkir mana yang belum ada di JukirHub?".
- **Grup FB lokal** (info Makassar, komunitas ojol, jual-beli per kecamatan): **izin admin dulu**, 1 kali per grup,
  pakai teks `teks-whatsapp.md` §1 + tautan grup (bagian 4). Jangan menyebar ke banyak grup dalam satu hari (akun
  bisa dibatasi sebagai spam).
- **Postingan viral soal parkir/jukir di grup:** boleh ikut berkomentar sopan + tautan, sekali saja, tanpa menyudutkan
  siapa pun.

---

## 8. Jadwal 4 minggu

| Minggu | Organik | Iklan | Target |
|---|---|---|---|
| 0 (persiapan) | Halaman FB + IG + TikTok dibuat, 3–5 postingan, rekam V1–V3 & G1; cold start ±20 laporan sungguhan | — | peta tidak kosong di kawasan utama |
| 1 | 3 video TikTok/IG, grup FB tahap 1 (5 grup) | `mks-uji-okt` Rp 50 rb/hari | tahu iklan mana yang menghasilkan pelapor |
| 2 | 3 video + 1 carousel, grup tahap 2 | perbesar 1–2 iklan terbaik, 2 variasi baru | biaya per pelapor turun |
| 3 | seri "per kawasan" bila data cukup | `mks-jangkau-okt` + `mks-ingat-okt` | laporan berulang di tempat yang sama |
| 4 | rekap: "X tempat sudah dilaporkan warga" | evaluasi, putuskan anggaran bulan 2 | catat hasil di AGENTS.md bagian 11 |

---

## 9. Membalas komentar

Prinsip: tenang, singkat, tidak berdebat, tidak menyebut orang/tempat tertentu. Sembunyikan (bukan hapus) komentar
yang memuat nomor HP, plat nomor, wajah/nama jukir, atau kata kasar. Jangan membalas dengan data laporan pribadi.

| Komentar | Balasan |
|---|---|
| "Ini resmi dari pemerintah?" | Bukan, JukirHub independen dan tidak berafiliasi dengan Dishub/Pemkot. Isinya laporan warga, jadi anggap sebagai petunjuk. |
| "Jukir juga cari makan, kasihan" | Setuju, makanya ada pilihan "membantu" dan bintang 5. Jukir yang membantu juga kelihatan di JukirHub. |
| "Data saya aman?" | Tanpa akun, tanpa nama, tanpa nomor HP. Lokasi hanya untuk memastikan Anda di tempat, tidak ditampilkan, dan dihapus setelah 7 hari. |
| "Tempat saya tidak ada di peta" | Saat berada di sana, buka Peta → "Tempat tidak ada di peta? Laporkan di lokasi saya". |
| "Kenapa harus di lokasi?" | Supaya laporan dari orang yang benar-benar parkir di sana, bukan dari rumah. |
| "Jukir di X tukang palak!" | Terima kasih. Silakan laporkan langsung dari lokasi lewat app supaya tercatat dan dihitung bersama laporan warga lain. (lalu sembunyikan bila menyebut nama/ciri orang) |
| Komentar marah/provokatif | Tidak dibalas, atau satu kali: "Terima kasih masukannya." |
| Pemilik usaha keberatan | Minta hubungi lewat pesan Halaman; tempat bisa disembunyikan pemilik JukirHub (Telegram 🙈). |

---

## 10. Setelah 1 bulan: lanjut atau berhenti?

- **Lanjut & naikkan** bila biaya per pelapor ≤ target dan jumlah tempat dengan ≥ 3 laporan naik tiap minggu.
- **Ganti materi** bila klik banyak tapi pelapor sedikit (orang tertarik melihat, tapi tidak melapor): perbanyak
  pesan "laporkan saat parkir berikutnya" dan "simpan di layar utama".
- **Berhenti iklan, fokus organik** bila biaya per pelapor > 3× target setelah 2 kali ganti materi.
