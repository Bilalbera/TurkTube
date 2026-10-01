"use client";

import { useActionState } from "react";
import { IconList } from "@/components/icons";
import { createPlaylistAction, type ActionState } from "@/lib/actions";

const baslangic: ActionState = {};

export function PlaylistCreateForm({ isPremium }: { isPremium: boolean }) {
  const [durum, formAction, bekliyor] = useActionState(createPlaylistAction, baslangic);

  return (
    <form action={formAction} className="tt-card flex flex-col gap-3 p-4">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <IconList className="h-4 w-4" /> Yeni oynatma listesi
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="tt-label" htmlFor="title">
            Liste adı
          </label>
          <input
            id="title"
            name="title"
            required
            maxLength={120}
            placeholder="Örn: Sonra izle"
            className="tt-input"
          />
        </div>

        <div>
          <label className="tt-label" htmlFor="visibility">
            Görünürlük
          </label>
          <select id="visibility" name="visibility" defaultValue="public" className="tt-input">
            <option value="public">Herkese açık</option>
            <option value="unlisted">Liste dışı</option>
            <option value="private">Özel {isPremium ? "(Premium)" : "(Premium gerekir)"}</option>
          </select>
        </div>
      </div>

      <div>
        <label className="tt-label" htmlFor="description">
          Açıklama (isteğe bağlı)
        </label>
        <input
          id="description"
          name="description"
          maxLength={1000}
          placeholder="Bu liste ne hakkında?"
          className="tt-input"
        />
      </div>

      {durum.error ? <p className="text-sm text-accent">{durum.error}</p> : null}
      {durum.success ? <p className="text-sm text-brand-strong">{durum.success}</p> : null}

      <button type="submit" disabled={bekliyor} className="tt-btn tt-btn-primary h-10 self-start px-5">
        {bekliyor ? "Oluşturuluyor..." : "Liste oluştur"}
      </button>
    </form>
  );
}
