import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
// CSS peta ikut dimuat bersama komponen ini (dipisah dari muatan awal app).
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { useApp } from '../state.jsx';
import { kodeLevel, labelLevel } from '../lib/tempat.js';
import { pesanGalatLokasi } from '../lib/lokasi.js';
import { useTema } from '../lib/tema.js';
import { Ikon } from './Ikon.jsx';

// MapLibre v6 memuat worker dari URL relatif yang tidak ikut ter-emit saat build (pelajaran Adami).
maplibregl.setWorkerUrl(workerUrl);

// OpenFreeMap (gratis, tanpa API key); gaya mengikuti tema app. Tile OSM resmi hanya CADANGAN darurat.
const GAYA_TEMA = {
  gelap: 'https://tiles.openfreemap.org/styles/dark',
  terang: 'https://tiles.openfreemap.org/styles/positron'
};
const BATAS_TUNGGU_GAYA_MS = 10_000;
const GAYA_CADANGAN = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
    }
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
};

const PUSAT_MAKASSAR = [119.4327, -5.1477];
const BATAS_GESER = [[118.9, -6.1], [120.4, -4.3]];
// Nama tempat (POI) mulai terlihat & bisa diketuk pada zoom ini (AGENTS.md 1.2 poin 1).
export const ZOOM_NAMA_TEMPAT = 15;
const ZOOM_FOKUS = 17;
const RADIUS_KETUK_PX = 14;
const LAMA_TEKAN_MS = 600;
const KOSONG = { type: 'FeatureCollection', features: [] };
const LAPISAN_POI = ['jh-poi-titik', 'jh-poi-nama'];

// Gaya dark/positron tidak menampilkan POI, tapi tile-nya memuat lapisan `poi` (OpenMapTiles).
// Lapisan sendiri ini menampilkan nama tempat dengan warna tema supaya bisa diketuk.
function pasangLapisanPoi(m) {
  if (!m.getSource('openmaptiles') || m.getLayer('jh-poi-titik')) return;
  const css = getComputedStyle(document.documentElement);
  const warna = (v, cadangan) => css.getPropertyValue(v).trim() || cadangan;
  const adaNama = ['all', ['has', 'name'], ['match', ['geometry-type'], ['Point', 'MultiPoint'], true, false]];
  m.addLayer({
    id: 'jh-poi-titik', type: 'circle', source: 'openmaptiles', 'source-layer': 'poi', minzoom: ZOOM_NAMA_TEMPAT,
    filter: adaNama,
    paint: {
      'circle-radius': 3.5,
      'circle-color': warna('--aksen', '#60a5fa'),
      'circle-stroke-width': 1,
      'circle-stroke-color': warna('--latar', '#0e0e10')
    }
  });
  m.addLayer({
    id: 'jh-poi-nama', type: 'symbol', source: 'openmaptiles', 'source-layer': 'poi', minzoom: ZOOM_NAMA_TEMPAT,
    filter: adaNama,
    layout: {
      'text-field': ['coalesce', ['get', 'name:latin'], ['get', 'name']],
      'text-font': ['Noto Sans Regular'],
      'text-size': 12,
      'text-anchor': 'top',
      'text-offset': [0, 0.5],
      'text-max-width': 9,
      'symbol-sort-key': ['coalesce', ['get', 'rank'], 99]
    },
    paint: {
      'text-color': warna('--teks-isi', '#d4d4d8'),
      'text-halo-color': warna('--latar', '#0e0e10'),
      'text-halo-width': 1.2
    }
  });
}

// Fitur POI terdekat dari titik ketuk (kotak ±14 px, supaya titik kecil tetap mudah diketuk jari).
function poiDiTitik(m, titik) {
  if (!m.getLayer('jh-poi-titik')) return null;
  const kotak = [[titik.x - RADIUS_KETUK_PX, titik.y - RADIUS_KETUK_PX], [titik.x + RADIUS_KETUK_PX, titik.y + RADIUS_KETUK_PX]];
  let terbaik = null;
  for (const f of m.queryRenderedFeatures(kotak, { layers: LAPISAN_POI })) {
    const nama = f.properties?.['name:latin'] || f.properties?.name;
    if (!nama || f.geometry?.type !== 'Point') continue;
    const [lng, lat] = f.geometry.coordinates;
    const p = m.project([lng, lat]);
    const d = Math.hypot(p.x - titik.x, p.y - titik.y);
    if (!terbaik || d < terbaik.d) terbaik = { d, hasil: { nama: String(nama).slice(0, 60), lat, lng, osm_ref: null, sumber: 'peta' } };
  }
  return terbaik?.hasil ?? null;
}

export default function Peta({ pilihan, onPilih, fokus, petunjukPilih, onTutupPetunjuk }) {
  const { daftar, posisi, izinLokasi, galatLokasi, mintaPosisi } = useApp();
  const wadah = useRef(null);
  const peta = useRef(null);
  const marker = useRef(new Map());
  const markerSaya = useRef(null);
  const markerPilih = useRef(null);
  const sudahTerbang = useRef(false);
  const dataTerakhir = useRef(KOSONG);
  const onPilihRef = useRef(onPilih);
  const pilihanIdRef = useRef(null);
  onPilihRef.current = onPilih;
  pilihanIdRef.current = pilihan?.id ?? null;
  const [siap, setSiap] = useState(false);
  const [zoomKecil, setZoomKecil] = useState(true);
  const [tema] = useTema();
  const temaPeta = useRef(tema);
  const pakaiCadangan = useRef(false);

  // --- inisialisasi peta sekali
  useEffect(() => {
    const m = new maplibregl.Map({
      container: wadah.current,
      style: GAYA_TEMA[temaPeta.current] ?? GAYA_TEMA.gelap,
      center: PUSAT_MAKASSAR,
      zoom: 12.5,
      maxBounds: BATAS_GESER,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false
    });
    m.touchZoomRotate.disableRotation();
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    // Source & lapisan hilang setiap kali gaya diganti, jadi dipasang ulang di setiap 'style.load'.
    const pasangLapisan = () => {
      pasangLapisanPoi(m);
      if (!m.getSource('tempat')) {
        m.addSource('tempat', { type: 'geojson', data: dataTerakhir.current, cluster: true, clusterMaxZoom: 13, clusterRadius: 44 });
        // Layer tak terlihat supaya fitur source dimuat; tampilan sebenarnya pakai marker HTML (bisa difokus keyboard).
        m.addLayer({ id: 'tempat-titik', type: 'circle', source: 'tempat', paint: { 'circle-radius': 1, 'circle-opacity': 0 } });
      }
      setSiap(true);
    };

    let gayaTermuat = false;
    let sudahCadangan = false;
    const keCadangan = (alasan) => {
      if (gayaTermuat || sudahCadangan) return;
      sudahCadangan = true;
      pakaiCadangan.current = true;
      console.warn(`[peta] gaya utama gagal dimuat (${alasan}); memakai tile OSM cadangan`);
      m.setStyle(GAYA_CADANGAN, { diff: false });
    };
    const timer = setTimeout(() => keCadangan('waktu habis'), BATAS_TUNGGU_GAYA_MS);
    m.on('error', (e) => { if (!gayaTermuat) keCadangan(e?.error?.message ?? 'galat'); });
    m.on('style.load', () => { gayaTermuat = true; clearTimeout(timer); pasangLapisan(); });
    m.on('render', () => {
      if (m.getSource('tempat') && m.isSourceLoaded('tempat')) sinkronMarker(m, marker, onPilihRef, pilihanIdRef);
    });
    const cekZoom = () => setZoomKecil(m.getZoom() < ZOOM_NAMA_TEMPAT);
    m.on('zoomend', cekZoom);

    // Ketuk: nama tempat di peta → pilih; area kosong → tutup lembar. Penanda punya handler sendiri.
    let abaikanKlikSampai = 0;
    m.on('click', (e) => {
      if (Date.now() < abaikanKlikSampai) return;
      if (e.originalEvent?.target?.closest?.('.mk, .mk-klaster')) return;
      onPilihRef.current?.(poiDiTitik(m, e.point));
    });

    // Tekan lama (sentuh) / klik kanan (mouse): pin untuk tempat tanpa nama di peta.
    const pasangPin = (lngLat) => {
      abaikanKlikSampai = Date.now() + 500;
      onPilihRef.current?.({ nama: '', lat: lngLat.lat, lng: lngLat.lng, osm_ref: null, sumber: 'pin' });
    };
    let tekan = null;
    const batalTekan = () => { if (tekan) { clearTimeout(tekan.timer); tekan = null; } };
    m.on('touchstart', (e) => {
      batalTekan();
      if (e.points?.length !== 1) return;
      tekan = { titik: e.point, timer: setTimeout(() => { const t = tekan; tekan = null; if (t) pasangPin(e.lngLat); }, LAMA_TEKAN_MS) };
    });
    m.on('touchmove', (e) => { if (tekan && Math.hypot(e.point.x - tekan.titik.x, e.point.y - tekan.titik.y) > 8) batalTekan(); });
    m.on('touchend', batalTekan);
    m.on('touchcancel', batalTekan);
    m.on('zoomstart', batalTekan);
    m.on('contextmenu', (e) => pasangPin(e.lngLat));

    peta.current = m;
    if (import.meta.env.DEV) window.__peta = m;
    return () => {
      clearTimeout(timer);
      batalTekan();
      marker.current.forEach(x => x.marker.remove());
      marker.current = new Map();
      m.remove();
    };
  }, []);

  // --- tema app berganti → ganti gaya peta (lapisan dipasang ulang di 'style.load'). Peta cadangan tetap.
  useEffect(() => {
    if (!siap || pakaiCadangan.current || temaPeta.current === tema) return;
    temaPeta.current = tema;
    peta.current?.setStyle(GAYA_TEMA[tema] ?? GAYA_TEMA.gelap, { diff: false });
  }, [siap, tema]);

  // --- tempat terlapor → GeoJSON
  useEffect(() => {
    dataTerakhir.current = {
      type: 'FeatureCollection',
      features: daftar.map(t => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [t.lng, t.lat] },
        properties: { id: t.id, nama: t.nama, level: kodeLevel(t.ringkasan), label: labelLevel(t.ringkasan) }
      }))
    };
    if (siap) peta.current?.getSource('tempat')?.setData(dataTerakhir.current);
  }, [siap, daftar]);

  // --- tempat terpilih: tandai penandanya, atau pasang pin untuk tempat yang belum dilaporkan
  useEffect(() => {
    if (!siap) return;
    const m = peta.current;
    for (const [kunci, x] of marker.current) x.el.classList.toggle('terpilih', kunci === `t${pilihan?.id}`);
    if (!pilihan || pilihan.id != null) {
      markerPilih.current?.remove();
      markerPilih.current = null;
      return;
    }
    if (!markerPilih.current) {
      const el = document.createElement('div');
      el.className = 'mk-pilih';
      el.setAttribute('aria-hidden', 'true');
      markerPilih.current = new maplibregl.Marker({ element: el, anchor: 'bottom' });
    }
    markerPilih.current.setLngLat([pilihan.lng, pilihan.lat]).addTo(m);
  }, [siap, pilihan]);

  // --- posisi pengguna: titik biru + terbang sekali ke sana (cukup dekat untuk melihat nama tempat)
  useEffect(() => {
    if (!siap || !posisi) return;
    const m = peta.current;
    if (!markerSaya.current) {
      const el = document.createElement('div');
      el.className = 'titik-saya';
      el.setAttribute('aria-label', 'Lokasi Anda');
      markerSaya.current = new maplibregl.Marker({ element: el }).setLngLat([posisi.lng, posisi.lat]).addTo(m);
    } else {
      markerSaya.current.setLngLat([posisi.lng, posisi.lat]);
    }
    if (!sudahTerbang.current) {
      sudahTerbang.current = true;
      m.flyTo({ center: [posisi.lng, posisi.lat], zoom: 16.5, duration: 900 });
    }
  }, [siap, posisi]);

  // --- fokus ke satu tempat (hasil cari, Daftar, Beranda). Setelah efek posisi supaya flyTo ini yang menang.
  useEffect(() => {
    if (!siap || !fokus) return;
    sudahTerbang.current = true;
    // offset ke atas: tempat tidak tertutup lembar di bagian bawah
    peta.current.flyTo({ center: [fokus.lng, fokus.lat], zoom: Math.max(peta.current.getZoom(), ZOOM_FOKUS), offset: [0, -120], duration: 800 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siap, fokus?.kunci]);

  const keLokasiSaya = async () => {
    sudahTerbang.current = true;
    try {
      const p = await mintaPosisi();
      peta.current?.flyTo({ center: [p.lng, p.lat], zoom: Math.max(peta.current.getZoom(), 16.5), duration: 700 });
    } catch { /* pesan ditampilkan lewat galatLokasi */ }
  };
  const mencariLokasi = izinLokasi === 'meminta';
  const [catatanDitutup, setCatatanDitutup] = useState(false);
  useEffect(() => { if (mencariLokasi) setCatatanDitutup(false); }, [mencariLokasi]);
  const tampilCatatan = mencariLokasi || (galatLokasi && !catatanDitutup);

  return (
    <div className="peta-wadah">
      <div ref={wadah} className="peta" />
      {/* Satu pesan di bawah kolom cari: lokasi > petunjuk memilih tempat > petunjuk zoom. */}
      {!tampilCatatan && petunjukPilih && (
        <div className="catatan-lokasi" role="status">
          <p>Ketuk tempat Anda parkir di peta{zoomKecil ? ' (perbesar dulu sampai nama tempat terlihat)' : ''}, atau cari namanya.</p>
          <button type="button" className="tutup-catatan" onClick={onTutupPetunjuk} aria-label="Tutup petunjuk">✕</button>
        </div>
      )}
      {siap && zoomKecil && !tampilCatatan && !petunjukPilih && !pilihan && (
        <p className="petunjuk-zoom" role="status">Perbesar peta untuk melihat dan mengetuk nama tempat</p>
      )}
      <button
        type="button"
        className="tombol-lokasi"
        onClick={keLokasiSaya}
        disabled={mencariLokasi}
        aria-busy={mencariLokasi}
        aria-label="Tampilkan lokasi saya"
        title="Lokasi saya"
      >
        <Ikon nama="lokasi" ukuran={22} />
      </button>
      {tampilCatatan && (
        <div className="catatan-lokasi" role="status">
          <p>{mencariLokasi ? 'Mencari lokasi Anda…' : pesanGalatLokasi(galatLokasi, navigator.userAgent)}</p>
          {!mencariLokasi && (
            <button type="button" className="tutup-catatan" onClick={() => setCatatanDitutup(true)} aria-label="Tutup pesan">✕</button>
          )}
        </div>
      )}
    </div>
  );
}

// Sinkronkan marker HTML dengan fitur (gugus / tempat) yang sedang tampil di source (pola Adami).
function sinkronMarker(m, marker, onPilihRef, pilihanIdRef) {
  const baru = new Map();
  for (const f of m.querySourceFeatures('tempat')) {
    const p = f.properties;
    const kunci = p.cluster ? `c${p.cluster_id}` : `t${p.id}`;
    if (baru.has(kunci)) continue;
    let entri = marker.current.get(kunci);
    if (!entri) {
      const el = document.createElement('button');
      el.type = 'button';
      entri = { el, marker: new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(f.geometry.coordinates).addTo(m), tanda: null };
    }
    const tanda = p.cluster ? `c|${p.point_count}` : `t|${p.level}|${p.label}`;
    if (entri.tanda !== tanda) {
      if (p.cluster) isiKlaster(entri.el, p, m, f.geometry.coordinates);
      else isiMarker(entri.el, p, onPilihRef);
      entri.tanda = tanda;
    }
    if (!p.cluster) entri.el.classList.toggle('terpilih', pilihanIdRef.current === p.id);
    baru.set(kunci, entri);
  }
  for (const [kunci, entri] of marker.current) {
    if (!baru.has(kunci)) entri.marker.remove();
  }
  marker.current = baru;
}

function isiMarker(el, p, onPilihRef) {
  // classList, bukan className: jangan hapus class maplibregl-marker bawaan (posisi absolut)
  el.classList.remove('indikasi-rendah', 'indikasi-sedang', 'indikasi-tinggi', 'indikasi-kurang');
  el.classList.add('mk', `indikasi-${p.level}`);
  // nama dari pengguna/OSM hanya lewat setAttribute/textContent, tidak pernah lewat innerHTML
  el.setAttribute('aria-label', `${p.nama}: ${p.label}`);
  el.replaceChildren();
  const bulat = document.createElement('span');
  bulat.className = 'mk-bulat';
  bulat.textContent = 'P';
  el.append(bulat);
  el.onclick = (e) => { e.stopPropagation(); onPilihRef.current?.({ id: p.id }); };
}

function isiKlaster(el, p, m, koordinat) {
  el.classList.add('mk-klaster');
  el.textContent = p.point_count;
  el.setAttribute('aria-label', `${p.point_count} tempat parkir, perbesar peta`);
  el.onclick = async (e) => {
    e.stopPropagation();
    const zoom = await m.getSource('tempat').getClusterExpansionZoom(p.cluster_id);
    m.easeTo({ center: koordinat, zoom: zoom + 0.5 });
  };
}
