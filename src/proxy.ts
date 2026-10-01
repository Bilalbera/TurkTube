import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

/**
 * Next.js "proxy" (eski adıyla middleware): her istekte Supabase oturum
 * çerezini yeniler. Bu olmadan sunucu bileşenlerindeki oturum düşer.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Statik dosyalar ve görseller hariç tüm isteklerde çalış.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
