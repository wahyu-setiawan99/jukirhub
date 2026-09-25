import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  BATAS, INDIKASI_PUNGLI, KENDARAAN, LEVEL_PUNGLI, STATUS_TITIK
} from '../supabase/functions/_shared/konstanta.js';

// Daftar kode di _shared/konstanta.js harus sama persis dengan constraint database (AGENTS.md 6.1):
// menambah/mengubah kode butuh migrasi, dan tes ini mengingatkan bila salah satunya lupa.
const sql = fs.readdirSync('supabase/migrations')
  .filter(f => f.endsWith('.sql'))
  .sort()
  .map(f => fs.readFileSync(`supabase/migrations/${f}`, 'utf8'))
  .join('\n')
  .replace(/\r\n/g, '\n');

// Isi constraint terakhir dengan nama itu (migrasi yang lebih baru menang), sampai constraint berikutnya / ");".
function kodeConstraint(nama) {
  const awal = sql.lastIndexOf(`constraint ${nama} `);
  assert.ok(awal >= 0, `constraint ${nama} tidak ditemukan`);
  const sisa = sql.slice(awal + nama.length + 12);
  const akhir = Math.min(...[sisa.indexOf('constraint '), sisa.indexOf(');\n')].filter(i => i >= 0));
  return new Set([...sisa.slice(0, akhir).matchAll(/'([a-z_]+)'/g)].map(m => m[1]));
}

const sama = (nama, daftar) => assert.deepEqual([...kodeConstraint(nama)].sort(), [...daftar].sort(), nama);

test('kendaraan, status tempat, indikasi pungli, dan level sama dengan database', () => {
  sama('tarif_kendaraan_valid', KENDARAAN);
  sama('laporan_kendaraan_valid', KENDARAAN);
  sama('titik_status_valid', STATUS_TITIK);
  sama('laporan_pungli_valid', INDIKASI_PUNGLI.map(i => i.kode));
  sama('ringkasan_level_pungli_valid', LEVEL_PUNGLI.map(l => l.kode));
  assert.match(sql, new RegExp(`cardinality\\(pungli\\) <= ${INDIKASI_PUNGLI.length}`), 'batas jumlah indikasi sama');
});

test('form laporan sederhana (AGENTS.md 1.2): kolom inti ada, kolom model lama tidak', () => {
  const laporan = sql.slice(sql.indexOf('create table laporan ('), sql.indexOf('create index laporan_titik_idx'));
  for (const kolom of ['bantu_datang', 'bantu_pergi', 'bayar', 'pungli', 'bintang', 'kendaraan']) {
    assert.match(laporan, new RegExp(`\\n\\s+${kolom}\\s`), `kolom ${kolom}`);
  }
  for (const lama of ['kerja', 'tag', 'atribut_resmi', 'amati_menit', 'memaksa ']) {
    assert.ok(!new RegExp(`\\n\\s+${lama}\\s`).test(laporan), `kolom lama ${lama} masih ada`);
  }
});

test('indikasi pungli: kode unik, poin wajar, batas level 0 / 30 / 60', () => {
  assert.equal(new Set(INDIKASI_PUNGLI.map(i => i.kode)).size, INDIKASI_PUNGLI.length);
  assert.ok(INDIKASI_PUNGLI.every(i => i.poin > 0 && i.poin <= 30));
  assert.deepEqual(LEVEL_PUNGLI.map(l => l.mulai), [0, 30, 60]);
});

test('ambang & radius di database sama dengan konstanta', () => {
  assert.match(sql, /jumlah_laporan >= 3 and r\.jumlah_perangkat >= 2/);
  assert.match(sql, new RegExp(`p_radius integer default ${BATAS.radiusLaporM}`));
  assert.match(sql, new RegExp(`between 2 and ${BATAS.panjangNamaTempatMaks}`));
});

test('tabel mentah tertutup untuk anon; publik hanya lewat view', () => {
  for (const tabel of ['tarif_resmi', 'titik_parkir', 'laporan', 'ringkasan_titik']) {
    assert.match(sql, new RegExp(`alter table ${tabel}\\s+enable row level security`), `RLS ${tabel}`);
  }
  assert.match(sql, /revoke all on table tarif_resmi, titik_parkir, laporan, ringkasan_titik from anon, authenticated;/);
  const grant = sql.match(/grant select on ([^;]+) to anon, authenticated;/g) ?? [];
  const terbuka = grant.flatMap(g => g.replace(/grant select on | to anon, authenticated;/g, '').split(',').map(s => s.trim()));
  assert.ok(terbuka.length > 0);
  for (const nama of terbuka) assert.match(nama, /_publik$/, `hanya view *_publik yang boleh dibaca anon: ${nama}`);
});
