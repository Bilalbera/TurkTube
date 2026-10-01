"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import {
  IconChart,
  IconClock,
  IconList,
  IconLogout,
  IconSettings,
  IconSpark,
  IconStar,
  IconUser,
} from "@/components/icons";
import { signOutAction } from "@/lib/actions";

interface UserMenuProps {
  displayName: string;
  avatarUrl: string | null;
  points: number;
  isPremium: boolean;
  hasChannel: boolean;
}

export function UserMenu({
  displayName,
  avatarUrl,
  points,
  isPremium,
  hasChannel,
}: UserMenuProps) {
  const [acik, setAcik] = useState(false);
  const kapsayici = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function disariTikla(event: MouseEvent) {
      if (kapsayici.current && !kapsayici.current.contains(event.target as Node)) {
        setAcik(false);
      }
    }
    document.addEventListener("mousedown", disariTikla);
    return () => document.removeEventListener("mousedown", disariTikla);
  }, []);

  const menuler = [
    { href: "/profil", etiket: "Profilim", ikon: <IconUser className="h-4.5 w-4.5" /> },
    { href: "/puanlar", etiket: `TürkTube Puanı · ${points}`, ikon: <IconSpark className="h-4.5 w-4.5" /> },
    { href: "/premium", etiket: "TürkTube Premium", ikon: <IconStar className="h-4.5 w-4.5" /> },
    { href: "/gecmis", etiket: "İzleme geçmişi", ikon: <IconClock className="h-4.5 w-4.5" /> },
    { href: "/oynatma-listeleri", etiket: "Oynatma listelerim", ikon: <IconList className="h-4.5 w-4.5" /> },
    { href: "/abonelikler", etiket: "Aboneliklerim", ikon: <IconChart className="h-4.5 w-4.5" /> },
    { href: "/profil/ayarlar", etiket: "Ayarlar", ikon: <IconSettings className="h-4.5 w-4.5" /> },
  ];

  return (
    <div ref={kapsayici} className="relative">
      <button
        type="button"
        onClick={() => setAcik((prev) => !prev)}
        className="flex items-center gap-2 rounded-full p-0.5 transition hover:opacity-90"
        aria-haspopup="menu"
        aria-expanded={acik}
        aria-label="Hesap menüsü"
      >
        <Avatar name={displayName} src={avatarUrl} size={34} premium={isPremium} />
      </button>

      {acik ? (
        <div
          role="menu"
          className="tt-card absolute right-0 z-50 mt-2 w-64 overflow-hidden p-2 shadow-lg"
        >
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar name={displayName} src={avatarUrl} size={40} premium={isPremium} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p className="text-xs text-muted">
                {isPremium ? "TürkTube Premium" : "Standart üyelik"}
              </p>
            </div>
          </div>

          <div className="my-1 h-px bg-line" />

          {!hasChannel ? (
            <Link
              href="/profil/ayarlar"
              onClick={() => setAcik(false)}
              className="mb-1 block rounded-lg bg-brand-soft px-3 py-2 text-xs font-semibold text-brand-strong"
            >
              Kanal oluştur ve video yüklemeye başla →
            </Link>
          ) : null}

          <ul className="flex flex-col">
            {menuler.map((menu) => (
              <li key={menu.href}>
                <Link
                  href={menu.href}
                  onClick={() => setAcik(false)}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-surface2"
                >
                  <span className="text-muted">{menu.ikon}</span>
                  {menu.etiket}
                </Link>
              </li>
            ))}
          </ul>

          <div className="my-1 h-px bg-line" />

          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-accent hover:bg-surface2"
            >
              <IconLogout className="h-4.5 w-4.5" />
              Çıkış yap
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
