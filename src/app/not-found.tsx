import Link from "next/link";
import { IconCompass, IconHome } from "@/components/icons";

export default function BulunamadiSayfasi() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <p className="text-5xl font-extrabold tracking-tight text-brand">404</p>
      <h1 className="text-xl font-bold">Aradığın sayfa bulunamadı</h1>
      <p className="max-w-md text-sm text-muted">
        Bağlantı kaldırılmış veya hiç var olmamış olabilir. Ana sayfaya dönüp tekrar deneyebilirsin.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Link href="/" className="tt-btn tt-btn-primary">
          <IconHome className="h-4 w-4" /> Ana sayfa
        </Link>
        <Link href="/kesfet" className="tt-btn tt-btn-soft">
          <IconCompass className="h-4 w-4" /> Keşfet
        </Link>
      </div>
    </div>
  );
}
