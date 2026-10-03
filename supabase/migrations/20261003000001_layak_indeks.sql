-- Aturan indeks halaman tempat (AGENTS.md 1.8 A, disetujui pemilik 3 Okt 2026): halaman /tempat/… boleh diindeks
-- Google & masuk sitemap hanya bila ≥ 3 laporan dari ≥ 2 perangkat (sama dengan ambang bagian 6.2 & 7), supaya satu
-- perangkat tidak bisa membuat halaman tempat terindeks. Hanya boolean; jumlah perangkat mentah tetap tidak dibuka.
-- `create or replace view` hanya boleh menambah kolom di akhir: definisi lain sama dengan 20261001000006_sulawesi.sql.

set search_path = public, extensions;

create or replace view ringkasan_titik_publik as
select r.titik_id, r.jumlah_laporan,
       (r.jumlah_laporan - r.jumlah_tanpa_jukir >= 3 and r.jumlah_perangkat >= 2) as data_cukup,
       case when r.jumlah_laporan - r.jumlah_tanpa_jukir >= 3 and r.jumlah_perangkat >= 2 then r.level_pungli end as level_pungli,
       case when r.jumlah_laporan - r.jumlah_tanpa_jukir >= 3 and r.jumlah_perangkat >= 2 then r.alasan_pungli end as alasan_pungli,
       r.bantu_datang_ya, r.bantu_pergi_ya,
       r.bayar_median_motor, r.jumlah_motor, r.bayar_median_mobil, r.jumlah_mobil,
       r.bintang_rata, r.laporan_terakhir,
       r.jumlah_tanpa_jukir,
       case when r.jumlah_laporan - r.jumlah_tanpa_jukir >= 3 and r.jumlah_perangkat >= 2 and r.skor_pungli is not null
            then least(100, round(r.skor_pungli))::integer end as indeks_pungli,
       (r.jumlah_laporan >= 3 and r.jumlah_perangkat >= 2) as layak_indeks
from ringkasan_titik r
join titik_parkir t on t.id = r.titik_id
where t.status = 'aktif';

revoke all on ringkasan_titik_publik from anon, authenticated;
grant select on ringkasan_titik_publik to anon, authenticated;
