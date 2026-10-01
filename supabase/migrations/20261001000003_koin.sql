-- Koin pelapor + tab Saya (keputusan pemilik 1 Okt 2026, pola Adami 10.4 fase A). Aturan koin ada di
-- supabase/functions/_shared/koin.js; tabel ini hanya menyimpan hasilnya.
--
--   reputasi_pelapor  satu baris per pelapor (reporter_key = hash bersalt kunci perangkat, sama dengan laporan).
--                     koin_tampil = yang dilihat pelapor; koin_sah = yang dihitung di peringkat (GPS palsu dan tempat
--                     dibekukan tidak menambah koin_sah, diam-diam).
--   koin_harian       koin per pelapor per hari per kabupaten tempat parkir, untuk peringkat 30 hari. Dihapus setelah
--                     35 hari (angka agregat, bukan jejak perjalanan).
--   laporan.koin_sah  koin sah per laporan (untuk moderasi bila nanti perlu ditarik).
-- Semua tertutup untuk anon/authenticated; hanya Edge Function (service_role) yang membaca/menulis.

set search_path = public, extensions;

create or replace function tanggal_wita(t timestamptz default now())
returns date
language sql stable
as $$ select (t at time zone 'Asia/Makassar')::date $$;

create table reputasi_pelapor (
  reporter_key        text primary key,
  nama_samaran        text not null check (char_length(nama_samaran) <= 60),
  putaran_nama        integer not null default 0,
  kabupaten_asal      text,
  tampil_di_peringkat boolean not null default true,
  koin_tampil         integer not null default 0 check (koin_tampil >= 0),
  koin_sah            integer not null default 0 check (koin_sah >= 0),
  laporan_berkoin     integer not null default 0,
  seri_hari           integer not null default 0,
  seri_terpanjang     integer not null default 0,
  tanggal_terakhir    date,
  laporan_hari_ini    integer not null default 0,
  pembuka_data        integer not null default 0,
  tempat_berbeda      integer not null default 0,
  maks_satu_tempat    integer not null default 0,
  lencana             text[] not null default '{}',
  dibuat              timestamptz not null default now(),
  diperbarui          timestamptz not null default now()
);

create table koin_harian (
  reporter_key text not null,
  tanggal      date not null,
  kabupaten    text not null,
  koin_tampil  integer not null default 0,
  koin_sah     integer not null default 0,
  primary key (reporter_key, tanggal, kabupaten)
);
create index koin_harian_peringkat on koin_harian (tanggal, kabupaten);

alter table laporan add column koin_sah integer not null default 0 check (koin_sah >= 0);

alter table reputasi_pelapor enable row level security;
alter table koin_harian enable row level security;
revoke all on table reputasi_pelapor, koin_harian from anon, authenticated;

-- ---------------------------------------------------------------- fungsi (hanya service_role)

create or replace function catat_koin_harian(
  p_reporter text, p_tanggal date, p_kabupaten text, p_tampil integer, p_sah integer
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into koin_harian (reporter_key, tanggal, kabupaten, koin_tampil, koin_sah)
  values (p_reporter, p_tanggal, coalesce(p_kabupaten, '-'), p_tampil, p_sah)
  on conflict (reporter_key, tanggal, kabupaten) do update set
    koin_tampil = koin_harian.koin_tampil + excluded.koin_tampil,
    koin_sah    = koin_harian.koin_sah + excluded.koin_sah;
$$;

-- Peringkat koin SAH dalam p_hari terakhir (WITA), per kabupaten atau semua (p_kabupaten null).
create or replace function peringkat_pelapor(p_kabupaten text default null, p_hari integer default 30, p_batas integer default 10)
returns table (reporter_key text, nama_samaran text, koin bigint)
language sql stable
security definer
set search_path = public
as $$
  select k.reporter_key, r.nama_samaran, sum(k.koin_sah) as koin
  from koin_harian k
  join reputasi_pelapor r on r.reporter_key = k.reporter_key
  where k.tanggal > tanggal_wita() - p_hari
    and (p_kabupaten is null or k.kabupaten = p_kabupaten)
    and r.tampil_di_peringkat
  group by k.reporter_key, r.nama_samaran
  having sum(k.koin_sah) > 0
  order by koin desc, min(r.dibuat)
  limit greatest(least(p_batas, 50), 1);
$$;

-- Koin TAMPIL pelapor sendiri per kabupaten dalam p_hari terakhir (posisinya di peringkat).
create or replace function koin_saya(p_reporter text, p_hari integer default 30)
returns table (kabupaten text, koin bigint)
language sql stable
security definer
set search_path = public
as $$
  select k.kabupaten, sum(k.koin_tampil)
  from koin_harian k
  where k.reporter_key = p_reporter and k.tanggal > tanggal_wita() - p_hari
  group by k.kabupaten
  order by 2 desc, 1;
$$;

-- Posisi p_nilai di antara pelapor LAIN yang tampil di peringkat (1 = teratas).
create or replace function posisi_peringkat(p_reporter text, p_kabupaten text, p_nilai integer, p_hari integer default 30)
returns integer
language sql stable
security definer
set search_path = public
as $$
  select 1 + count(*)::integer
  from (
    select k.reporter_key
    from koin_harian k
    join reputasi_pelapor r on r.reporter_key = k.reporter_key
    where k.tanggal > tanggal_wita() - p_hari
      and (p_kabupaten is null or k.kabupaten = p_kabupaten)
      and r.tampil_di_peringkat
      and k.reporter_key <> p_reporter
    group by k.reporter_key
    having sum(k.koin_sah) > p_nilai
  ) di_atas;
$$;

revoke execute on function catat_koin_harian(text, date, text, integer, integer),
  peringkat_pelapor(text, integer, integer), koin_saya(text, integer),
  posisi_peringkat(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function catat_koin_harian(text, date, text, integer, integer),
  peringkat_pelapor(text, integer, integer), koin_saya(text, integer),
  posisi_peringkat(text, text, integer, integer)
  to service_role;

-- 19:40 UTC = 03:40 WITA, setelah pembersihan data pribadi.
select cron.schedule('bersihkan-koin-harian', '40 19 * * *',
  $$delete from public.koin_harian where tanggal < public.tanggal_wita() - 35$$);
