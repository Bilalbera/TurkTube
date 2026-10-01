import Link from "next/link";
import { Suspense } from "react";
import { SearchBar } from "@/components/SearchBar";
import { UserMenu } from "@/components/UserMenu";
import { IconBell, IconLogo, IconUpload } from "@/components/icons";
import { formatNumber } from "@/lib/format";
import type { SessionInfo } from "@/lib/queries";

export function SiteHeader({ session }: { session: SessionInfo }) {
  const girisYapildi = Boolean(session.userId && session.profile);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-3 sm:px-4 lg:gap-5">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-extrabold tracking-tight">
          <IconLogo className="h-7 w-7 text-brand" />
          <span className="hidden sm:inline">
            Türk<span className="text-brand">Tube</span>
          </span>
        </Link>

        <div className="mx-auto w-full max-w-2xl">
          <Suspense fallback={<div className="h-10 w-full rounded-xl bg-surface2" />}>
            <SearchBar />
          </Suspense>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {girisYapildi ? (
            <>
              {session.profile ? (
                <span
                  className="hidden items-center gap-1 rounded-full bg-brand-soft px-3 py-1.5 text-xs font-bold text-brand-strong md:inline-flex"
                  title="TürkTube Puanın"
                >
                  {formatNumber(session.profile.points)} puan
                </span>
              ) : null}

              <Link
                href="/yukle"
                className="tt-btn tt-btn-soft h-9 px-3"
                title="Video yükle"
              >
                <IconUpload className="h-4.5 w-4.5" />
                <span className="hidden lg:inline">Yükle</span>
              </Link>

              <Link
                href="/bildirimler"
                className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface2"
                title="Bildirimler"
                aria-label="Bildirimler"
              >
                <IconBell className="h-5 w-5" />
                {session.unreadNotifications > 0 ? (
                  <span className="absolute top-0.5 right-0.5 min-w-4 rounded-full bg-accent px-1 text-[10px] leading-4 font-bold text-white">
                    {session.unreadNotifications > 9 ? "9+" : session.unreadNotifications}
                  </span>
                ) : null}
              </Link>

              <UserMenu
                displayName={session.profile?.display_name ?? "Kullanıcı"}
                avatarUrl={session.profile?.avatar_url ?? null}
                points={session.profile?.points ?? 0}
                isPremium={session.isPremium}
                hasChannel={Boolean(session.channel)}
              />
            </>
          ) : (
            <>
              <Link
                href="/giris"
                className="rounded-full px-3 py-1.5 text-sm font-semibold text-fg transition hover:bg-surface2"
              >
                Giriş yap
              </Link>
              <Link href="/kayit" className="tt-btn tt-btn-primary h-9 px-4">
                Kayıt ol
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
