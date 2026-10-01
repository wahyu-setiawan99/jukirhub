-- Formulir kontak (halaman /kontak, persiapan Google AdSense 1 Okt 2026). Isi pesan TIDAK disimpan (diteruskan ke
-- Telegram pengelola); tabel ini hanya mencatat hash IP & waktu kirim untuk batas 3/jam & 10/hari per jaringan.
-- Dihapus setelah 30 hari. Tertutup untuk anon/authenticated.

set search_path = public, extensions;

create table pesan_kontak (
  id      bigserial primary key,
  ip_hash text,
  dibuat  timestamptz not null default now()
);
create index pesan_kontak_ip on pesan_kontak (ip_hash, dibuat);

alter table pesan_kontak enable row level security;
revoke all on table pesan_kontak from anon, authenticated;
revoke all on sequence pesan_kontak_id_seq from anon, authenticated;

-- 19:50 UTC = 03:50 WITA.
select cron.schedule('bersihkan-pesan-kontak', '50 19 * * *',
  $$delete from public.pesan_kontak where dibuat < now() - interval '30 days'$$);
