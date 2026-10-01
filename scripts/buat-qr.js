// Buat QR code tautan JukirHub untuk poster & pesan WhatsApp (pola Adami).
//
//   npm run qr
//
// Hasil: docs/peluncuran/qr-jukirhub.svg (cetak) dan .png (kirim di chat). Tautan polos tanpa parameter pelacak,
// langsung ke tab Peta. Ganti URL_APP bila domain sendiri sudah dipasang (AGENTS.md bagian 11).

import fs from 'node:fs';
import QRCode from 'qrcode';

const URL_APP = 'https://jukirhub.site/peta';
const FOLDER = 'docs/peluncuran';

fs.mkdirSync(FOLDER, { recursive: true });
const opsi = { errorCorrectionLevel: 'M', margin: 2 };
await QRCode.toFile(`${FOLDER}/qr-jukirhub.svg`, URL_APP, { ...opsi, type: 'svg', width: 512 });
await QRCode.toFile(`${FOLDER}/qr-jukirhub.png`, URL_APP, { ...opsi, type: 'png', width: 1024 });
console.log(`QR untuk ${URL_APP} ditulis ke ${FOLDER}/qr-jukirhub.svg dan .png`);
