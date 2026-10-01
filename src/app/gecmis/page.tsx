import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { IconClock, IconStar, IconTrash } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import { clearWatchHistoryAction } from "@/lib/actions";
import { formatDuration, formatViews, timeAgo } from "@/lib/format";
import { getSession } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "İzleme geçmişi" };

interface GecmisSatiri {
  video_id: string;
  watched_at: string;
  position_seconds: number;
  videos: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    duration_seconds: number;
    view_count: number;
    channels: { id: string; name: string; handle: string } | null;
  } | null;
}

interface GecmisSayfasiProps {
  searchParams: Promise<{ kanal?: string; baslangic?: string; bitis?: string }>;
}

export default async function GecmisSayfasi({ searchParams }: GecmisSayfasiProps) {
  const session = await getSession();
  if (!session.userId) redirect("/giris");

  const filtreler = await searchParams;
  const filtreAktif = Boolean(filtreler.kanal || filtreler.baslangic || filtreler.bitis);

  const supabase = await createClient();
  const { data } = await supabase
    .from("watch_history")
    .select(
      "video_id, watched_at, position_seconds, videos(id, title, thumbnail_url, duration_seconds, view_count, channels(id, name, handle))",
    )
    .eq("user_id", session.userId)
    .order("watched_at", { ascending: false })
    .limit(200);

  const tumKayitlar = (data as unknown as GecmisSatiri[]) ?? [];

  // Gelişmiş filtreleme Premium özelliğidir. Filtreler yalnızca kullanıcının
  // kendi geçmiş verisi üzerinde çalıştığı için ek bir güvenlik riski yoktur;
  // yine de arayüzde Premium kontrolü uygulanır.
  const kayitlar =
    session.isPremium && filtreAktif
      ? tumKayitlar.filter((kayit) => {
          if (filtreler.kanal && kayit.videos?.channels?.handle !== filtreler.kanal) return false;
          if (filtreler.baslangic && new Date(kayit.watched_at) < new Date(filtreler.baslangic)) {
            return false;
          }
          if (filtreler.bitis) {
            const bitis = new Date(filtreler.bitis);
            bitis.setHours(23, 59, 59, 999);
            if (new Date(kayit.watched_at) > bitis) return false;
          }
          return true;
        })
      : tumKayitlar;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">İzleme geçmişi</h1>
          <p className="text-sm text-muted">
            {kayitlar.length} kayıt{filtreAktif ? " (filtrelenmiş)" : ""}
          </p>
        </div>

        {tumKayitlar.length > 0 ? (
          <form action={clearWatchHistoryAction}>
            <button type="submit" className="tt-btn tt-btn-soft h-9 px-4 text-xs text-accent">
              <IconTrash className="h-4 w-4" /> Geçmişi temizle
            </button>
          </form>
        ) : null}
      </header>

      <section className="tt-card flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold">Gelişmiş filtreleme</h2>
          {!session.isPremium ? (
            <Link href="/premium" className="tt-premium-badge">
              <IconStar className="h-3 w-3" /> Premium özelliği
            </Link>
          ) : null}
        </div>

        {session.isPremium ? (
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div>
              <label className="tt-label" htmlFor="kanal">
                Kanal adresi
              </label>
              <input
                id="kanal"
                name="kanal"
                defaultValue={filtreler.kanal ?? ""}
                placeholder="örn: bilal_efendi"
                className="tt-input"
              />
            </div>
            <div>
              <label className="tt-label" htmlFor="baslangic">
                Başlangıç
              </label>
              <input
                id="baslangic"
                name="baslangic"
                type="date"
                defaultValue={filtreler.baslangic ?? ""}
                className="tt-input"
              />
            </div>
            <div>
              <label className="tt-label" htmlFor="bitis">
                Bitiş
              </label>
              <input
                id="bitis"
                name="bitis"
                type="date"
                defaultValue={filtreler.bitis ?? ""}
                className="tt-input"
              />
            </div>
            <button type="submit" className="tt-btn tt-btn-primary h-10 px-4">
              Filtrele
            </button>
            {filtreAktif ? (
              <Link href="/gecmis" className="tt-btn tt-btn-outline h-10 px-4">
                Temizle
              </Link>
            ) : null}
          </form>
        ) : (
          <p className="text-xs text-muted">
            İzleme geçmişini tarih aralığı ve kanala göre filtrelemek Premium özelliğidir.
          </p>
        )}
      </section>

      {kayitlar.length === 0 ? (
        <EmptyState
          baslik={filtreAktif ? "Bu filtreyle kayıt bulunamadı" : "İzleme geçmişin boş"}
          aciklama="İzlediğin videolar burada listelenir; kaldığın yerden devam edebilirsin."
          ikon={<IconClock className="h-10 w-10" />}
          aksiyon={{ etiket: "Keşfet", href: "/kesfet" }}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {kayitlar.map((kayit) => {
            if (!kayit.videos) return null;
            const video = kayit.videos;

            return (
              <li
                key={`${kayit.video_id}-${kayit.watched_at}`}
                className="tt-card flex items-center gap-3 p-3"
              >
                <Link
                  href={`/izle/${video.id}`}
                  className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-surface2"
                >
                  {video.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  {video.duration_seconds > 0 ? (
                    <span className="absolute right-1 bottom-1 rounded bg-black/80 px-1 text-[10px] font-semibold text-white">
                      {formatDuration(video.duration_seconds)}
                    </span>
                  ) : null}
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/izle/${video.id}`}
                    className="line-clamp-1 text-sm font-semibold hover:text-brand"
                  >
                    {video.title}
                  </Link>
                  {video.channels ? (
                    <Link
                      href={`/kanal/${video.channels.handle}`}
                      className="mt-0.5 block truncate text-xs text-muted hover:text-fg"
                    >
                      {video.channels.name}
                    </Link>
                  ) : null}
                  <p className="mt-0.5 text-xs text-muted">
                    {timeAgo(kayit.watched_at)} · {formatViews(video.view_count)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
