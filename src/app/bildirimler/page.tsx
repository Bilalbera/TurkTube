import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import {
  IconBell,
  IconCheck,
  IconStar,
  IconTrash,
  IconUser,
  IconVideo,
} from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import { deleteNotificationAction, markAllNotificationsReadAction } from "@/lib/actions";
import { timeAgo } from "@/lib/format";
import { getSession } from "@/lib/queries";
import type { Notification } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bildirimler" };

const IKONLAR: Record<string, React.ReactNode> = {
  yeni_video: <IconVideo className="h-4.5 w-4.5" />,
  yeni_yorum: <IconBell className="h-4.5 w-4.5" />,
  yeni_abone: <IconUser className="h-4.5 w-4.5" />,
  puan: <IconStar className="h-4.5 w-4.5" />,
  premium: <IconStar className="h-4.5 w-4.5" />,
  premium_bitti: <IconStar className="h-4.5 w-4.5" />,
};

export default async function BildirimlerSayfasi() {
  const session = await getSession();
  if (!session.userId) redirect("/giris");

  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, user_id, type, title, body, link, is_read, created_at")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false })
    .limit(100);

  const bildirimler = (data as Notification[]) ?? [];
  const okunmamis = bildirimler.filter((bildirim) => !bildirim.is_read).length;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Bildirimler</h1>
          <p className="text-sm text-muted">
            {okunmamis > 0 ? `${okunmamis} okunmamış bildirim` : "Tüm bildirimler okundu"}
          </p>
        </div>

        {okunmamis > 0 ? (
          <form action={markAllNotificationsReadAction}>
            <button type="submit" className="tt-btn tt-btn-soft h-9 px-4 text-xs">
              <IconCheck className="h-4 w-4" /> Tümünü okundu işaretle
            </button>
          </form>
        ) : null}
      </header>

      {bildirimler.length === 0 ? (
        <EmptyState
          baslik="Henüz bildirimin yok"
          aciklama="Abone olduğun kanallar video yüklediğinde, yorum aldığında veya puan kazandığında burada göreceksin."
          ikon={<IconBell className="h-10 w-10" />}
          aksiyon={{ etiket: "Keşfet", href: "/kesfet" }}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {bildirimler.map((bildirim) => (
            <li
              key={bildirim.id}
              className={`tt-card flex items-start gap-3 p-4 ${
                bildirim.is_read ? "" : "border-brand"
              }`}
            >
              <span
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  bildirim.is_read ? "bg-surface2 text-muted" : "bg-brand-soft text-brand-strong"
                }`}
              >
                {IKONLAR[bildirim.type] ?? <IconBell className="h-4.5 w-4.5" />}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{bildirim.title}</span>
                  {!bildirim.is_read ? (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">
                      YENİ
                    </span>
                  ) : null}
                  <span className="text-xs text-muted">{timeAgo(bildirim.created_at)}</span>
                </div>

                {bildirim.body ? (
                  <p className="mt-1 text-sm break-words text-muted">{bildirim.body}</p>
                ) : null}

                {bildirim.link ? (
                  <Link
                    href={bildirim.link}
                    className="mt-1 inline-block text-xs font-semibold text-brand"
                  >
                    Görüntüle →
                  </Link>
                ) : null}
              </div>

              <form action={deleteNotificationAction}>
                <input type="hidden" name="notification_id" value={bildirim.id} />
                <button
                  type="submit"
                  className="rounded-full p-2 text-muted hover:bg-surface2 hover:text-accent"
                  title="Bildirimi sil"
                >
                  <IconTrash className="h-4 w-4" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
