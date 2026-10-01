import type { ReactNode } from "react";
import { MobileNav } from "@/components/MobileNav";
import { Sidebar } from "@/components/Sidebar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getSession } from "@/lib/queries";

/**
 * Uygulama iskeleti: üst menü, sol gezinme, içerik, alt gezinme ve alt bilgi.
 * Responsive: mobilde alt gezinme çubuğu, masaüstünde sol menü görünür.
 */
export async function AppShell({ children }: { children: ReactNode }) {
  const session = await getSession();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader session={session} />

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 items-start gap-0 lg:gap-6">
        <div className="sticky top-14 hidden lg:block">
          <Sidebar
            channelHandle={session.channel?.handle ?? null}
            isPremium={session.isPremium}
            girisYapildi={Boolean(session.userId)}
          />
        </div>

        <main className="min-w-0 flex-1 px-3 pt-4 pb-24 sm:px-4 lg:pb-8">{children}</main>
      </div>

      <MobileNav girisYapildi={Boolean(session.userId)} />
      <SiteFooter />
    </div>
  );
}
