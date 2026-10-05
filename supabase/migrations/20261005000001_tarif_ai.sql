-- Tarif resmi parkir dibaca AI, disetujui pemilik (AGENTS.md 1.8 C, keputusan pemilik 5 Okt 2026).
--
--   usulan_tarif         usulan Gemini + Google Search per kab/kota (angka, dasar hukum, kutipan, tautan), 'menunggu'
--                        sampai pemilik menekan ✅ Pakai / 🚫 Abaikan di Telegram.
--   cek_tarif            kapan tiap kab/kota terakhir dicek & hasilnya (jeda ulang: _shared/tarif.js HARI_ULANG).
--   tarif_resmi          + jenis, sumber ('pemilik' | 'ai'), kutipan. Hanya baris diperiksa_pemilik yang dipakai.
--   tarif_resmi_publik   tarif terbaru per kab/kota & kendaraan yang sudah disetujui (dibaca web & server).
--   putuskan_usulan_tarif(id, pakai)  dipanggil fungsi `telegram`; Pakai → baris tarif_resmi (diperiksa_pemilik).
--   jadwal `tarif`       tiap hari 06:00 WITA → Edge Function /tarif (≤ 5 kab/kota per hari, hanya yang jatuh tempo).

set search_path = public, extensions;

alter table tarif_resmi
  add column jenis   text not null default 'tepi_jalan_umum',
  add column sumber  text not null default 'pemilik',
  add column kutipan text,
  add constraint tarif_sumber_valid check (sumber in ('pemilik', 'ai'));

create table usulan_tarif (
  id            bigserial primary key,
  kota          text not null,
  motor         integer check (motor between 500 and 50000),
  mobil         integer check (mobil between 500 and 50000),
  dasar_hukum   text not null check (char_length(dasar_hukum) <= 200),
  sumber_url    text not null check (char_length(sumber_url) <= 500),
  kutipan       text not null check (char_length(kutipan) <= 300),
  berlaku_sejak date,
  catatan       text check (char_length(catatan) <= 300),
  status        text not null default 'menunggu',
  diputuskan    timestamptz,
  dibuat        timestamptz not null default now(),
  constraint usulan_tarif_status_valid check (status in ('menunggu', 'dipakai', 'diabaikan')),
  constraint usulan_tarif_ada_angka check (motor is not null or mobil is not null)
);

create table cek_tarif (
  kota     text primary key,
  terakhir timestamptz not null default now(),
  hasil    text not null
);

alter table usulan_tarif enable row level security;
alter table cek_tarif    enable row level security;
revoke all on table usulan_tarif, cek_tarif from anon, authenticated;
revoke all on sequence usulan_tarif_id_seq from anon, authenticated;

-- Tarif terbaru yang SUDAH berlaku per kab/kota & kendaraan (berlaku_sejak terbaru, lalu yang terakhir dibuat).
create or replace view tarif_resmi_publik as
select distinct on (kota, kendaraan)
       kota, kendaraan, tarif, jenis, dasar_hukum, sumber_url, berlaku_sejak, sumber
from tarif_resmi
where diperiksa_pemilik and (berlaku_sejak is null or berlaku_sejak <= tanggal_wita())
order by kota, kendaraan, berlaku_sejak desc nulls last, dibuat desc;

revoke all on tarif_resmi_publik from anon, authenticated;
grant select on tarif_resmi_publik to anon, authenticated;

-- Pakai / Abaikan usulan. Pakai: tarif motor/mobil yang disebut masuk tarif_resmi (diperiksa_pemilik, sumber 'ai').
-- Menekan ulang tombol yang sama aman (status sudah diputuskan → hanya mengembalikan kotanya).
create or replace function putuskan_usulan_tarif(p_id bigint, p_pakai boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  u usulan_tarif;
  berlaku date;
begin
  select * into u from usulan_tarif where id = p_id for update;
  if not found then
    return null;
  end if;
  if u.status = 'menunggu' then
    update usulan_tarif set status = case when p_pakai then 'dipakai' else 'diabaikan' end, diputuskan = now()
    where id = p_id;
    if p_pakai then
      berlaku := coalesce(u.berlaku_sejak, tanggal_wita());
      insert into tarif_resmi (kota, kendaraan, tarif, dasar_hukum, sumber_url, berlaku_sejak, diperiksa_pemilik, sumber, kutipan)
      select u.kota, k.kendaraan, k.tarif, u.dasar_hukum, u.sumber_url, berlaku, true, 'ai', u.kutipan
      from (values ('motor', u.motor), ('mobil', u.mobil)) as k(kendaraan, tarif)
      where k.tarif is not null
      on conflict (kota, kendaraan, berlaku_sejak) do update
        set tarif = excluded.tarif, dasar_hukum = excluded.dasar_hukum, sumber_url = excluded.sumber_url,
            diperiksa_pemilik = true, sumber = 'ai', kutipan = excluded.kutipan, dibuat = now();
    end if;
  end if;
  return jsonb_build_object('kota', u.kota, 'status', (select status from usulan_tarif where id = p_id));
end;
$$;

revoke execute on function putuskan_usulan_tarif(bigint, boolean) from public, anon, authenticated;
grant execute on function putuskan_usulan_tarif(bigint, boolean) to service_role;

-- 22:00 UTC = 06:00 WITA. Memakai URL & secret Vault milik berita (seperti pemantauan).
select cron.schedule(
  'tarif',
  '0 22 * * *',
  $$
  select net.http_post(
    url := regexp_replace((select decrypted_secret from vault.decrypted_secrets where name = 'berita_url'), '/berita/?$', '/tarif'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-berita-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'berita_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);
