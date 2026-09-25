-- Skema v1 JukirHub, alur sederhana (AGENTS.md 1.2, 4–6).
--
-- Prinsip akses (sama dengan Adami):
--   * anon/authenticated TIDAK punya hak apa pun di tabel mentah.
--   * Baca publik hanya lewat view *_publik yang tidak memuat koordinat/IP/kunci pelapor maupun bobot laporan.
--   * Tulis hanya lewat Edge Function `lapor` (service_role). Ringkasan per tempat dihitung server ke ringkasan_titik.
--
-- Daftar kode di constraint *_valid harus sama dengan supabase/functions/_shared/konstanta.js
-- (dijaga tests/konstanta-db.test.js). Migrasi ini belum pernah diterapkan ke cloud (26 Sept 2026).

create extension if not exists postgis with schema extensions;
set search_path = public, extensions;

-- ---------------------------------------------------------------- tarif resmi

-- Diisi dari scripts/data/tarif-resmi.json; angka diperiksa pemilik (AGENTS.md bagian 5).
create table tarif_resmi (
  id                bigserial primary key,
  kota              text not null,
  kendaraan         text not null,
  tarif             integer not null check (tarif > 0 and tarif <= 100000),
  dasar_hukum       text not null,
  sumber_url        text,
  berlaku_sejak     date,
  diperiksa_pemilik boolean not null default false,
  dibuat            timestamptz not null default now(),
  constraint tarif_kendaraan_valid check (kendaraan in ('motor', 'mobil')),
  unique (kota, kendaraan, berlaku_sejak)
);

-- ---------------------------------------------------------------- tempat (titik parkir)

-- Tercatat saat laporan pertamanya masuk: dari tempat di peta dasar / hasil cari (osm_ref) atau pin tekan lama.
create table titik_parkir (
  id           bigserial primary key,
  nama         text not null check (char_length(btrim(nama)) between 2 and 60),
  osm_ref      text check (osm_ref ~ '^(node|way|relation)/[0-9]+$'),   -- mis. node/123
  geom         geography(point, 4326) not null,
  kota         text,
  status       text not null default 'aktif',
  dibekukan    boolean not null default false,   -- circuit breaker
  dibuat_oleh  text,                             -- reporter_key pembuat (hash bersalt)
  dibuat       timestamptz not null default now(),
  constraint titik_status_valid check (status in ('aktif', 'disembunyikan'))
);

create index titik_geom_idx on titik_parkir using gist (geom);
create unique index titik_osm_ref_unik on titik_parkir (osm_ref) where osm_ref is not null;

-- ---------------------------------------------------------------- laporan

create table laporan (
  id             bigserial primary key,
  titik_id       bigint not null references titik_parkir(id) on delete cascade,
  kendaraan      text not null,
  bantu_datang   boolean not null,       -- saat datang: membantu / tidak membantu
  bantu_pergi    boolean not null,       -- saat mau pergi: membantu / tidak membantu
  bayar          integer not null check (bayar between 0 and 100000),
  pungli         text[] not null default '{}'::text[],
  bintang        smallint not null check (bintang between 1 and 5),
  reporter_key   text not null,          -- hash bersalt id perangkat
  ip_hash        text,                   -- hash bersalt, jangan simpan IP mentah
  -- dikosongkan setelah 7 hari (bersihkan_data_pribadi)
  lat            double precision,
  lng            double precision,
  akurasi_m      double precision,
  jarak_m        double precision,
  bobot_manual   double precision not null default 1.0,
  dibuat         timestamptz not null default now(),
  constraint laporan_kendaraan_valid check (kendaraan in ('motor', 'mobil')),
  constraint laporan_pungli_valid check (
    pungli <@ array['tanpa_karcis', 'kemahalan', 'memaksa', 'tanda_gratis']::text[] and cardinality(pungli) <= 4
  )
);

create index laporan_titik_idx    on laporan (titik_id, dibuat desc);
create index laporan_waktu_idx    on laporan (dibuat desc);
create index laporan_reporter_idx on laporan (reporter_key, dibuat desc);
create index laporan_ip_idx       on laporan (ip_hash, dibuat desc);

-- ---------------------------------------------------------------- ringkasan per tempat (ditulis server)

-- AGENTS.md 6.2. Diisi Edge Function lapor setelah laporan tersimpan.
create table ringkasan_titik (
  titik_id              bigint primary key references titik_parkir(id) on delete cascade,
  jumlah_laporan        integer not null default 0,
  jumlah_perangkat      integer not null default 0,
  skor_pungli           real,
  level_pungli          text,
  alasan_pungli         text,              -- mis. "3 dari 4 laporan tidak diberi karcis"
  bantu_datang_ya       integer not null default 0,   -- jumlah laporan "membantu" saat datang
  bantu_pergi_ya        integer not null default 0,   -- jumlah laporan "membantu" saat pergi
  bayar_median_motor    integer,
  jumlah_motor          integer not null default 0,
  bayar_median_mobil    integer,
  jumlah_mobil          integer not null default 0,
  bintang_rata          real,
  laporan_terakhir      timestamptz,
  diperbarui            timestamptz not null default now(),
  constraint ringkasan_level_pungli_valid check (level_pungli is null or level_pungli in ('rendah', 'sedang', 'tinggi'))
);

-- ---------------------------------------------------------------- RLS & hak akses

alter table tarif_resmi     enable row level security;
alter table titik_parkir    enable row level security;
alter table laporan         enable row level security;
alter table ringkasan_titik enable row level security;
-- Sengaja TANPA policy: anon & authenticated tidak bisa select/insert/update/delete. service_role melewati RLS.

revoke all on table tarif_resmi, titik_parkir, laporan, ringkasan_titik from anon, authenticated;
revoke all on sequence tarif_resmi_id_seq, titik_parkir_id_seq, laporan_id_seq from anon, authenticated;

-- ---------------------------------------------------------------- fungsi server

-- Tempat aktif terdekat (gerbang lapor 250 m & pencocokan tempat yang sama 30 m). Hanya Edge Function.
create or replace function titik_terdekat(
  p_lat double precision, p_lng double precision, p_radius integer default 250
)
returns table (id bigint, nama text, osm_ref text, dibekukan boolean, jarak_m double precision)
language sql stable
set search_path = public, extensions
as $$
  select t.id, t.nama, t.osm_ref, t.dibekukan,
         ST_Distance(t.geom, ST_MakePoint(p_lng, p_lat)::geography)
  from titik_parkir t
  where t.status = 'aktif'
    and ST_DWithin(t.geom, ST_MakePoint(p_lng, p_lat)::geography, least(p_radius, 1000))
  order by 5
  limit 5;
$$;

revoke execute on function titik_terdekat(double precision, double precision, integer) from public, anon, authenticated;
grant execute on function titik_terdekat(double precision, double precision, integer) to service_role;

-- Retensi (AGENTS.md bagian 4): setelah 7 hari data lokasi & jaringan pelapor dikosongkan.
create or replace function bersihkan_data_pribadi()
returns integer
language sql
set search_path = public
as $$
  with dibersihkan as (
    update laporan
    set lat = null, lng = null, akurasi_m = null, jarak_m = null, ip_hash = null
    where dibuat < now() - interval '7 days'
      and (lat is not null or lng is not null or akurasi_m is not null or jarak_m is not null or ip_hash is not null)
    returning 1
  )
  select count(*)::integer from dibersihkan;
$$;

revoke execute on function bersihkan_data_pribadi() from public, anon, authenticated;
grant execute on function bersihkan_data_pribadi() to service_role;

-- ---------------------------------------------------------------- view publik
-- View berjalan dengan hak pemilik (postgres), jadi bisa membaca tabel ber-RLS; hanya kolom di sini yang terekspos.

create or replace view titik_publik as
select t.id, t.nama, t.osm_ref, t.kota,
       ST_Y(t.geom::geometry) as lat,
       ST_X(t.geom::geometry) as lng,
       t.dibuat
from titik_parkir t
where t.status = 'aktif';

-- Level & alasan pungli hanya keluar setelah ambang data (≥ 3 laporan dari ≥ 2 perangkat, AGENTS.md 6.2).
-- Jukir membantu, tarif, dan rating tampil sejak laporan pertama (selalu bersama jumlahnya).
create or replace view ringkasan_titik_publik as
select r.titik_id, r.jumlah_laporan,
       (r.jumlah_laporan >= 3 and r.jumlah_perangkat >= 2) as data_cukup,
       case when r.jumlah_laporan >= 3 and r.jumlah_perangkat >= 2 then r.level_pungli end as level_pungli,
       case when r.jumlah_laporan >= 3 and r.jumlah_perangkat >= 2 then r.alasan_pungli end as alasan_pungli,
       r.bantu_datang_ya, r.bantu_pergi_ya,
       r.bayar_median_motor, r.jumlah_motor, r.bayar_median_mobil, r.jumlah_mobil,
       r.bintang_rata, r.laporan_terakhir
from ringkasan_titik r
join titik_parkir t on t.id = r.titik_id
where t.status = 'aktif';

create or replace view tarif_publik as
select kota, kendaraan, tarif, dasar_hukum, sumber_url, berlaku_sejak
from tarif_resmi
where diperiksa_pemilik;

revoke all on titik_publik, ringkasan_titik_publik, tarif_publik from anon, authenticated;
grant select on titik_publik, ringkasan_titik_publik, tarif_publik to anon, authenticated;

-- ---------------------------------------------------------------- jadwal

create extension if not exists pg_cron;

-- 03:00 WITA = 19:00 UTC
select cron.schedule('bersihkan-data-pribadi', '0 19 * * *', $$select public.bersihkan_data_pribadi()$$);
