"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconBell, IconCheck } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { formatSubscribers } from "@/lib/format";

interface SubscribeButtonProps {
  channelId: string;
  abone: boolean;
  aboneSayisi: number;
  girisYapildi: boolean;
  sahibiMisin: boolean;
}

export function SubscribeButton({
  channelId,
  abone,
  aboneSayisi,
  girisYapildi,
  sahibiMisin,
}: SubscribeButtonProps) {
  const router = useRouter();
  const [aboneMi, setAboneMi] = useState(abone);
  const [sayi, setSayi] = useState(aboneSayisi);
  const [mesgul, setMesgul] = useState(false);
  const [uyari, setUyari] = useState<string | null>(null);

  if (sahibiMisin) {
    return (
      <span className="tt-btn tt-btn-soft cursor-default">Bu senin kanalın</span>
    );
  }

  async function degistir() {
    if (!girisYapildi) {
      router.push("/giris");
      return;
    }
    if (mesgul) return;
    setMesgul(true);
    setUyari(null);

    const supabase = createClient();
    const { data, error } = await supabase.rpc("toggle_subscription", {
      p_channel_id: channelId,
    });

    if (error) {
      setUyari(error.message);
    } else {
      const sonuc = data as { abone: boolean; abone_sayisi: number };
      setAboneMi(sonuc.abone);
      setSayi(sonuc.abone_sayisi);
      router.refresh();
    }
    setMesgul(false);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void degistir()}
        disabled={mesgul}
        className={`tt-btn ${aboneMi ? "tt-btn-soft" : "tt-btn-primary"}`}
      >
        {aboneMi ? (
          <>
            <IconCheck className="h-4 w-4" /> Abone olundu
          </>
        ) : (
          <>
            <IconBell className="h-4 w-4" /> Abone ol
          </>
        )}
      </button>
      <span className="text-xs text-muted">{formatSubscribers(sayi)}</span>
      {uyari ? <span className="text-xs text-accent">{uyari}</span> : null}
    </div>
  );
}
