"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface ImageUploadFieldProps {
  bucket: "avatars" | "banners" | "thumbnails";
  userId: string;
  label: string;
  initialUrl?: string | null;
  maksMb?: number;
  /** Yükleme tamamlandığında public URL ile çağrılır. */
  onChange: (url: string) => void;
  yukseklikSinifi?: string;
}

const IZINLI = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/** Görsel yükleyip Supabase Storage'daki genel adresini döndüren alan. */
export function ImageUploadField({
  bucket,
  userId,
  label,
  initialUrl,
  maksMb = 5,
  onChange,
  yukseklikSinifi = "h-28 w-28",
}: ImageUploadFieldProps) {
  const [onizleme, setOnizleme] = useState<string | null>(initialUrl ?? null);
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function dosyaSecildi(event: React.ChangeEvent<HTMLInputElement>) {
    const dosya = event.target.files?.[0];
    if (!dosya) return;

    setHata(null);
    if (!IZINLI.includes(dosya.type)) {
      setHata("Yalnızca PNG, JPG, WEBP veya GIF yükleyebilirsin.");
      return;
    }
    if (dosya.size > maksMb * 1024 * 1024) {
      setHata(`Dosya boyutu en fazla ${maksMb} MB olabilir.`);
      return;
    }

    setMesgul(true);
    const supabase = createClient();
    const uzanti = dosya.name.split(".").pop()?.toLowerCase() ?? "png";
    const yol = `${userId}/${crypto.randomUUID()}.${uzanti}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(yol, dosya, { cacheControl: "3600", upsert: true, contentType: dosya.type });

    if (error) {
      setHata("Yüklenemedi: " + error.message);
      setMesgul(false);
      return;
    }

    const url = supabase.storage.from(bucket).getPublicUrl(yol).data.publicUrl;
    setOnizleme(url);
    onChange(url);
    setMesgul(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="tt-label">{label}</span>
      <div className="flex items-center gap-4">
        <div
          className={`${yukseklikSinifi} shrink-0 overflow-hidden rounded-xl bg-surface2 ring-1 ring-line`}
        >
          {onizleme ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={onizleme} alt={label} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xs text-muted">
              Görsel yok
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <input
            type="file"
            accept={IZINLI.join(",")}
            onChange={dosyaSecildi}
            disabled={mesgul}
            className="tt-input text-xs"
          />
          <span className="text-xs text-muted">
            {mesgul ? "Yükleniyor..." : `En fazla ${maksMb} MB`}
          </span>
          {hata ? <span className="text-xs text-accent">{hata}</span> : null}
        </div>
      </div>
    </div>
  );
}
