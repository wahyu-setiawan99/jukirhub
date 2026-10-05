// Akses database tarif resmi untuk Edge Function lapor, telegram, dan tarif (AGENTS.md 1.8 C). Hanya Edge Function
// (service_role). Logika murni ada di tarif.js.

// deno-lint-ignore no-explicit-any
type Klien = any;

function periksa<T>({ data, error }: { data: T; error: unknown }): T {
  if (error) throw error;
  return data;
}

// Tarif terpakai { motor, mobil } kab/kota dari view tarif_resmi_publik, atau null bila belum ada yang disetujui.
export async function bacaTarifKota(supabase: Klien, kota: string) {
  const baris = periksa(await supabase.from('tarif_resmi_publik').select('kendaraan, tarif').eq('kota', kota)) as
    Array<{ kendaraan: string; tarif: number }> | null;
  if (!baris?.length) return null;
  const t: { motor: number | null; mobil: number | null } = { motor: null, mobil: null };
  for (const b of baris) if (b.kendaraan === 'motor' || b.kendaraan === 'mobil') t[b.kendaraan] = Number(b.tarif);
  return t;
}

// Id tempat aktif di kab/kota (untuk hitung ulang ringkasan setelah tarif disetujui).
export async function titikDiKota(supabase: Klien, kota: string) {
  const baris = periksa(await supabase.from('titik_parkir').select('id').eq('kota', kota).eq('status', 'aktif').limit(5000)) as
    Array<{ id: number }> | null;
  return (baris ?? []).map(b => Number(b.id));
}
