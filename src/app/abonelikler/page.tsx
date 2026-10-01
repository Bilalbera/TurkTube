import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { IconChart } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import { formatSubscribers, timeAgo } from "@/lib/format";
import { getSession } from "@/lib/queries";
import type { Channel } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Aboneliklerim" };

interface AbonelikSatiri {
  channel_id: string;
  created_at: string;
  channels: Channel | null;
}

export default async function AboneliklerSayfasi() {
  const session = await getSession();
  if (!session.userId) redirect("/giris");

  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select(
      "channel_id, created_at, channels(id, owner_id, name, handle, description, avatar_url, banner_url, subscriber_count, created_at, updated_at)",
    )
    .eq("subscriber_id", session.userId)
    .order("created_at", { ascending: false });

  const abonelikler = (data as unknown as AbonelikSatiri[]) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Aboneliklerim</h1>
        <p className="text-sm text-muted">
          {abonelikler.length} kanala abonesin. Yeni videolar yayınlandığında bildirim alırsın.
        </p>
      </header>

      {abonelikler.length === 0 ? (
        <EmptyState
          baslik="Henüz hiçbir kanala abone değilsin"
          aciklama="Beğendiğin kanalları bulup abone ol, yeni videolarından haberdar ol."
          ikon={<IconChart className="h-10 w-10" />}
          aksiyon={{ etiket: "Keşfet", href: "/kesfet" }}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {abonelikler.map((abonelik) => {
            const kanal = abonelik.channels;
            if (!kanal) return null;

            return (
              <li key={abonelik.channel_id}>
                <Link
                  href={`/kanal/${kanal.handle}`}
                  className="tt-card flex items-center gap-3 p-4 transition hover:border-brand"
                >
                  <Avatar name={kanal.name} src={kanal.avatar_url} size={52} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{kanal.name}</p>
                    <p className="truncate text-xs text-muted">
                      @{kanal.handle} · {formatSubscribers(kanal.subscriber_count)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      Abone olundu: {timeAgo(abonelik.created_at)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
