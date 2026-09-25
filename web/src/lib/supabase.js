import { createClient } from '@supabase/supabase-js';

// Hanya anon key, hanya untuk MEMBACA view *_publik. Semua tulis lewat Edge Function (AGENTS.md bagian 4).
// Belum diimpor di M0 (belum ada data); dipakai mulai M1.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});
