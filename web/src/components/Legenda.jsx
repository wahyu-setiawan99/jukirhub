import { AMBANG_TAMPIL, INDIKASI_PUNGLI } from '@shared/konstanta.js';

// Arti tanda (AGENTS.md 1.2 & 6.2). Warna selalu disertai teks: warna tidak pernah sendirian.
const LEVEL = [
  ['rendah', 'Rendah', 'Laporan umumnya tanpa indikasi pungli.'],
  ['sedang', 'Sedang', 'Sebagian laporan menyebut indikasi pungli.'],
  ['tinggi', 'Tinggi', 'Banyak laporan menyebut indikasi pungli.'],
  ['kurang', 'Data belum cukup', `Belum ada ${AMBANG_TAMPIL.laporan} laporan dari ${AMBANG_TAMPIL.perangkat} orang berbeda.`],
  ['tanpa', 'Tanpa jukir', 'Sebagian besar laporan menyebut tidak ada juru parkir di tempat ini.']
];

export function LencanaIndikasi({ level, label }) {
  return (
    <span className={`lencana-indikasi indikasi-${level}`}>
      <span className="titik-warna" aria-hidden="true" />
      {label}
    </span>
  );
}

export function LegendaIndikasi() {
  return (
    <>
      <ul className="legenda">
        {LEVEL.map(([kode, label, arti]) => (
          <li key={kode}>
            <LencanaIndikasi level={kode} label={label} />
            <span className="redup">{arti}</span>
          </li>
        ))}
      </ul>
      <p className="redup">Tanpa penanda = belum ada laporan. Ketuk tempatnya di peta untuk melapor.</p>
    </>
  );
}

// Indikasi yang bisa dipilih pelapor (boleh kosong), sumbernya _shared/konstanta.js.
export function DaftarIndikasi() {
  return (
    <ul className="poin">
      {INDIKASI_PUNGLI.map(i => <li key={i.kode}>{i.label}</li>)}
    </ul>
  );
}
