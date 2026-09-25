import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatJarak, formatRupiah, formatRupiahRingkas } from '../supabase/functions/_shared/format.js';

test('formatRupiah memakai titik ribuan', () => {
  assert.equal(formatRupiah(0), 'Rp 0');
  assert.equal(formatRupiah(2000), 'Rp 2.000');
  assert.equal(formatRupiah(1500000), 'Rp 1.500.000');
  assert.equal(formatRupiah('x'), '');
});

test('formatRupiahRingkas untuk rentang estimasi', () => {
  assert.equal(formatRupiahRingkas(500), 'Rp 500');
  assert.equal(formatRupiahRingkas(150000), 'Rp 150rb');
  assert.equal(formatRupiahRingkas(152500), 'Rp 152,5rb');
  assert.equal(formatRupiahRingkas(2500000), 'Rp 2,5jt');
  assert.equal(formatRupiahRingkas(3000000), 'Rp 3jt');
});

test('formatJarak', () => {
  assert.equal(formatJarak(4), '10 m');
  assert.equal(formatJarak(144), '140 m');
  assert.equal(formatJarak(1250), '1,3 km');
});
