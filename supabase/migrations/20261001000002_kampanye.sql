-- Penanda kampanye iklan pada laporan (rencana pemasaran, docs/peluncuran/iklan.md): tanpa Meta Pixel. Laporan dari
-- pengunjung iklan (≤ 30 hari sejak klik) membawa "sumber/kampanye/konten" dari UTM. Bukan data pribadi.

alter table laporan add column kampanye text;
alter table laporan add constraint laporan_kampanye_valid check (
  kampanye is null or kampanye ~ '^[a-z0-9_-]{1,40}/[a-z0-9_-]{1,40}/[a-z0-9_-]{1,40}$'
);

-- Ringkasan per kampanye per hari (WITA) untuk `npm run kampanye`: hanya angka agregat.
create or replace view kampanye_publik as
select split_part(kampanye, '/', 1) as sumber,
       split_part(kampanye, '/', 2) as kampanye,
       split_part(kampanye, '/', 3) as konten,
       (dibuat at time zone 'Asia/Makassar')::date as hari,
       count(*)::integer as laporan,
       count(distinct reporter_key)::integer as pelapor
from laporan
where kampanye is not null
group by 1, 2, 3, 4;

revoke all on kampanye_publik from anon, authenticated;
grant select on kampanye_publik to anon, authenticated;
