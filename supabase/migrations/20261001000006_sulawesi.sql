-- Fase N2 pulau Sulawesi + tampilan Radar (keputusan pemilik 1 Okt 2026, AGENTS.md 1.5 & 6.3).
--
--   berita.provinsi          kode provinsi Sulawesi yang disebut berita (atau provinsi liputan media), untuk urutan
--                            berita per zona; view berita_publik ikut memuat kolom ini.
--   ringkasan_titik_publik   + indeks_pungli 0–100 (skor dibulatkan, maks. 100), hanya bila data cukup.
--   imbauan_publik           angka agregat per kab/kota 30 hari terakhir untuk "Imbauan parkir" di Beranda:
--                            jumlah laporan berjukir, perangkat berbeda, tiap indikasi pungli, membantu saat pergi,
--                            median bayar motor. Laporan berbobot rendah (GPS palsu) tidak dihitung. Ambang tampil
--                            ada di supabase/functions/_shared/imbauan.js (web), bukan di sini.

set search_path = public, extensions;

alter table berita add column provinsi text[] not null default '{}';

create or replace view berita_publik as
select id, sumber, judul, ringkasan, url, terbit, kabupaten, provinsi
from berita
where relevan and not disembunyikan and ringkasan is not null
  and terbit > now() - interval '30 days'
order by terbit desc
limit 50;

revoke all on berita_publik from anon, authenticated;
grant select on berita_publik to anon, authenticated;

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
            then least(100, round(r.skor_pungli))::integer end as indeks_pungli
from ringkasan_titik r
join titik_parkir t on t.id = r.titik_id
where t.status = 'aktif';

revoke all on ringkasan_titik_publik from anon, authenticated;
grant select on ringkasan_titik_publik to anon, authenticated;

create or replace view imbauan_publik as
select t.kota as kabupaten,
       count(*)::integer as laporan,
       count(distinct l.reporter_key)::integer as perangkat,
       count(*) filter (where 'tanpa_karcis' = any (l.pungli))::integer as tanpa_karcis,
       count(*) filter (where 'kemahalan' = any (l.pungli))::integer as kemahalan,
       count(*) filter (where 'memaksa' = any (l.pungli))::integer as memaksa,
       count(*) filter (where 'tanda_gratis' = any (l.pungli))::integer as tanda_gratis,
       count(*) filter (where l.bantu_pergi)::integer as bantu_pergi,
       (percentile_cont(0.5) within group (order by l.bayar) filter (where l.kendaraan = 'motor'))::integer as bayar_median_motor
from laporan l
join titik_parkir t on t.id = l.titik_id
where t.status = 'aktif' and t.kota is not null
  and l.ada_jukir and l.bobot_manual >= 1
  and l.dibuat > now() - interval '30 days'
group by t.kota;

revoke all on imbauan_publik from anon, authenticated;
grant select on imbauan_publik to anon, authenticated;
