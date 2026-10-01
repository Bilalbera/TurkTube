import Link from "next/link";
import { notFound } from "next/navigation";
import { AnalyticsChart } from "@/components/AnalyticsChart";
import { Avatar } from "@/components/Avatar";
import { CommentsSection } from "@/components/CommentsSection";
import { ReactionButtons } from "@/components/ReactionButtons";
import { SaveToPlaylistButton } from "@/components/SaveToPlaylistButton";
import { ShareButton } from "@/components/ShareButton";
import { SubscribeButton } from "@/components/SubscribeButton";
import { VideoCard } from "@/components/VideoCard";
import { VideoPlayer } from "@/components/VideoPlayer";
import { IconStar } from "@/components/icons";
import { formatDate, formatViews } from "@/lib/format";
import {
  getLikedCommentIds,
  getSession,
  getVideoAnalytics,
  getVideoById,
  getVideoComments,
  getUserReaction,
  isSubscribed,
  listUserPlaylists,
  listVideos,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

interface IzleSayfasiProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ gun?: string }>;
}

async function videoGetir(id: string) {
  // Geçersiz UUID biçimlerinde sorgu hatası yerine 404 döndür.
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return getVideoById(id);
}

export async function generateMetadata({ params }: IzleSayfasiProps) {
  const { id } = await params;
  const video = await videoGetir(id);
  return { title: video?.title ?? "Video bulunamadı" };
}

export default async function IzleSayfasi({ params, searchParams }: IzleSayfasiProps) {
  const [{ id }, { gun }] = await Promise.all([params, searchParams]);
  const video = await videoGetir(id);

  if (!video) notFound();

  const session = await getSession();
  const kanal = video.channels;
  const sahibiMisin = Boolean(session.channel && session.channel.id === video.channel_id);

  const [yorumlar, tepki, abone, begenilenler, benzerVideolar, listeler] = await Promise.all([
    getVideoComments(video.id),
    getUserReaction(video.id, session.userId),
    kanal ? isSubscribed(kanal.id, session.userId) : Promise.resolve(false),
    getLikedCommentIds(video.id, session.userId),
    listVideos({ limit: 12, orderBy: "view_count", excludeIds: [video.id] }),
    session.userId ? listUserPlaylists(session.userId) : Promise.resolve([]),
  ]);

  const analizGun = gun === "90" ? 90 : 30;
  const analiz =
    sahibiMisin && session.isPremium
      ? await getVideoAnalytics(video.id, analizGun)
      : { data: [], error: null };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      {/* Ana içerik */}
      <div className="flex min-w-0 flex-col gap-5">
        {sahibiMisin && video.visibility === "private" ? (
          <p className="tt-card border-premium p-3 text-xs text-premium">
            Bu video <strong>özel</strong> olarak işaretlendi. Yalnızca sen görebilirsin.
          </p>
        ) : null}

        <VideoPlayer
          videoId={video.id}
          videoUrl={video.video_url}
          thumbnailUrl={video.thumbnail_url}
          isPremium={session.isPremium}
        />

        <h1 className="text-lg leading-snug font-bold sm:text-xl">{video.title}</h1>

        {/* Kanal satırı + aksiyonlar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {kanal ? (
              <>
                <Link href={`/kanal/${kanal.handle}`}>
                  <Avatar name={kanal.name} src={kanal.avatar_url} size={44} />
                </Link>
                <div>
                  <Link
                    href={`/kanal/${kanal.handle}`}
                    className="text-sm font-semibold hover:text-brand"
                  >
                    {kanal.name}
                  </Link>
                  <p className="text-xs text-muted">@{kanal.handle}</p>
                </div>
                <SubscribeButton
                  channelId={kanal.id}
                  abone={abone}
                  aboneSayisi={kanal.subscriber_count}
                  girisYapildi={Boolean(session.userId)}
                  sahibiMisin={sahibiMisin}
                />
              </>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ReactionButtons
              videoId={video.id}
              begeni={video.like_count}
              begenmeme={video.dislike_count}
              tepki={tepki}
              girisYapildi={Boolean(session.userId)}
            />
            <ShareButton videoId={video.id} baslik={video.title} />
            <SaveToPlaylistButton
              videoId={video.id}
              listeler={listeler}
              girisYapildi={Boolean(session.userId)}
              isPremium={session.isPremium}
            />
          </div>
        </div>

        {/* Açıklama */}
        <div className="tt-card flex flex-col gap-2 p-4">
          <p className="text-sm font-semibold">
            {formatViews(video.view_count)} · {formatDate(video.created_at)}
          </p>
          {video.description ? (
            <p className="text-sm break-words whitespace-pre-wrap text-muted">{video.description}</p>
          ) : (
            <p className="text-sm text-muted">Bu videoda açıklama yok.</p>
          )}
        </div>

        {/* Premium video istatistikleri */}
        {sahibiMisin ? (
          session.isPremium ? (
            <AnalyticsChart
              baslik="Video istatistikleri (Premium)"
              birincilEtiket="izlenme"
              ikincilEtiket="benzersiz izleyici"
              veri={analiz.data.map((nokta) => ({
                gun: nokta.gun,
                birincil: Number(nokta.izlenme),
                ikincil: Number(nokta.benzersiz_izleyici),
              }))}
              gunSecenekleri={[
                { gun: 30, aktif: analizGun === 30, href: `/izle/${video.id}?gun=30` },
                { gun: 90, aktif: analizGun === 90, href: `/izle/${video.id}?gun=90` },
              ]}
            />
          ) : (
            <div className="tt-card flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="text-sm text-muted">
                Bu videonun gelişmiş istatistiklerini görmek için Premium gerekir.
              </p>
              <Link href="/premium" className="tt-btn tt-btn-primary h-9 px-3 text-xs">
                <IconStar className="h-3.5 w-3.5" /> Premium&apos;a geç
              </Link>
            </div>
          )
        ) : null}

        <CommentsSection
          videoId={video.id}
          yorumlar={yorumlar}
          userId={session.userId}
          begenilenler={begenilenler}
          sahibiMisin={sahibiMisin}
        />
      </div>

      {/* Benzer videolar */}
      <aside className="flex flex-col gap-4">
        <h2 className="text-sm font-bold tracking-wide text-muted uppercase">Benzer videolar</h2>
        {benzerVideolar.length === 0 ? (
          <p className="text-sm text-muted">Şimdilik başka video yok.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {benzerVideolar.map((benzer) => (
              <VideoCard key={benzer.id} video={benzer} />
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
