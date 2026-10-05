import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { semuaKabupaten, provinsiKabupaten } from '../supabase/functions/_shared/wilayah.js';

// Lembar isian tarif resmi (AGENTS.md 1.8 C). Aturan 1.1: AI tidak boleh mengarang angka tarif, jadi angka hanya boleh
// ada pada baris yang sudah diperiksa pemilik, lengkap dengan dasar hukum & sumber.
const lembar = JSON.parse(fs.readFileSync(new URL('../scripts/data/tarif-resmi.json', import.meta.url), 'utf8'));
const STATUS = new Set(['resmi', 'tidak_resmi', 'perlu_dicek', 'belum']);

test('lembar tarif resmi: tiap kab/kota Sulawesi tepat satu baris, label & provinsi sah', () => {
  const label = lembar.kota.map(k => k.kota);
  assert.deepEqual([...label].sort(), [...semuaKabupaten()].sort());
  for (const k of lembar.kota) {
    assert.equal(k.provinsi, provinsiKabupaten(k.kota), k.kota);
    assert.ok(STATUS.has(k.status_sumber), `${k.kota}: status ${k.status_sumber}`);
    assert.equal(k.jenis, 'tepi_jalan_umum');
    if (k.sumber_url) assert.match(k.sumber_url, /^https:\/\//, k.kota);
  }
});

test('lembar tarif resmi: angka hanya pada baris yang sudah diperiksa pemilik (lengkap dengan sumber)', () => {
  for (const k of lembar.kota) {
    const angka = [k.tarif.motor, k.tarif.mobil];
    if (!k.diperiksa_pemilik) {
      assert.deepEqual(angka, [null, null], `${k.kota}: tarif diisi tetapi belum diperiksa pemilik`);
      continue;
    }
    assert.ok(k.dasar_hukum && k.sumber_url, `${k.kota}: dasar hukum & sumber wajib`);
    assert.ok(angka.some(n => n !== null), `${k.kota}: diperiksa tetapi tarif kosong`);
    for (const n of angka) if (n !== null) assert.ok(Number.isInteger(n) && n > 0 && n <= 100000, `${k.kota}: tarif ${n}`);
    if (k.berlaku_sejak) assert.match(k.berlaku_sejak, /^\d{4}-\d{2}-\d{2}$/);
  }
});
