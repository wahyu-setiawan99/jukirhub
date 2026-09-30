# AGENTS.md — JukirHub

Pedoman bersama untuk semua asisten AI (Claude Code, Cursor/Grok, dan lainnya) serta manusia yang mengerjakan
repo ini. Baca sampai habis sebelum mengubah apa pun. Kalau ada yang bertentangan dengan permintaan pemilik
proyek di chat, tanyakan dulu.

**JukirHub meniru Adami** (`../Adami App`, https://adami.tech): pola kerja, tech stack, struktur repo, tampilan,
font, ukuran huruf, keamanan, dan SEO. Yang berbeda hanya isi (juru parkir, bukan SPBU) dan **warna tema**
(bagian 6.3). Bila ragu soal cara mengerjakan sesuatu, lihat cara Adami mengerjakannya. Repo Adami **hanya
dibaca**: salin polanya ke sini lalu sesuaikan nama (`adami_` → `jukirhub_`), jangan pernah mengubah file di sana.

**Mulai dari bagian 1.2 (Prioritas dasar).** Itu inti produk yang dikerjakan lebih dulu. Kalau bagian lain
bertentangan dengan 1.2, **1.2 yang berlaku**; fitur di luar 1.2 hanya dikerjakan bila pemilik memintanya.

Terakhir diperbarui: 26 Sept 2026.

---

## 0. Cara bekerja dengan pemilik proyek

- Komunikasi dalam **Bahasa Indonesia**.
- **Beri masukan dan tanya dulu** sebelum mengubah file atau script yang sudah jadi. Untuk perubahan tampilan,
  tunjukkan visualisasi/mockup dulu supaya satu persepsi. Kalau pemilik minta "planning dulu" atau "jangan diubah
  dulu", jangan ubah kode sama sekali.
- Beri pilihan dengan rekomendasi dan alasannya, termasuk perkiraan biaya bila memakai layanan berbayar.
  Hindari layanan yang mewajibkan kartu kredit kecuali pemilik menyetujuinya.
- **Git:** kerja langsung di `main`, tanpa PR atau cabang (repo belum dibuat, lihat bagian 11). Setelah deploy
  tersambung, **push ke `main` = langsung tayang**. Jangan push tanpa izin; setelah selesai mengubah kode, tawarkan
  pilihan "commit saja" atau "commit & push".
- Pesan commit jelas, dalam bahasa Indonesia. Tulis juga yang belum selesai (mis. "perlu dicek").
- Sebelum commit: `npm test` dan `npm run build --prefix web` harus lolos.
- **Setiap perubahan wajib tetap ramah HP, cepat, dan kuat SEO-nya** (bagian 7). Kalau ada yang terpaksa
  dikorbankan, jelaskan ke pemilik sebelum dikerjakan.
- Setiap selesai push, cek tampilan di situs langsung (bagian 9) dan laporkan hasilnya ke pemilik.
- Berganti alat/model AI: commit dulu, dan baca ulang file sebelum mengubahnya (file bisa sudah diubah alat lain).

---

## 1. Produk

**JukirHub** menampilkan info **juru parkir (jukir) di luar gedung** dari laporan warga: apakah jukir membantu,
berapa tarif yang biasa ditarik, rating, dan **indikasi pungli** di setiap tempat. Tujuannya supaya warga dan
pemerintah (Dishub, Bapenda, Pemda) tahu aktivitas parkir di wilayahnya. Estimasi perputaran uang parkir dan
dashboard per wilayah adalah tujuan lanjutan (bagian 10, ditunda). Bukan layanan resmi pemerintah; setiap tampilan
data memuat disclaimer itu.

| | |
|---|---|
| Web | https://jukirhub.vercel.app (Vercel, deploy otomatis dari `main`; domain sendiri belum, bagian 11) |
| Backend | Supabase, proyek khusus JukirHub, ref `dcjnufascffooyotwqki` (https://dcjnufascffooyotwqki.supabase.co) |
| Repo | https://github.com/wahyu-setiawan99/jukirhub (cabang `main`) |
| Rujukan | repo Adami di `../Adami App` (baca saja) |

**Jangan pernah menyentuh proyek Supabase lain** di akun yang sama: Adami (`pylduwdknbaslmbrimjg`),
"airpresales", dan lainnya.

**Termasuk:** parkir tepi jalan umum, depan toko/minimarket/ruko/warung/ATM/sekolah/masjid, bahu jalan, lahan
kosong yang dijaga jukir, parkir acara.
**Tidak termasuk:** parkir resmi berpalang/bergedung (mall, basement, gedung parkir, bandara, rumah sakit dengan
gate/mesin tiket). Layar tambah titik menanyakan ini dan menolak dengan ramah.

Pengguna utama: pengendara motor dan mobil, warga sekitar, dan petugas Dishub/Bapenda/Pemda yang membaca data.

### 1.1 Prinsip produk (wajib)

1. **Indikasi, bukan tuduhan.** Tidak pernah menyebut seseorang "pelaku pungli". Label hanya
   "Indikasi pungli: rendah / sedang / tinggi" atau "Data belum cukup". Hindari kata "pelaku", "preman",
   "pemeras"; pakai "dilaporkan", "terindikasi".
2. **Tanpa identitas jukir**: tidak ada nama, foto wajah, nomor HP, atau ciri pribadi (bagian 4).
3. **Pelapor tanpa akun, tidak dikenali** (sama dengan Adami): kunci perangkat yang di-hash, lapor wajib di lokasi.
4. **Sederhana dulu.** Satu pertanyaan = satu ketukan. Jangan menambah isian, layar, tabel, atau layanan di luar
   bagian 1.2–1.3 tanpa persetujuan pemilik.
5. **Tarif resmi harus punya sumber** (nomor Perda/Perwali/Perbup + tautan) dan diperiksa pemilik.
   AI tidak boleh mengarang angka tarif.
6. **Jujur soal sedikitnya data**: tampilkan jumlah laporan di setiap kesimpulan.
7. Bahasa tidak alarmis, mobile-first, lapor selesai **< 30 detik**.

### 1.2 Prioritas dasar (kerjakan ini dulu, jangan over-engineering)

Keputusan pemilik 26 Sept 2026. Seluruh app versi pertama hanya berisi alur ini:

```
Peta ──► pilih tempat (ketuk di peta / cari nama) ──► lembar tempat ──► [Laporkan parkir] ──► form 1 layar ──► kirim
  ▲                                                                                                          │
  └──────────────────────── tempat muncul di peta dengan warna indikasi pungli ◄─────────────────────────────┘
```

**1. Pilih tempat** (tab Peta):

- **Ketuk nama/ikon tempat di peta dasar.** Peta OpenFreeMap (MapLibre) sudah memuat nama toko, minimarket, warung,
  ATM, masjid, sekolah dari OpenStreetMap. Mengetuknya mengambil nama + koordinat langsung dari tile, tanpa layanan lain.
- **Cari nama tempat** lewat kolom cari di atas peta: (1) tempat yang sudah dilaporkan dicari langsung di data yang
  sudah dimuat (instan); (2) tempat lain dicari di **Nominatim OpenStreetMap** saat pengguna menekan Cari (bukan
  setiap huruf, sesuai aturan Nominatim), dibatasi kotak Makassar Raya, maks. 5 hasil, atribusi OSM. **Tidak memakai
  Google Places** (berbayar, perlu kartu kredit, dan ketentuannya melarang menyimpan datanya).
- **Tekan lama di peta** untuk tempat tanpa nama di peta (mis. pinggir jalan): pin + isi nama singkat (≤ 60 huruf).
- **"Tidak ada di peta? Laporkan di lokasi saya"** (hasil cari & panel peta): pin di posisi GPS pengguna, nama dari
  kolom cari (bisa diubah di form), langsung membuka form. Untuk tempat yang belum ada di OpenStreetMap (mis. cafe
  baru). **Tidak menerima link Google Maps** (keputusan 30 Sept: membuka link = akses otomatis & menyalin data Google,
  bagian 5; lokasi pelapor tetap wajib).
- Tombol bilah bawah **"Laporkan parkir"** di tab lain membuka Peta di lokasi pengguna dengan petunjuk
  "Ketuk tempat Anda parkir".

**2. Lembar tempat** (setengah layar, pola lembar SPBU Adami):

- **Belum ada laporan:** "Belum ada laporan parkir di sini" + tombol **Laporkan parkir**.
- **Sudah ada laporan:** indikasi pungli (level + alasan utama), jukir membantu (saat datang / saat pergi, "x dari y
  laporan"), tarif yang biasa dibayar (median, sesuai Motor/Mobil di header), ★ rata-rata (jumlah), tombol
  **Laporkan parkir** dan **Petunjuk arah**. Disclaimer singkat.

**3. Form laporan** (satu layar, tanpa langkah bertahap, semua tombol besar):

| # | Pertanyaan | Pilihan | Wajib |
|---|---|---|---|
| 1 | **Saat datang**, jukir… | Membantu · Tidak membantu | ya |
| 2 | **Saat mau pergi**, jukir… | Membantu · Tidak membantu | ya |
| 3 | **Bayar berapa?** | 0 · 1.000 · 2.000 · 3.000 · 5.000 · Lainnya (ketik) | ya |
| 4 | **Ada indikasi pungli?** (pilih yang dialami, boleh kosong) | Tidak diberi karcis · Tarif kemahalan · Memaksa / marah · Ada tulisan "parkir gratis" | tidak |
| 5 | **Rating** | ★ 1–5 | ya |

- Kendaraan diambil dari pilihan **Motor / Mobil** di header (bukan pertanyaan tersendiri), ditampilkan di form dan
  bisa diganti di situ.
- Tanpa teks bebas (kecuali nama tempat baru), tanpa foto, tanpa akun.
- Laporan dikirim satu kali, biasanya saat mau pergi (kedua pertanyaan dijawab sekaligus). Tidak ada laporan dua
  tahap.

**4. Tampilan di peta:**

- **Tempat yang sudah dilaporkan** = bulatan penanda berwarna level indikasi pungli (rendah / sedang / tinggi) +
  ikon; **abu-abu bergaris** = baru 1–2 laporan (data belum cukup). Jauh = dikelompokkan (gugus berangka).
- **Tempat yang belum dilaporkan tidak diberi penanda apa pun.** Peta dasar sudah menampilkan nama tempatnya;
  memberi penanda pada ribuan tempat membuat peta berat dan terkesan ada jukir di semua tempat. Legenda menulis:
  "Tanpa penanda = belum ada laporan. Ketuk tempat untuk melapor."
- Saat pengguna mengetuk tempat tanpa penanda, lembar "Belum ada laporan" muncul (poin 2).

**5. Aturan yang tetap berlaku di versi sederhana:** lapor hanya dari dekat tempat (bagian 6.1), tanpa identitas
jukir/pelapor (bagian 4), indikasi bukan tuduhan (1.1), ambang tampil level pungli (6.2).

**Ditunda (jangan dikerjakan sebelum 1.2 selesai dan pemilik meminta):** estimasi pendapatan / mode amati, tab Data
dan dashboard per wilayah, rincian kerja jukir, atribut resmi, tag sikap, foto, notifikasi, koin, halaman statis per
tempat.

### 1.3 Setelah alur dasar jalan: riwayat + komentar, dan berita parkir

Keputusan pemilik 26 Sept 2026. Dikerjakan **setelah** 1.2 tayang (bagian 10: M4 lalu M5), karena keduanya butuh
moderasi dan kunci AI yang berjalan. Tetap sederhana: satu komentar per laporan, satu daftar berita per tempat.

#### 1.3.1 Riwayat laporan + komentar (M4)

- **Riwayat** di lembar tempat, di bawah ringkasan: 10 laporan terbaru + "Tampilkan lebih banyak". Tiap baris:
  waktu ("2 jam lalu"), Motor/Mobil, datang/pergi membantu atau tidak, bayar, indikasi pungli yang dipilih, bintang,
  dan komentarnya bila ada. Penulis selalu "Warga" (tanpa nama samaran, tanpa identitas).
- **Komentar melekat pada laporan** (isian ke-6 di form 1.2, opsional, ≤ 200 huruf, "Ceritakan singkat pengalaman
  parkir Anda"). Satu laporan = maks. satu komentar, **tanpa balas-membalas**. Alasannya: komentar ikut lolos gerbang
  lokasi & batas laporan (bagian 6.1), jadi tidak bisa dipakai menyerang tempat dari jauh.
- **Moderasi sebelum tampil** (komentar = teks bebas, risiko UU ITE bagi JukirHub):
  1. Saringan server (`_shared/komentar.js`, aturan pasti, dites): tolak nomor HP, email, tautan, NIK/angka panjang,
     plat nomor (mis. `DD 1234 XY`), kata kasar dari daftar. Ditolak → pelapor diberi tahu alasannya, laporan tetap
     tersimpan tanpa komentar.
  2. Pemeriksaan AI (Gemini, pola Adami 10.1) **di latar** setelah laporan tersimpan: memilih satu dari daftar tetap
     `layak` · `menyebut_identitas` (nama/ciri orang) · `tuduhan_pidana` (menuduh orang tertentu) · `kasar` · `spam` ·
     `tidak_relevan`. Hanya `layak` yang tampil. Gagal/tanpa kunci AI → `menunggu`, ditinjau pemilik
     (`npm run moderasi`, kabar Telegram).
  3. Tombol **"Laporkan komentar"** di tiap komentar: aduan dari ≥ 3 perangkat berbeda → disembunyikan otomatis dan
     masuk antrean pemilik.
- Komentar **tidak memengaruhi** skor pungli, bintang, atau ringkasan (hanya dibaca manusia).
- **Data:** tabel `komentar` (`laporan_id` unik, `titik_id`, `isi`, `status` `menunggu`/`tampil`/`ditolak`/
  `disembunyikan`, `alasan`, `dibuat`), `aduan_komentar` (`komentar_id`, `reporter_key` hash, `dibuat`); view
  `riwayat_publik` (kolom laporan tanpa kunci/lokasi/bobot + komentar berstatus `tampil`).
- Info memuat cara meminta penghapusan komentar (pemilik tempat / pihak yang disebut).

#### 1.3.2 Berita parkir di detail tempat (M5)

Pola feed berita Adami (Adami AGENTS.md 10.6), ditambah pencocokan lokasi:

1. **Ambil** (Edge Function `berita`, pg_cron tiap 3 jam): RSS media yang mengizinkan akses otomatis, dimulai dari
   media Sulsel yang sudah dicek di Adami (`_shared/berita.js` Adami); setiap sumber baru dicek dulu. **Tidak** dari
   Google News atau situs yang menolak bot. Saring kata kunci dulu (parkir, jukir, juru parkir, retribusi parkir,
   parkir liar, pungli parkir) supaya panggilan AI hemat.
2. **AI mendeteksi** (Gemini, keluaran JSON divalidasi server): relevan tidaknya (tentang parkir di Makassar Raya),
   **frasa lokasi** yang disebut (nama tempat / jalan / kecamatan / kota, **harus muncul persis** di judul atau
   cuplikan), tingkat presisi (`tempat`, `jalan`, `kecamatan`, `kota`), dan ringkasan netral 1–2 kalimat. Maks.
   100 panggilan per hari; lewat batas atau gagal → berita dilewati.
3. **Cari koordinat** frasa lokasi lewat Nominatim di server (maks. 1 permintaan/detik, hasil disimpan), harus di
   dalam kotak Makassar Raya.
4. **Selipkan ke tempat:** presisi `tempat`/`jalan` → tampil di lembar tempat yang berjarak ≤ **300 m** sebagai
   **"Berita parkir di sekitar sini"** (judul, media, tanggal, ringkasan AI, jarak/lokasi, tautan). Presisi
   `kecamatan`/`kota` → **tidak** diselipkan ke tempat, hanya di daftar "Berita parkir terbaru" (Beranda/Info).
   Tampil 90 hari sejak terbit.
- **Pagar hukum:** berita ditempel berdasarkan **kedekatan lokasi**, bukan berarti berita itu tentang jukir di tempat
  ini. Label wajib: "Dicocokkan otomatis dari lokasi yang disebut berita · bisa keliru". Berita tidak memengaruhi
  skor pungli.
- **Hak cipta:** hanya judul, nama media, tanggal, ringkasan buatan sendiri, dan tautan `nofollow noopener`; isi dan
  gambar artikel tidak disalin.
- **Data:** tabel `berita` (`judul`, `media`, `tautan` unik, `terbit`, `ringkasan`, `lokasi_teks`, `presisi`, `lat`,
  `lng`, `kota`, `relevan`, `disembunyikan`, `dibuat`); view `berita_publik`; fungsi `berita_sekitar(titik_id)`.
  Pemilik bisa menyembunyikan satu berita (`npm run berita -- sembunyikan <id>`).
- Secret `GEMINI_API_KEY` dipasang pemilik di proyek Supabase **JukirHub** (bukan disalin dari Adami oleh AI);
  dipakai juga untuk pemeriksaan komentar (1.3.1).

---

## 2. Struktur repo (meniru Adami)

| Folder / file | Isi |
|---|---|
| `web/` | Web app: React 19, Vite 8, react-router 7, MapLibre 6 (dimuat belakangan), PWA dengan service worker tulisan tangan |
| `web/src/pages/` | Beranda, Peta (di `App.jsx` + `components/Peta.jsx`), Daftar, Info |
| `web/src/components/` | Komponen React (nama bahasa Indonesia: `Peta.jsx`, `CariTempat.jsx`, `LembarTempat.jsx`, `LaporLayar.jsx`, `Legenda.jsx`) |
| `web/src/lib/` | Logika web tanpa React bila memungkinkan: `data.js` (baca view publik lewat `fetch` REST, tanpa supabase-js), `tempat.js` (gabung data, cocokkan tempat, kalimat ringkasan), `lokasi.js`, `cari.js` (Nominatim), `offline.js`, `seo.js`, `tema.js`, `koneksi.js`, `konten-beranda.js`, `util.js` |
| `web/src/state.jsx` | Context app: data tempat + ringkasan, posisi pengguna, kendaraan terpilih (motor/mobil) |
| `web/src/app.css` | **Satu file CSS**, semua warna lewat variabel (bagian 6.3) |
| `supabase/functions/` | Edge Function: `lapor` (juga membuat tempat baru bila belum ada), `komentar` (periksa komentar di latar, M4), `berita` (M5), nanti `telegram` (kabar ke pemilik) |
| `supabase/functions/_shared/` | Modul bersama. File `.js` = ESM murni, dipakai web (alias `@shared`), Edge Function, dan tes. File `.ts` hanya untuk Edge Function |
| `supabase/migrations/` | Skema, RLS, view publik, retensi, cron |
| `supabase/seed.sql` | Dibuat otomatis dari `scripts/`, jangan diedit manual |
| `scripts/` | Seed tarif, moderasi, setup rahasia, ikon |
| `scripts/data/` | `tarif-resmi.json` (diisi/diperiksa pemilik) |
| `tests/` | `node:test`, satu file per modul |
| `docs/` | Dokumen pendukung, materi peluncuran |

---

## 3. Perintah

| Perintah | Fungsi |
|---|---|
| `npm test` | Semua tes (`node --test "tests/**/*.test.js"`) |
| `npm run dev --prefix web` | Server dev (Supabase lokal di `web/.env.local`) |
| `npm run build --prefix web` | Build produksi (sekaligus membuat HTML statis SEO, robots, sitemap) |
| `npm run seed` | Buat ulang `seed.sql` dari `scripts/data/` (tarif resmi) — dibuat saat tarif diisi pemilik |
| `npm run moderasi` | Tinjau titik baru / sembunyikan titik atau laporan |
| `npm run ikon` | Buat ulang favicon, ikon HP, dan `og.png` dari `web/src/lib/logo.js` |
| `npm run cloud:secrets`, `bot:setup`, `pemantauan:setup` | **Dijalankan pemilik** (menyentuh rahasia) |
| `npx supabase db push` | Terapkan migrasi baru ke cloud |

Perintah yang menyentuh rahasia atau deploy ditulis dalam blok `bash` supaya pemilik menjalankannya sendiri.

**Port lokal dibedakan dari Adami** supaya keduanya bisa jalan bersamaan: server dev web **5174** (preview 4174),
Supabase lokal **55321** (API), 55322 (db), 55323 (studio), 55324 (email) — lihat `supabase/config.toml`.

---

## 4. Keamanan, privasi, dan hukum — wajib

- Kunci `service_role` **hanya** ada di environment Edge Function. Tidak pernah di `web/`, repo, log, atau commit.
- Rahasia hanya di `supabase/functions/.env.cloud` (di-gitignore). Jangan membaca atau menampilkan isinya.
- **AI tidak mengetik, menyalin, atau meminta** token, password, atau API key. Pemilik yang menjalankan script
  rahasia dan login CLI.
- Anon **tidak punya SELECT** ke tabel mentah. Web hanya membaca view publik (`titik_publik`, `ringkasan_titik_publik`,
  `tarif_publik`).
- **Semua penulisan lewat Edge Function**; tidak ada insert langsung dari client. Validasi di server.
- **Bobot laporan tidak pernah keluar dari server.** Skor dan estimasi dihitung Edge Function; view publik hanya
  berisi hasil (level, rentang, keyakinan, jumlah laporan, alasan utama).
- `reporter_key` dan `ip_hash` adalah hash bersalt. Tampilan publik dan ekspor **tidak memuat koordinat, IP,
  atau identitas pelapor**.
- **Retensi:** setelah 7 hari, `lat`, `lng`, `akurasi_m`, `jarak_m`, `ip_hash` laporan dikosongkan (pg_cron). Titik,
  jawaban laporan, dan waktu tetap disimpan untuk riwayat.
- **Deteksi GPS palsu diam-diam** (pola `deteksi-gps.js` Adami): laporan tetap diterima dengan bobot 0,2, pelapor
  tidak diberi tahu.
- **Tanpa identitas jukir:** tidak ada kolom nama, NIK, nomor HP, plat, ciri fisik, atau foto jukir.
- **Teks bebas hanya dua:** **nama tempat** (≤ 60 huruf) saat melapor di tempat tanpa nama di peta, dan
  **komentar opsional** (≤ 200 huruf, mulai M4). Keduanya disaring server (tanpa nomor HP, tautan, plat, kata kasar,
  nama orang); komentar juga diperiksa AI dan baru tampil bila lolos (bagian 1.3.1). Isian lain berupa pilihan dan
  bintang dari daftar tetap.
- **Foto belum ada** di versi awal (bagian 10). Bila dibuat: bucket privat, EXIF dibuang di HP, moderasi dulu,
  wajah dan plat tidak boleh terlihat.
- Setiap halaman titik memuat disclaimer: "Data dari laporan warga, belum diverifikasi pihak berwenang."
  Info memuat cara menyampaikan keberatan (pemilik tempat / pihak resmi).
- Uji di produksi: jangan kirim laporan palsu. Kalau terpaksa menulis data uji, bersihkan lagi.

---

## 5. Data titik parkir, wilayah, dan tarif resmi

**Tempat (titik parkir) tidak diisi lebih dulu.** Tempat baru tercatat saat **laporan pertamanya** masuk: dari
tempat yang diketuk di peta dasar / hasil cari Nominatim (nama + `osm_ref`, mis. `node/123`, bila ada) atau dari pin
tekan lama (nama diketik). Server memakai tempat yang sudah ada bila `osm_ref` sama atau ada tempat aktif dalam
radius **30 m** dengan nama mirip; bila tidak, membuat tempat baru.

**Kolom `titik_parkir` (versi sederhana):** `id`, `nama`, `osm_ref` (opsional), `lat`, `lng` (`geom`), `kota`
(opsional), `status` (`aktif`, `disembunyikan`), `dibekukan`, `dibuat_oleh` (hash), `dibuat`.

Tempat **disembunyikan, bukan dihapus**, jadi riwayat laporan tetap aman. **Pemilik dikabari lewat Telegram tiap tempat
baru** (nama, asal nama: diketik warga / peta / cari, tautan OpenStreetMap) dengan tombol **Sembunyikan** (bisa dibatalkan
"Tampilkan lagi"). Tidak ada halaman moderasi: tempat yang tidak disembunyikan pemilik dianggap sah (keputusan 30 Sept).
Kode: `_shared/kabar-pemilik.js` (pesan & tombol), `_shared/telegram.ts`, `lapor` (kabar di latar setelah tempat dibuat),
Edge Function `telegram` = `telegram/proses.js` + `index.ts` (secret webhook + hanya chat pemilik). Pesan tanpa data pelapor.

Nama tempat dan peta dari **OpenStreetMap** (ODbL, atribusi wajib). **Jangan menyalin data dari Google Maps**
(dilarang ketentuan Google), termasuk nama tempat, foto, dan ulasan.

**Tarif resmi** (`scripts/data/tarif-resmi.json` → tabel `tarif_resmi`): `kota`, `kendaraan`, `tarif`,
`dasar_hukum` (mis. nomor Perda), `sumber_url`, `berlaku_sejak`, `diperiksa_pemilik` (bool). Alurnya sama dengan
nomor SPBU di Adami: AI boleh menyiapkan lembar isian dan tautan sumber; **pemilik** memeriksa dan mengisi
angkanya. Tarif yang belum diperiksa tidak dipakai untuk menilai "di atas tarif resmi".

---

## 6. Laporan, skoring, dan tampilan

### 6.1 Laporan

- **Isian = bagian 1.2 poin 3** (datang membantu?, pergi membantu?, bayar, indikasi pungli, bintang). Jangan
  menambah pertanyaan tanpa persetujuan pemilik.
- **Lapor hanya dari dekat tempat:** lokasi diambil saat tombol **Laporkan parkir** ditekan dan harus ≤ **250 m**
  dari tempat, akurasi GPS ≤ **250 m** (sama dengan Adami). Alasannya: mencegah laporan palsu dari jauh untuk
  menjelekkan satu toko atau jukir. Mencari tempat yang jauh tetap bisa, tetapi hanya untuk **melihat** info.
- **Batas** (`_shared/konstanta.js` → `BATAS`): 1 laporan per perangkat per tempat per 24 jam; maks. 10 laporan per
  perangkat per hari; 10 laporan/jam per IP; lebih dari 10 laporan/tempat/jam → tempat dibekukan (laporan
  pura-pura diterima). GPS palsu → bobot 0,2 diam-diam (bagian 4).
- **Kolom `laporan`:** `titik_id`, `kendaraan` (`motor`/`mobil`), `bantu_datang` (bool), `bantu_pergi` (bool),
  `bayar` (0–100.000), `pungli[]` (kode di bawah, boleh kosong), `bintang` (1–5), `reporter_key`, `ip_hash`, `lat`,
  `lng`, `akurasi_m`, `jarak_m`, `bobot_manual`, `dibuat`.
- **Kode indikasi pungli** (`_shared/konstanta.js` → `INDIKASI_PUNGLI`, juga dicek database):

  | Kode | Label di layar |
  |---|---|
  | `tanpa_karcis` | Tidak diberi karcis |
  | `kemahalan` | Tarif kemahalan |
  | `memaksa` | Memaksa / marah |
  | `tanda_gratis` | Ada tulisan "parkir gratis" |

### 6.2 Ringkasan per tempat (di `_shared/`, satu sumber untuk server dan tes)

Dihitung **di server** (Edge Function `lapor` setelah laporan tersimpan) ke tabel `ringkasan_titik`; publik membaca
`ringkasan_titik_publik`. Laporan yang dihitung: 180 hari terakhir, bobot 1 (GPS palsu 0,2). Tanpa peluruhan waktu
dulu, supaya sederhana.

**Skor indikasi pungli per laporan** (`_shared/skor-pungli.js`, maks. 100):

| Indikator | Poin |
|---|---|
| `tanpa_karcis` (dan bayar > 0) | +30 |
| `memaksa` | +30 |
| `tanda_gratis` (dan bayar > 0) | +30 |
| `kemahalan`, **atau** bayar di atas tarif resmi yang sudah diperiksa pemilik | +25 |

- Skor tempat = rata-rata berbobot skor laporan. Level: **0–29 rendah, 30–59 sedang, ≥ 60 tinggi**.
- **Level baru tampil setelah ≥ 3 laporan dari ≥ 2 perangkat**; sebelum itu "Data belum cukup (N laporan)" dan
  penanda abu-abu bergaris.
- **Alasan utama** = indikasi yang paling sering dilaporkan, ditulis dengan jumlahnya, mis. "3 dari 4 laporan tidak
  diberi karcis". Tanpa indikasi apa pun: "Tidak ada indikasi pungli yang dilaporkan".

**Jukir membantu** (tampil sejak laporan pertama, selalu dengan jumlahnya): "Saat datang: membantu (3 dari 4
laporan) · Saat pergi: membantu (4 dari 4)". Tidak memengaruhi skor pungli.

**Tarif yang biasa dibayar:** median `bayar` per kendaraan, tampil sejak laporan pertama ("Rp 2.000 · dari 3
laporan motor"). Bila tarif resmi daerah sudah diperiksa pemilik, tampil berdampingan ("tarif resmi Rp 1.000").

**Rating:** rata-rata bintang + jumlah ("★ 3,8 (5)"), tampil sejak rating pertama (pola Adami).

### 6.3 Tampilan (meniru Adami)

- **Kerangka** sama dengan Adami (`.app` grid): header · banner offline · isi · bilah aksi (tombol utama
  **"Laporkan parkir"**, membuka Peta di lokasi pengguna + petunjuk "Ketuk tempat Anda parkir") · menu bawah
  **4 tab: Beranda, Peta, Daftar, Info** (tab Data ditunda, bagian 1.2). **Di tab Peta bilah aksi tidak ditampilkan**
  (tombol "Laporkan parkir" ada di lembar tempat; dua tombol sama bertumpuk membingungkan).
- **Header:** logo + "JukirHub", pilihan **Motor / Mobil** (pengganti Pertalite/Solar di Adami; menentukan tarif yang
  ditampilkan dan kendaraan di form lapor), lalu ikon tema di kanan. Di HP < 360 px tulisan "JukirHub"
  disembunyikan, logo tetap.
- **Peta:** MapLibre dimuat belakangan, peta dasar OpenFreeMap `dark` / `positron` mengikuti tema (cadangan tile OSM),
  atribusi wajib terlihat. **Kolom cari di atas peta.** Penanda hanya untuk tempat yang sudah dilaporkan (bagian 1.2
  poin 4). Tata letak lapisan lain sama dengan Adami (zoom kanan atas di bawah kolom cari, panel info + legenda kiri
  bawah, tombol lokasi kanan bawah).
  - Gaya `dark`/`positron` **tidak menggambar POI**, jadi `components/Peta.jsx` menambah lapisan sendiri
    `jh-poi-titik` + `jh-poi-nama` dari source-layer `poi` OpenMapTiles (warna dari variabel tema), tampil mulai
    **zoom 15** (`ZOOM_NAMA_TEMPAT`); di bawah itu muncul petunjuk "Perbesar peta…". Ketuk dicari dalam kotak ±14 px.
    `feature.id` POI tidak dipakai sebagai `osm_ref` (jenis node/way tidak diketahui); `osm_ref` hanya dari Nominatim.
  - Tempat yang diketuk/dicari/dipin dicocokkan dulu ke tempat terlapor (`cocokkanTempat`, `lib/tempat.js`).
  - Di jendela yang tersembunyi MapLibre berhenti menggambar (penanda belum muncul); uji lewat DOM +
    `window.__peta` (hanya dev), atau picu screenshot dulu.
- **Lembar tempat** (setengah layar) sesuai bagian 1.2 poin 2; **tombol Laporkan parkir & Petunjuk arah tepat di bawah
  nama** (terlihat tanpa gulir di 360×640), lalu ringkasan. Halaman statis per tempat ditunda.
- **Daftar:** tempat yang sudah dilaporkan, terdekat dulu bila lokasi diizinkan; ketuk → Peta + lembar tempat.
- **Warna hanya untuk makna:** level indikasi, bintang rating, dan aksen biru rambu parkir. Selebihnya netral
  hitam-putih seperti Adami. Warna tidak pernah sendirian: selalu disertai teks/ikon.
- Tombol/tautan minimal 44 px (tombol utama 48 px), radius 12 px, kartu 14 px, lembar bawah 16 px 16 px 0 0,
  pil 999 px. Lebar kolom isi desktop 696 px (`--lebar-kolom`), bilah tetap selebar layar.

#### Tema dan warna

**GELAP bawaan**, mode terang lewat ikon di kanan header (matahari = ke terang, bulan = ke gelap), disimpan
`jukirhub_tema`, dipasang skrip kecil di `web/index.html` sebelum halaman digambar (`lib/tema.js`, salin dari
Adami). Semua warna lewat variabel di `:root` (gelap) dan `:root[data-tema="terang"]` di `app.css`; **variabel
baru wajib ada di kedua tema** (`tests/tema.test.js`, salin dari Adami).

Netral sama persis dengan Adami (`--latar`, `--permukaan`, `--teks`, `--teks-isi`, `--redup`, `--garis`,
`--lembut`, `--kaca`, `--bayang`, `--kuning-*`, `--merah-*`, `--pudar-*`, `--bintang`). Yang disesuaikan untuk
JukirHub (**biru rambu parkir "P"**, menggantikan tombol utama putih/hitam Adami):

| Variabel | Gelap | Terang | Dipakai untuk |
|---|---|---|---|
| `--utama` | `#2563eb` | `#1d4ed8` | Tombol utama, tab aktif, pilihan Motor/Mobil aktif |
| `--utama-teks` | `#ffffff` | `#ffffff` | Teks di atas `--utama` |
| `--aksen` | `#60a5fa` | `#1d4ed8` | Tautan, ikon aktif, garis tab aktif |
| `--fokus` | `#93c5fd` | `#1e40af` | Garis fokus keyboard (3 px, offset 2 px) |
| `--logo-latar` | `#2563eb` | `#1d4ed8` | Kotak logo "P" |
| `--logo-gambar` | `#ffffff` | `#ffffff` | Huruf "P" di logo |
| `--klaster-latar` / `-teks` | `#f5f5f4` / `#0e0e10` | `#334155` / `#ffffff` | Angka gugus di peta (sama dengan Adami) |
| `--indikasi-rendah` | `#2dd4bf` | `#0f766e` | Penanda & label indikasi rendah |
| `--indikasi-sedang` | `#facc15` | `#a16207` | Penanda & label indikasi sedang |
| `--indikasi-tinggi` | `#f87171` | `#b91c1c` | Penanda & label indikasi tinggi |
| `--indikasi-kurang` | `#71717a` | `#9ca3af` | Belum cukup data |
| `--indikasi-*-latar` | alfa 0,14–0,16 dari warna di atas | `#e3f5f1` / `#fdf2d3` / `#fdeaea` / `#eceef1` | Latar lencana/sel (pola `--sel-*` Adami) |

Warna bilah status HP (`meta theme-color`) = `--permukaan`: `#18181b` (gelap) / `#ffffff` (terang).
Manifest: `background_color` `#0e0e10`, `theme_color` `#18181b`.

#### Font dan ukuran huruf (sama persis dengan Adami)

- **Poppins untuk semua teks**, disajikan dari situs sendiri (`@fontsource/poppins`, latin **400/600/700** saja,
  `font-display: swap`, diimpor di `main.jsx`). **Jangan memuat dari Google Fonts** dan jangan menambah font atau
  ketebalan lain. `--font-isi: Poppins, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
- Ukuran dasar **15 px di HP**, **16 px di layar ≥ 760 px** (`:root { font-size }`, semua rem ikut).
- Ketebalan standar **600** untuk judul, `strong`, tombol, label menu. **700 hanya untuk angka gugus di peta.**
- Skala (ikuti `app.css` Adami):

| Elemen | Ukuran |
|---|---|
| Judul pembuka Beranda | `clamp(1.45rem, 5.4vw, 2rem)` |
| Judul halaman (h1) di HP | ±19–22 px (`1.25rem`–`1.45rem`) |
| Judul seksi Beranda (h2) | `1.2rem` |
| Merek di header, judul lembar | `1.1rem` |
| Judul kartu (h2 / h3) | `1.05rem` / `0.95rem` |
| Teks isi | `1rem` |
| Teks redup, banner | `0.875rem` |
| Catatan kecil, disclaimer | `0.8rem` |
| Label menu bawah | `0.75rem` |
| Minimum mutlak | ±12 px |

Poppins tampak lebih besar dari font bawaan: cek di HP 360 px setiap menambah teks/judul.

---

## 7. Ramah HP, kecepatan, dan SEO — wajib di setiap perubahan

**Ramah HP:** rancang untuk HP dulu; uji di 375×812 **dan** 360×640, lalu desktop ±1280 px. Tidak boleh ada scroll
horizontal; kontras cukup; aksi penting (Lapor, Detail, Petunjuk arah) terlihat tanpa scroll; hormati
`prefers-reduced-motion`.

**Kecepatan:** JS awal target **≤ 150 kB gzip** (hitung semua `<script>` + `modulepreload` di `web/dist/index.html`).
MapLibre (±280 kB gzip) hanya saat peta dibuka dan ditanya dulu di koneksi lambat. Halaman/layar lain dimuat
terpisah (`muatBagian` di `lib/koneksi.js`). **Tanpa library UI, tanpa CSS framework, tanpa gambar berat.**
Data tampil dulu dari snapshot offline, lalu diperbarui; semua permintaan diberi batas waktu.

**SEO** — setiap halaman baru wajib: HTML statis saat build (plugin `seoHalaman` di `web/vite.config.js`, pola
Adami), judul ≤ 70 karakter, deskripsi 70–170 karakter yang unik, canonical, tepat satu `h1`, JSON-LD yang sesuai
(WebSite, Organization, WebApplication, FAQPage di Beranda, BreadcrumbList), tautan internal, masuk sitemap.
Teks di `web/src/lib/konten-beranda.js`, dijaga `tests/seo.test.js`.

- Halaman statis versi pertama: `/`, `/peta`, `/daftar`, `/info`.
- Nanti (ditunda): `/titik/<kota>/<slug>` dan `/data/<kota>`. Halaman tempat baru diindeks bila ≥ 3 laporan dari
  ≥ 2 perangkat; sebelum itu `noindex` (hindari konten tipis dan kesan tuduhan dari satu laporan).

---

## 8. Konvensi kode

- **JavaScript (ESM) + JSX, bukan TypeScript** (TS hanya di Edge Function `.ts`, seperti Adami).
- Penamaan (fungsi, variabel, class CSS, kolom database) dan komentar dalam **bahasa Indonesia**. Ikuti gaya file
  di sekitarnya.
- Pisahkan logika murni dari React/DOM supaya bisa dites dengan `node:test`. **Logika baru butuh tes.**
- Web tanpa library UI. State: React context (`state.jsx`) + `useState`; tidak menambah state manager.
- Preferensi kecil di `localStorage` lewat `bacaSimpan` / `tulisSimpan` (aman bila penyimpanan diblokir), kunci
  berawalan `jukirhub_`.
- Uang: `Intl.NumberFormat('id-ID')`, bentuk ringkas "Rp 150rb" lewat `_shared/format.js`.
- **Karakter tak terlihat:** jangan menulis escape `\uXXXX` mentah di regex/string; pakai `codePointAt` atau
  `/\p{M}/u`. Salin `tests/karakter-tak-terlihat.test.js` dari Adami.
- **Akhir baris:** mesin pemilik memakai `core.autocrlf=true`; file bisa CRLF/LF. Alat edit harus memperhitungkannya.

---

## 9. Deploy dan operasional

- **Web:** Vercel, `installCommand` `npm ci --prefix web`, `buildCommand` `npm run build --prefix web`, output
  `web/dist`, `cleanUrls: true`. Tujuan rewrite SPA **tanpa** `.html` (pelajaran Adami: `/index.html` membuat alamat
  tak dikenal jadi 404 polos). Salin `vercel.json` Adami lalu sesuaikan domain.
- **Environment Vercel** (diisi pemilik): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (kunci anon **atau** publishable `sb_publishable_…`; hanya dikirim di header `apikey`), opsional `VITE_SITE_URL`. Tanpa keduanya app tetap jalan dengan data kosong. Untuk dev: `web/.env.local` (di-gitignore).
- **Edge Function** (dideploy pemilik): `npx supabase functions deploy <nama>`.
- **Secret Edge Function** (lewat `npm run cloud:secrets`, dijalankan pemilik): `ALLOWED_ORIGINS`, `URL_WEB`,
  `REPORTER_SALT`, `IP_SALT`, `PEMANTAUAN_SECRET`, mulai M4 `GEMINI_API_KEY` (dipasang pemilik sendiri).
- **Bot Telegram pemilik:** `npm run bot:setup` (dijalankan pemilik; `scripts/setup-telegram.js`) memasang
  `TELEGRAM_BOT_TOKEN`, `TELEGRAM_OWNER_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`, `URL_WEB` dan webhook ke fungsi `telegram`.
  Tanpa itu kabar tempat baru diam saja (no-op), laporan tetap jalan.
- **Cek tipe Edge Function** tanpa memasang Deno: salin `supabase/functions` ke folder sementara berisi
  `deno.json` `{ "nodeModulesDir": "auto" }`, lalu `npx --yes deno@2 check functions/<nama>/index.ts`.
- **Migrasi:** file baru di `supabase/migrations/` (`YYYYMMDDNNNNNN_nama.sql`), lalu `npx supabase db push`.
- **pg_cron:** `bersihkan-data-pribadi` (03:00 WITA); mulai M4 `periksa-komentar` (tiap 5 menit, hanya bila ada yang menunggu); mulai M5 `berita` (tiap 3 jam).
- Pemilik menerima kabar Telegram untuk setiap tempat baru dan laporan (yang berpola GPS palsu diberi tanda) —
  menyusul setelah alur 1.2 jalan.
- **Hanya SATU proyek Vercel: `jukirhub`** (memegang jukirhub.vercel.app). 30 Sept 2026 repo ternyata tersambung juga ke
  duplikat `jukirhub-aywb` (import kedua, preset Vite → build selalu gagal) dan production `jukirhub` tertahan di M0
  sampai pemilik menjalankan **Promote to Production** pada deploy M2. Setelah push, pastikan bundle di situs berganti;
  kalau tidak, cek tab Deployments proyek `jukirhub` (bukan build lokal). Status deploy juga terlihat di
  `https://api.github.com/repos/wahyu-setiawan99/jukirhub/commits/<sha>/status`.
- **Jangan mengecek situs langsung dengan loop cepat** (mis. `curl` tiap 10 detik): 29 Sept 2026 hal itu memicu
  **Vercel Security Checkpoint** (403 `x-vercel-mitigated: challenge`) untuk jaringan pemilik, termasuk browser pane.
  Tunggu ±2 menit setelah push, lalu cek sekali; jangan pernah mencoba melewati tantangan anti-bot.
- **Cek setelah push:** tunggu deploy selesai; `/`, `/peta`, `/daftar`, `/info` menjawab 200; buka di 375×812,
  360×640, dan desktop, tema gelap dan terang; console bersih; laporkan ke pemilik.

---

## 10. Rencana kerja

Urutan mengikuti bagian 1.2. Satu tahap selesai (tes + build lolos, dicek di HP) sebelum tahap berikutnya.

| Tahap | Isi |
|---|---|
| **M0 Fondasi** | Kerangka `web/` meniru Adami, tema, Poppins, service worker, SEO dasar, migrasi awal, tes. *Selesai (lihat status).* |
| **M1 Peta & pilih tempat** | Peta MapLibre + penanda tempat terlapor + gugus, ketuk tempat di peta dasar, cari (lokal + Nominatim), tekan lama untuk pin, lembar tempat (baca dari view publik), Daftar *Selesai 29 Sept (lihat status).* |
| **M2 Laporkan parkir** | Form 1 layar (1.2 poin 3), Edge Function `lapor` (gerbang 250 m, batas, GPS palsu, buat tempat baru), `skor-pungli.js` + ringkasan, penanda berubah warna setelah lapor *Selesai 30 Sept (lihat status).* |
| **M3 Rilis** | Commit & push, Vercel, proyek Supabase cloud, domain, uji di HP sungguhan, materi ajakan |
| **M4 Riwayat & komentar** | Riwayat laporan di lembar tempat, komentar opsional di form, saringan server + pemeriksaan AI + aduan (bagian 1.3.1) |
| **M5 Berita parkir** | Edge Function `berita` (RSS + AI deteksi lokasi + Nominatim), "Berita parkir di sekitar sini" di lembar tempat (bagian 1.3.2) |

**Ditunda (hanya bila pemilik meminta setelah M3):** estimasi pendapatan / mode amati, tab Data & dashboard per
wilayah + CSV, halaman statis per tempat, rincian kerja jukir, atribut resmi, tag sikap, foto, notifikasi, bot
Telegram warga, koin pelapor, hak jawab pemilik tempat, lencana "Resmi terverifikasi Dishub", akun pemerintah.

**Status (30 Sept 2026): M0, M1, dan M2 selesai dan tayang** di https://jukirhub.vercel.app (M2 dicek langsung 30 Sept: bundle baru, view Supabase 200, form lapor terbuka) (cek setelah push M0: semua
halaman 200, canonical & sitemap benar, tampilan HP benar).

- **M0:** kerangka `.app` meniru Adami, 4 tab, tema, Poppins, service worker, SEO statis `/`, `/peta`, `/daftar`,
  `/info`; `_shared/konstanta.js` (indikasi pungli, level, ambang, `BATAS`), `_shared/format.js`; migrasi
  `20260924000001_skema.sql` model 1.2 (diuji di PGlite + PostGIS).
- **M1:** peta MapLibre (dimuat terpisah ±283 kB gzip; ditanya dulu di koneksi lambat), lapisan nama tempat sendiri,
  penanda tempat terlapor + gugus, ketuk nama tempat / cari (lokal + Nominatim) / tekan lama → lembar tempat, Daftar
  & Beranda dari view publik, snapshot offline. Tombol "Laporkan parkir" di lembar **belum membuka form** (pesan
  "sedang disiapkan"); form = M2. JS awal **91,6 kB gzip**.
- Tes 45 lolos (`tema`, `karakter-tak-terlihat`, `konstanta-db`, `format`, `seo`, `tempat`, `cari-data`, `lokasi`).
- Dicek di server dev dengan data uji di snapshot `localStorage` (dihapus lagi): 375×812, 360×640, 1280×800, tema gelap &
  terang, tanpa scroll horizontal, tombol ≥ 44 px (zoom peta juga), lembar & pencarian berfungsi, console bersih.
- **M2:** form satu layar `components/LaporLayar.jsx` (dari tombol "Laporkan parkir" di lembar tempat; lokasi diambil
  saat dibuka, peringatan bila > 250 m, pesan validasi sama dengan server), Edge Function `lapor` = `lapor/proses.js`
  (JS murni, dites dengan database tiruan) + `lapor/index.ts` (pembungkus Deno). Logika bersama: `_shared/lapor.js`
  (validasi & nama tempat), `_shared/skor-pungli.js` (skor, level, alasan, ringkasan), `_shared/geo.js` (tempat sama),
  `_shared/deteksi-gps.js` (dari Adami). Migrasi `20260930000001_fungsi_lapor.sql` (`titik_detail`, `buat_titik`).
  Tarif resmi belum dibandingkan (belum ada tarif yang diperiksa pemilik, kota tempat belum diisi).
- Pemilik sudah (30 Sept): `db push` kedua migrasi pertama, rahasia `REPORTER_SALT`/`IP_SALT`/`ALLOWED_ORIGINS`,
  deploy `lapor`, env Supabase di Vercel & `web/.env.local`. Web dev membaca view cloud (200). **Migrasi yang sudah
  di-push tidak boleh ditulis ulang lagi**; perubahan skema = file migrasi baru.
- Uji PGlite kini meniru hak bawaan Supabase (`alter default privileges … to anon, authenticated, service_role`);
  tanpa itu uji "anon ditolak" lolos terlalu mudah.
- Form dicek di server dev dengan GPS & fungsi `lapor` DITIRU di browser (tidak ada laporan uji ke produksi):
  375×812, 360×640, 1280×800, tema terang, tanpa overflow, tombol ≥ 44 px, tombol kirim selalu terlihat.
- Tes: 68 lolos.
- Dicek 30 Sept: kedua migrasi sudah ada di cloud (`rpc/titik_detail` ada, anon ditolak 42501).
- **Setelah M2 tayang, pemilik perlu:** satu laporan sungguhan dari HP di lokasi parkir untuk uji ujung-ke-ujung.

---

## 11. Catatan keputusan dan masukan pemilik

Keputusan yang sudah diambil pemilik proyek. Jangan dibalik tanpa bertanya.

- **24 Sept 2026:**
  - Konsep: laporan warga soal jukir di luar gedung, rating, tarif, indikasi pungli, estimasi pendapatan, untuk
    warga dan pemerintah; parkir resmi bergedung (mall dsb.) tidak dimasukkan.
  - **Model, tech stack, font, ukuran huruf, dan tampilan mengikuti Adami**; warna tema disesuaikan dengan konteks
    parkir (aksen biru rambu "P", warna level indikasi).
  - Wilayah awal **Makassar Raya** (zona waktu **WITA**), aksen **biru rambu**. Lanjut ke M0.
  - ~~Kinerja jukir rinci (8 pilihan kerja dengan poin)~~ → **dibatalkan 26 Sept**: diganti membantu / tidak membantu.
- **26 Sept 2026 (penyederhanaan, jadi bagian 1.2):**
  - Pemilik: "membantu ya/tidak lebih sederhana dan lebih bagus dibanding pertanyaan panjang lebar."
  - Alur inti: pilih tempat di peta atau cari nama tempat → ketuk → **Laporkan parkir**.
  - Laporan: **saat datang** dan **saat mau pergi**, masing-masing "membantu" / "tidak membantu"; lalu rating,
    indikasi pungli, dan tarif.
  - Tempat yang sudah dilaporkan tampil di peta dengan warna indikasi. Tempat yang belum dilaporkan: **tanpa penanda**
    (rekomendasi Claude, bagian 1.2 poin 4).
  - Jangan over-engineering: estimasi pendapatan, tab Data, dan fitur lain ditunda (bagian 10).
  - Repo: https://github.com/wahyu-setiawan99/jukirhub.
  - Ditambah: **komentar pada riwayat tempat** dan **berita parkir** yang lokasinya dideteksi AI lalu diselipkan ke
    detail tempat (bagian 1.3). Urutan (rekomendasi Claude): setelah alur dasar tayang, komentar (M4) lalu berita (M5).
- **29 Sept 2026:**
  - Pemilik: jukirhub.vercel.app sudah tayang; proyek Supabase `dcjnufascffooyotwqki`; "silahkan lanjut" → M1.
  - Keputusan teknis Claude saat M1 (boleh ditinjau pemilik): **supabase-js tidak dipakai** (web hanya membaca view
    lewat `fetch` REST; lebih ringan), lapisan nama tempat sendiri di atas peta, **bilah "Laporkan parkir" disembunyikan
    di tab Peta** (tombolnya ada di lembar tempat), tombol aksi lembar dipindah ke atas ringkasan.
- **30 Sept 2026:**
  - M2 tayang; repo sempat tersambung ke dua proyek Vercel, duplikat `jukirhub-aywb` dihapus pemilik.
  - Pemilik: tempat yang tidak ada di peta harus bisa dilaporkan (cafe-nya sendiri). Usul link Google Maps ditolak
    (bagian 5); diganti tombol **"Laporkan di lokasi saya"** (bagian 1.2 poin 1).
  - Pemilik: nama tempat baru cukup **dikabarkan** ke pemilik; selama tidak dihapus berarti sah, tanpa halaman
    moderasi → Telegram + tombol Sembunyikan (bagian 5).

**Belum diputuskan (tanyakan pemilik sebelum dikerjakan):**

- Nama domain.
- Gerbang lokasi 250 m untuk melapor (rekomendasi Claude, bagian 6.1): bila pemilik ingin warga bisa melapor dari
  jauh (mis. setelah sampai rumah), perlu keputusan dan penanganan laporan palsu.
- Poin skor pungli di 6.2 masih usulan awal; kalibrasi setelah ada data.
- Komentar hanya lewat laporan (rekomendasi Claude, 1.3.1) atau juga boleh tanpa melapor (butuh batas & moderasi
  tambahan).
- Daftar sumber berita parkir (1.3.2) dan kunci Gemini untuk proyek JukirHub.
