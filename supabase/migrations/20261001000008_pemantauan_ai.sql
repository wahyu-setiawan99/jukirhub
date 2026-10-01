-- Ringkasan harian Telegram + jatah AI per jenis (permintaan pemilik 1 Okt 2026: ringkasan harian & pemeriksaan
-- komentar oleh AI). Hanya service_role.
--
--   ringkasan_pemantauan(p_jam)  angka agregat p_jam terakhir untuk Edge Function `pemantauan` (tanpa data pribadi):
--                                laporan, tempat baru, komentar, foto, kontak, berita, koin, jadwal pg_cron yang gagal,
--                                dan panggilan pg_net (fungsi terjadwal) yang gagal.
--   pemakaian_ai_jenis           jatah Gemini per hari per jenis ('komentar', …), terpisah dari jatah berita
--                                (pemakaian_ai) supaya komentar tidak menghabiskan jatah berita dan sebaliknya.
--   jadwal                       `pemantauan` 13:00 UTC = 21:00 WITA, memakai URL & secret Vault milik berita.

set search_path = public, extensions;

create table pemakaian_ai_jenis (
  tanggal   date not null,
  jenis     text not null,
  panggilan integer not null default 0 check (panggilan >= 0),
  primary key (tanggal, jenis)
);
alter table pemakaian_ai_jenis enable row level security;
revoke all on table pemakaian_ai_jenis from anon, authenticated;

create or replace function ambil_jatah_ai_jenis(p_jenis text, p_batas integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  insert into pemakaian_ai_jenis (tanggal, jenis, panggilan) values (tanggal_wita(), p_jenis, 1)
  on conflict (tanggal, jenis) do update set panggilan = pemakaian_ai_jenis.panggilan + 1
  where pemakaian_ai_jenis.panggilan < p_batas
  returning panggilan into n;
  return n is not null;
end;
$$;

-- plpgsql: tabel cron.job_run_details & net._http_response hanya ada di Supabase; bila tidak ada, bagian itu dilewati.
create or replace function ringkasan_pemantauan(p_jam integer default 24)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  sejak timestamptz := now() - make_interval(hours => p_jam);
  hasil jsonb;
  cron_gagal jsonb := '[]'::jsonb;
  http_total integer := 0;
  http_gagal integer := 0;
begin
  select jsonb_build_object(
    'laporan', count(*),
    'tanpa_jukir', count(*) filter (where not ada_jukir),
    'mencurigakan', count(*) filter (where bobot_manual < 1),
    'perangkat', count(distinct reporter_key)
  ) into hasil
  from laporan where dibuat > sejak;

  hasil := hasil || jsonb_build_object(
    'tempat_baru', (select count(*) from titik_parkir where dibuat > sejak),
    'komentar_baru', (select count(*) from komentar where dibuat > sejak),
    'komentar_otomatis', (select count(*) from komentar where dibuat > sejak and status = 'tampil' and alasan = 'ai'),
    'komentar_menunggu', (select count(*) from komentar where status = 'menunggu'),
    'foto', (select count(*) from foto_laporan where dibuat > sejak),
    'pesan_kontak', (select count(*) from pesan_kontak where dibuat > sejak),
    'berita_baru', (select count(*) from berita where dibuat > sejak and relevan and not disembunyikan),
    'koin', (select coalesce(sum(koin_tampil), 0) from koin_harian where tanggal >= tanggal_wita(sejak))
  );

  begin
    select coalesce(jsonb_agg(jsonb_build_object('job', jobname, 'jumlah', jumlah, 'pesan', pesan)), '[]'::jsonb)
    into cron_gagal
    from (
      select j.jobname, count(*) as jumlah, max(d.return_message) as pesan
      from cron.job_run_details d join cron.job j on j.jobid = d.jobid
      where d.start_time > sejak and d.status not in ('succeeded', 'running', 'starting')
      group by j.jobname
    ) g;
  exception when undefined_table or undefined_column or invalid_schema_name then
    cron_gagal := '[]'::jsonb;
  end;

  begin
    select count(*), count(*) filter (where status_code is null or status_code >= 300 or timed_out)
    into http_total, http_gagal
    from net._http_response where created > sejak;
  exception when undefined_table or undefined_column or invalid_schema_name then
    http_total := 0; http_gagal := 0;
  end;

  return hasil || jsonb_build_object('cron_gagal', cron_gagal, 'http_total', http_total, 'http_gagal', http_gagal);
end;
$$;

revoke execute on function ambil_jatah_ai_jenis(text, integer), ringkasan_pemantauan(integer) from public, anon, authenticated;
grant execute on function ambil_jatah_ai_jenis(text, integer), ringkasan_pemantauan(integer) to service_role;

select cron.schedule(
  'pemantauan',
  '0 13 * * *',
  $$
  select net.http_post(
    url := regexp_replace((select decrypted_secret from vault.decrypted_secrets where name = 'berita_url'), '/berita/?$', '/pemantauan'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-berita-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'berita_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
