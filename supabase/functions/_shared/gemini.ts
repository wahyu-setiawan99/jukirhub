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
