"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconChart,
  IconClock,
  IconCompass,
  IconHome,
  IconList,
  IconSpark,
  IconStar,
  IconUser,
  IconVideo,
} from "@/components/icons";

interface SidebarProps {
  channelHandle: string | null;
  isPremium: boolean;
  girisYapildi: boolean;
}

interface Oge {
  href: string;
  etiket: string;
  ikon: React.ReactNode;
}

export function Sidebar({ channelHandle, isPremium, girisYapildi }: SidebarProps) {
  const pathname = usePathname();

  const anaMenu: Oge[] = [
    { href: "/", etiket: "Ana sayfa", ikon: <IconHome className="h-5 w-5" /> },
    { href: "/kesfet", etiket: "Keşfet", ikon: <IconCompass className="h-5 w-5" /> },
  ];

  const kisisel: Oge[] = girisYapildi
    ? [
        ...(channelHandle
          ? [{ href: `/kanal/${channelHandle}`, etiket: "Kanalım", ikon: <IconVideo className="h-5 w-5" /> }]
          : []),
        { href: "/abonelikler", etiket: "Aboneliklerim", ikon: <IconChart className="h-5 w-5" /> },
        { href: "/gecmis", etiket: "İzleme geçmişi", ikon: <IconClock className="h-5 w-5" /> },
        { href: "/oynatma-listeleri", etiket: "Oynatma listelerim", ikon: <IconList className="h-5 w-5" /> },
      ]
    : [];

  const hesap: Oge[] = girisYapildi
    ? [
        { href: "/puanlar", etiket: "TürkTube Puanı", ikon: <IconSpark className="h-5 w-5" /> },
        { href: "/premium", etiket: "Premium", ikon: <IconStar className="h-5 w-5" /> },
        { href: "/profil", etiket: "Profilim", ikon: <IconUser className="h-5 w-5" /> },
      ]
    : [];

  function Bolum({ baslik, ogeler }: { baslik?: string; ogeler: Oge[] }) {
    if (ogeler.length === 0) return null;
    return (
      <div className="flex flex-col gap-0.5">
        {baslik ? (
          <p className="px-3 pt-4 pb-1 text-xs font-bold tracking-wide text-muted uppercase">
            {baslik}
          </p>
        ) : null}
        {ogeler.map((oge) => {
          const aktif = oge.href === "/" ? pathname === "/" : pathname.startsWith(oge.href);
          return (
            <Link
              key={oge.href}
              href={oge.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                aktif ? "bg-brand-soft text-brand-strong" : "text-fg hover:bg-surface2"
              }`}
            >
              {oge.ikon}
              <span className="truncate">{oge.etiket}</span>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <aside className="sticky top-14 flex h-[calc(100vh-3.5rem)] w-60 shrink-0 flex-col gap-1 overflow-y-auto border-r border-line px-2 py-3">
      <Bolum ogeler={anaMenu} />
      <Bolum baslik="Kitaplığım" ogeler={kisisel} />
      <Bolum baslik="Hesap" ogeler={hesap} />

      {!girisYapildi ? (
        <div className="tt-card mt-4 flex flex-col gap-2 p-3">
          <p className="text-xs text-muted">
            Giriş yaparak beğen, yorum yap, abone ol ve TürkTube Puanı kazan.
          </p>
          <Link href="/kayit" className="tt-btn tt-btn-primary h-9">
            Ücretsiz kayıt ol
          </Link>
        </div>
      ) : null}

      {girisYapildi && !isPremium ? (
        <Link
          href="/premium"
          className="tt-card mt-4 flex flex-col gap-1 p-3 transition hover:border-premium"
        >
          <span className="flex items-center gap-1.5 text-sm font-bold text-premium">
            <IconStar className="h-4 w-4" /> TürkTube Premium
          </span>
          <span className="text-xs text-muted">
            Reklamsız izle, gelişmiş istatistikler ve özel temalar.
          </span>
        </Link>
      ) : null}
    </aside>
  );
}
