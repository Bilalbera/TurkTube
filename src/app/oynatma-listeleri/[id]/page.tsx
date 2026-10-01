import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { IconList, IconStar, IconTrash } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import { removePlaylistItemAction } from "@/lib/actions";
import { VIDEO_VISIBILITY_LABELS } from "@/lib/constants";
import { formatDuration, formatViews, timeAgo } from "@/lib/format";
import { getSession } from "@/lib/queries";

export const dynamic = "force-dynamic";

interface ListeSayfasiProps {
  params: Promise<{ id: string }>;
}

interface ListeSatiri {
  video_id: string;
  position: number;
  added_at: string;
  videos: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    duration_seconds: number;
    view_count: number;
    created_at: string;
    channels: { id: string; name: string; handle: string } | null;
  } | null;
}

export async function generateMetadata({ params }: ListeSayfasiProps) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { title: "Liste bulunamadı" };

  const supabase = await createClient();
  const { data } = await supabase.from("playlists").select("title").eq("id", id).maybeSingle();
  return { title: (data as { title: string } | null)?.title ?? "Oynatma listesi" };
}

export default async function ListeSayfasi({ params }: ListeSayfasiProps) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const session = await getSession();
  if (!session.userId) redirect("/giris");

  const supabase = await createClient();
  const [listeRes, ogeRes] = await Promise.all([
    supabase
      .from("playlists")
      .select("id, owner_id, title, description, visibility, created_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("playlist_items")
      .select(
        "video_id, position, added_at, videos(id, title, thumbnail_url, duration_seconds, view_count, created_at, channels(id, name, handle))",
      )
      .eq("playlist_id", id)
      .order("position", { ascending: true })
      .order("added_at", { ascending: false }),
  ]);

  const liste = listeRes.data as
    | {
        id: string;
        owner_id: string;
        title: string;
        description: string | null;
        visibility: string;
        created_at: string;
      }
    | null;

  if (!liste) notFound();

  const ogeler = (ogeRes.data as unknown as ListeSatiri[]) ?? [];
  const sahibiMisin = liste.owner_id === session.userId;

  return (
    <div className="flex flex-col gap-6">
      <header className="tt-card flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{liste.title}</h1>
            <p className="mt-1 text-sm text-muted">
              {ogeler.length} video · {VIDEO_VISIBILITY_LABELS[liste.visibility]} · Sahibi:{" "}
              {sahibiMisin ? "sen" : "başka bir kullanıcı"}
            </p>
            {liste.description ? (
              <p className="mt-2 max-w-2xl text-sm text-muted">{liste.description}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {sahibiMisin ? (
              <>
                <Link href="/oynatma-listeleri" className="tt-btn tt-btn-soft h-9 px-4 text-xs">
                  Tüm listelerim
                </Link>
                {session.isPremium ? (
                  <span className="tt-premium-badge">
                    <IconStar className="h-3 w-3" /> Sıralama ve gizlilik: Premium
                  </span>
                ) : (
                  <Link href="/premium" className="tt-premium-badge">
                    <IconStar className="h-3 w-3" /> Gelişmiş liste seçenekleri
                  </Link>
                )}
              </>
            ) : null}
          </div>
        </div>
      </header>

      {ogeler.length === 0 ? (
        <EmptyState
          baslik="Bu liste boş"
          aciklama="Videoların altındaki 'Kaydet' butonuyla bu listeye video ekleyebilirsin."
          ikon={<IconList className="h-10 w-10" />}
          aksiyon={{ etiket: "Keşfet", href: "/kesfet" }}
        />
      ) : (
        <ol className="flex flex-col gap-3">
          {ogeler.map((oge, index) => {
            if (!oge.videos) return null;
            const video = oge.videos;

            return (
              <li key={oge.video_id} className="tt-card flex items-center gap-3 p-3">
                <span className="w-6 shrink-0 text-center text-sm font-bold text-muted">
                  {index + 1}
                </span>

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
                    {formatViews(video.view_count)} · {timeAgo(video.created_at)}
                  </p>
                </div>

                {sahibiMisin ? (
                  <form action={removePlaylistItemAction}>
                    <input type="hidden" name="playlist_id" value={liste.id} />
                    <input type="hidden" name="video_id" value={video.id} />
                    <button
                      type="submit"
                      className="rounded-full p-2 text-muted hover:bg-surface2 hover:text-accent"
                      title="Listeden çıkar"
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
