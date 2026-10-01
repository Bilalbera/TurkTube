import Link from "next/link";
import { redirect } from "next/navigation";
import { ChannelForm, ProfileForm } from "@/components/ProfileForm";
import { IconStar } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { getSession } from "@/lib/queries";
import type { PremiumPurchase } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ayarlar" };

export default async function AyarlarSayfasi() {
  const session = await getSession();
  if (!session.userId || !session.profile) redirect("/giris");

  const supabase = await createClient();
  const { data: alimlar } = await supabase
    .from("premium_purchases")
    .select("id, user_id, points_spent, days, starts_at, ends_at, created_at")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false })
    .limit(5);

  const alimGecmisi = (alimlar as PremiumPurchase[]) ?? [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight">Ayarlar</h1>
        <p className="text-sm text-muted">
          Profilini ve kanalını buradan yönetebilirsin. Puan ve Premium bilgileri yalnızca
          veritabanı tarafından değiştirilebilir.
        </p>
      </header>

      {/* Premium durumu */}
      <section className="tt-card flex flex-col gap-3 p-5">
        <h2 className="text-base font-bold">Premium durumu</h2>
        <div className="flex flex-wrap items-center gap-2">
          {session.isPremium ? (
            <>
              <span className="tt-premium-badge">
                <IconStar className="h-3 w-3" /> Aktif
              </span>
              <span className="text-sm text-muted">
                Bitiş tarihi: {session.profile.premium_until ? formatDate(session.profile.premium_until) : "-"}
              </span>
            </>
          ) : (
            <>
              <span className="tt-chip">Pasif</span>
              <span className="text-sm text-muted">
                Premium aktif değil. 100 TürkTube Puanı ile 30 gün boyunca aktifleştirebilirsin.
              </span>
            </>
          )}
          <Link href="/premium" className="tt-btn tt-btn-soft h-8 px-3 text-xs">
            Premium sayfası
          </Link>
        </div>

        {alimGecmisi.length > 0 ? (
          <div className="mt-1 flex flex-col gap-1">
            <p className="text-xs font-semibold text-muted">Son Premium satın alımların</p>
            <ul className="flex flex-col gap-1 text-xs text-muted">
              {alimGecmisi.map((alim) => (
                <li key={alim.id} className="flex flex-wrap justify-between gap-2">
                  <span>{formatDate(alim.created_at)}</span>
                  <span>
                    {alim.points_spent} puan · {alim.days} gün
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <ProfileForm profil={session.profile} userId={session.userId} />
      <ChannelForm kanal={session.channel} userId={session.userId} />
    </div>
  );
}
