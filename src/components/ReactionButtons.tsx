"use client";

import { useState } from "react";
import { IconThumbDown, IconThumbUp } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { formatNumber } from "@/lib/format";

interface ReactionButtonsProps {
  videoId: string;
  begeni: number;
  begenmeme: number;
  tepki: number;
  girisYapildi: boolean;
}

export function ReactionButtons({
  videoId,
  begeni,
  begenmeme,
  tepki,
  girisYapildi,
}: ReactionButtonsProps) {
  const [begeniSayisi, setBegeniSayisi] = useState(begeni);
  const [begenmemeSayisi, setBegenmemeSayisi] = useState(begenmeme);
  const [aktifTepki, setAktifTepki] = useState(tepki);
  const [mesgul, setMesgul] = useState(false);
  const [uyari, setUyari] = useState<string | null>(null);

  async function tepkiVer(deger: 1 | -1) {
    if (!girisYapildi) {
      setUyari("Beğenmek için giriş yapmalısın.");
      return;
    }
    if (mesgul) return;
    setMesgul(true);
    setUyari(null);

    const supabase = createClient();
    const { data, error } = await supabase.rpc("set_video_reaction", {
      p_video_id: videoId,
      p_reaction: deger,
    });

    if (error) {
      setUyari("İşlem tamamlanamadı: " + error.message);
    } else {
      const sonuc = data as { tepki: number; begeni: number; begenmeme: number };
      setAktifTepki(sonuc.tepki);
      setBegeniSayisi(sonuc.begeni);
      setBegenmemeSayisi(sonuc.begenmeme);
    }
    setMesgul(false);
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <div className="flex items-center overflow-hidden rounded-full bg-surface2">
          <button
            type="button"
            onClick={() => void tepkiVer(1)}
            disabled={mesgul}
            aria-pressed={aktifTepki === 1}
            className={`flex items-center gap-2 px-3.5 py-2 text-sm font-semibold transition ${
              aktifTepki === 1 ? "text-brand" : "text-fg hover:bg-line"
            }`}
          >
            <IconThumbUp className="h-4.5 w-4.5" />
            {formatNumber(begeniSayisi)}
          </button>
          <span className="h-6 w-px bg-line" />
          <button
            type="button"
            onClick={() => void tepkiVer(-1)}
            disabled={mesgul}
            aria-pressed={aktifTepki === -1}
            className={`flex items-center gap-2 px-3.5 py-2 text-sm font-semibold transition ${
              aktifTepki === -1 ? "text-accent" : "text-fg hover:bg-line"
            }`}
          >
            <IconThumbDown className="h-4.5 w-4.5" />
            {formatNumber(begenmemeSayisi)}
          </button>
        </div>
      </div>
      {uyari ? <p className="text-xs text-accent">{uyari}</p> : null}
    </div>
  );
}
