-- Build ulang harian (AGENTS.md 1.8 B, disetujui pemilik 3 Okt 2026): halaman statis /tempat/…, /wilayah/…, dan
-- sitemap.xml dibuat saat build Vercel, jadi tanpa deploy datanya tertinggal. Tiap 02:00 WITA pg_cron memanggil Vercel
-- Deploy Hook, HANYA bila 24 jam terakhir ada laporan atau tempat baru (hemat kuota build).
--
-- URL Deploy Hook = rahasia (siapa pun yang tahu bisa memicu build): disimpan pemilik di Vault `deploy_hook_url` lewat
-- `npm run bangun:setup`. Selama belum ada, fungsi ini tidak melakukan apa-apa.

set search_path = public, extensions;

create or replace function bangun_ulang_jika_perlu()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  url text;
begin
  select decrypted_secret into url from vault.decrypted_secrets where name = 'deploy_hook_url';
  if url is null or url not like 'https://api.vercel.com/%' then
    return 'tanpa_hook';
  end if;
  if not exists (select 1 from laporan where dibuat > now() - interval '24 hours')
     and not exists (select 1 from titik_parkir where dibuat > now() - interval '24 hours') then
    return 'tanpa_perubahan';
  end if;
  perform net.http_post(
    url := url,
    body := '{}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 30000
  );
  return 'dipicu';
end;
$$;

revoke execute on function bangun_ulang_jika_perlu() from public, anon, authenticated;
grant execute on function bangun_ulang_jika_perlu() to service_role;

-- 18:00 UTC = 02:00 WITA (sepi; sebelum bersihkan-data-pribadi 03:00).
select cron.schedule('bangun-ulang', '0 18 * * *', $$ select bangun_ulang_jika_perlu(); $$);
