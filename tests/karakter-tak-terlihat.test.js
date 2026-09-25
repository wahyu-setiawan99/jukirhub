import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Escape seperti \uXXXX pernah tersimpan sebagai KARAKTER MENTAH di file (pelajaran Adami, AGENTS.md bagian 8) dan
// merusak Edge Function tanpa ketahuan build web. Tes ini memindai semua kode sumber. Rentang ditulis sebagai angka.
const RENTANG_TERLARANG = [
  [0x00, 0x08], [0x0b, 0x0c], [0x0e, 0x1f], [0x7f, 0x7f],   // kontrol (kecuali tab, LF, CR)
  [0x0300, 0x036f],                                        // tanda diakritik gabung
  [0x200b, 0x200f], [0x2028, 0x2029], [0x202a, 0x202e],   // zero-width, pemisah baris, arah teks
  [0x2060, 0x2064], [0xfeff, 0xfeff]                       // word joiner, BOM
];
const FOLDER = ['web/src', 'web/public', 'supabase/functions', 'supabase/migrations', 'scripts', 'tests'];
const EKSTENSI = new Set(['.js', '.jsx', '.ts', '.sql', '.css', '.html', '.json', '.md', '.webmanifest']);
const DILEWATI = /(^|[\\/])(node_modules|dist|\.temp)([\\/]|$)|-raw[^\\/]*\.json$/;

function semuaFile(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    if (DILEWATI.test(p)) return [];
    if (e.isDirectory()) return semuaFile(p);
    return EKSTENSI.has(path.extname(e.name)) ? [p] : [];
  });
}

test('kode sumber bebas karakter tak terlihat', () => {
  const temuan = [];
  for (const file of [...FOLDER.flatMap(semuaFile), 'AGENTS.md', 'CLAUDE.md', 'web/index.html']) {
    if (!fs.existsSync(file)) continue;
    const teks = fs.readFileSync(file, 'utf8');
    let baris = 1;
    for (const c of teks) {
      const k = c.codePointAt(0);
      if (k === 0x0a) baris += 1;
      else if (RENTANG_TERLARANG.some(([a, b]) => k >= a && k <= b)) {
        temuan.push(`${file}:${baris} U+${k.toString(16).toUpperCase().padStart(4, '0')}`);
      }
    }
  }
  assert.deepEqual(temuan, []);
});
