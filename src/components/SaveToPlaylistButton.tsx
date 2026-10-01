"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconCheck, IconList, IconSave, IconStar } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import type { PlaylistSummary } from "@/lib/queries";

interface SaveToPlaylistButtonProps {
  videoId: string;
  listeler: PlaylistSummary[];
  girisYapildi: boolean;
  isPremium: boolean;
}

export function SaveToPlaylistButton({
  videoId,
  listeler,
  girisYapildi,
  isPremium,
}: SaveToPlaylistButtonProps) {
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [yeniBaslik, setYeniBaslik] = useState("");
  const [gizli, setGizli] = useState(false);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState(false);

  if (!girisYapildi) return null;

  async function listeyeEkle(playlistId: string) {
    setMesgul(true);
    setMesaj(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("playlist_items")
      .upsert({ playlist_id: playlistId, video_id: videoId }, { onConflict: "playlist_id,video_id" });
    setMesgul(false);
    setMesaj(error ? "Eklenemedi: " + error.message : "Videoyu listeye ekledik.");
    if (!error) {
      setAcik(false);
      router.refresh();
    }
  }

  async function yeniListeOlusturVeEkle() {
    const baslik = yeniBaslik.trim();
    if (!baslik) return;
    setMesgul(true);
    setMesaj(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMesgul(false);
      setMesaj("Oturum bulunamadı.");
      return;
    }

    const { data: liste, error } = await supabase
      .from("playlists")
      .insert({
        owner_id: user.id,
        title: baslik,
        visibility: gizli ? "private" : "public",
      })
      .select("id")
      .single();

    if (error || !liste) {
      setMesgul(false);
      setMesaj("Liste oluşturulamadı: " + (error?.message ?? "bilinmeyen hata"));
      return;
    }

    await supabase
      .from("playlist_items")
      .insert({ playlist_id: (liste as { id: string }).id, video_id: videoId });

    setYeniBaslik("");
    setMesgul(false);
    setMesaj("Yeni liste oluşturuldu ve video eklendi.");
    setAcik(false);
    router.refresh();
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setAcik((prev) => !prev)} className="tt-btn tt-btn-soft" aria-expanded={acik}>
        <IconSave className="h-4.5 w-4.5" /> Kaydet
      </button>

      {acik ? (
        <div className="tt-card absolute right-0 z-30 mt-2 w-80 p-3 shadow-lg">
          <p className="mb-2 flex items-center gap-2 text-xs font-bold text-muted">
            <IconList className="h-4 w-4" /> OYNATMA LİSTESİNE EKLE
          </p>

          <ul className="flex max-h-52 flex-col gap-1 overflow-y-auto">
            {listeler.length === 0 ? (
              <li className="px-2 py-1 text-xs text-muted">Henüz listen yok.</li>
            ) : (
              listeler.map((liste) => (
                <li key={liste.id}>
                  <button
                    type="button"
                    disabled={mesgul}
                    onClick={() => void listeyeEkle(liste.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-surface2"
                  >
                    <IconCheck className="h-4 w-4 text-brand" />
                    <span className="min-w-0 flex-1 truncate">{liste.title}</span>
                    {liste.visibility === "private" ? (
                      <span className="text-[10px] text-muted">özel</span>
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>

          <div className="mt-3 border-t border-line pt-3">
            <label className="tt-label" htmlFor="yeni-liste">
              Yeni liste oluştur
            </label>
            <input
              id="yeni-liste"
              value={yeniBaslik}
              onChange={(event) => setYeniBaslik(event.target.value)}
              placeholder="Örn: Sonra izle"
              className="tt-input"
            />
            {isPremium ? (
              <label className="mt-2 flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={gizli}
                  onChange={(event) => setGizli(event.target.checked)}
                  className="h-4 w-4 accent-[var(--tt-brand)]"
                />
                Gizli liste (Premium seçeneği)
              </label>
            ) : (
              <p className="mt-2 flex items-center gap-1 text-[11px] text-premium">
                <IconStar className="h-3 w-3" /> Gizli liste oluşturmak Premium özelliğidir.
              </p>
            )}
            <button
              type="button"
              disabled={mesgul || !yeniBaslik.trim()}
              onClick={() => void yeniListeOlusturVeEkle()}
              className="tt-btn tt-btn-primary mt-2 h-9 w-full text-xs"
            >
              Oluştur ve ekle
            </button>
          </div>
        </div>
      ) : null}

      {mesaj ? <p className="mt-1 text-xs text-muted">{mesaj}</p> : null}
    </div>
  );
}
