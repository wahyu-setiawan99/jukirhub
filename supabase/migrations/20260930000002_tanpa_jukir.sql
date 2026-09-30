-- Laporan "tidak ada jukir" (keputusan pemilik 30 Sept 2026, AGENTS.md 1.2 poin 3): warga bisa melaporkan bahwa
-- sebuah tempat tidak ada juru parkirnya. Laporan seperti ini tidak punya jawaban membantu/bayar/pungli/bintang,
-- dan tidak ikut dihitung dalam skor pungli, tarif, maupun "membantu" (hanya jumlah_tanpa_jukir).

alter table laporan add column ada_jukir boolean not null default true;
alter table laporan
  alter column bantu_datang drop not null,
  alter column bantu_pergi drop not null,
  alter column bintang drop not null;
alter table laporan add constraint laporan_isian_sesuai_jukir check (
  (ada_jukir and bantu_datang is not null and bantu_pergi is not null and bintang is not null)
  or (not ada_jukir and bantu_datang is null and bantu_pergi is null and bintang is null
      and bayar = 0 and cardinality(pungli) = 0)
);

alter table ringkasan_titik add column jumlah_tanpa_jukir integer not null default 0;

-- Ambang level pungli dihitung dari laporan YANG ADA JUKIRNYA (jumlah_perangkat juga hanya dari laporan itu).
-- Kolom baru ditambahkan di akhir supaya create or replace view tetap sah.
create or replace view ringkasan_titik_publik as
select r.titik_id, r.jumlah_laporan,
       (r.jumlah_laporan - r.jumlah_tanpa_jukir >= 3 and r.jumlah_perangkat >= 2) as data_cukup,
       case when r.jumlah_laporan - r.jumlah_tanpa_jukir >= 3 and r.jumlah_perangkat >= 2 then r.level_pungli end as level_pungli,
       case when r.jumlah_laporan - r.jumlah_tanpa_jukir >= 3 and r.jumlah_perangkat >= 2 then r.alasan_pungli end as alasan_pungli,
       r.bantu_datang_ya, r.bantu_pergi_ya,
       r.bayar_median_motor, r.jumlah_motor, r.bayar_median_mobil, r.jumlah_mobil,
       r.bintang_rata, r.laporan_terakhir,
       r.jumlah_tanpa_jukir
from ringkasan_titik r
join titik_parkir t on t.id = r.titik_id
where t.status = 'aktif';

revoke all on ringkasan_titik_publik from anon, authenticated;
grant select on ringkasan_titik_publik to anon, authenticated;
