"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IconStar } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { MIN_WATCH_SECONDS } from "@/lib/constants";

interface VideoPlayerProps {
  videoId: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  isPremium: boolean;
}

interface ViewResult {
  sayildi: boolean;
  sebep: string | null;
  izlenme: number;
  puan: number;
}

/**
 * TürkTube oynatıcı.
 *
 * İzlenme sayımı TAMAMEN sunucu tarafında doğrulanır: istemci yalnızca
 * "register_view" adlı veritabanı fonksiyonunu çağırır. Fonksiyon izleme
 * süresini, tekrar izlemeleri, günlük limiti ve sahte izlenmeleri kontrol
 * eder; puan ödülü de yalnızca orada verilir.
 */
export function VideoPlayer({ videoId, videoUrl, thumbnailUrl, isPremium }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const izlenenSaniye = useRef(0);
  const oncekiZaman = useRef(0);
  const gonderildi = useRef(false);
  const [sonuc, setSonuc] = useState<ViewResult | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    // Yeni video seçildiğinde sayaçları sıfırla.
    izlenenSaniye.current = 0;
    oncekiZaman.current = 0;
    gonderildi.current = false;
    setSonuc(null);
    setHata(null);
  }, [videoId]);

  async function izlenmeyiKaydet() {
    if (gonderildi.current) return;
    const saniye = Math.floor(izlenenSaniye.current);
    if (saniye < MIN_WATCH_SECONDS) return;
    gonderildi.current = true;

    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("register_view", {
        p_video_id: videoId,
        p_watch_seconds: saniye,
      });
      if (error) {
        setHata("İzlenme kaydedilemedi.");
        return;
      }
      setSonuc(data as ViewResult);
    } catch {
      setHata("İzlenme kaydedilemedi.");
    }
  }

  function zamanGuncellendi() {
    const video = videoRef.current;
    if (!video) return;

    const fark = video.currentTime - oncekiZaman.current;
    // Atlama / hızlı ileri sarma izlenmiş sayılmaz.
    if (fark > 0 && fark <= 2) {
      izlenenSaniye.current += fark;
    }
    oncekiZaman.current = video.currentTime;

    if (izlenenSaniye.current >= MIN_WATCH_SECONDS) {
      void izlenmeyiKaydet();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Reklamsız deneyim yalnızca Premium üyeler için */}
      {!isPremium ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-line bg-surface2 px-4 py-2.5">
          <p className="text-xs text-muted">
            <span className="font-semibold text-fg">Reklam alanı</span> — Premium ile reklamsız izle.
          </p>
          <Link href="/premium" className="tt-btn tt-btn-primary h-8 px-3 text-xs">
            <IconStar className="h-3.5 w-3.5" /> Premium&apos;a geç
          </Link>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-card bg-black">
        <video
          ref={videoRef}
          src={videoUrl}
          poster={thumbnailUrl ?? undefined}
          controls
          preload="metadata"
          playsInline
          onTimeUpdate={zamanGuncellendi}
          onEnded={() => void izlenmeyiKaydet()}
          className="aspect-video w-full bg-black"
        />
      </div>

      {sonuc && !sonuc.sayildi ? (
        <p className="text-xs text-muted">
          Bu izlenme sayılmadı (
          {sonuc.sebep === "tekrar_izleme"
            ? "aynı videoyu kısa süre içinde tekrar izledin"
            : sonuc.sebep === "kendi_videosu"
              ? "kendi videon"
              : sonuc.sebep === "gunluk_limit"
                ? "günlük izlenme limitine ulaşıldı"
                : "izleme süresi yetersiz"}
          ). TürkTube puan sistemi sahte izlenmeleri saymaz.
        </p>
      ) : null}

      {sonuc?.sayildi ? (
        <p className="text-xs text-muted">
          İzlenme kaydedildi. Bu videonun toplam izlenmesi: {sonuc.izlenme}
          {sonuc.puan > 0 ? ` · videonun sahibi +${sonuc.puan} TürkTube Puanı kazandı!` : ""}
        </p>
      ) : null}

      {hata ? <p className="text-xs text-accent">{hata}</p> : null}
    </div>
  );
}
