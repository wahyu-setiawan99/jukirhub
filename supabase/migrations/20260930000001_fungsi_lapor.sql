-- Fungsi untuk Edge Function `lapor` (M2, AGENTS.md 6.1). Hanya service_role; anon tidak bisa memanggil.
-- File baru (bukan mengubah 20260924000001) supaya aman walau migrasi pertama sudah diterapkan ke cloud.

set search_path = public, extensions;

-- Satu tempat aktif berdasarkan id atau osm_ref, lengkap dengan koordinat (untuk gerbang lokasi 250 m).
create or replace function titik_detail(p_id bigint default null, p_osm_ref text default null)
returns table (id bigint, nama text, osm_ref text, dibekukan boolean, lat double precision, lng double precision)
language sql stable
set search_path = public, extensions
as $$
  select t.id, t.nama, t.osm_ref, t.dibekukan, ST_Y(t.geom::geometry), ST_X(t.geom::geometry)
  from titik_parkir t
  where t.status = 'aktif'
    and ((p_id is not null and t.id = p_id) or (p_osm_ref is not null and t.osm_ref = p_osm_ref))
  limit 1;
$$;

-- Tempat baru saat laporan pertamanya masuk. osm_ref kembar (dua laporan pertama bersamaan) → id yang sudah ada.
create or replace function buat_titik(
  p_nama text, p_osm_ref text, p_lat double precision, p_lng double precision, p_dibuat_oleh text
)
returns bigint
language plpgsql
set search_path = public, extensions
as $$
declare
  v_id bigint;
begin
  insert into titik_parkir (nama, osm_ref, geom, dibuat_oleh)
  values (btrim(p_nama), p_osm_ref, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_dibuat_oleh)
  on conflict (osm_ref) where osm_ref is not null do nothing
  returning id into v_id;
  if v_id is null then
    select t.id into v_id from titik_parkir t where t.osm_ref = p_osm_ref;
  end if;
  return v_id;
end;
$$;

revoke execute on function titik_detail(bigint, text) from public, anon, authenticated;
revoke execute on function buat_titik(text, text, double precision, double precision, text) from public, anon, authenticated;
grant execute on function titik_detail(bigint, text) to service_role;
grant execute on function buat_titik(text, text, double precision, double precision, text) to service_role;
