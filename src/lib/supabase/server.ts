import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/**
 * Sunucu bileşenleri, Server Action'ları ve Route Handler'ları için
 * Supabase istemcisi. Oturum bilgisi httpOnly çerezlerden okunur.
 *
 * RLS kuralları kullanıcının JWT'si ile uygulanır; bu nedenle sunucu
 * tarafında da istemci tarafındakiyle aynı kısıtlar geçerlidir.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component içinden çerez yazılamaz.
          // Oturum yenileme işlemini middleware üstlenir.
        }
      },
    },
  });
}
