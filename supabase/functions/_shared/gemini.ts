// Panggilan Gemini bersama (berita & pemeriksaan komentar). Hanya Edge Function. Kunci GEMINI_API_KEY dipasang pemilik
// (`npm run berita:setup`); model bisa diganti secret GEMINI_MODEL. Keluaran selalu JSON sesuai skema.

import { MODEL_BAWAAN } from './berita.js';

export const KUNCI_GEMINI = Deno.env.get('GEMINI_API_KEY') ?? '';
const MODEL = Deno.env.get('GEMINI_MODEL') || MODEL_BAWAAN;

export async function panggilGemini(
  { sistem, pengguna, skema, maksToken = 2048, batasMs = 20_000 }:
  { sistem: string; pengguna: string; skema: unknown; maksToken?: number; batasMs?: number }
): Promise<unknown> {
  if (!KUNCI_GEMINI) throw new Error('GEMINI_API_KEY belum dipasang');
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KUNCI_GEMINI },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: sistem }] },
      contents: [{ role: 'user', parts: [{ text: pengguna }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: skema, temperature: 0.2, maxOutputTokens: maksToken }
    }),
    signal: AbortSignal.timeout(batasMs)
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const hasil = await res.json();
  const teks = (hasil?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('');
  return JSON.parse(teks);
}

// Gemini + Google Search (tarif resmi, AGENTS.md 1.8 C). Pencarian gratis (≤ 500 permintaan/hari) hanya di model 2.5
// (tier gratis, cek 5 Okt 2026), jadi modelnya terpisah: secret GEMINI_MODEL_TARIF bila perlu diganti. Model dengan alat
// pencarian tidak bisa dipaksa responseSchema → teks mentah + domain yang dibuka pencarian (groundingChunks[].web.title).
const MODEL_CARI = Deno.env.get('GEMINI_MODEL_TARIF') || 'gemini-2.5-flash-lite';

export async function panggilGeminiCari(
  { sistem, pengguna, maksToken = 1024, batasMs = 40_000 }:
  { sistem: string; pengguna: string; maksToken?: number; batasMs?: number }
): Promise<{ teks: string; domain: string[] }> {
  if (!KUNCI_GEMINI) throw new Error('GEMINI_API_KEY belum dipasang');
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_CARI}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KUNCI_GEMINI },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: sistem }] },
      contents: [{ role: 'user', parts: [{ text: pengguna }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.1, maxOutputTokens: maksToken }
    }),
    signal: AbortSignal.timeout(batasMs)
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const hasil = await res.json();
  const kandidat = hasil?.candidates?.[0];
  const teks = (kandidat?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('');
  const domain = (kandidat?.groundingMetadata?.groundingChunks ?? [])
    .map((c: { web?: { title?: string } }) => c?.web?.title ?? '')
    .filter(Boolean);
  return { teks, domain };
}
