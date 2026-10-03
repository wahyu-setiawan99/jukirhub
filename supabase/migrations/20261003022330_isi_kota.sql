-- Isi kab/kota tempat yang masih kosong (scripts/isi-kota.js, Nominatim reverse). 7 tempat, 2026-10-03.
-- Hanya baris yang kotanya masih kosong; aman dijalankan ulang.

update titik_parkir set kota = 'Makassar' where id = 1 and kota is null;
update titik_parkir set kota = 'Makassar' where id = 2 and kota is null;
update titik_parkir set kota = 'Makassar' where id = 3 and kota is null;
update titik_parkir set kota = 'Makassar' where id = 4 and kota is null;
update titik_parkir set kota = 'Makassar' where id = 5 and kota is null;
update titik_parkir set kota = 'Makassar' where id = 6 and kota is null;
update titik_parkir set kota = 'Makassar' where id = 7 and kota is null;
