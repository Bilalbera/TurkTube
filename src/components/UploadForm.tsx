"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { IconStar, IconUpload, IconVideo } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { createVideoAction } from "@/lib/actions";

const MAKS_VIDEO_MB = 100;
const MAKS_KAPAK_MB = 5;
const IZINLI_VIDEO = ["video/mp4", "video/webm", "video/quicktime", "video/ogg"];
const IZINLI_KAPAK = ["image/png", "image/jpeg", "image/webp"];

interface UploadFormProps {
  userId: string;
  kanalAdi: string;
  isPremium: boolean;
}

function uzanti(mime: string): string {
  const harita: Record<string, string> = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "video/ogg": "ogv",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
  };
  return harita[mime] ?? "bin";
}

export function UploadForm({ userId, kanalAdi, isPremium }: UploadFormProps) {
  const router = useRouter();
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [mod, setMod] = useState<"dosya" | "baglanti">("dosya");
  const [videoDosya, setVideoDosya] = useState<File | null>(null);
  const [kapakDosya, setKapakDosya] = useState<File | null>(null);
  const [videoBaglanti, setVideoBaglanti] = useState("");
  const [baslik, setBaslik] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [gorunurluk, setGorunurluk] = useState("public");
  const [asama, setAsama] = useState<string | null>(null);
  const [ilerleme, setIlerleme] = useState(0);
  const [hata, setHata] = useState<string | null>(null);

  function videoSecildi(event: React.ChangeEvent<HTMLInputElement>) {
    setHata(null);
    const dosya = event.target.files?.[0] ?? null;
    if (!dosya) {
      setVideoDosya(null);
      return;
    }
    if (!IZINLI_VIDEO.includes(dosya.type)) {
      setHata("Desteklenmeyen video biçimi. MP4, WEBM, MOV veya OGG yükleyebilirsin.");
      setVideoDosya(null);
      return;
    }
    if (dosya.size > MAKS_VIDEO_MB * 1024 * 1024) {
      setHata(`Video boyutu en fazla ${MAKS_VIDEO_MB} MB olabilir.`);
      setVideoDosya(null);
      return;
    }
    setVideoDosya(dosya);
    if (!baslik) setBaslik(dosya.name.replace(/\.[^.]+$/, ""));
  }

  function kapakSecildi(event: React.ChangeEvent<HTMLInputElement>) {
    setHata(null);
    const dosya = event.target.files?.[0] ?? null;
    if (!dosya) {
      setKapakDosya(null);
      return;
    }
    if (!IZINLI_KAPAK.includes(dosya.type)) {
      setHata("Kapak görseli PNG, JPG veya WEBP olmalıdır.");
      setKapakDosya(null);
      return;
    }
    if (dosya.size > MAKS_KAPAK_MB * 1024 * 1024) {
      setHata(`Kapak görseli en fazla ${MAKS_KAPAK_MB} MB olabilir.`);
      setKapakDosya(null);
      return;
    }
    setKapakDosya(dosya);
  }

  /** Süreyi tarayıcıda okur (sunucuya ek yük bindirmez). */
  async function sureyiOku(dosya: File): Promise<number> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(dosya);
      const eleman = document.createElement("video");
      eleman.preload = "metadata";
      eleman.onloadedmetadata = () => {
        const sure = Number.isFinite(eleman.duration) ? Math.round(eleman.duration) : 0;
        URL.revokeObjectURL(url);
        resolve(sure);
      };
      eleman.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(0);
      };
      eleman.src = url;
    });
  }

  async function gonder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHata(null);

    if (!baslik.trim()) {
      setHata("Video başlığı zorunludur.");
      return;
    }
    if (mod === "dosya" && !videoDosya) {
      setHata("Lütfen bir video dosyası seç.");
      return;
    }
    if (mod === "baglanti" && !/^https?:\/\//.test(videoBaglanti.trim())) {
      setHata("Geçerli bir video bağlantısı (https://...) gir.");
      return;
    }

    try {
      const supabase = createClient();
      let videoUrl = videoBaglanti.trim();
      let kapakUrl = "";
      let sure = 0;

      if (mod === "dosya" && videoDosya) {
        setAsama("Video yükleniyor...");
        setIlerleme(15);
        sure = await sureyiOku(videoDosya);

        const yol = `${userId}/${crypto.randomUUID()}.${uzanti(videoDosya.type)}`;
        const { error: yuklemeHatasi } = await supabase.storage
          .from("videos")
          .upload(yol, videoDosya, {
            cacheControl: "3600",
            upsert: false,
            contentType: videoDosya.type,
          });

        if (yuklemeHatasi) {
          setHata("Video yüklenemedi: " + yuklemeHatasi.message);
          setAsama(null);
          setIlerleme(0);
          return;
        }
        videoUrl = supabase.storage.from("videos").getPublicUrl(yol).data.publicUrl;
      }

      setIlerleme(55);

      if (kapakDosya) {
        setAsama("Kapak görseli yükleniyor...");
        const kapakYolu = `${userId}/${crypto.randomUUID()}.${uzanti(kapakDosya.type)}`;
        const { error: kapakHatasi } = await supabase.storage
          .from("thumbnails")
          .upload(kapakYolu, kapakDosya, {
            cacheControl: "3600",
            upsert: false,
            contentType: kapakDosya.type,
          });

        if (kapakHatasi) {
          setHata("Kapak görseli yüklenemedi: " + kapakHatasi.message);
          setAsama(null);
          setIlerleme(0);
          return;
        }
        kapakUrl = supabase.storage.from("thumbnails").getPublicUrl(kapakYolu).data.publicUrl;
      }

      setIlerleme(80);
      setAsama("Video kaydediliyor...");

      const formData = new FormData();
      formData.set("title", baslik.trim());
      formData.set("description", aciklama.trim());
      formData.set("video_url", videoUrl);
      formData.set("thumbnail_url", kapakUrl);
      formData.set("visibility", gorunurluk);
      formData.set("duration_seconds", String(sure));

      const sonuc = await createVideoAction({}, formData);

      if (sonuc?.error) {
        setHata(sonuc.error);
        setAsama(null);
        setIlerleme(0);
        return;
      }

      setIlerleme(100);
    } catch {
      setHata("Beklenmeyen bir hata oluştu. Lütfen tekrar dene.");
      setAsama(null);
      setIlerleme(0);
      router.refresh();
    }
  }

  const mesgul = asama !== null;

  return (
    <form onSubmit={gonder} className="flex flex-col gap-5">
      <div className="tt-card flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted">
            Yükleyen kanal: <span className="font-semibold text-fg">{kanalAdi}</span>
          </p>
          {isPremium ? (
            <span className="tt-premium-badge">
              <IconStar className="h-3 w-3" /> Premium: öncelikli işleme kuyruğu
            </span>
          ) : null}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMod("dosya")}
            className={`tt-chip ${mod === "dosya" ? "tt-chip-active" : ""}`}
          >
            <IconUpload className="h-4 w-4" /> Dosya yükle
          </button>
          <button
            type="button"
            onClick={() => setMod("baglanti")}
            className={`tt-chip ${mod === "baglanti" ? "tt-chip-active" : ""}`}
          >
            <IconVideo className="h-4 w-4" /> Bağlantıdan ekle
          </button>
        </div>

        {mod === "dosya" ? (
          <div>
            <label className="tt-label" htmlFor="video-dosya">
              Video dosyası (en fazla {MAKS_VIDEO_MB} MB)
            </label>
            <input
              ref={videoInputRef}
              id="video-dosya"
              type="file"
              accept={IZINLI_VIDEO.join(",")}
              onChange={videoSecildi}
              disabled={mesgul}
              className="tt-input file:mr-3 file:rounded-full file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-strong"
            />
          </div>
        ) : (
          <div>
            <label className="tt-label" htmlFor="video-baglanti">
              Video bağlantısı (mp4/webm)
            </label>
            <input
              id="video-baglanti"
              type="url"
              value={videoBaglanti}
              onChange={(event) => setVideoBaglanti(event.target.value)}
              placeholder="https://ornek.com/video.mp4"
              disabled={mesgul}
              className="tt-input"
            />
          </div>
        )}

        <div>
          <label className="tt-label" htmlFor="kapak">
            Kapak görseli (isteğe bağlı, en fazla {MAKS_KAPAK_MB} MB)
          </label>
          <input
            id="kapak"
            type="file"
            accept={IZINLI_KAPAK.join(",")}
            onChange={kapakSecildi}
            disabled={mesgul}
            className="tt-input file:mr-3 file:rounded-full file:border-0 file:bg-surface2 file:px-3 file:py-1.5 file:text-xs file:font-semibold"
          />
        </div>

        <div>
          <label className="tt-label" htmlFor="baslik">
            Başlık
          </label>
          <input
            id="baslik"
            value={baslik}
            onChange={(event) => setBaslik(event.target.value)}
            maxLength={120}
            required
            disabled={mesgul}
            placeholder="Videona dikkat çekici bir başlık ver"
            className="tt-input"
          />
          <p className="mt-1 text-xs text-muted">{baslik.length}/120</p>
        </div>

        <div>
          <label className="tt-label" htmlFor="aciklama">
            Açıklama
          </label>
          <textarea
            id="aciklama"
            value={aciklama}
            onChange={(event) => setAciklama(event.target.value)}
            rows={5}
            maxLength={5000}
            disabled={mesgul}
            placeholder="İzleyicilere videodan bahset..."
            className="tt-input resize-y"
          />
        </div>

        <fieldset>
          <legend className="tt-label">Görünürlük</legend>
          <div className="flex flex-col gap-2">
            {[
              { deger: "public", etiket: "Herkese açık", aciklama: "Ana sayfada ve aramada görünür." },
              { deger: "unlisted", etiket: "Liste dışı", aciklama: "Yalnızca bağlantıya sahip olanlar görür." },
              { deger: "private", etiket: "Özel", aciklama: "Yalnızca sen görürsün." },
            ].map((secenek) => (
              <label key={secenek.deger} className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="visibility"
                  value={secenek.deger}
                  checked={gorunurluk === secenek.deger}
                  onChange={() => setGorunurluk(secenek.deger)}
                  disabled={mesgul}
                  className="mt-1 h-4 w-4 accent-[var(--tt-brand)]"
                />
                <span>
                  <span className="font-semibold">{secenek.etiket}</span>
                  <span className="ml-2 text-xs text-muted">{secenek.aciklama}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {hata ? <p className="text-sm text-accent">{hata}</p> : null}

      {mesgul ? (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted">{asama}</p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface2">
            <div className="h-full bg-brand transition-all" style={{ width: `${ilerleme}%` }} />
          </div>
        </div>
      ) : null}

      <button type="submit" disabled={mesgul} className="tt-btn tt-btn-primary h-11">
        {mesgul ? "Yükleniyor..." : "Videoyu yayınla"}
      </button>
    </form>
  );
}