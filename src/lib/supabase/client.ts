"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/**
 * Tarayıcı tarafı Supabase istemcisi.
 *
 * Bu istemci yalnızca anon anahtarı ile çalışır; tüm tablo erişimleri
 * Row Level Security politikaları ve SECURITY DEFINER fonksiyonları ile
 * korunur. İstemciye puan / premium yazma yetkisi verilmemiştir.
 */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
