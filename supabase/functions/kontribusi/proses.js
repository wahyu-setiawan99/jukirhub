// Alur Edge Function `kontribusi` (tab Saya, AGENTS.md 10.4): koin, lencana, peringkat 30 hari per kabupaten, dan
// 10 laporan terakhir dari perangkat ini. JavaScript murni: database disuntikkan lewat `db` supaya bisa dites.
//   { perangkat, aksi?: 'lihat' | 'sembunyikan' | 'tampilkan' | 'ganti_nama', kabupaten?: <label> | 'semua' }
// Pelapor selalu melihat koin TAMPIL miliknya (pelapor yang dicurigai tidak tahu dirinya dicurigai); peringkat memakai
// koin SAH. Hanya nama samaran; tanpa koordinat, IP, atau identitas.

import { HARI_PERINGKAT, PERINGKAT_TAMPIL, namaSamaran, seriBerjalan } from '../_shared/koin.js';
import { kabupatenSah } from '../_shared/kabupaten.js';
import { sha256 } from '../lapor/proses.js';

const AKSI = new Set(['lihat', 'sembunyikan', 'tampilkan', 'ganti_nama']);
const tolak = (status, kode, pesan) => ({ status, body: { ok: false, kode, pesan } });

/**
 * @param {{ body: any, garam: { reporter: string }, sekarang?: number, db: {
 *   bacaReputasi(key: string): Promise<Record<string, any> | null>,
 *   ubahReputasi(key: string, ubah: Record<string, unknown>): Promise<void>,
 *   koinSaya(key: string, hari: number): Promise<Array<{ kabupaten: string, koin: number }>>,
 *   peringkat(kabupaten: string | null, hari: number, batas: number): Promise<Array<{ reporter_key: string, nama_samaran: string, koin: number }>>,
 *   posisi(key: string, kabupaten: string | null, nilai: number, hari: number): Promise<number>,
 *   laporanTerakhir(key: string, batas: number): Promise<Array<Record<string, unknown>>>
 * } }} p
 */
export async function prosesKontribusi({ body, garam, db, sekarang = Date.now() }) {
  const b = body && typeof body === 'object' ? body : {};
  if (typeof b.perangkat !== 'string' || b.perangkat.length < 8 || b.perangkat.length > 100) {
    return tolak(400, 'perangkat', 'Identitas perangkat tidak valid.');
  }
  const aksi = b.aksi ?? 'lihat';
  if (!AKSI.has(aksi)) return tolak(400, 'aksi', 'Permintaan tidak dikenal.');
  // undefined = kabupaten tempat pelapor paling banyak mendapat koin; null = semua kabupaten.
  let kabupatenDiminta;
  if (b.kabupaten === 'semua') kabupatenDiminta = null;
  else if (b.kabupaten != null) {
    if (!kabupatenSah(b.kabupaten)) return tolak(400, 'kabupaten', 'Kabupaten tidak dikenal.');
    kabupatenDiminta = b.kabupaten;
  }

  // Hash yang sama dengan `lapor` (reporter_key laporan & reputasi).
  const key = await sha256(`${garam.reporter}:${b.perangkat}`);
  let r = await db.bacaReputasi(key);

  if (aksi !== 'lihat') {
    if (!r) return tolak(404, 'belum_ada', 'Belum ada koin. Laporkan parkir dulu dari lokasi.');
    const ubah = aksi === 'ganti_nama'
      ? { nama_samaran: namaSamaran(key, r.kabupaten_asal, r.putaran_nama + 1), putaran_nama: r.putaran_nama + 1 }
      : { tampil_di_peringkat: aksi === 'tampilkan' };
    await db.ubahReputasi(key, ubah);
    r = { ...r, ...ubah };
  }

  let kabupatenSaya = null;
  let koinPeriode = 0;
  if (r) {
    const perKab = await db.koinSaya(key, HARI_PERINGKAT);
    kabupatenSaya = perKab.find(x => x.kabupaten !== '-')?.kabupaten ?? r.kabupaten_asal ?? null;
    const kab = kabupatenDiminta === undefined ? kabupatenSaya : kabupatenDiminta;
    koinPeriode = kab == null
      ? perKab.reduce((j, x) => j + Number(x.koin), 0)
      : Number(perKab.find(x => x.kabupaten === kab)?.koin ?? 0);
  }
  const kabupaten = kabupatenDiminta === undefined ? kabupatenSaya : kabupatenDiminta;

  let daftar = (await db.peringkat(kabupaten, HARI_PERINGKAT, PERINGKAT_TAMPIL))
    .filter(x => x.reporter_key !== key)
    .map(x => ({ nama: x.nama_samaran, koin: Number(x.koin), saya: false }));
  let posisi = null;
  if (r?.tampil_di_peringkat && koinPeriode > 0) {
    posisi = Number(await db.posisi(key, kabupaten, koinPeriode, HARI_PERINGKAT));
    daftar.push({ nama: r.nama_samaran, koin: koinPeriode, saya: true });
    daftar.sort((a, c) => c.koin - a.koin || Number(c.saya) - Number(a.saya));
    daftar = daftar.slice(0, PERINGKAT_TAMPIL);
    if (!daftar.some(x => x.saya)) daftar.push({ nama: r.nama_samaran, koin: koinPeriode, saya: true });
  }

  const laporan = r ? await db.laporanTerakhir(key, 10) : [];
  return {
    status: 200,
    body: {
      ok: true,
      saya: r ? {
        nama_samaran: r.nama_samaran,
        tampil_di_peringkat: r.tampil_di_peringkat,
        koin: r.koin_tampil,
        laporan: r.laporan_berkoin,
        seri: seriBerjalan(r, sekarang),
        statistik: {
          laporan_berkoin: r.laporan_berkoin, tempat_berbeda: r.tempat_berbeda, pembuka_data: r.pembuka_data,
          seri_terpanjang: r.seri_terpanjang, maks_satu_tempat: r.maks_satu_tempat
        },
        lencana: r.lencana ?? [],
        kabupaten: kabupatenSaya,
        posisi
      } : null,
      peringkat: { kabupaten, hari: HARI_PERINGKAT, daftar },
      laporan_terakhir: laporan
    }
  };
}
