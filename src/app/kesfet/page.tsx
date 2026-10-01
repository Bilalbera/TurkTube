import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { VideoGrid } from "@/components/VideoGrid";
import { IconCompass } from "@/components/icons";
import { listVideos } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { formatSubscribers } from "@/lib/format";
import type { Channel } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Keşfet" };

export default async function KesfetSayfasi() {
  const [trendVideolar, kanallar] = await Promise.all([
    listVideos({ limit: 32, orderBy: "view_count" }),
    (async () => {
      const supabase = await createClient();
      const { data } = await supabase
        .from("channels")
        .select("*")
        .order("subscriber_count", { ascending: false })
        .limit(10);
      return (data as Channel[]) ?? [];
    })(),
  ]);

  const populerKanallar = kanallar;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight">Keşfet</h1>
        <p className="text-sm text-muted">
          TürkTube&apos;da en çok izlenen videolar ve öne çıkan kanallar.
        </p>
      </header>

      {populerKanallar.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-bold tracking-tight">Öne çıkan kanallar</h2>
          <div className="tt-scroll-x -mx-1 flex gap-3 px-1 pb-1">
            {populerKanallar.map((kanal) => (
              <Link
                key={kanal.id}
                href={`/kanal/${kanal.handle}`}
                className="tt-card flex w-40 shrink-0 flex-col items-center gap-2 p-4 text-center transition hover:border-brand"
              >
                <Avatar name={kanal.name} src={kanal.avatar_url} size={56} />
                <span className="line-clamp-1 text-sm font-semibold">{kanal.name}</span>
                <span className="text-xs text-muted">{formatSubscribers(kanal.subscriber_count)}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold tracking-tight">Trend videolar</h2>
        {trendVideolar.length === 0 ? (
          <EmptyState
            baslik="Keşfedilecek video yok"
            aciklama="Platformda henüz herkese açık video bulunmuyor."
            ikon={<IconCompass className="h-10 w-10" />}
            aksiyon={{ etiket: "Video yükle", href: "/yukle" }}
          />
        ) : (
          <VideoGrid videos={trendVideolar} />
        )}
      </section>
    </div>
  );
}
