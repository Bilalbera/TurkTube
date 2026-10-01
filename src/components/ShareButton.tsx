"use client";

import { useState } from "react";
import { IconCheck, IconShare } from "@/components/icons";

interface ShareButtonProps {
  videoId: string;
  baslik: string;
}

/**
 * Video paylaşma. Bağlantı tarayıcı adres çubuğundan üretilir;
 * destekleyen cihazlarda yerel paylaşım menüsü açılır.
 */
export function ShareButton({ videoId, baslik }: ShareButtonProps) {
  const [kopyalandi, setKopyalandi] = useState(false);
  const [acik, setAcik] = useState(false);

  function baglantiUret() {
    if (typeof window === "undefined") return `/izle/${videoId}`;
    return `${window.location.origin}/izle/${videoId}`;
  }

  async function panoyaKopyala() {
    const url = baglantiUret();
    try {
      await navigator.clipboard.writeText(url);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 2000);
    } catch {
      // Pano erişimi yoksa kullanıcı bağlantıyı elle kopyalayabilir.
    }
  }

  async function cihazdaPaylas() {
    const url = baglantiUret();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: baslik, url });
        setAcik(false);
        return;
      } catch {
        // Kullanıcı paylaşımı iptal etti.
      }
    }
    await panoyaKopyala();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAcik((prev) => !prev)}
        className="tt-btn tt-btn-soft"
        title="Videoyu paylaş"
        aria-expanded={acik}
      >
        {kopyalandi ? <IconCheck className="h-4.5 w-4.5" /> : <IconShare className="h-4.5 w-4.5" />}
        {kopyalandi ? "Kopyalandı" : "Paylaş"}
      </button>

      {acik ? (
        <div className="tt-card absolute right-0 z-30 mt-2 w-72 p-3 shadow-lg">
          <p className="mb-2 text-xs font-semibold text-muted">VİDEO BAĞLANTISI</p>
          <input
            readOnly
            value={baglantiUret()}
            className="tt-input text-xs"
            onFocus={(event) => event.currentTarget.select()}
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => void panoyaKopyala()}
              className="tt-btn tt-btn-primary h-8 flex-1 text-xs"
            >
              Bağlantıyı kopyala
            </button>
            <button
              type="button"
              onClick={() => void cihazdaPaylas()}
              className="tt-btn tt-btn-soft h-8 flex-1 text-xs"
            >
              Cihazda paylaş
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

