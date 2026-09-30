import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PESAN, putuskan } from '../scripts/cek-tayang.js';

const T = 'abc123';

test('commit situs = commit terakhir → tayang (apa pun status GitHub)', () => {
  assert.equal(putuskan({ commitTarget: T, commitTayang: T, statusGithub: 'pending' }), 'tayang');
});

test('build gagal → langsung dilaporkan', () => {
  assert.equal(putuskan({ commitTarget: T, commitTayang: 'lama', statusGithub: 'failure' }), 'gagal');
  assert.equal(putuskan({ commitTarget: T, commitTayang: 'lama', statusGithub: 'error' }), 'gagal');
});

test('build sukses tapi situs tidak berganti > 2 menit → belum dijadikan Production, dengan cara memperbaikinya', () => {
  assert.equal(putuskan({ commitTarget: T, commitTayang: 'lama', statusGithub: 'success', msSejakSukses: 60_000 }), 'tunggu');
  assert.equal(putuskan({ commitTarget: T, commitTayang: 'lama', statusGithub: 'success', msSejakSukses: 120_000 }), 'belum_production');
  assert.match(PESAN.belum_production(), /Auto-assign Custom Production Domains/);
});

test('diblokir Vercel Security Checkpoint → berhenti, tidak mengulang', () => {
  assert.equal(putuskan({ commitTarget: T, statusGithub: 'pending', mitigasi: true }), 'diblokir');
});

test('build menulis versi.json dan Vercel menyajikannya tanpa cache', () => {
  assert.match(fs.readFileSync('web/vite.config.js', 'utf8'), /fileName: 'versi\.json'/);
  const v = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  assert.ok(v.headers.some(h => h.source === '/versi.json' && h.headers.some(x => x.value === 'no-cache')));
  assert.match(v.rewrites[0].source, /versi\\.json/);
});
