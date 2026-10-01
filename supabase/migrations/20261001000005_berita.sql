-- Berita parkir per daerah (M5, keputusan pemilik 1 Okt 2026). Aturan & daftar sumber di
-- supabase/functions/_shared/berita.js; hanya Edge Function `berita` (service_role) yang menulis.
--
--   berita         satu baris per artikel RSS: judul, media, tautan asli, waktu terbit, kabupaten Sulsel yang disebut,
--                  ringkasan 1–2 kalimat buatan AI. relevan = false → dicatat supaya tidak dinilai ulang, tidak tampil.
--                  Isi artikel / cuplikan TIDAK disimpan.
--   berita_publik  berita relevan ≤ 30 hari yang tidak disembunyikan pemilik, terbaru dulu (maks. 50).
--   pemakaian_ai   jumlah panggilan Gemini per hari (WITA) untuk batas harian.
--   jadwal         `berita` tiap 3 jam (menit ke-20) lewat pg_net; URL & secret dibaca dari Supabase Vault
--                  (`berita_url`, `berita_secret`, dipasang pemilik dengan `npm run berita:setup`).
--                  `bersihkan-berita` menghapus baris > 90 hari (04:10 WITA).
-- Pemilik menyembunyikan satu berita lewat tombol 🙈 di Telegram.

set search_path = public, extensions;

create extension if not exists pg_net with schema extensions;

create table berita (
  id            bigserial primary key,
  url           text not null unique check (url ~ '^https?://' and length(url) <= 600),
  sumber_id     text not null,
  sumber        text not null,
  judul         text not null check (length(judul) between 1 and 300),
  ringkasan     text check (ringkasan is null or length(ringkasan) <= 300),
  terbit        timestamptz not null,
  kabupaten     text[] not null default '{}',
  relevan       boolean not null default false,
  disembunyikan boolean not null default false,
  dibuat        timestamptz not null default now()
);
create index berita_tampil on berita (terbit desc) where relevan and not disembunyikan;
create index berita_dibuat on berita (dibuat);

alter table berita enable row level security;
revoke all on table berita from anon, authenticated;
revoke all on sequence berita_id_seq from anon, authenticated;

create or replace view berita_publik as
select id, sumber, judul, ringkasan, url, terbit, kabupaten
from berita
where relevan and not disembunyikan and ringkasan is not null
  and terbit > now() - interval '30 days'
order by terbit desc
limit 50;

revoke all on berita_publik from anon, authenticated;
grant select on berita_publik to anon, authenticated;

create table pemakaian_ai (
  tanggal   date primary key,
  panggilan integer not null default 0 check (panggilan >= 0)
);
alter table pemakaian_ai enable row level security;
revoke all on table pemakaian_ai from anon, authenticated;

-- Ambil jatah satu panggilan AI hari ini; false bila batas harian sudah tercapai (atomik).
create or replace function ambil_jatah_ai(p_batas integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  insert into pemakaian_ai (tanggal, panggilan) values (tanggal_wita(), 1)
  on conflict (tanggal) do update set panggilan = pemakaian_ai.panggilan + 1
  where pemakaian_ai.panggilan < p_batas
  returning panggilan into n;
  return n is not null;
end;
$$;

revoke execute on function ambil_jatah_ai(integer) from public, anon, authenticated;
grant execute on function ambil_jatah_ai(integer) to service_role;

-- ---------------------------------------------------------------- jadwal
-- Sebelum `npm run berita:setup` dijalankan, Vault belum berisi berita_url → url null → pg_net menolak, tanpa efek.

select cron.schedule(
  'berita',
  '20 */3 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'berita_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-berita-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'berita_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

-- 20:10 UTC = 04:10 WITA.
select cron.schedule('bersihkan-berita', '10 20 * * *', $$delete from public.berita where dibuat < now() - interval '90 days'$$);
