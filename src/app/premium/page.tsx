import Link from "next/link";
import { PremiumPurchaseButton } from "@/components/PremiumPurchaseButton";
import { IconCheck, IconSpark, IconStar } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import {
  POINTS_PER_VIEW_BLOCK,
  PREMIUM_COST,
  PREMIUM_DURATION_DAYS,
  PREMIUM_FEATURES,
  VIEW_BLOCK_SIZE,
} from "@/lib/constants";
import { daysUntil, formatDate, formatNumber } from "@/lib/format";
import { getSession } from "@/lib/queries";
import type { PremiumPurchase } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "TürkTube Premium" };

export default async function PremiumSayfasi() {
  const session = await getSession();

  let alimlar: PremiumPurchase[] = [];
  if (session.userId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("premium_purchases")
      .select("id, user_id, points_spent, days, starts_at, ends_at, created_at")
      .eq("user_id", session.userId)
      .order("created_at", { ascending: false });
    alimlar = (data as PremiumPurchase[]) ?? [];
  }

  const puan = session.profile?.points ?? 0;
  const kalanGun = daysUntil(session.profile?.premium_until ?? null);

  return (
    <div className="flex flex-col gap-8">
      <section className={`tt-card flex flex-col gap-5 p-6 ${session.isPremium ? "border-premium" : ""}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-premium">
              <IconStar className="h-4 w-4" /> TürkTube Premium
            </p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
              {session.isPremium ? "Premium üyeliğin aktif" : "Premium'a geç, ayrıcalıkları keşfet"}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted">
              Premium üyelik <strong className="text-fg">{PREMIUM_COST} TürkTube Puanı</strong>{" "}
              karşılığında <strong className="text-fg">{PREMIUM_DURATION_DAYS} gün</strong> boyunca
              geçerlidir. Süre bittiğinde Premium özellikleri otomatik olarak kapanır.
            </p>
          </div>

          <div className="flex flex-col gap-1 rounded-xl bg-surface2 px-4 py-3">
            <span className="text-xs text-muted">Mevcut puanın</span>
            <span className="text-2xl font-extrabold text-brand">{formatNumber(puan)}</span>
          </div>
        </div>

        {session.isPremium && session.profile?.premium_until ? (
          <div className="flex flex-wrap gap-2">
            <span className="tt-premium-badge">
              <IconCheck className="h-3 w-3" /> Aktif
            </span>
            <span className="tt-chip">Bitiş: {formatDate(session.profile.premium_until)}</span>
            <span className="tt-chip">{kalanGun} gün kaldı</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <span className="tt-chip">Durum: Pasif</span>
            <span className="tt-chip">Süre: {PREMIUM_DURATION_DAYS} gün</span>
            <span className="tt-chip">Ücret: {PREMIUM_COST} puan</span>
          </div>
        )}

        <PremiumPurchaseButton puan={puan} girisYapildi={Boolean(session.userId)} />

        {session.isPremium ? (
          <p className="text-xs text-muted">
            Yeni bir satın alma yaparsan süre mevcut bitiş tarihinin üzerine eklenir.
          </p>
        ) : null}
      </section>

      <section className="tt-card flex flex-col gap-3 p-5">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <IconSpark className="h-4.5 w-4.5 text-brand" /> Premium nasıl kazanılır?
        </h2>
        <ul className="flex flex-col gap-2 text-sm text-muted">
          <li>
            · Videon {formatNumber(VIEW_BLOCK_SIZE)} gerçek izlenmeye ulaştığında{" "}
            <strong className="text-fg">+{POINTS_PER_VIEW_BLOCK} puan</strong> kazanırsın.
          </li>
          <li>
            · Aynı video sonraki her {formatNumber(VIEW_BLOCK_SIZE)} izlenmede tekrar +10 puan
            kazandırır.
          </li>
          <li>· 1.000.000 izlenmeye ulaşan bir video toplam 100 puan kazandırır.</li>
          <li>· Sahte ve spam izlenmeler puan sistemine dahil edilmez.</li>
        </ul>
        <Link href="/puanlar" className="tt-btn tt-btn-soft h-9 self-start px-4 text-xs">
          Puan geçmişini gör
        </Link>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold tracking-tight">Premium özellikleri</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PREMIUM_FEATURES.map((ozellik) => (
            <div key={ozellik.baslik} className="tt-card flex gap-3 p-4">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-premium-soft text-premium">
                <IconCheck className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold">{ozellik.baslik}</span>
                <span className="block text-xs text-muted">{ozellik.aciklama}</span>
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted">
          Not: Premium paketi sınırsız depolama içermez. Video yüklemelerinde tüm kullanıcılar için
          aynı boyut ve biçim sınırları geçerlidir.
        </p>
      </section>

      {session.userId ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold tracking-tight">Premium satın alım geçmişin</h2>

          {alimlar.length === 0 ? (
            <p className="tt-card p-5 text-sm text-muted">Henüz Premium satın alımın yok.</p>
          ) : (
            <div className="tt-card overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-surface2 text-xs text-muted">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Satın alma</th>
                    <th className="px-4 py-2 font-semibold">Başlangıç</th>
                    <th className="px-4 py-2 font-semibold">Bitiş</th>
                    <th className="px-4 py-2 text-right font-semibold">Puan</th>
                  </tr>
                </thead>
                <tbody>
                  {alimlar.map((alim) => (
                    <tr key={alim.id} className="border-t border-line">
                      <td className="px-4 py-2 text-xs text-muted">{formatDate(alim.created_at)}</td>
                      <td className="px-4 py-2 text-xs">{formatDate(alim.starts_at)}</td>
                      <td className="px-4 py-2 text-xs">{formatDate(alim.ends_at)}</td>
                      <td className="px-4 py-2 text-right font-bold text-accent">
                        -{formatNumber(alim.points_spent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
