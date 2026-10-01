/**
 * Supabase ortam değişkenleri ve yapılandırma kontrolü.
 *
 * Not: NEXT_PUBLIC_* değişkenleri istemci paketine gömülebilmesi için
 * doğrudan `process.env.X` biçiminde okunmalıdır.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Supabase anahtarları girilmiş mi? Değilse uygulama kurulum ekranı gösterir. */
export function isSupabaseConfigured(): boolean {
  return (
    SUPABASE_URL.startsWith("http") &&
    SUPABASE_ANON_KEY.length > 20 &&
    !SUPABASE_URL.includes("YOUR_")
  );
}
