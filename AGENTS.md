# AGENTS.md — JukirHub

Pedoman bersama untuk semua asisten AI (Claude Code, Cursor, dan lainnya) serta manusia yang mengerjakan repo ini.
**File ini satu-satunya sumber aturan** (Cursor membacanya otomatis; `CLAUDE.md` & `.cursor/rules/` hanya menunjuk ke
sini). Baca **"Serah terima"** di bawah dulu, lalu bagian yang relevan. Kalau ada yang bertentangan dengan permintaan
pemilik proyek di chat, tanyakan dulu.

**Pola kerja, tech stack, struktur repo, keamanan, dan SEO meniru Adami** (`../Adami App`, https://adami.tech).
**Tampilan & font TIDAK lagi meniru Adami** sejak 1 Okt 2026: ikuti tampilan "Radar" (bagian 6.3). Bila ragu soal cara
mengerjakan sesuatu, lihat cara Adami mengerjakannya. Repo Adami **hanya dibaca**: salin polanya ke sini lalu sesuaikan
nama (`adami_` → `jukirhub_`), jangan pernah mengubah file di sana, dan **jangan membaca file `.env*` di sana**.

**Mulai dari bagian 1.2 (Prioritas dasar).** Itu inti produk yang dikerjakan lebih dulu. Kalau bagian lain
bertentangan dengan 1.2, **1.2 yang berlaku**; fitur di luar 1.2 hanya dikerjakan bila pemilik memintanya.

Terakhir diperbarui: 2 Okt 2026.

---

## Serah terima (status terkini, 2 Okt 2026) — baca ini dulu

**Tayang di https://jukirhub.site** (domain utama). `jukirhub.vercel.app` &
`www.jukirhub.site` dialihkan 308 ke `jukirhub.site` (diuji, termasuk halaman depan). Isi: M0–M6 lengkap.
- Peta & lapor (1.2), riwayat + komentar (1.3.1), koin + tab Saya + foto bukti (1.4).
- Berita parkir per daerah + halaman `/berita` (1.3.2), zonasi pulau Sulawesi N2 (1.5).
- Tampilan Radar + logo perisai heksagon (6.3), halaman situs untuk AdSense (1.6), kecepatan diukur (7).
- Migrasi s/d `20261001000007_kontak.sql` sudah di-`db push`. Fungsi `lapor kontribusi foto berita telegram kontak aduan`
  sudah di-deploy. Berita aktif (`npm run berita:setup`), tidak dikirim ke Telegram.

**Dibuat 1 Okt (sore); web sudah tayang (`afc275c`), sisi Supabase menunggu pemilik** (pilihan pemilik setelah review AGENTS.md):
- Halaman per tempat `/tempat/<nama>-<id>` (bagian 1.7), pemeriksaan komentar oleh AI (1.3.1), ringkasan harian
  Telegram 21:00 WITA (bagian 9). Kebijakan Privasi ikut diperbarui (komentar diperiksa Gemini).
- Sisa langkah (urut): `npx supabase db push` (migrasi `20261001000008_pemantauan_ai.sql`) →
  `npx supabase functions deploy lapor berita pemantauan`. Tanpa secret baru:
  `pemantauan` memakai `BERITA_SECRET` & Vault berita, AI komentar memakai `GEMINI_API_KEY` yang sudah ada.

**Domain (selesai 1 Okt):** registrar DomaiNesia, nameserver sudah diganti ke `ns1/ns2.vercel-dns.com` (DNS kini dikelola
Vercel: record bisa ditambah AI lewat `npx vercel dns add jukirhub.site …`). Domain & `www` terpasang di proyek Vercel
`jukirhub`, HTTPS aktif. Supabase `ALLOWED_ORIGINS` memuat jukirhub.site, www, vercel.app, localhost:5174/4174; `URL_WEB`
= `https://jukirhub.site`. `VITE_SITE_URL` tidak dipakai di Vercel. Folder lokal di-`vercel link` (`.vercel/` & `.env.local`
root berisi token OIDC: di-gitignore, jangan dibaca/di-commit).

**Menunggu pemilik (urut):**
1. Google Search Console: buat properti **Domain** `jukirhub.site`, salin nilai TXT `google-site-verification=…` →
   AI menambahkannya: `npx vercel dns add jukirhub.site @ TXT "google-site-verification=…"`. Lalu kirim sitemap
   `https://jukirhub.site/sitemap.xml`.
2. Google AdSense: daftar dengan `jukirhub.site`. Kode `ca-pub-…` diisi di env Vercel `VITE_ADSENSE_CLIENT` (AI bisa lewat
   `npx vercel env add`), lalu build ulang (meta verifikasi & `ads.txt` otomatis, bagian 1.6). Skrip iklan belum dipasang.
3. Lapangan: uji laporan sungguhan dari HP (koin, foto bukti ke Telegram), ganti tautan di FB/IG/TikTok ke jukirhub.site,
   cetak ulang poster dengan QR baru (`docs/peluncuran/qr-jukirhub.svg`).

**Belum diputuskan / calon pekerjaan berikutnya:** bagian 11 "Belum diputuskan" (fase N3, moderator per zona,
imbauan manual, skrip iklan AdSense, og.png masih memuat tagline, `ads.txt`, halaman tempat diperbarui otomatis).

**Foto langsung dari kamera (1.4, dikerjakan 2 Okt):** dua tombol di HP (Ambil foto / Pilih dari galeri), satu tombol
di komputer, kartu pulih dari `sessionStorage` bila tab ditutup saat kamera terbuka, keterangan sumber di Telegram.
Web ikut commit ini. **Menunggu pemilik** (tanpa migrasi, tanpa secret baru) supaya baris sumber benar-benar terkirim:

```bash
npx supabase functions deploy foto
```

**Cara memeriksa tanpa alat khusus Claude:**
- Tes & build: `npm test` dan `npm run build --prefix web` (wajib lolos sebelum commit).
- Server dev: `npm run dev --prefix web` → http://localhost:5174. Versi produksi: `npm run build --prefix web` lalu
  `npm run preview --prefix web -- --port 4174`.
- Lighthouse: `npx lighthouse@12 http://localhost:4174/ --only-categories=performance,seo,accessibility` (ulang 2–3×).
- Tampilan: cek di 375×812, 360×640, dan 1280×800, tema gelap & terang (DevTools → mode perangkat).
- Situs live: `npm run cek:tayang` setelah push. **Jangan** mengulang curl ke situs live dalam loop cepat (bagian 9).

---

## 0. Cara bekerja dengan pemilik proyek

- Komunikasi dalam **Bahasa Indonesia**.
- **Beri masukan dan tanya dulu** sebelum mengubah file atau script yang sudah jadi. Untuk perubahan tampilan,
  tunjukkan visualisasi/mockup dulu supaya satu persepsi. Kalau pemilik minta "planning dulu" atau "jangan diubah
  dulu", jangan ubah kode sama sekali.
- Beri pilihan dengan rekomendasi dan alasannya, termasuk perkiraan biaya bila memakai layanan berbayar.
  Hindari layanan yang mewajibkan kartu kredit kecuali pemilik menyetujuinya.
- **Git:** kerja langsung di `main`, tanpa PR atau cabang. **Push ke `main` = langsung tayang** (Vercel). Jangan push
  tanpa izin; setelah selesai mengubah kode, tawarkan pilihan "commit saja" atau "commit & push".
- Pesan commit jelas, dalam bahasa Indonesia. Tulis juga yang belum selesai (mis. "perlu dicek").
- Sebelum commit: `npm test` dan `npm run build --prefix web` harus lolos.
- **Setiap perubahan wajib tetap ramah HP, cepat, dan kuat SEO-nya** (bagian 7). Kalau ada yang terpaksa
  dikorbankan, jelaskan ke pemilik sebelum dikerjakan.
- Setiap selesai push, cek tampilan di situs langsung (bagian 9) dan laporkan hasilnya ke pemilik.
- Berganti alat/model AI: commit dulu, dan baca ulang file sebelum mengubahnya (file bisa sudah diubah alat lain).
  Perbarui bagian "Serah terima" di atas setiap selesai sesi supaya alat berikutnya tahu status terakhir.
- **Perintah deploy, migrasi, dan yang menyentuh rahasia dijalankan pemilik.** AI menuliskannya dalam blok kode `bash`
  satu perintah per blok. AI tidak mengetik, menyalin, atau meminta token/password/API key; bila pemilik tidak sengaja
  menempel kunci di chat, sarankan membuat kunci baru.
- **Pengecualian (izin pemilik 1 Okt 2026):** bila pemilik meminta, AI boleh menjalankan CLI `vercel` / `supabase` yang
  sudah login di mesin pemilik untuk pengaturan yang **tidak menampilkan nilai rahasia** (mis. `vercel domains add`,
  `vercel dns add`, `supabase secrets set ALLOWED_ORIGINS=…`/`URL_WEB=…`, `vercel env add VITE_ADSENSE_CLIENT`). Nilai
  rahasia lama tidak bisa dibaca (hanya hash); cocokkan hash bila perlu mempertahankan isinya.
- Perubahan tampilan diverifikasi di server dev pada 375×812, 360×640, dan 1280×800, tema gelap & terang.

---

## 1. Produk

**JukirHub** menampilkan info **juru parkir (jukir) di luar gedung** dari laporan warga: apakah jukir membantu,
berapa tarif yang biasa ditarik, rating, dan **indikasi pungli** di setiap tempat. Tujuannya supaya warga dan
pemerintah (Dishub, Bapenda, Pemda) tahu aktivitas parkir di wilayahnya. Estimasi perputaran uang parkir dan
dashboard per wilayah adalah tujuan lanjutan (bagian 10, ditunda). Bukan layanan resmi pemerintah; setiap tampilan
data memuat disclaimer itu.

| | |
|---|---|
| Web | **https://jukirhub.site** (domain utama sejak 1 Okt 2026; Vercel, deploy otomatis dari `main`). `jukirhub.vercel.app` & `www.jukirhub.site` dialihkan permanen (308) lewat `redirects` di `vercel.json` |
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
  setiap huruf, sesuai aturan Nominatim), dibatasi kotak provinsi zona aktif (1.5), maks. 5 hasil, atribusi OSM. **Tidak memakai
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
| 0 | **Ada jukir di tempat ini?** | Ada jukir · Tidak ada jukir | ya; **"Tidak ada jukir" → pertanyaan 1–5 disembunyikan, langsung kirim** |
| 1 | **Saat datang**, jukir… | Membantu · Tidak membantu | ya |
| 2 | **Saat mau pergi**, jukir… | Membantu · Tidak membantu | ya |
| 3 | **Bayar berapa?** | 0 · 1.000 · 2.000 · 3.000 · 5.000 · Lainnya (ketik) | ya |
| 4 | **Ada indikasi pungli?** (pilih yang dialami, boleh kosong) | Tidak diberi karcis · Tarif kemahalan · Memaksa / marah · Ada tulisan "parkir gratis" | tidak |
| 5 | **Rating** | ★ 1–5 | ya |

- **Laporan "tidak ada jukir"** (keputusan 30 Sept): `laporan.ada_jukir = false`, jawaban lain kosong (constraint
  `laporan_isian_sesuai_jukir`). Tidak ikut skor pungli, tarif, membantu, bintang; hanya `jumlah_tanpa_jukir`. Ambang
  level pungli dihitung dari laporan yang ada jukirnya. Lembar: "Dilaporkan tidak ada jukir (x dari y)" bila
  kebanyakan, "Pernah dilaporkan tanpa jukir" bila sebagian kecil.
- Kendaraan diambil dari pilihan **Motor / Mobil** di header (bukan pertanyaan tersendiri), ditampilkan di form dan
  bisa diganti di situ.
- Tanpa teks bebas (kecuali nama tempat baru & komentar opsional), tanpa akun. Foto bukti opsional sesudah lapor
  hanya untuk pemilik (bagian 1.4).
- Laporan dikirim satu kali, biasanya saat mau pergi (kedua pertanyaan dijawab sekaligus). Tidak ada laporan dua
  tahap.

**4. Tampilan di peta:**

- **Kebanyakan laporan tanpa jukir** = penanda berlubang tepi hijau dengan **✓** ("Tanpa jukir", kode `tanpa`).
- **Tempat yang sudah dilaporkan** = bulatan penanda berwarna level indikasi pungli (rendah / sedang / tinggi) +
  ikon; **abu-abu bergaris** = baru 1–2 laporan (data belum cukup). Jauh = dikelompokkan (gugus berangka).
- **Tempat yang belum dilaporkan tidak diberi penanda apa pun.** Peta dasar sudah menampilkan nama tempatnya;
  memberi penanda pada ribuan tempat membuat peta berat dan terkesan ada jukir di semua tempat. Legenda menulis:
  "Tanpa penanda = belum ada laporan. Ketuk tempat untuk melapor."
- Saat pengguna mengetuk tempat tanpa penanda, lembar "Belum ada laporan" muncul (poin 2).

**5. Aturan yang tetap berlaku di versi sederhana:** lapor hanya dari dekat tempat (bagian 6.1), tanpa identitas
jukir/pelapor (bagian 4), indikasi bukan tuduhan (1.1), ambang tampil level pungli (6.2).

**Ditunda (jangan dikerjakan sebelum 1.2 selesai dan pemilik meminta):** estimasi pendapatan / mode amati, tab Data
dan dashboard per wilayah, rincian kerja jukir, atribut resmi, tag sikap, foto publik, notifikasi, halaman statis per
tempat. (Koin, tab Saya, dan foto bukti untuk pemilik dibuat 1 Okt atas permintaan pemilik, bagian 1.4.)

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
  1. Saringan server (`periksaKomentar` di `_shared/lapor.js`, aturan sama dengan nama tempat, dites): tolak nomor HP,
     email, tautan, NIK/angka panjang, plat nomor (mis. `DD 1234 XY`), kata kasar; 3–200 huruf. Web memeriksa dulu dengan
     fungsi yang sama; server menolak seluruh laporan dengan pesan jelas (kode `komentar`) supaya pelapor bisa membetulkan.
  2. **Persetujuan pemilik lewat Telegram** (dibuat 1 Okt 2026): komentar disimpan `menunggu`, pesan 💬 dengan tombol
     **✅ Tampilkan / 🚫 Tolak** (setelah tampil: 🙈 Sembunyikan). Tidak ada halaman moderasi.
  3. **Pemeriksaan AI** (dibuat 1 Okt 2026, pilihan pemilik): setelah komentar tersimpan, `lapor` di latar memanggil
     `moderasiKomentarBaru` (`_shared/moderasi-komentar.js`): Gemini (`_shared/gemini.ts`, kunci & model sama dengan
     berita) menggolongkan ke `layak` · `menyebut_identitas` · `tuduhan_pidana` · `kasar` · `spam` · `tidak_relevan`
     (`_shared/periksa-komentar.js`). Hanya `layak` → `status 'tampil'`, `alasan 'ai'` (hanya bila masih `menunggu`) dan
     pesan pemilik "Tampil otomatis" + tombol Sembunyikan. Kategori lain, AI gagal, kunci kosong, atau jatah habis
     (**100/hari**, `ambil_jatah_ai_jenis('komentar')`, terpisah dari jatah berita) → tetap `menunggu` seperti nomor 2
     (pesan memuat label AI). Yang dikirim ke Gemini hanya teks komentar + nama tempat. Dites: `tests/pemantauan-ai.test.js`.
  4. Tombol **"Laporkan komentar"** → Edge Function `aduan`: satu perangkat = satu aduan; ≥ 3 perangkat berbeda →
     komentar disembunyikan otomatis + pesan 🚩 ke pemilik (tombol Tampilkan). Balasan selalu sama.
- Komentar **tidak memengaruhi** skor pungli, bintang, atau ringkasan (hanya dibaca manusia).
- **Data** (migrasi `20261001000001_riwayat_komentar.sql`): tabel `komentar` (`laporan_id` unik, `titik_id`, `isi`,
  `status` `menunggu`/`tampil`/`ditolak`/`disembunyikan`, `alasan`), `aduan_komentar` (`komentar_id`, `reporter_key` hash,
  `ip_hash`); view `riwayat_publik` (kolom laporan tanpa kunci/lokasi/bobot, **waktu dibulatkan ke jam**, komentar hanya
  berstatus `tampil`). Web: `components/Riwayat.jsx`, `lib/riwayat.js`, `ambilRiwayat` di `lib/data.js`.
- Info memuat cara meminta penghapusan komentar (pemilik tempat / pihak yang disebut).

#### 1.3.2 Berita parkir per daerah pengguna (M5, dibuat 1 Okt 2026)

Keputusan pemilik 1 Okt: berita mengikuti **daerah pengguna** (mis. di Soppeng → berita Soppeng dulu), cakupan
**seluruh Sulsel per kabupaten/kota**. Rencana lama (berita diselipkan ke lembar tempat ≤ 300 m lewat geocoding frasa
lokasi) **diganti** karena lebih rumit dan rawan salah cocok. Pola feed berita Adami (Adami AGENTS.md 10.6).

1. **Ambil** (Edge Function `berita` = `berita/proses.js` + `index.ts`, pg_cron `berita` tiap 3 jam menit ke-20 lewat
   pg_net; URL & secret di Supabase Vault `berita_url`/`berita_secret`): RSS media Sulsel yang sudah dicek di Adami
   (`_shared/berita.js` → `SUMBER_BERITA`: ANTARA Sulsel, detikSulsel, Herald.id, FAJAR, Terkini.id). **Tidak** dari
   Google News / situs yang menolak bot; sumber baru dicek dulu. Saring kata kunci dulu (parkir, perparkiran, jukir,
   juru parkir, tukang parkir) supaya hemat AI. Hanya berita ≤ 30 hari, tautan harus ke domain sumber.
2. **AI** (Gemini `gemini-3.5-flash-lite`, bisa diganti secret `GEMINI_MODEL`; maks. **60 panggilan/hari**, tabel
   `pemakaian_ai` + `ambil_jatah_ai`): relevan (parkir di Sulsel) + ringkasan netral 1–2 kalimat HANYA dari judul &
   cuplikan, tanpa nama orang biasa. Ringkasan divalidasi server (panjang, tanpa tautan/emoji, **angka harus ada di
   sumber**). Tidak relevan tetap dicatat supaya tidak dinilai ulang. Tanpa kunci / jatah habis → dicoba lagi nanti.
3. **Kabupaten** yang disebut di judul/cuplikan dicatat (`_shared/kabupaten.js`: 24 kabupaten/kota Sulsel + alias ibu
   kota, mis. Sengkang → Wajo, Watansoppeng → Soppeng; "Bone Bolango" bukan Bone).
4. **Tampil di web saja**: kartu ringkas di Beranda (`components/KartuBerita.jsx`, 3 berita + tombol "Semua berita
   parkir") dan **halaman khusus `/berita`** (`pages/Berita.jsx`, HTML statis + sitemap, semua berita ≤ 30 hari, pilihan
   zona & daerah);
   berita daerah pengguna dulu, lalu Sulsel lainnya (`urutkanBerita`). **Daerah pengguna** (`web/src/lib/daerah.js`):
   pilihan manual (disimpan di HP), atau otomatis dari posisi yang **sudah diizinkan** (tidak meminta izin sendiri) lewat
   Nominatim reverse zoom 8 dengan koordinat dibulatkan ±1 km, disimpan 7 hari per sel. Kartu tidak tampil bila belum
   ada berita. Label: "Ringkasan dibuat otomatis oleh AI dari judul berita dan bisa keliru".
- **Berita tidak dikirim ke Telegram** (keputusan pemilik 1 Okt 2026: cukup di web). Penyaringan sepenuhnya oleh kata
  kunci + AI + validasi ringkasan; bila perlu menyembunyikan satu berita: `update berita set disembunyikan = true` lewat
  SQL editor Supabase (pemilik).
- **Hak cipta:** hanya judul, nama media, tanggal, ringkasan buatan AI, dan tautan `noopener noreferrer nofollow`; isi,
  cuplikan, dan gambar artikel tidak disimpan. Berita tidak memengaruhi skor pungli.
- **Data** (migrasi `20261001000005_berita.sql`): tabel `berita` (`url` unik, `sumber_id`, `sumber`, `judul`,
  `ringkasan`, `terbit`, `kabupaten[]`, `relevan`, `disembunyikan`, `dibuat`), view `berita_publik` (relevan, ≤ 30 hari,
  maks. 50), cron `bersihkan-berita` (> 90 hari, 04:10 WITA).
- **Pemasangan oleh pemilik:** `npm run berita:setup` (minta kunci Gemini **khusus JukirHub** dari AI Studio, pasang
  secret `GEMINI_API_KEY` & `BERITA_SECRET`, isi Vault, uji sekali). AI tidak melihat kuncinya.

### 1.4 Koin, tab Saya, dan foto bukti (M6, keputusan pemilik 1 Okt 2026)

Pemilik: "akun poin dan koin + tab Saya mirip Adami; foto bukti opsional". Pilihan pemilik (semua rekomendasi Claude):
**koin saja** (satu angka, tanpa "poin" terpisah), **tanpa login** (koin terikat HP/browser), **foto hanya untuk
pemilik**. Pola Adami 10.4 fase A.

- **Aturan koin** (`_shared/koin.js`, dites `tests/koin.test.js`): laporan dari lokasi **+10**; **pembuka data +5** bila
  belum ada laporan siapa pun di tempat itu 7 hari terakhir (termasuk tempat baru); **seri harian** +2 per hari
  berturut-turut (maks. +10, sekali sehari, tanggal WITA); maks. **5 laporan berkoin per hari** (laporan berikutnya
  tetap diterima tanpa koin). **Tanpa nilai uang.** Foto dan komentar tidak memberi koin (supaya warga tidak terdorong
  memotret jukir). 6 lencana: Pelapor pertama, Penjelajah (5 tempat), Pembuka data (3×), Seri 7 hari, Langganan
  (5 laporan di satu tempat), Rajin (25 laporan).
- **Anti-kecurangan diam-diam:** laporan GPS palsu (bobot < 1) atau ke tempat dibekukan tetap terlihat mendapat koin di
  HP pelapor (`koin_tampil`) tetapi tidak masuk peringkat (`koin_sah` = 0). `koin_sah` tidak pernah dikirim ke pelapor.
- **Peringkat 30 hari per kabupaten/kota** tempat parkir (24 kabupaten Sulsel, `_shared/kabupaten.js`), nama samaran
  hewan khas Sulawesi + kabupaten (bisa diganti, bisa disembunyikan dari peringkat). Kabupaten tempat diisi `lapor`
  sekali per tempat (`titik_parkir.kota`) lewat Nominatim reverse (maks. 3 detik; gagal → koin tanpa kabupaten).
- **`lapor`** mencatat koin setelah laporan tersimpan (galat koin tidak menggagalkan laporan) dan mengembalikan
  `koin` (ringkasan untuk layar sukses) + `laporan_id` (untuk foto; `null` saat pura-pura diterima).
- **Tab "Saya"** (`/saya`, tab ke-5 menu bawah, `pages/Saya.jsx`, Edge Function `kontribusi`): nama samaran, koin,
  laporan, seri, posisi; lencana + kemajuan; 10 laporan terakhir HP ini (tanpa bobot/tanda GPS palsu); peringkat per
  kabupaten; cara dapat koin. Halaman pribadi: `noindex`, tidak masuk sitemap. Layar sukses lapor menampilkan koin
  (`components/KoinDiterima.jsx`).
- **Data** (migrasi `20261001000003_koin.sql`): `reputasi_pelapor`, `koin_harian` (dihapus > 35 hari),
  `laporan.koin_sah`, fungsi `tanggal_wita`, `catat_koin_harian`, `peringkat_pelapor`, `koin_saya`, `posisi_peringkat`
  (hanya service_role). Anon tidak bisa membaca apa pun dari tabel koin.
- **Foto bukti** (`_shared/foto.js`, Edge Function `foto`, `components/TambahFoto.jsx`): tombol opsional di layar sukses
  lapor (mis. karcis, papan tarif, tulisan "parkir gratis"). HP mengecilkan foto (1280 px, JPEG ±70%, ≤ 500 KB; kanvas
  membuang EXIF) → server membuang lagi segmen metadata JPEG → **diteruskan ke Telegram pemilik** (sendPhoto + keterangan
  laporan, peringatan bila lokasi pelapor mencurigakan). **Tidak tampil publik dan tidak disimpan di server JukirHub.**
  Syarat: laporan milik HP itu, ≤ 30 menit setelah lapor, satu foto per laporan, maks. 3 foto per HP per 24 jam. Tabel
  `foto_laporan` hanya mencatat batas (migrasi `20261001000004_foto.sql`, dihapus > 30 hari).
- **Foto langsung dari kamera** (permintaan pemilik 2 Okt 2026; **disetujui & dikerjakan 2 Okt: Opsi A + keterangan
  sumber foto**). Sisa: pemilik menjalankan `npx supabase functions deploy foto` (tanpa migrasi, tanpa secret baru).
  Sebelumnya hanya ada satu `<input type="file" accept="image/*">`; di Android baru (Chrome + pemilih foto Android 13+)
  yang muncul sering hanya galeri, tanpa pilihan kamera.
  - **Opsi A (DIPILIH pemilik):** dua tombol di `TambahFoto.jsx`: **"Ambil foto"** (input kedua dengan
    `capture="environment"` → aplikasi kamera HP langsung terbuka, kamera belakang) dan **"Pilih dari galeri"** (input
    lama). Di layar tanpa sentuh (`matchMedia('(pointer: coarse)')` salah = komputer) hanya satu tombol "Pilih foto".
    Alur setelahnya sama persis: `kecilkanFoto` (kanvas membuang EXIF/GPS) → Edge Function `foto` → Telegram pemilik.
    Tanpa izin kamera di browser. Server hanya menambah baris sumber di keterangan (tidak disimpan).
  - **Opsi B (ditolak):** kamera di dalam halaman (`getUserMedia` + jendela bidik sendiri). Lebih banyak kode,
    minta izin kamera, boros baterai, rawan beda perilaku antar-HP; manfaatnya kecil untuk foto karcis/papan tarif.
  - **Jaga-jaga HP RAM kecil:** saat aplikasi kamera terbuka, Android bisa menutup tab browser; kembali ke JukirHub,
    halaman dimuat ulang dan layar sukses (beserta `laporan_id`) hilang. Sebelum membuka kamera, simpan
    `{ laporan_id, waktu, nama }` di `sessionStorage`; setelah muat ulang, tampilkan lagi kartu "Tambah foto bukti"
    ("Untuk laporan Anda di <nama tempat>") selama masih ≤ 30 menit (syarat server tetap berlaku). Dihapus setelah foto
    terkirim / kedaluwarsa / kartu ditutup, **dan saat layar sukses lapor ditutup biasa** (`lupakanSaatDitutup`, review
    Claude 2 Okt: tanpa ini, pengguna yang batal memotret masih dikejar kartu melayang 30 menit).
  - **Keterangan sumber foto (DIPILIH pemilik):** web mengirim `sumber: 'kamera' | 'galeri'` (dari tombol yang ditekan)
    dan `umur_detik` (sekarang − `file.lastModified`, dibulatkan) ke fungsi `foto`; server memvalidasi (nilai lain →
    diabaikan) dan `keteranganFoto` menambah baris mis. "📷 Diambil dari kamera" / "🖼 Dari galeri, file ±3 hari lalu".
    Tidak disimpan di database. Hanya petunjuk, **bukan bukti**: `capture` bisa diakali dan jam HP bisa diubah, jadi tidak
    memengaruhi koin atau bobot laporan. **Perlu dicek saat uji HP:** umur file dari galeri bisa selalu "baru saja"
    (Android/iOS sering memberi waktu salin, bukan waktu potret); bila begitu, hapus umur dari keterangan.
  - Teks peringatan tetap ("Jangan memotret wajah orang atau pelat nomor"), lebih penting saat memotret langsung.
  - Tombol: ikon `kamera` & `galeri` (`lib/ikon.js`); saat mengirim hanya tombol yang dipakai berlabel "Mengirim foto…".
  - **Uji:** `npm test` + build; browser pane hanya bisa memeriksa tampilan (375×812, 360×640, 1280×800, gelap & terang),
    kamera sungguhan **diuji pemilik** di HP Android (Chrome) dan iPhone (Safari), termasuk kasus tab dimuat ulang.
  - **Urutan kerja:** kode `TambahFoto.jsx` (+ `sessionStorage`) dan keterangan Telegram sudah dibuat 2 Okt.
    Sisa: pemilik `npx supabase functions deploy foto` (tanpa migrasi, tanpa secret baru). Kamera sungguhan diuji di HP.
- **Akun (username/sandi) belum dibuat.** Bila nanti diminta: ikuti catatan "Akun opsional" di Adami AGENTS.md 10.4.

### 1.5 Seluruh Indonesia dengan zonasi pulau / provinsi (rencana; fase N2 pulau Sulawesi dibuat 1 Okt 2026)

Keinginan pemilik 1 Okt 2026: JukirHub berlaku **di seluruh Indonesia**, tetapi **dizonasi per pulau / provinsi**
supaya informasi (dan imbauan ke masyarakat soal aktivitas parkir) relevan per daerah. Bagian ini rencana; kerjakan per
fase setelah pemilik memilih fase (tabel di bawah). **Pemilik memilih mulai dari N2 (pulau Sulawesi).**

**Status N2 (dibuat 1 Okt 2026), cara sederhana dulu:**
- `supabase/functions/_shared/wilayah.js`: 6 provinsi (kode pendek `sulsel`, `sulbar`, `sulteng`, `sultra`,
  `gorontalo`, `sulut`; kode ISO, ibu kota, kotak perkiraan) + **81 kab/kota** dengan alias (pengganti
  `kabupaten.js`). Label kab/kota unik se-Sulawesi; label Sulsel tidak berubah. Kode Kemendagri & poligon PostGIS
  **belum** dipakai: kab/kota tempat & pengguna dari Nominatim reverse (`wilayahDariAlamat`, provinsi dari kode ISO),
  tempat tanpa kab/kota → perkiraan kotak provinsi (`provinsiDariKoordinat`). Pindah ke poligon sebelum N3.
- **Zona aktif** (`state.jsx` → `useZona`, `lib/daerah.js`): pilihan manual (select di header, disimpan di HP) ??
  provinsi dari posisi yang sudah diizinkan ?? Sulawesi Selatan. **Pemilihnya di dalam halaman, bukan di header**
  (masukan pemilik: mengganggu): `components/PilihZona.jsx` di Beranda (di bawah status), panel kiri bawah Peta
  (nama singkat), Daftar, dan halaman Berita. Dipakai: pusat peta (terbang ke ibu kota saat zona
  diganti; peta bisa digeser se-Sulawesi), kotak pencarian Nominatim (`kotakZona`), Beranda & Daftar
  (`tempatDiZona`), urutan berita, imbauan, dan optgroup peringkat koin.
- **Berita:** + ANTARA Sulut, Gorontalo, Sulteng, Sultra (dicek 1 Okt); Sulbar belum punya feed ANTARA (tercakup
  media Sulsel). Kolom `berita.provinsi`.
- **Imbauan otomatis** (`_shared/imbauan.js`, view `imbauan_publik`, `components/Imbauan.jsx`): ≥ 30 laporan
  berjukir dari ≥ 10 perangkat dalam 30 hari; maks. 2 indikasi terbesar (tanpa karcis / kemahalan ≥ 25%, tanda
  gratis / memaksa ≥ 15%) + kalimat "jukir membantu" bila ≥ 60%. Kab/kota pengguna dulu, selain itu provinsi zona.
  Imbauan manual lewat Telegram **belum** dibuat.
- Migrasi `20261001000006_sulawesi.sql` (juga `indeks_pungli` untuk tampilan Radar). Zona waktu: seluruh Sulawesi
  WITA, jadi `tanggalWita` belum perlu diganti (wajib sebelum N3).

**Hierarki zona** (kunci = kode wilayah Kemendagri/BPS, bukan nama, supaya nama ganda aman):

| Tingkat | Jumlah | Dipakai untuk |
|---|---|---|
| Pulau / kepulauan | 7 (Sumatera, Jawa, Kalimantan, Sulawesi, Bali–Nusa Tenggara, Maluku, Papua) | pilihan zona di layar awal, peringkat pulau |
| Provinsi | 38 | zona aktif (peta, daftar, berita, imbauan), halaman wilayah |
| Kabupaten/kota | 514 | peringkat, berita per daerah, tarif resmi (Perda per kab/kota), statistik |

**Data & penentuan zona**
- Tabel `wilayah` (`kode`, `nama`, `tingkat`, `induk`, `pulau`, `zona_waktu` WIB/WITA/WIT, `bbox`, `geom` disederhanakan)
  dari batas administrasi OpenStreetMap (admin_level 4 = provinsi, 5 = kab/kota), disederhanakan supaya kecil. Dibuat
  skrip `npm run wilayah` (sekali, hasilnya file migrasi data).
- **Tempat parkir:** `titik_parkir.kode_wilayah` diisi server dengan PostGIS `ST_Contains` saat tempat dibuat
  (menggantikan Nominatim per tempat di 1.4: lebih cepat, tanpa batas 1 permintaan/detik). Data lama diisi sekali.
- **Pengguna:** zona aktif otomatis dari lokasi (dihitung dari `bbox` di perangkat, atau RPC `wilayah_di` dengan
  koordinat dibulatkan ±1 km; tidak disimpan) dan selalu bisa dipilih manual ("Zona: Sulawesi Selatan ▾", disimpan di HP).
  Tanpa izin lokasi → zona terakhir, atau minta pilih pulau → provinsi saat pertama buka.
- `_shared/kabupaten.js` (24 kab/kota Sulsel) diganti `_shared/wilayah.js` yang dibangkitkan dari data yang sama
  (label + alias untuk mendeteksi daerah di berita).

**Yang berubah per zona**
- **Peta & daftar:** pusat awal = zona aktif; tempat dimuat per provinsi/bbox (bukan seluruh Indonesia sekaligus,
  `titik_publik` difilter kode provinsi), snapshot offline per zona.
- **Pencarian:** viewbox Nominatim = zona aktif (`kotakZona` di `lib/cari.js`, sudah dibuat di N2).
- **Peringkat koin:** kab/kota (bawaan), provinsi, pulau, nasional.
- **Berita (1.3.2):** `SUMBER_BERITA` diberi `provinsi`; sumber tiap provinsi dicek dulu (RSS, izin bot). Jatah Gemini
  per hari dinaikkan bertahap; berita diurutkan kab/kota pengguna → provinsi → pulau.
- **Waktu:** "hari ini" untuk koin/seri dan tampilan jam mengikuti zona waktu wilayah (WIB/WITA/WIT), bukan WITA saja
  (`tanggalWita` → `tanggalZona`, `tanggal_wita()` → per wilayah).
- **Tarif resmi:** per kab/kota (Perda), diisi bertahap pemilik / relawan, sumber wajib.
- **Imbauan parkir per zona (fitur baru):** kartu "Imbauan parkir · <wilayah>" di Beranda dan halaman wilayah.
  1. *Otomatis dari data*, hanya bila cukup laporan (usulan: ≥ 30 laporan dari ≥ 10 perangkat dalam 30 hari) dan
     dengan nada netral, mis. "38% laporan di Kota Makassar bulan ini: tidak diberi karcis. Minta karcis saat
     membayar." Tidak menyebut tempat atau orang tertentu.
  2. *Manual* oleh pemilik (nanti mitra) lewat Telegram: `/imbauan <kode wilayah> <teks>` → pratinjau → Tampilkan,
     berlaku sampai tanggal tertentu.
- **Halaman wilayah statis (SEO lokal):** `/wilayah/sulawesi-selatan`, `/wilayah/sulawesi-selatan/makassar` berisi
  ringkasan agregat (jumlah tempat & laporan, indikasi terbanyak, tarif median, imbauan), masuk sitemap. Membuka jalan
  untuk dashboard / CSV per wilayah bagi pemerintah daerah (bagian 10, ditunda).

**Tahapan**

| Fase | Cakupan | Syarat sebelum mulai |
|---|---|---|
| N1 | Sulawesi Selatan penuh (24 kab/kota) | tabel `wilayah`, pilih zona, peta & cari per zona, zona waktu |
| N2 | Pulau Sulawesi (6 provinsi) | sumber berita provinsi dicek, imbauan otomatis |
| N3 | Kota besar Jawa–Bali (Jakarta, Bandung, Semarang, Yogyakarta, Surabaya, Denpasar) | kapasitas & moderasi siap (di bawah), halaman wilayah |
| N4 | Seluruh Indonesia | biaya terukur, moderator per pulau |

Wilayah yang baru dibuka tetap bisa dipakai (melapor membuat tempat baru), dengan label "Baru dibuka di wilayah ini".

**Kapasitas & biaya (cek sebelum N3, tanyakan pemilik sebelum berlangganan apa pun)**
- **Supabase** free tier (500 MB database, batas panggilan Edge Function per bulan) kemungkinan tidak cukup nasional →
  Pro ±US$25/bulan.
- **Nominatim publik** tidak boleh dipakai berat (maks. 1 permintaan/detik, bukan untuk autocomplete) → Photon (komoot),
  layanan berbayar (LocationIQ / MapTiler), atau instance sendiri.
- **Peta OpenFreeMap:** gratis; cek kebijakan pemakaian volume besar.
- **Gemini:** jatah harian naik seiring jumlah sumber berita; tetap usahakan free tier.
- **Moderasi:** satu pemilik di Telegram tidak cukup untuk nasional → moderator per pulau (chat Telegram per zona,
  tabel `moderator`), pemilik tetap pemutus akhir.

### 1.6 Halaman situs & persiapan Google AdSense (dibuat 1 Okt 2026)

Permintaan pemilik: siapkan halaman yang dibutuhkan untuk daftar AdSense sesuai kebijakan terbaru.

- **Halaman:** `/tentang`, `/privasi` (Kebijakan Privasi), `/syarat` (Syarat Penggunaan), `/kontak`. Teks di
  `web/src/lib/konten-legal.js` (satu sumber untuk `pages/Legal.jsx` dan HTML statis lengkap di `lib/seo.js`), masuk
  sitemap. **Isi privasi wajib sesuai kenyataan kode**; ubah bila cara data dikelola berubah (dijaga
  `tests/situs.test.js`: pengungkapan cookie iklan Google, tautan opt-out adssettings.google.com & aboutads.info,
  partner-sites, retensi 7 hari, hash bersalt, Telegram, Nominatim, UU 27/2022 PDP).
- **Tautan situs** (`components/TautanSitus.jsx`, `TAUTAN_SITUS`): Tentang · Berita parkir · Kebijakan Privasi · Syarat ·
  Kontak, di bawah Beranda, Daftar, Berita, Info, Saya, halaman situs, dan semua HTML statis.
- **Kontak:** formulir → Edge Function `kontak` (`kontak/proses.js`, `_shared/kontak.js`) → Telegram pengelola. Isi pesan
  tidak disimpan; tabel `pesan_kontak` hanya hash IP + waktu untuk batas 3/jam & 10/hari (migrasi
  `20261001000007_kontak.sql`, dihapus 30 hari). Kolom jebakan bot `situs` (bot dapat balasan sukses palsu).
- **Verifikasi & ads.txt:** env Vercel `VITE_ADSENSE_CLIENT=ca-pub-<16 angka>` (diisi pemilik setelah daftar) →
  meta `google-adsense-account` di semua halaman + `/ads.txt` (`google.com, pub-…, DIRECT, f08c47fec0942fa0`).
  **Skrip iklan (adsbygoogle.js) belum dipasang**: menambah ±100–200 KB JS dan memperlambat situs. Bila disetujui:
  muat setelah halaman selesai dimuat, hanya di halaman berisi teks (Beranda, Berita, Info, halaman situs), **tidak di
  layar Peta, form lapor, atau dekat tombol** (aturan klik tidak sengaja). Untuk pengunjung EEA/UK/Swiss, aktifkan pesan
  persetujuan bawaan AdSense ("Privasi & pesan"), tanpa kode tambahan.
- **Syarat AdSense yang di luar kode (pemilik):** domain sendiri (AdSense tidak menerima subdomain `*.vercel.app`),
  akun Google pemilik ≥ 18 tahun, isi cukup & asli (halaman berita, info, FAQ sudah ada), situs bisa diakses peninjau.

### 1.7 Halaman per tempat (dibuat 1 Okt 2026, pilihan pemilik)

- Alamat `/tempat/<slug-nama>-<id>` (`lib/halaman-tempat.js`: `jalurTempat`, `idDariJalur`; id di akhir, jadi nama
  boleh berubah). Halaman React `pages/Tempat.jsx`: ringkasan (`components/RingkasanTempat.jsx`, sama dengan lembar
  peta), "Lihat di peta" (fokus ke tempat), "Petunjuk arah", riwayat, 5 tempat terdekat, tautan situs. Lembar tempat
  di peta memuat tautan "Buka halaman tempat ini (untuk dibagikan)".
- **HTML statis saat build** (`seoHalaman` di `web/vite.config.js` + `buatIsiTempat`/`khususTempat` di `lib/seo.js`):
  membaca `titik_publik` + `ringkasan_titik_publik` dengan kunci anon dari env build, menulis `dist/tempat/<slug>.html`
  (judul ≤ 70, deskripsi kalimat utuh ≤ 160, isi ringkasan), daftar tautan di `daftar.html`, dan sitemap. Tanpa env
  Supabase build tetap lolos (0 halaman tempat).
- **Indeks hanya bila ≥ 3 laporan** (`MIN_LAPORAN_INDEKS`, disetujui pemilik 1 Okt 2026): di bawah itu `noindex, follow` dan tidak masuk sitemap
  (halaman tipis merugikan SEO & AdSense). Tanpa menuduh: kalimat sama dengan lembar (bagian 6.2).
- Keterbatasan: HTML statis hanya diperbarui saat deploy (halaman React selalu terbaru). Bila perlu: Vercel Deploy
  Hook + pg_cron harian ±02:00 WITA (diusulkan 1 Okt, belum diputuskan pemilik).

---

## 2. Struktur repo (meniru Adami)

| Folder / file | Isi |
|---|---|
| `web/` | Web app: React 19, Vite 8, react-router 7, MapLibre 6 (dimuat belakangan), PWA dengan service worker tulisan tangan |
| `web/src/pages/` | Beranda, Peta (di `App.jsx` + `components/Peta.jsx`), Daftar, Info, Saya (koin, noindex), Berita, Tempat (1.7), Legal |
| `web/src/components/` | Komponen React (nama bahasa Indonesia: `Peta.jsx`, `CariTempat.jsx`, `LembarTempat.jsx`, `LaporLayar.jsx`, `Legenda.jsx`) |
| `web/src/lib/` | Logika web tanpa React bila memungkinkan: `data.js` (baca view publik lewat `fetch` REST, tanpa supabase-js), `tempat.js` (gabung data, cocokkan tempat, kalimat ringkasan), `lokasi.js`, `cari.js` (Nominatim), `offline.js`, `seo.js`, `tema.js`, `koneksi.js`, `konten-beranda.js`, `util.js` |
| `web/src/state.jsx` | Context app: data tempat + ringkasan, posisi pengguna, zona aktif (provinsi) & kab/kota pengguna, kendaraan terpilih (motor/mobil) |
| `web/src/app.css` | **Satu file CSS**, semua warna lewat variabel (bagian 6.3) |
| `supabase/functions/` | Edge Function: `lapor` (juga membuat tempat baru & mencatat koin), `telegram` (tombol pemilik), `aduan` (laporkan komentar), `kontribusi` (tab Saya), `foto` (foto bukti → Telegram pemilik), `berita` (M5, cron), `kontak` (formulir kontak → Telegram), `pemantauan` (ringkasan harian, cron). Logika di `proses.js` (JS murni, dites), `index.ts` = pembungkus Deno |
| `supabase/functions/_shared/` | Modul bersama. File `.js` = ESM murni, dipakai web (alias `@shared`), Edge Function, dan tes. File `.ts` hanya untuk Edge Function |
| `supabase/migrations/` | Skema, RLS, view publik, retensi, cron |
| `supabase/seed.sql` | Data awal lokal. Tarif resmi belum diisi (5, menunggu pemilik) |
| `scripts/` | `setup-telegram.js`, `setup-berita.js` (rahasia, dijalankan pemilik), `cek-tayang.js`, `buat-ikon.js`, `buat-qr.js`, `kampanye.js` |
| `scripts/data/` | Kosong; nanti `tarif-resmi.json` (diisi/diperiksa pemilik) |
| `tests/` | `node:test`, satu file per modul |
| `docs/` | Dokumen pendukung, materi peluncuran |

---

## 3. Perintah

| Perintah | Fungsi |
|---|---|
| `npm test` | Semua tes (`node --test "tests/**/*.test.js"`) |
| `npm run dev --prefix web` | Server dev (Supabase lokal di `web/.env.local`) |
| `npm run build --prefix web` | Build produksi (sekaligus membuat HTML statis SEO, robots, sitemap) |
| `npm run cek:tayang` | Setelah push: tunggu sampai commit terakhir tayang di jukirhub.site (bagian 9) |
| `npm run qr` | Buat ulang QR poster ke `https://jukirhub.site/peta` |
| `npm run kampanye` | Laporan & pelapor per kampanye iklan (UTM), dari view `kampanye_publik` (`docs/peluncuran/iklan.md`) |
| `npm run berita:setup` | **Dijalankan pemilik**: kunci Gemini + secret jadwal berita (M5) |
| `npm run ikon` | Buat ulang favicon, ikon HP, dan `og.png` dari `web/src/lib/logo.js` |
| `npm run bot:setup` | **Dijalankan pemilik**: token bot Telegram + webhook (rahasia) |
| *(belum ada)* `seed`, `moderasi`, `cloud:secrets`, `pemantauan:setup` | Pola Adami, tidak dibuat di JukirHub; moderasi lewat tombol Telegram (+ AI), rahasia lewat `npx supabase secrets set`, `pemantauan` memakai secret & Vault berita |
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
  `tarif_publik`, `riwayat_publik`, `berita_publik`, `imbauan_publik`, `kampanye_publik`): hanya hasil/agregat.
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
  nama orang); komentar baru tampil bila AI menilai `layak` atau pemilik menekan Tampilkan di Telegram
  (bagian 1.3.1). Isian lain berupa pilihan dan bintang dari daftar tetap.
- **Foto bukti** (dibuat 1 Okt, bagian 1.4) hanya diteruskan ke Telegram pemilik, tidak tampil publik dan tidak disimpan
  di server; EXIF dibuang di HP dan di server. Bila kelak foto ditampilkan publik: bucket privat, moderasi dulu,
  wajah dan plat tidak boleh terlihat.
- Setiap halaman titik memuat disclaimer: "Data dari laporan warga, belum diverifikasi pihak berwenang."
  Keberatan (pemilik tempat / pihak resmi / pihak yang disebut) lewat halaman **/kontak**; kebijakan lengkap di
  **/privasi** & **/syarat** (1.6).
- **Tanpa pelacak iklan** (Meta Pixel, TikTok Pixel, Google Analytics, dsb.). Iklan diukur dengan UTM: web
  menyimpan `sumber/kampanye/konten` di HP 30 hari (`web/src/lib/kampanye.js`), laporan membawanya ke kolom
  `laporan.kampanye`, publik hanya melihat angka agregat (`kampanye_publik`).
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
  `lng`, `akurasi_m`, `jarak_m`, `bobot_manual`, `dibuat`, `kampanye` (kode iklan `sumber/kampanye/konten`, boleh
  kosong; tidak valid → diabaikan tanpa menolak laporan).
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

### 6.3 Tampilan "Radar" (Opsi A, pilihan pemilik 1 Okt 2026; kerangka tetap pola Adami)

- **Kerangka** sama dengan Adami (`.app` grid): header · banner offline · isi · bilah aksi (tombol utama
  **"Laporkan parkir"**, membuka Peta di lokasi pengguna + petunjuk "Ketuk tempat Anda parkir") · menu bawah
  **5 tab: Beranda, Peta, Daftar, Info, Saya** (tab Data ditunda, bagian 1.2). **Di tab Peta bilah aksi tidak ditampilkan**
  (tombol "Laporkan parkir" ada di lembar tempat; dua tombol sama bertumpuk membingungkan).
- **Header:** logo perisai heksagon + "JukirHub" (tagline **tidak** di dekat logo maupun di Beranda, permintaan
  pemilik 1 Okt; `SITUS.tagline` hanya dipakai og.png), pilihan **Motor / Mobil** (menentukan tarif yang ditampilkan dan kendaraan di form lapor),
  lalu ikon tema di kanan. **Jangan menaruh pemilih zona/provinsi di header** (masukan pemilik); letaknya di halaman
  (bagian 1.5). Di HP < 360 px tulisan "JukirHub" disembunyikan, logo tetap.
- **Logo** (`web/src/lib/logo.js`, satu sumber untuk header, HTML statis, `npm run ikon`): perisai heksagon cyan +
  "P" + titik sinyal kuning. Ikon HP/favicon: kotak gelap `#060a13`. `og.png`: latar gelap ber-grid + tagline.
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
- **Ciri Radar:** latar hitam-biru, aksen **cyan**, grid tipis di atas peta (`.peta-wadah::after`, tidak menangkap
  ketukan), cincin tipis di sekitar penanda, **angka & label data monospace** (`.angka`, `.label-data`), indeks
  indikasi pungli **0–100 + bilah 10 ruas** di lembar tempat (`indeks_pungli`, hanya bila data cukup; skor > 100
  dibatasi 100), kartu **Imbauan parkir** & **Berita parkir** di Beranda.
- **Warna hanya untuk makna:** level indikasi, bintang rating, koin, dan aksen cyan. Selebihnya netral. Warna tidak
  pernah sendirian: selalu disertai teks/ikon.
- Tombol/tautan minimal 44 px (tombol utama 48 px), radius **10 px**, kartu **12 px**, lembar bawah 18 px 18 px 0 0.
  Lebar kolom isi desktop 696 px (`--lebar-kolom`), bilah tetap selebar layar.

#### Tema dan warna

**GELAP bawaan**, mode terang lewat ikon di kanan header (matahari = ke terang, bulan = ke gelap), disimpan
`jukirhub_tema`, dipasang skrip kecil di `web/index.html` sebelum halaman digambar (`lib/tema.js`, salin dari
Adami). Semua warna lewat variabel di `:root` (gelap) dan `:root[data-tema="terang"]` di `app.css`; **variabel
baru wajib ada di kedua tema** (`tests/tema.test.js`, salin dari Adami).

Nilai pasti ada di `app.css` (dua blok `:root`); yang dijaga tes (`tests/tema.test.js`):

| Variabel | Gelap | Terang | Dipakai untuk |
|---|---|---|---|
| `--latar` / `--permukaan` | `#060a13` / `#0b1324` | `#f3f6fa` / `#ffffff` | Latar halaman / header, kartu, lembar |
| `--utama` | `#22d3ee` | `#0e7490` | Tombol utama, pilihan Motor/Mobil aktif |
| `--utama-teks` | `#04222a` | `#ffffff` | Teks di atas `--utama` |
| `--aksen` | `#22d3ee` | `#0e7490` | Tautan, tab aktif, label data penting |
| `--fokus` | `#67e8f9` | `#155e75` | Garis fokus keyboard (3 px, offset 2 px) |
| `--logo-gambar` / `--logo-sinyal` | `#22d3ee` / `#facc15` | `#0e7490` / `#ca8a04` | Logo di header |
| `--grid` | cyan alfa 0,05 | cyan tua alfa 0,06 | Grid radar di atas peta |
| `--klaster-latar` / `-teks` | `#22d3ee` / `#04222a` | `#0e7490` / `#ffffff` | Angka gugus di peta |
| `--indikasi-rendah` | `#2dd4bf` | `#0f766e` | Penanda & label indikasi rendah |
| `--indikasi-sedang` | `#facc15` | `#a16207` | Penanda & label indikasi sedang |
| `--indikasi-tinggi` | `#f87171` | `#b91c1c` | Penanda & label indikasi tinggi |
| `--indikasi-kurang` | `#64748b` | `#9aa8bb` | Belum cukup data |

Warna bilah status HP (`meta theme-color`) = `--permukaan`: `#0b1324` (gelap) / `#ffffff` (terang).
Manifest: `background_color` `#060a13`, `theme_color` `#0b1324`.

#### Font dan ukuran huruf (tampilan Radar)

- **Space Grotesk** untuk teks & judul (latin **400/600**) dan **JetBrains Mono** untuk angka & label data (latin
  **400/500**), disajikan dari situs sendiri (`@fontsource/space-grotesk`, `@fontsource/jetbrains-mono`, diimpor di
  `main.jsx`, `font-display: swap`). **Jangan memuat dari Google Fonts.** Poppins (Adami) tidak dipakai lagi.
  `--font-isi: "Space Grotesk", …`, `--font-angka: "JetBrains Mono", …`.
- Ukuran dasar **15 px di HP**, **16 px di layar ≥ 760 px** (`:root { font-size }`, semua rem ikut).
- Ketebalan **600** untuk judul, `strong`, tombol, label menu; angka monospace 400/500.
- **Monospace hanya untuk angka & tanda pendek** (koin, indeks, gugus, tagline, label "eyebrow"). Teks keterangan
  biasa ("Tanpa jukir", sumber berita, meta tempat) memakai Space Grotesk `.redup` (masukan pemilik: ukuran huruf
  tidak pas, 1 Okt 2026).
- Skala:

| Elemen | Ukuran (rem; 1rem = 15 px HP / 16 px desktop) |
|---|---|
| Judul pembuka Beranda | `clamp(1.65rem, 6.4vw, 2.25rem)` |
| Judul halaman (h1) | `1.5rem` |
| Judul seksi Beranda (h2) | `1.25rem` |
| Merek di header | `1.1rem` |
| Judul kartu & lembar (h2) | `1.0625rem` |
| Teks isi, judul kecil (h3), tombol | `1rem` |
| Teks redup, meta, label, lencana | `0.875rem` |
| Keterangan, label menu bawah, label data monospace | `0.8rem` (12 px, **minimum mutlak**) |

Hanya ukuran di tabel ini; jangan menambah ukuran "nanggung" (0,85 / 0,9 / 0,95 rem).
Cek di HP 360 px setiap menambah teks/judul; header paling padat (logo, zona, kendaraan, tema).

---

## 7. Ramah HP, kecepatan, dan SEO — wajib di setiap perubahan

**Pengukuran 1 Okt 2026** (Lighthouse 12, mode HP + 4G lambat, build produksi `vite preview`): Beranda kinerja 96,
Daftar 93, Berita 96, Info/Tentang/Privasi/Kontak 97, Saya 96; SEO 100 & aksesibilitas 100 di semua halaman publik
(Saya sengaja noindex). Peta 65: MapLibre ±275 KB & ±1 detik CPU (TBT) — biaya pustaka peta; menunda pemuatannya
sudah dicoba dan tidak membantu. Pelajaran (jangan diulang):
- Pramuat bagian lain (Peta, Daftar, …) **menunggu event load + 3 detik** (`lib/koneksi.js`); pramuat yang terlalu cepat
  membuat LCP Beranda 4 detik (unduhan 470 KB) padahal LCP nyata ±0,35 detik. Sekarang LCP 2,1 s, 170 KB.
- Data Supabase diminta **setelah gambar pertama** (`setelahGambarPertama`, dengan cadangan timer 300 ms karena
  requestAnimationFrame tidak berjalan di tab tersembunyi). **Kecuali halaman /berita**: berita = isi utama, jadi
  diunduh sejak `main.jsx` (`lib/berita.js`, sekali per kunjungan & dipakai bersama kartu Beranda). Berita 97 (LCP 2,4 s).
- Preload font **memperburuk** LCP (diuji 3×), menanam CSS di HTML tidak terukur manfaatnya → keduanya tidak dipakai.
- Font cadangan berukuran sama (`@font-face` "… Fallback", Capsize) supaya ganti font tidak menggeser teks.
- Saat memuat daftar/berita, `.memuat-blok` mencadangkan tinggi supaya tautan situs di bawah tidak terdorong (CLS).
- Uji: `preview_start web-preview` lalu `npx lighthouse@12 http://localhost:4174/<halaman>` (CHROME_PATH Chrome); ulangi
  2–3× sebelum menyimpulkan (simulasi bergantung latensi Supabase).

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
- **Environment Vercel**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (kunci anon **atau** publishable `sb_publishable_…`; hanya dikirim di header `apikey`); opsional `VITE_SITE_URL` (tidak dipakai: bawaan `SITUS.urlBawaan` = jukirhub.site) dan `VITE_ADSENSE_CLIENT` (belum diisi; meta AdSense & Search Console sementara ditulis langsung pemilik di `web/index.html`, `ads.txt` belum ada, 1.6). Tanpa keduanya app tetap jalan dengan data kosong. Untuk dev: `web/.env.local` (di-gitignore).
- **Edge Function** (dideploy pemilik): `npx supabase functions deploy <nama>`.
- **Secret Edge Function** (`npx supabase secrets set …`): `ALLOWED_ORIGINS`, `URL_WEB`, `REPORTER_SALT`, `IP_SALT`,
  `GEMINI_API_KEY` & `BERITA_SECRET` (`npm run berita:setup`), `TELEGRAM_*` (`npm run bot:setup`).
- **Bot Telegram pemilik:** `npm run bot:setup` (dijalankan pemilik; `scripts/setup-telegram.js`) memasang
  `TELEGRAM_BOT_TOKEN`, `TELEGRAM_OWNER_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`, `URL_WEB` dan webhook ke fungsi `telegram`.
  Tanpa itu kabar tempat baru diam saja (no-op), laporan tetap jalan.
- **Cek tipe Edge Function** tanpa memasang Deno: salin `supabase/functions` ke folder sementara berisi
  `deno.json` `{ "nodeModulesDir": "auto" }`, lalu `npx --yes deno@2 check functions/<nama>/index.ts`.
- **Migrasi:** file baru di `supabase/migrations/` (`YYYYMMDDNNNNNN_nama.sql`), lalu `npx supabase db push`.
- **pg_cron:** `bersihkan-data-pribadi` (03:00 WITA), `bersihkan-koin-harian` (03:40), `bersihkan-foto-laporan` (03:45), `bersihkan-pesan-kontak` (03:50), `bersihkan-berita` (04:10), `berita` (tiap 3 jam menit ke-20, lewat pg_net + Vault; aktif), `pemantauan` (21:00 WITA, URL fungsi diturunkan dari Vault `berita_url`, header `x-berita-secret`).
- Kabar Telegram ke pemilik: tempat baru, komentar baru (dengan hasil AI), komentar diadukan, foto bukti, pesan kontak,
  dan **ringkasan harian 21:00 WITA** (Edge Function `pemantauan` + RPC `ringkasan_pemantauan`, migrasi
  `20261001000008_pemantauan_ai.sql`; `_shared/pemantauan.js`): angka 24 jam (laporan, perangkat, tempat baru, komentar
  & yang tampil lewat AI, foto, kontak, berita, koin, laporan lokasi mencurigakan), pengingat komentar menunggu, dan
  peringatan bila jadwal pg_cron atau panggilan pg_net gagal. Hanya angka agregat, tanpa data pribadi.
- **Alur rilis (seperti Adami): `git push` ke `main` → Vercel build & tayang otomatis → `npm run cek:tayang`.**
  Build menulis `/versi.json` (commit yang tayang); `scripts/cek-tayang.js` membandingkannya dengan HEAD tiap 30 detik
  (maks. 10 menit) sambil membaca status build Vercel di GitHub, lalu melapor: tayang / build gagal (dengan tautan log) /
  build sukses tapi tidak dijadikan Production (dengan cara memperbaikinya) / diblokir checkpoint. Pemilik tidak perlu
  membuka Vercel kecuali skrip menyuruh. Syarat sekali di Vercel: Environments → Production → Branch Tracking `main` (bukan `master`)
  + "Auto-assign Custom Production Domains" aktif.
- **Hanya SATU proyek Vercel: `jukirhub`** (memegang jukirhub.site, www, dan jukirhub.vercel.app). 30 Sept 2026 repo ternyata tersambung juga ke
  duplikat `jukirhub-aywb` (import kedua, preset Vite → build selalu gagal) dan production `jukirhub` tertahan di M0
  sampai pemilik menjalankan **Promote to Production** pada deploy M2. Setelah push, pastikan bundle di situs berganti;
  kalau tidak, cek tab Deployments proyek `jukirhub` (bukan build lokal). Status deploy juga terlihat di
  `https://api.github.com/repos/wahyu-setiawan99/jukirhub/commits/<sha>/status`.
- **Jangan mengecek situs langsung dengan loop cepat** (mis. `curl` tiap 10 detik): 29 Sept 2026 hal itu memicu
  **Vercel Security Checkpoint** (403 `x-vercel-mitigated: challenge`) untuk jaringan pemilik, termasuk browser pane.
  Tunggu ±2 menit setelah push, lalu cek sekali; jangan pernah mencoba melewati tantangan anti-bot.
- **Cek setelah push:** tunggu deploy selesai; `/`, `/peta`, `/daftar`, `/berita`, `/info`, `/privasi`, `/kontak`, satu `/tempat/…` (dari `daftar.html`) menjawab 200; buka di 375×812,
  360×640, dan desktop, tema gelap dan terang; console bersih; laporkan ke pemilik.

---

## 10. Rencana kerja

Urutan mengikuti bagian 1.2. Satu tahap selesai (tes + build lolos, dicek di HP) sebelum tahap berikutnya.

| Tahap | Isi |
|---|---|
| **M0 Fondasi** | Kerangka `web/` meniru Adami, tema, Poppins, service worker, SEO dasar, migrasi awal, tes. *Selesai (lihat status).* |
| **M1 Peta & pilih tempat** | Peta MapLibre + penanda tempat terlapor + gugus, ketuk tempat di peta dasar, cari (lokal + Nominatim), tekan lama untuk pin, lembar tempat (baca dari view publik), Daftar *Selesai 29 Sept (lihat status).* |
| **M2 Laporkan parkir** | Form 1 layar (1.2 poin 3), Edge Function `lapor` (gerbang 250 m, batas, GPS palsu, buat tempat baru), `skor-pungli.js` + ringkasan, penanda berubah warna setelah lapor *Selesai 30 Sept (lihat status).* |
| **M3 Rilis** | Commit & push, Vercel, proyek Supabase cloud, domain, uji di HP sungguhan, materi ajakan. *Materi siap 30 Sept: `docs/peluncuran/` (checklist, poster A5 ×2, teks WhatsApp, QR `npm run qr`). Domain `jukirhub.site` aktif 1 Okt. Sisa: uji HP lapangan & cold start oleh pemilik. Rencana iklan FB/IG/TikTok + pengukuran UTM siap 1 Okt (`docs/peluncuran/iklan.md`).* |
| **M4 Riwayat & komentar** | Riwayat laporan di lembar tempat, komentar opsional di form, saringan server + pemeriksaan AI + aduan (bagian 1.3.1) *Selesai 1 Okt (moderasi lewat Telegram; pemeriksaan AI dibuat 1 Okt sore).* |
| **M5 Berita parkir** | Berita parkir per daerah pengguna (kartu Beranda + halaman `/berita`): RSS media Sulawesi + ringkasan Gemini + kab/kota & provinsi yang disebut (bagian 1.3.2) *Selesai & aktif 1 Okt.* |
| **M6 Koin & tab Saya** | Koin tanpa nilai uang, lencana, seri, peringkat per kabupaten, tab Saya, foto bukti ke Telegram pemilik (bagian 1.4) *Dibuat 1 Okt. Tombol "Ambil foto" + sumber foto di Telegram dikerjakan 2 Okt; deploy fungsi `foto` menunggu pemilik.* |
| **M7 Nasional** | Zonasi pulau / provinsi / kab-kota, imbauan parkir per zona, halaman wilayah (bagian 1.5), per fase N1–N4 *N2 pulau Sulawesi dibuat 1 Okt (pilihan pemilik); N3–N4 rencana.* |

**Ditunda (hanya bila pemilik meminta setelah M3):** estimasi pendapatan / mode amati, tab Data & dashboard per
wilayah + CSV, rincian kerja jukir, atribut resmi, tag sikap, foto publik, notifikasi, bot
Telegram warga, akun untuk menyimpan koin, hadiah/penukaran koin, hak jawab pemilik tempat, lencana "Resmi
terverifikasi Dishub", akun pemerintah.

*Catatan di bawah ini riwayat per tahap; status terbaru selalu di bagian "Serah terima" di awal file.*

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
  - Pemilik tidak mau membuka Vercel untuk tiap rilis → pipeline `git push` + `npm run cek:tayang` (bagian 9). Skrip
    menemukan deploy tidak dijadikan Production: penyebab utamanya **Branch Tracking Vercel = `master`** (repo hanya punya
    `main`). Pemilik mengganti ke `main` dan mengaktifkan "Auto-assign Custom Production Domains" (30 Sept).
  - Pemilik: nama tempat baru cukup **dikabarkan** ke pemilik; selama tidak dihapus berarti sah, tanpa halaman
    moderasi → Telegram + tombol Sembunyikan (bagian 5).
- **1 Okt 2026:**
  - Legenda "Arti warna" di peta: judul + tombol ✕ jelas, tertutup juga saat peta diketuk (masukan pemilik dari
    tangkapan layar HP).
  - Koin + tab Saya + foto bukti (bagian 1.4): koin saja (tanpa poin terpisah), tanpa login, foto hanya untuk pemilik.
  - M5 berita: per daerah pengguna, seluruh Sulsel per kabupaten (bagian 1.3.2), menggantikan rencana berita per
    tempat ≤ 300 m.
  - Pemilik: JukirHub untuk **seluruh Indonesia**, dizonasi per pulau/provinsi supaya bisa mengimbau masyarakat per
    daerah → rencana bagian 1.5. Pemilik juga minta 2 opsi tampilan yang lebih "tech pro" dan logo lebih ikonik dengan
    tagline "Melaporkan juru parkir liar" (mockup dibuat).
  - **Domain `jukirhub.site`** (pemilik, 1 Okt 2026): semua URL di kode/dokumen diganti, QR dibuat ulang, redirect
    permanen dari alamat lama. Pemilik: tambah domain di Vercel + DNS, `ALLOWED_ORIGINS` & `URL_WEB` di Supabase, Search
    Console & AdSense memakai domain ini.
  - Revisi pemilik: tagline dihapus dari dekat logo (header); Poppins sudah tidak dipakai & tidak terpasang; satu
    tombol "Laporkan parkir" per layar (kartu "Belum ada koin" di tab Saya tidak punya tombol sendiri); halaman situs
    untuk AdSense (1.6); kinerja diukur ulang (7).
  - Revisi pemilik setelah tayang: berita **tidak** dikirim ke Telegram (cukup di web, halaman `/berita`), pemilih
    provinsi **dikeluarkan dari header** (mengganggu), ukuran huruf dirapikan ke satu skala (6.3).
  - Pemilik memilih **tampilan Opsi A "Radar"** (bagian 6.3; menggantikan aturan "tampilan & font meniru Adami",
    pola kode tetap meniru Adami), **logo C perisai heksagon** dengan tagline "Melaporkan juru parkir liar", dan
    **zonasi mulai fase N2 pulau Sulawesi** (bagian 1.5).
  - Pemasaran fokus **Facebook Ads (Meta Ads Manager), video**, plus IG & TikTok organik → `docs/peluncuran/iklan.md`.
    Tujuan iklan = pelapor; ukuran utama **biaya per pelapor** (`npm run kampanye`), tanpa Meta Pixel (rekomendasi
    Claude, pola Adami). Nada iklan: info praktis & adil, bukan kampanye anti-jukir.

**Belum diputuskan (tanyakan pemilik sebelum dikerjakan):**

- Gerbang lokasi 250 m untuk melapor (rekomendasi Claude, bagian 6.1): bila pemilik ingin warga bisa melapor dari
  jauh (mis. setelah sampai rumah), perlu keputusan dan penanganan laporan palsu.
- Poin skor pungli di 6.2 masih usulan awal; kalibrasi setelah ada data.
- Komentar hanya lewat laporan (rekomendasi Claude, 1.3.1) atau juga boleh tanpa melapor (butuh batas & moderasi
  tambahan).
- Rencana nasional (1.5): kapan N3 (kota besar Jawa–Bali), moderator per zona, dan apakah imbauan manual boleh dari
  mitra (Dishub / komunitas).
- Tagline "Melaporkan juru parkir liar" sudah dihapus dari header & Beranda (pemilik, 1 Okt); hanya tersisa di `og.png`.
  Hapus juga dari og.png? (kata "liar" bernada menuduh, 1.1, dan berisiko ditolak iklan Meta).
