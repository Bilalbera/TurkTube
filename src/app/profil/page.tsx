import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { ShareButton } from "@/components/ShareButton";
import {
  IconChart,
  IconClock,
  IconList,
  IconSettings,
  IconSpark,
  IconStar,
  IconTrash,
  IconVideo,
} from "@/components/icons";
import { deleteVideoAction } from "@/lib/actions";
import { POINTS_PER_VIEW_BLOCK, VIDEO_VISIBILITY_LABELS } from "@/lib/constants";
import { daysUntil, formatDate, formatNumber, formatViews, timeAgo } from "@/lib/format";
import { getChannelVideos, getSession } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profilim" };

export default async function ProfilSayfasi() {
  const session = await getSession();
  if (!session.userId || !session.profile) redirect("/giris");

  const profil = session.profile;
  const kanal = session.channel;
  const videolar = kanal ? await getChannelVideos(kanal.id, 100, true) : [];

  const toplamIzlenme = videolar.reduce((acc, video) => acc + Number(video.view_count), 0);
  const kalanGun = daysUntil(profil.premium_until);

  const kisayollar = [
    {
      href: "/puanlar",
      etiket: "TürkTube Puanı",
      deger: `${formatNumber(profil.points)} puan`,
      ikon: <IconSpark className="h-5 w-5" />,
    },
    {
      href: "/premium",
      etiket: "Premium",
      deger: session.isPremium ? `${kalanGun} gün kaldı` : "Aktif değil",
      ikon: <IconStar className="h-5 w-5" />,
    },
    {
      href: "/gecmis",
      etiket: "İzleme geçmişi",
      deger: "Geçmişini yönet",
      ikon: <IconClock className="h-5 w-5" />,
    },
    {
      href: "/oynatma-listeleri",
      etiket: "Oynatma listeleri",
      deger: "Listelerini yönet",
      ikon: <IconList className="h-5 w-5" />,
    },
    {
      href: "/abonelikler",
      etiket: "Abonelikler",
      deger: "Abone olduğun kanallar",
      ikon: <IconChart className="h-5 w-5" />,
    },
    {
      href: "/profil/ayarlar",
      etiket: "Ayarlar",
      deger: "Profil ve kanal",
      ikon: <IconSettings className="h-5 w-5" />,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <section className="tt-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar
            name={profil.display_name}
            src={profil.avatar_url}
            size={88}
            premium={session.isPremium}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-extrabold tracking-tight">
                {profil.display_name}
              </h1>
              {session.isPremium ? (
                <span className="tt-premium-badge">
                  <IconStar className="h-3 w-3" /> Premium
                </span>
              ) : null}
            </div>

            <p className="mt-1 text-sm text-muted">
              {kanal ? `@${kanal.handle}` : "Kanal oluşturulmadı"} · Katılım{" "}
              {formatDate(profil.created_at)}
            </p>

            {profil.bio ? <p className="mt-2 max-w-xl text-sm">{profil.bio}</p> : null}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="tt-chip tt-chip-active">
                <IconSpark className="h-4 w-4" /> {formatNumber(profil.points)} TürkTube Puanı
              </span>
              {session.isPremium && profil.premium_until ? (
                <span className="tt-chip">
                  <IconStar className="h-4 w-4" /> Premium bitiş: {formatDate(profil.premium_until)}
                </span>
              ) : (
                <Link href="/premium" className="tt-chip">
                  <IconStar className="h-4 w-4" /> Premium aktif değil — 100 puanla aç
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          {kanal ? (
            <Link href={`/kanal/${kanal.handle}`} className="tt-btn tt-btn-outline">
              Kanalı görüntüle
            </Link>
          ) : (
            <Link href="/profil/ayarlar" className="tt-btn tt-btn-primary">
              Kanal oluştur
            </Link>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { etiket: "Toplam video", deger: formatNumber(videolar.length) },
          { etiket: "Toplam izlenme", deger: formatNumber(toplamIzlenme) },
          { etiket: "Abone", deger: formatNumber(kanal?.subscriber_count ?? 0) },
          { etiket: "TürkTube Puanı", deger: formatNumber(profil.points) },
        ].map((kart) => (
          <div key={kart.etiket} className="tt-card p-4">
            <p className="text-xl font-extrabold tracking-tight">{kart.deger}</p>
            <p className="text-xs text-muted">{kart.etiket}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {kisayollar.map((kisayol) => (
          <Link
            key={kisayol.href}
            href={kisayol.href}
            className="tt-card flex items-center gap-3 p-4 transition hover:border-brand"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand-strong">
              {kisayol.ikon}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{kisayol.etiket}</span>
              <span className="block truncate text-xs text-muted">{kisayol.deger}</span>
            </span>
          </Link>
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">Videolarım</h2>
          <Link href="/yukle" className="tt-btn tt-btn-primary h-9 px-4 text-xs">
            <IconVideo className="h-4 w-4" /> Yeni video
          </Link>
        </div>

        {!kanal ? (
          <EmptyState
            baslik="Kanalın yok"
            aciklama="Video yüklemek için önce bir kanal oluşturman gerekiyor."
            ikon={<IconVideo className="h-10 w-10" />}
            aksiyon={{ etiket: "Kanal oluştur", href: "/profil/ayarlar" }}
          />
        ) : videolar.length === 0 ? (
          <EmptyState
            baslik="Henüz video yüklemedin"
            aciklama="İlk videonu yükle ve TürkTube Puanı kazanmaya başla."
            ikon={<IconVideo className="h-10 w-10" />}
            aksiyon={{ etiket: "Video yükle", href: "/yukle" }}
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {videolar.map((video) => (
              <li key={video.id} className="tt-card flex items-center gap-3 p-3">
                <Link
                  href={`/izle/${video.id}`}
                  className="h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-surface2"
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
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/izle/${video.id}`}
                    className="line-clamp-1 text-sm font-semibold hover:text-brand"
                  >
                    {video.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatViews(video.view_count)} · {timeAgo(video.created_at)} ·{" "}
                    {VIDEO_VISIBILITY_LABELS[video.visibility]}
                  </p>
                  {video.awarded_blocks > 0 ? (
                    <p className="mt-0.5 text-xs font-semibold text-brand-strong">
                      Bu videodan {video.awarded_blocks * POINTS_PER_VIEW_BLOCK} TürkTube Puanı
                      kazandın
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <ShareButton videoId={video.id} baslik={video.title} />
                  <form action={deleteVideoAction}>
                    <input type="hidden" name="video_id" value={video.id} />
                    <button type="submit" className="tt-btn tt-btn-soft text-accent" title="Videoyu sil">
                      <IconTrash className="h-4 w-4" />
                      <span className="hidden sm:inline">Sil</span>
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
