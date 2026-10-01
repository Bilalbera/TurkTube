import Link from "next/link";
import type { ReactNode } from "react";

interface EmptyStateProps {
  baslik: string;
  aciklama?: string;
  ikon?: ReactNode;
  aksiyon?: { etiket: string; href: string };
}

export function EmptyState({ baslik, aciklama, ikon, aksiyon }: EmptyStateProps) {
  return (
    <div className="tt-card flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {ikon ? <div className="text-brand">{ikon}</div> : null}
      <h3 className="text-base font-semibold">{baslik}</h3>
      {aciklama ? <p className="max-w-md text-sm text-muted">{aciklama}</p> : null}
      {aksiyon ? (
        <Link href={aksiyon.href} className="tt-btn tt-btn-primary mt-1">
          {aksiyon.etiket}
        </Link>
      ) : null}
    </div>
  );
}
