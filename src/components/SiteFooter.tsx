import Link from "next/link";
import { IconLogo } from "@/components/icons";

export function SiteFooter() {
  const yil = new Date().getFullYear();

  return (
    <footer className="mt-14 border-t border-line bg-surface">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <IconLogo className="h-6 w-6 text-brand" />
            <span>TürkTube</span>
          </Link>
          <p className="max-w-sm text-xs text-muted">
            Tamamen Türkçe, modern ve özgün video platformu. TürkTube Puanı kazan,
            Premium&apos;un ayrıcalıklarını keşfet.
          </p>
        </div>

        <nav className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm sm:grid-cols-3">
          <Link href="/kesfet" className="text-muted hover:text-fg">Keşfet</Link>
          <Link href="/premium" className="text-muted hover:text-fg">Premium</Link>
          <Link href="/puanlar" className="text-muted hover:text-fg">Puanlar</Link>
          <Link href="/oynatma-listeleri" className="text-muted hover:text-fg">Oynatma listeleri</Link>
          <Link href="/gecmis" className="text-muted hover:text-fg">İzleme geçmişi</Link>
          <Link href="/abonelikler" className="text-muted hover:text-fg">Abonelikler</Link>
        </nav>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-muted sm:flex-row sm:px-6">
          <p>© {yil} TürkTube — Tüm hakları saklıdır.</p>
          <p className="font-semibold tracking-wide text-fg">
            Made By Bilal Efendi
          </p>
        </div>
      </div>
    </footer>
  );
}
