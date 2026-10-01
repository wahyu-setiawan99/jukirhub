import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Tema gelap bawaan + mode terang (AGENTS.md 6.3). Tes teks sumber saja: lib/tema.js memakai alias @shared
// lewat util.js yang tidak bisa dimuat Node.
const css = fs.readFileSync('web/src/app.css', 'utf8').replace(/\r\n/g, '\n');
const bukanWarna = new Set(['--font-isi', '--font-judul', '--font-angka', '--lebar-kolom', '--tepi-kolom', '--tinggi-nav', '--tinggi-aksi']);

function variabelBlok(pembuka) {
  const awal = css.indexOf(pembuka);
  assert.ok(awal >= 0, `blok ${pembuka} tidak ada`);
  const isi = css.slice(awal, css.indexOf('\n}', awal));
  return new Map([...isi.matchAll(/^\s*(--[a-z0-9-]+):\s*([^;]+);/gm)].map(m => [m[1], m[2].trim()]));
}

const gelap = variabelBlok(':root {');
const terang = variabelBlok(':root[data-tema="terang"] {');

test('setiap variabel warna ada di tema gelap (bawaan) dan tema terang', () => {
  for (const v of terang.keys()) assert.ok(gelap.has(v), `${v} hanya ada di tema terang`);
  for (const v of gelap.keys()) if (!bukanWarna.has(v)) assert.ok(terang.has(v), `${v} belum ada di tema terang`);
});

test('warna di aturan CSS memakai variabel tema, bukan kode warna langsung', () => {
  const sisa = css.slice(css.indexOf(':root[data-tema="terang"] {'));
  const baris = sisa.slice(sisa.indexOf('\n}') + 2)
    .split('\n')
    .filter(b => /#[0-9a-f]{3,8}\b/i.test(b));
  assert.deepEqual(baris, []);
});

test('warna tampilan Radar (aksen cyan) & indikasi sesuai tabel AGENTS.md 6.3', () => {
  const harap = {
    '--latar': ['#060a13', '#f3f6fa'],
    '--utama': ['#22d3ee', '#0e7490'],
    '--utama-teks': ['#04222a', '#ffffff'],
    '--aksen': ['#22d3ee', '#0e7490'],
    '--fokus': ['#67e8f9', '#155e75'],
    '--logo-gambar': ['#22d3ee', '#0e7490'],
    '--logo-sinyal': ['#facc15', '#ca8a04'],
    '--indikasi-rendah': ['#2dd4bf', '#0f766e'],
    '--indikasi-sedang': ['#facc15', '#a16207'],
    '--indikasi-tinggi': ['#f87171', '#b91c1c'],
    '--indikasi-kurang': ['#64748b', '#9aa8bb']
  };
  for (const [v, [g, t]] of Object.entries(harap)) {
    assert.equal(gelap.get(v), g, `${v} tema gelap`);
    assert.equal(terang.get(v), t, `${v} tema terang`);
  }
});

test('font tampilan Radar: Space Grotesk + JetBrains Mono dari situs sendiri; 15 px di HP, 16 px di layar ≥ 760 px', () => {
  assert.match(gelap.get('--font-isi'), /^"Space Grotesk",/);
  assert.match(gelap.get('--font-angka'), /^"JetBrains Mono",/);
  assert.match(css, /:root \{[^}]*\n {2}font-size: 15px;/);
  assert.ok(css.includes('@media (min-width: 760px) { :root { font-size: 16px; } }'));
  assert.ok(css.includes('h1, h2, h3, strong, b, th, legend { font-weight: 600; }'));
  const main = fs.readFileSync('web/src/main.jsx', 'utf8');
  for (const tebal of ['400', '600']) assert.ok(main.includes(`@fontsource/space-grotesk/latin-${tebal}.css`));
  for (const tebal of ['400', '500']) assert.ok(main.includes(`@fontsource/jetbrains-mono/latin-${tebal}.css`));
  assert.ok(!main.includes('poppins'), 'Poppins sudah diganti');
  assert.ok(!/fonts\.googleapis/.test(fs.readFileSync('web/index.html', 'utf8')), 'jangan memuat Google Fonts');
});

test('skrip awal di index.html memakai kunci & warna bilah yang sama dengan lib/tema.js', () => {
  const html = fs.readFileSync('web/index.html', 'utf8');
  const tema = fs.readFileSync('web/src/lib/tema.js', 'utf8');
  const kunci = tema.match(/KUNCI_TEMA = '([^']+)'/)[1];
  assert.ok(html.includes(`localStorage.getItem("${kunci}") === "terang"`));
  const [, warnaGelap, warnaTerang] = tema.match(/WARNA_BILAH = \{ gelap: '([^']+)', terang: '([^']+)' \}/);
  assert.ok(html.includes(`<meta name="theme-color" content="${warnaGelap}" />`), 'warna bilah bawaan = tema gelap');
  assert.ok(html.includes(`setAttribute("content", "${warnaTerang}")`));
  assert.equal(gelap.get('--permukaan'), warnaGelap, 'bilah HP gelap = warna header gelap');
  assert.equal(terang.get('--permukaan'), warnaTerang, 'bilah HP terang = warna header terang');
});
