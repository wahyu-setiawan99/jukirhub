// Hasil iklan per kampanye (rencana pemasaran docs/peluncuran/iklan.md): jumlah laporan & pelapor dari pengunjung
// yang datang lewat tautan ber-UTM, dibaca dari view publik `kampanye_publik` (angka agregat saja).
//
//   npm run kampanye            → 30 hari terakhir
//   npm run kampanye -- 7       → 7 hari terakhir
//
// URL & kunci anon Supabase dibaca dari web/.env.local oleh Node (--env-file-if-exists), sama dengan web.
// Biaya per pelapor = biaya iklan di Ads Manager ÷ kolom "pelapor".

import { pathToFileURL } from 'node:url';

// Fungsi murni (dites di tests/kampanye.test.js): baris view → total per sumber/kampanye/konten, terbanyak dulu.
export function rangkum(baris) {
  const peta = new Map();
  for (const b of baris) {
    const kunci = `${b.sumber}/${b.kampanye}/${b.konten}`;
    const t = peta.get(kunci) ?? { kunci, laporan: 0, pelapor: 0, hari: 0 };
    t.laporan += b.laporan;
    // Pelapor per hari dijumlah: orang yang melapor di dua hari berbeda terhitung dua kali (batas atas).
    t.pelapor += b.pelapor;
    t.hari += 1;
    peta.set(kunci, t);
  }
  return [...peta.values()].sort((a, b) => b.pelapor - a.pelapor || b.laporan - a.laporan);
}

async function utama() {
  const url = String(process.env.VITE_SUPABASE_URL ?? '').replace(/\/+$/, '');
  const kunci = process.env.VITE_SUPABASE_ANON_KEY ?? '';
  if (!url || !kunci) {
    console.error('✖ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY tidak ada di web/.env.local.');
    process.exit(1);
  }
  const hari = Math.max(1, Math.min(365, Number.parseInt(process.argv[2] ?? '30', 10) || 30));
  const sejak = new Date(Date.now() - hari * 86_400_000).toISOString().slice(0, 10);
  const res = await fetch(`${url}/rest/v1/kampanye_publik?select=*&hari=gte.${sejak}&limit=5000`, {
    headers: { apikey: kunci }
  });
  if (!res.ok) {
    console.error(`✖ Gagal membaca kampanye_publik (HTTP ${res.status}). Migrasi kampanye sudah di-push?`);
    process.exit(1);
  }
  const hasil = rangkum(await res.json());
  console.log(`Laporan dari iklan sejak ${sejak} (${hari} hari):\n`);
  if (!hasil.length) {
    console.log('  Belum ada laporan dari tautan kampanye.');
    return;
  }
  console.table(hasil.map(h => ({ 'sumber/kampanye/iklan': h.kunci, laporan: h.laporan, pelapor: h.pelapor, 'hari aktif': h.hari })));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  utama().catch((err) => { console.error('✖', err.message); process.exit(1); });
}
