"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { IconThumbUp, IconTrash } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { formatNumber, timeAgo } from "@/lib/format";
import type { CommentWithAuthor } from "@/lib/types";

interface CommentsSectionProps {
  videoId: string;
  yorumlar: CommentWithAuthor[];
  userId: string | null;
  begenilenler: string[];
  sahibiMisin: boolean;
}

export function CommentsSection({
  videoId,
  yorumlar,
  userId,
  begenilenler,
  sahibiMisin,
}: CommentsSectionProps) {
  const router = useRouter();
  const [metin, setMetin] = useState("");
  const [mesgul, setMesgul] = useState(false);
  const [uyari, setUyari] = useState<string | null>(null);
  const [begeniDurumu, setBegeniDurumu] = useState<
    Record<string, { begenildi: boolean; sayi: number }>
  >(() =>
    Object.fromEntries(
      yorumlar.map((yorum) => [
        yorum.id,
        { begenildi: begenilenler.includes(yorum.id), sayi: yorum.like_count },
      ]),
    ),
  );

  async function yorumGonder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const icerik = metin.trim();
    if (!icerik || !userId) return;

    setMesgul(true);
    setUyari(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("comments")
      .insert({ video_id: videoId, author_id: userId, content: icerik });

    if (error) {
      setUyari("Yorum gönderilemedi: " + error.message);
    } else {
      setMetin("");
      router.refresh();
    }
    setMesgul(false);
  }

  async function begeniDegistir(commentId: string) {
    if (!userId) {
      router.push("/giris");
      return;
    }
    const supabase = createClient();
    const { data, error } = await supabase.rpc("toggle_comment_like", { p_comment_id: commentId });
    if (error) {
      setUyari(error.message);
      return;
    }
    const sonuc = data as { begenildi: boolean; begeni: number };
    setBegeniDurumu((prev) => ({
      ...prev,
      [commentId]: { begenildi: sonuc.begenildi, sayi: sonuc.begeni },
    }));
  }

  async function yorumSil(commentId: string) {
    const supabase = createClient();
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (error) {
      setUyari("Yorum silinemedi: " + error.message);
      return;
    }
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-base font-bold">{formatNumber(yorumlar.length)} yorum</h2>

      {userId ? (
        <form onSubmit={yorumGonder} className="flex flex-col gap-2">
          <textarea
            value={metin}
            onChange={(event) => setMetin(event.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Düşüncelerini paylaş..."
            className="tt-input resize-y"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">{metin.length}/2000</span>
            <button type="submit" disabled={mesgul || !metin.trim()} className="tt-btn tt-btn-primary">
              {mesgul ? "Gönderiliyor..." : "Yorum yap"}
            </button>
          </div>
        </form>
      ) : (
        <p className="tt-card p-4 text-sm text-muted">
          Yorum yapmak için <Link href="/giris" className="font-semibold text-brand">giriş yap</Link>{" "}
          veya <Link href="/kayit" className="font-semibold text-brand">kayıt ol</Link>.
        </p>
      )}

      {uyari ? <p className="text-xs text-accent">{uyari}</p> : null}

      {yorumlar.length === 0 ? (
        <p className="text-sm text-muted">İlk yorumu sen yaz, sohbeti başlat.</p>
      ) : (
        <ul className="flex flex-col gap-5">
          {yorumlar.map((yorum) => {
            const begeni = begeniDurumu[yorum.id] ?? { begenildi: false, sayi: yorum.like_count };
            const silinebilir = userId === yorum.author_id || sahibiMisin;

            return (
              <li key={yorum.id} className="flex gap-3">
                <Avatar
                  name={yorum.profiles?.display_name ?? "Kullanıcı"}
                  src={yorum.profiles?.avatar_url ?? null}
                  size={38}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">
                      {yorum.profiles?.display_name ?? "Kullanıcı"}
                    </span>
                    <span className="text-xs text-muted">{timeAgo(yorum.created_at)}</span>
                  </div>
                  <p className="mt-1 text-sm break-words whitespace-pre-wrap">{yorum.content}</p>

                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void begeniDegistir(yorum.id)}
                      className={`flex items-center gap-1.5 text-xs font-semibold ${
                        begeni.begenildi ? "text-brand" : "text-muted hover:text-fg"
                      }`}
                    >
                      <IconThumbUp className="h-4 w-4" />
                      {begeni.sayi > 0 ? formatNumber(begeni.sayi) : "Beğen"}
                    </button>

                    {silinebilir ? (
                      <button
                        type="button"
                        onClick={() => void yorumSil(yorum.id)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-accent"
                      >
                        <IconTrash className="h-4 w-4" />
                        Sil
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
