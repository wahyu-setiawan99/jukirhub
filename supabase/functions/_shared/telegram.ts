// Kirim pesan Telegram ke pemilik (pola notifikasi.ts Adami). Hanya untuk Edge Function (Deno).
// No-op sampai TELEGRAM_BOT_TOKEN & TELEGRAM_OWNER_CHAT_ID terpasang (scripts/setup-telegram.js, dijalankan pemilik).
// Kegagalan Telegram tidak boleh menggagalkan permintaan pengguna.

const TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
export const CHAT_PEMILIK = Deno.env.get('TELEGRAM_OWNER_CHAT_ID') ?? '';

export async function panggilTelegram(metode: string, body: Record<string, unknown>) {
  if (!TOKEN) return null;
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${metode}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5_000)
  });
  if (!res.ok) console.warn(`[telegram] ${metode} ditolak:`, res.status);
  return res.ok ? res.json() : null;
}

export async function kabariPemilik(teksHtml: string, tombol?: unknown) {
  if (!TOKEN || !CHAT_PEMILIK) return;
  try {
    await panggilTelegram('sendMessage', {
      chat_id: CHAT_PEMILIK,
      text: teksHtml,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      ...(tombol ? { reply_markup: tombol } : {})
    });
  } catch (err) {
    console.warn('[telegram] gagal mengirim:', err);
  }
}

// Jalankan di latar supaya lama balasan ke pelapor tidak bergantung pada Telegram.
export function diLatar(tugas: Promise<unknown>) {
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
  if (runtime?.waitUntil) runtime.waitUntil(tugas);
  else tugas.catch(() => {});
}
