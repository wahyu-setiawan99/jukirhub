-- M4: riwayat laporan + komentar (AGENTS.md 1.3.1). Komentar melekat pada laporan (maks. satu), tampil hanya setelah
-- disetujui pemilik lewat Telegram; aduan dari >= 3 perangkat berbeda menyembunyikannya otomatis.

set search_path = public, extensions;

create table komentar (
  id          bigserial primary key,
  laporan_id  bigint not null unique references laporan(id) on delete cascade,
  titik_id    bigint not null references titik_parkir(id) on delete cascade,
  isi         text not null check (char_length(btrim(isi)) between 3 and 200),
  status      text not null default 'menunggu',
  alasan      text,
  dibuat      timestamptz not null default now(),
  constraint komentar_status_valid check (status in ('menunggu', 'tampil', 'ditolak', 'disembunyikan'))
);
create index komentar_titik_idx on komentar (titik_id, status);

create table aduan_komentar (
  komentar_id   bigint not null references komentar(id) on delete cascade,
  reporter_key  text not null,          -- hash bersalt perangkat pengadu
  ip_hash       text,
  dibuat        timestamptz not null default now(),
  primary key (komentar_id, reporter_key)
);
create index aduan_ip_idx on aduan_komentar (ip_hash, dibuat desc);

alter table komentar       enable row level security;
alter table aduan_komentar enable row level security;
revoke all on table komentar, aduan_komentar from anon, authenticated;
revoke all on sequence komentar_id_seq from anon, authenticated;

-- Riwayat publik: tanpa kunci/IP/lokasi/bobot pelapor. Waktu dibulatkan ke jam supaya laporan tidak mudah
-- dicocokkan dengan orang tertentu (mis. lewat rekaman kamera). Komentar hanya yang berstatus 'tampil'.
create or replace view riwayat_publik as
select l.id, l.titik_id,
       date_trunc('hour', l.dibuat) as waktu,
       l.ada_jukir, l.kendaraan, l.bantu_datang, l.bantu_pergi, l.bayar, l.pungli, l.bintang,
       k.id as komentar_id, k.isi as komentar
from laporan l
join titik_parkir t on t.id = l.titik_id and t.status = 'aktif'
left join komentar k on k.laporan_id = l.id and k.status = 'tampil';

revoke all on riwayat_publik from anon, authenticated;
grant select on riwayat_publik to anon, authenticated;
