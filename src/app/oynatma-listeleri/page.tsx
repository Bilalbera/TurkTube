import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { PlaylistCreateForm } from "@/components/PlaylistCreateForm";
import { IconList, IconTrash } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import { deletePlaylistAction } from "@/lib/actions";
import { VIDEO_VISIBILITY_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { getSession } from "@/lib/queries";
import type { Playlist } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Oynatma listelerim" };

export default async function OynatmaListeleriSayfasi() {
  const session = await getSession();
  if (!session.userId) redirect("/giris");

  const supabase = await createClient();
  const { data } = await supabase
    .from("playlists")
    .select("id, owner_id, title, description, visibility, created_at, updated_at, playlist_items(count)")
    .eq("owner_id", session.userId)
    .order("created_at", { ascending: false });

  const listeler = (data as unknown as (Playlist & { playlist_items: { count: number }[] })[]) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Oynatma listelerim</h1>
        <p className="text-sm text-muted">
          Beğendiğin videoları listeler halinde düzenle ve paylaş.
        </p>
      </header>

      <PlaylistCreateForm isPremium={session.isPremium} />

      {listeler.length === 0 ? (
        <EmptyState
          baslik="Henüz oynatma listen yok"
          aciklama="Yukarıdaki formu kullanarak ilk listeni oluştur, ardından videoları kaydetmeye başla."
          ikon={<IconList className="h-10 w-10" />}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {listeler.map((liste) => (
            <li key={liste.id} className="tt-card flex flex-col gap-2 p-4">
              <Link
                href={`/oynatma-listeleri/${liste.id}`}
                className="line-clamp-1 text-sm font-bold hover:text-brand"
              >
                {liste.title}
              </Link>

              <p className="text-xs text-muted">
                {liste.playlist_items?.[0]?.count ?? 0} video ·{" "}
                {VIDEO_VISIBILITY_LABELS[liste.visibility]} · {formatDate(liste.created_at)}
              </p>

              {liste.description ? (
                <p className="line-clamp-2 text-xs text-muted">{liste.description}</p>
              ) : null}

              <div className="mt-1 flex items-center gap-2">
                <Link
                  href={`/oynatma-listeleri/${liste.id}`}
                  className="tt-btn tt-btn-soft h-8 px-3 text-xs"
                >
                  Listeyi aç
                </Link>
                <form action={deletePlaylistAction}>
                  <input type="hidden" name="playlist_id" value={liste.id} />
                  <button
                    type="submit"
                    className="tt-btn tt-btn-outline h-8 px-3 text-xs text-accent"
                    title="Listeyi sil"
                  >
                    <IconTrash className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
