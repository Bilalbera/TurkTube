import { notFound } from "next/navigation";
import { AnalyticsChart } from "@/components/AnalyticsChart";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { SubscribeButton } from "@/components/SubscribeButton";
import { VideoGrid } from "@/components/VideoGrid";
import { IconChart, IconStar, IconVideo } from "@/components/icons";
import { formatDate, formatNumber, formatSubscribers } from "@/lib/format";
import {
  getChannelAnalytics,
  getChannelByHandle,
  getChannelVideosWithChannel,
  getSession,
  isSubscribed,
} from "@/lib/queries";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface KanalSayfasiProps {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ gun?: string }>;
}

export async function generateMetadata({ params }: KanalSayfasiProps) {
  const { handle } = await params;
  const kanal = await getChannelByHandle(handle);
  return { title: kanal ? `${kanal.name} (@${kanal.handle})` : "Kanal bulunamadı" };
}

export default async function KanalSayfasi({ params, searchParams }: KanalSayfasiProps) {
  const [{ handle }, { gun }] = await Promise.all([params, searchParams]);
  const kanal = await getChannelByHandle(handle);

  if (!kanal) notFound();

  const session = await getSession();
  const sahibiMisin = session.channel?.id === kanal.id;

  const [videolar, abone] = await Promise.all([
    getChannelVideosWithChannel(kanal.id, 60, sahibiMisin),
    isSubscribed(kanal.id, session.userId),
  ]);

  const analizGun = gun === "90" ? 90 : 30;
  const analiz =
    sahibiMisin && session.isPremium
      ? await getChannelAnalytics(kanal.id, analizGun)
      : { data: [], error: null };

  const toplamIzlenme = videolar.reduce((acc, video) => acc + Number(video.view_count), 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Kanal kapağı */}
      <section className="flex flex-col gap-4">
        <div className="relative h-32 overflow-hidden rounded-card bg-brand-soft sm:h-44">
          {kanal.banner_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={kanal.banner_url}
              alt={`${kanal.name} kapak görseli`}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar
              name={kanal.name}
              src={kanal.avatar_url}
              size={80}
              premium={sahibiMisin && session.isPremium}
            />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-extrabold tracking-tight">{kanal.name}</h1>
              <p className="text-sm text-muted">
                @{kanal.handle} · {formatSubscribers(kanal.subscriber_count)} ·{" "}
                {formatNumber(videolar.length)} video · {formatNumber(toplamIzlenme)} izlenme
              </p>
              {kanal.description ? (
                <p className="mt-1 max-w-2xl text-sm text-muted">{kanal.description}</p>
              ) : null}
            </div>
          </div>

          <SubscribeButton
            channelId={kanal.id}
            abone={abone}
            aboneSayisi={kanal.subscriber_count}
            girisYapildi={Boolean(session.userId)}
            sahibiMisin={Boolean(sahibiMisin)}
          />
        </div>

        <p className="text-xs text-muted">Kanal kuruluşu: {formatDate(kanal.created_at)}</p>
      </section>

      {/* Premium kanal istatistikleri */}
      {sahibiMisin ? (
        session.isPremium ? (
          <AnalyticsChart
            baslik="Kanal istatistikleri (Premium)"
            birincilEtiket="izlenme"
            ikincilEtiket="yeni abone"
            veri={analiz.data.map((nokta) => ({
              gun: nokta.gun,
              birincil: Number(nokta.izlenme),
              ikincil: Number(nokta.yeni_abone),
            }))}
            gunSecenekleri={[
              { gun: 30, aktif: analizGun === 30, href: `/kanal/${kanal.handle}?gun=30` },
              { gun: 90, aktif: analizGun === 90, href: `/kanal/${kanal.handle}?gun=90` },
            ]}
          />
        ) : (
          <div className="tt-card flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="flex items-center gap-2 text-sm text-muted">
              <IconChart className="h-4 w-4" />
              Kanalının son 30/90 günlük izlenme ve abone analizlerini görmek için Premium gerekir.
            </p>
            <Link href="/premium" className="tt-btn tt-btn-primary h-9 px-3 text-xs">
              <IconStar className="h-3.5 w-3.5" /> Premium&apos;a geç
            </Link>
          </div>
        )
      ) : null}

      {/* Videolar */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold tracking-tight">Videolar</h2>
        {videolar.length === 0 ? (
          <EmptyState
            baslik="Bu kanalda henüz video yok"
            aciklama={
              sahibiMisin
                ? "İlk videonu yükleyerek kanalını canlandır."
                : "Kanal yeni kurulmuş görünüyor, daha sonra tekrar bakabilirsin."
            }
            ikon={<IconVideo className="h-10 w-10" />}
            aksiyon={sahibiMisin ? { etiket: "Video yükle", href: "/yukle" } : undefined}
          />
        ) : (
          <VideoGrid videos={videolar} hideChannel dense />
        )}
      </section>
    </div>
  );
}
