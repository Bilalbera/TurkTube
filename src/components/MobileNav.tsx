"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconCompass, IconHome, IconUpload, IconUser } from "@/components/icons";

interface MobileNavProps {
  girisYapildi: boolean;
}

/** Mobil ve tablet için alt gezinme çubuğu. */
export function MobileNav({ girisYapildi }: MobileNavProps) {
  const pathname = usePathname();

  const ogeler = [
    { href: "/", etiket: "Ana sayfa", ikon: <IconHome className="h-5 w-5" /> },
    { href: "/kesfet", etiket: "Keşfet", ikon: <IconCompass className="h-5 w-5" /> },
    { href: "/yukle", etiket: "Yükle", ikon: <IconUpload className="h-5 w-5" /> },
    {
      href: girisYapildi ? "/profil" : "/giris",
      etiket: girisYapildi ? "Profil" : "Giriş",
      ikon: <IconUser className="h-5 w-5" />,
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur lg:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2">
        {ogeler.map((oge) => {
          const aktif = oge.href === "/" ? pathname === "/" : pathname.startsWith(oge.href);
          return (
            <li key={oge.href} className="flex-1">
              <Link
                href={oge.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                  aktif ? "text-brand" : "text-muted"
                }`}
              >
                {oge.ikon}
                {oge.etiket}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
