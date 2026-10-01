import { CATATAN_KAKI, HALAMAN } from '../lib/konten-beranda.js';
import { DaftarIndikasi, LegendaIndikasi } from '../components/Legenda.jsx';

// Halaman info: cara pakai, arti tanda, privasi, disclaimer. Nada tidak alarmis, bukan tuduhan.
export default function Info() {
  return (
    <div className="halaman info">
      <h1 className="judul-tersembunyi">{HALAMAN['/info'].h1}</h1>

      <section className="kartu" aria-labelledby="judul-cara">
        <h2 id="judul-cara">Cara pakai</h2>
        <ol className="langkah">
          <li>Buka <strong>Peta</strong>, lalu ketuk tempat Anda parkir atau cari namanya.</li>
          <li>Lihat laporan warga di tempat itu: jukir membantu atau tidak, tarif, rating, dan indikasi pungli.</li>
          <li>Sedang di sana? Tekan <strong>Laporkan parkir</strong> dan jawab lima pertanyaan singkat.</li>
          <li>Pilih <strong>Motor</strong> atau <strong>Mobil</strong> di bagian atas; tarif yang tampil mengikuti pilihan ini.</li>
        </ol>
      </section>

      <section className="kartu" aria-labelledby="judul-bantu">
        <h2 id="judul-bantu">Membantu atau tidak membantu</h2>
        <p>
          Pelapor menjawab dua hal: apakah jukir membantu <strong>saat datang</strong> (mengarahkan, merapikan) dan
          <strong> saat mau pergi</strong> (mengeluarkan kendaraan, menghentikan lalu lintas). Hasilnya ditulis bersama
          jumlahnya, mis. "saat pergi: membantu (4 dari 5 laporan)".
        </p>
      </section>

      <section className="kartu" aria-labelledby="judul-indikasi">
        <h2 id="judul-indikasi">Arti indikasi pungli</h2>
        <p>Pelapor boleh memilih indikasi yang dialami:</p>
        <DaftarIndikasi />
        <h3>Warna di peta</h3>
        <LegendaIndikasi />
        <p className="redup">
          Indikasi dihitung dari pengalaman yang dilaporkan warga, bukan tuduhan kepada siapa pun dan bukan putusan hukum.
        </p>
      </section>

      <section className="kartu" id="privasi" aria-labelledby="judul-privasi">
        <h2 id="judul-privasi">Privasi</h2>
        <ul className="poin">
          <li>Tanpa akun, tanpa nama, tanpa nomor HP.</li>
          <li>Tidak ada nama, foto, atau ciri pribadi jukir yang ditampilkan. Laporan berupa pilihan dan bintang.</li>
          <li>Koordinat saat melapor hanya untuk memastikan Anda di lokasi, tidak ditampilkan, dan dihapus setelah 7 hari.</li>
          <li>
            Foto bukti (opsional) hanya dikirim ke pengelola JukirHub, tidak ditampilkan, dan tidak disimpan di server
            JukirHub. Data lokasi di dalam foto dibuang dulu.
          </li>
          <li>Koin dan peringkat memakai nama samaran acak, tanpa akun. Anda bisa menyembunyikan diri dari peringkat.</li>
          <li>
            Tanpa pelacak iklan (tidak ada Meta Pixel atau sejenisnya). Bila Anda datang dari iklan, hanya nama
            kampanyenya yang ikut tersimpan di laporan, untuk menghitung iklan mana yang berguna.
          </li>
        </ul>
      </section>

      <p className="disclaimer">{CATATAN_KAKI}</p>
    </div>
  );
}
