import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { VideoGrid } from "@/components/VideoGrid";
import { IconCompass, IconVideo } from "@/components/icons";
import { formatCompact } from "@/lib/format";
import { getSession, listVideos } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AnaSayfa() {
  const [session, yeniVideolar, populerVideolar] = await Promise.all([
    getSession(),
    listVideos({ limit: 36, orderBy: "created_at" }),
    listVideos({ limit: 8, orderBy: "view_count" }),
  ]);

  const toplamIzlenme = populerVideolar.reduce((acc, video) => acc + Number(video.view_count), 0);

  return (
    <div className="flex flex-col gap-8">
      {/* Karşılama / özet */}
      <section className="tt-card overflow-hidden">
        <div className="relative flex flex-col gap-4 bg-gradient-to-br from-brand-soft to-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-widest text-brand-strong uppercase">
              TürkTube
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {session.profile
                ? `Tekrar hoş geldin, ${session.profile.display_name}!`
                : "Türkçe videoların yeni adresi"}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted">
              100.000 gerçek izlenmede <strong className="text-fg">+10 TürkTube Puanı</strong> kazan,
              puanlarınla <strong className="text-fg">TürkTube Premium</strong>&apos;a geç.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/kesfet" className="tt-btn tt-btn-soft">
              <IconCompass className="h-4.5 w-4.5" /> Keşfet
            </Link>
            <Link href="/yukle" className="tt-btn tt-btn-primary">
              <IconVideo className="h-4.5 w-4.5" /> Video yükle
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-line border-t border-line">
          {[
            { etiket: "Yayında olan video", deger: formatCompact(yeniVideolar.length) },
            { etiket: "Popüler videolarda izlenme", deger: formatCompact(toplamIzlenme) },
            { etiket: "Puan / video bloğu", deger: "10 / 100B" },
          ].map((stat) => (
            <div key={stat.etiket} className="px-4 py-3 text-center sm:text-left">
              <p className="text-lg font-extrabold tracking-tight">{stat.deger}</p>
              <p className="text-[11px] leading-tight text-muted">{stat.etiket}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Öne çıkanlar */}
      {populerVideolar.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-bold tracking-tight">Öne çıkanlar</h2>
          <VideoGrid videos={populerVideolar} />
        </section>
      ) : null}

      {/* Yeni videolar */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold tracking-tight">Yeni videolar</h2>

        {yeniVideolar.length === 0 ? (
          <EmptyState
            baslik="Henüz video yok"
            aciklama="İlk videoyu sen yükle ve TürkTube Puanı kazanmaya başla. Video yüklemek için bir kanal oluşturman gerekir."
            ikon={<IconVideo className="h-10 w-10" />}
            aksiyon={{ etiket: "Video yükle", href: "/yukle" }}
          />
        ) : (
          <VideoGrid videos={yeniVideolar} />
        )}
      </section>
    </div>
  );
}
