-- Foto bukti (keputusan pemilik 1 Okt 2026): file foto TIDAK disimpan di Supabase, hanya diteruskan ke Telegram
-- pemilik. Tabel ini mencatat bahwa satu laporan sudah punya foto (satu foto per laporan) dan dipakai untuk batas
-- 3 foto per perangkat per 24 jam. Baris dihapus setelah 30 hari. Tertutup untuk anon/authenticated.

set search_path = public, extensions;

create table foto_laporan (
  id           bigserial primary key,
  laporan_id   bigint not null unique references laporan (id) on delete cascade,
  reporter_key text not null,
  terkirim     boolean not null default false,
  dibuat       timestamptz not null default now()
);
create index foto_laporan_perangkat on foto_laporan (reporter_key, dibuat);

alter table foto_laporan enable row level security;
revoke all on table foto_laporan from anon, authenticated;
revoke all on sequence foto_laporan_id_seq from anon, authenticated;

-- 19:45 UTC = 03:45 WITA.
select cron.schedule('bersihkan-foto-laporan', '45 19 * * *',
  $$delete from public.foto_laporan where dibuat < now() - interval '30 days'$$);
