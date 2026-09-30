// Pasang bot Telegram pemilik JukirHub (kabar tempat baru + tombol Sembunyikan, AGENTS.md bagian 5).
// DIJALANKAN PEMILIK PROYEK (menangani token bot; AI tidak melihat token):
//
//   npm run bot:setup
//
// Prasyarat: proyek Supabase sudah di-link (npx supabase link) dan fungsi `telegram` + `lapor` sudah di-deploy.
// Langkah: minta token dari @BotFather → cek (getMe) → pemilik menekan Start di bot → ambil chat id (getUpdates)
// → pasang secret TELEGRAM_BOT_TOKEN, TELEGRAM_OWNER_CHAT_ID, TELEGRAM_WEBHOOK_SECRET, URL_WEB ke Supabase
// → setWebhook (dengan secret_token) → kirim pesan uji ke pemilik. Token tidak disimpan di repo.

import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';

const URL_WEB = 'https://jukirhub.vercel.app';

async function telegram(token, metode, body) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${metode}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {})
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`${metode} gagal: ${data.description}`);
  return data.result;
}

async function main() {
  const refFile = 'supabase/.temp/project-ref';
  if (!fs.existsSync(refFile)) throw new Error('Proyek Supabase belum di-link. Jalankan dulu: npx supabase link --project-ref <ref>');
  const ref = fs.readFileSync(refFile, 'utf8').trim();
  if (ref === 'pylduwdknbaslmbrimjg') throw new Error('Ini proyek Adami, bukan JukirHub. Batal.');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const token = (process.env.TELEGRAM_BOT_TOKEN || await rl.question('Tempel token bot dari @BotFather: ')).trim();
  if (!/^\d+:[A-Za-z0-9_-]{30,}$/.test(token)) throw new Error('Format token tidak dikenali. Salin ulang dari @BotFather.');
  const bot = await telegram(token, 'getMe');
  console.log(`\nToken valid: @${bot.username}`);

  // getUpdates hanya bisa dipakai saat webhook tidak terpasang.
  await telegram(token, 'deleteWebhook', { drop_pending_updates: false });
  console.log(`\nBuka https://t.me/${bot.username} di Telegram, tekan START (atau kirim pesan apa saja).`);
  await rl.question('Sudah? Tekan Enter… ');
  rl.close();
  const pembaruan = await telegram(token, 'getUpdates', { allowed_updates: ['message'] });
  const chat = [...pembaruan].reverse().map(u => u.message?.chat).find(c => c?.type === 'private');
  if (!chat) throw new Error('Belum ada pesan dari Anda ke bot. Tekan START di bot lalu jalankan lagi.');
  console.log(`Chat pemilik: ${chat.first_name ?? ''} (${chat.id})`);

  const secretWebhook = randomBytes(32).toString('base64url');
  const fileSementara = path.join(os.tmpdir(), `jukirhub-secrets-${process.pid}.env`);
  fs.writeFileSync(fileSementara, [
    `TELEGRAM_BOT_TOKEN=${token}`,
    `TELEGRAM_OWNER_CHAT_ID=${chat.id}`,
    `TELEGRAM_WEBHOOK_SECRET=${secretWebhook}`,
    `URL_WEB=${URL_WEB}`
  ].join('\n') + '\n', { mode: 0o600 });
  try {
    execSync(`npx supabase secrets set --env-file "${fileSementara}" --project-ref ${ref}`, { stdio: 'inherit' });
  } finally {
    fs.rmSync(fileSementara, { force: true });
  }

  await telegram(token, 'setWebhook', {
    url: `https://${ref}.supabase.co/functions/v1/telegram`,
    secret_token: secretWebhook,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: true
  });
  const info = await telegram(token, 'getWebhookInfo');
  console.log(`\nWebhook: ${info.url} (${info.last_error_message ? `galat: ${info.last_error_message}` : 'ok'})`);
  await telegram(token, 'sendMessage', {
    chat_id: chat.id,
    text: 'JukirHub terhubung. Kabar tempat parkir baru akan masuk ke sini, lengkap dengan tombol Sembunyikan.'
  });
  console.log('Pesan uji terkirim ke Telegram Anda. Selesai.');
}

main().catch((err) => {
  console.error(`\n✖ ${err.message}`);
  process.exit(1);
});
