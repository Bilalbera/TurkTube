import Link from "next/link";
import { redirect } from "next/navigation";
import { IconStar, IconVideo } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import {
  POINTS_PER_VIEW_BLOCK,
  PREMIUM_COST,
  PREMIUM_DURATION_DAYS,
  VIEW_BLOCK_SIZE,
} from "@/lib/constants";
import { formatDateTime, formatMilestone, formatNumber } from "@/lib/format";
import { getChannelVideos, getSession } from "@/lib/queries";
import type { PointTransaction } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "TürkTube Puanı" };

const KURALLAR = [
  {
    baslik: "Her 100.000 gerçek izlenme = +10 puan",
    aciklama:
      "Bir video 100.000 geçerli izlenmeye ulaştığında sahibi +10 TürkTube Puanı kazanır.",
  },
  {
    baslik: "Her yeni sınırda tekrar +10 puan",
    aciklama: "Aynı video 200.000, 300.000 ... izlenmede tekrar +10 puan kazandırır.",
  },
  {
    baslik: "1.000.000 izlenme = toplam +100 puan",
    aciklama: "Ödüller kademeli olarak verilir; toplam puan otomatik birikir.",
  },
  {
    baslik: "100 puan = 30 gün Premium",
    aciklama: "Puanlarınla TürkTube Premium üyeliğini aktifleştirebilirsin.",
  },
  {
    baslik: "Sahte izlenmeler sayılmaz",
    aciklama:
      "Kendi videonu izlemek, aynı videoyu kısa sürede tekrar izlemek ve günlük limit aşımları puan kazandırmaz.",
  },
];

export default async function PuanlarSayfasi() {
  const session = await getSession();
  if (!session.userId || !session.profile) redirect("/giris");

  const supabase = await createClient();
  const [islemlerRes, kanalVideolari] = await Promise.all([
    supabase
      .from("point_transactions")
      .select("id, user_id, amount, balance_after, kind, description, video_id, created_at")
      .eq("user_id", session.userId)
      .order("created_at", { ascending: false })
      .limit(50),
    session.channel ? getChannelVideos(session.channel.id, 20, true) : Promise.resolve([]),
  ]);

  const islemler = (islemlerRes.data as PointTransaction[]) ?? [];
  const puan = session.profile.points;
  const premiumHakki = Math.floor(puan / PREMIUM_COST);

  return (
    <div className="flex flex-col gap-8">
      <section className="tt-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-widest text-muted uppercase">TürkTube Puanın</p>
          <p className="mt-1 text-4xl font-extrabold tracking-tight text-brand">
            {formatNumber(puan)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {premiumHakki > 0
              ? `${premiumHakki} adet ${PREMIUM_DURATION_DAYS} günlük Premium alabilirsin.`
              : `Premium için ${PREMIUM_COST - puan} puan daha kazanman gerekiyor.`}
          </p>
        </div>

        <Link href="/premium" className="tt-btn tt-btn-primary self-start sm:self-auto">
          <IconStar className="h-4 w-4" /> Premium&apos;a geç
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {KURALLAR.map((kural) => (
          <div key={kural.baslik} className="tt-card p-4">
            <p className="text-sm font-bold">{kural.baslik}</p>
            <p className="mt-1 text-xs text-muted">{kural.aciklama}</p>
          </div>
        ))}
      </section>

      {kanalVideolari.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold tracking-tight">Videolarının puan ilerlemesi</h2>
          <ul className="flex flex-col gap-3">
            {kanalVideolari.map((video) => {
              const izlenme = Number(video.view_count);
              const tamamlananBlok = Math.floor(izlenme / VIEW_BLOCK_SIZE);
              const kazanilanPuan = tamamlananBlok * POINTS_PER_VIEW_BLOCK;
              const sonrakiSinir = (tamamlananBlok + 1) * VIEW_BLOCK_SIZE;
              const yuzde = Math.min(100, Math.round((izlenme / sonrakiSinir) * 100));

              return (
                <li key={video.id} className="tt-card flex flex-col gap-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href={`/izle/${video.id}`}
                      className="line-clamp-1 text-sm font-semibold hover:text-brand"
                    >
                      {video.title}
                    </Link>
                    <span className="text-xs font-semibold text-brand-strong">
                      Kazanılan: {formatNumber(kazanilanPuan)} puan
                    </span>
                  </div>

                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface2">
                    <div className="h-full bg-brand" style={{ width: `${yuzde}%` }} />
                  </div>

                  <p className="text-xs text-muted">
                    {formatNumber(izlenme)} / {formatMilestone(sonrakiSinir)} izlenme — sonraki +
                    {POINTS_PER_VIEW_BLOCK} puan için{" "}
                    {formatMilestone(Math.max(0, sonrakiSinir - izlenme))} izlenme kaldı.
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold tracking-tight">Puan kazanma ve harcama geçmişi</h2>

        {islemler.length === 0 ? (
          <div className="tt-card flex items-center gap-3 p-5 text-sm text-muted">
            <IconVideo className="h-5 w-5" />
            Henüz puan hareketi yok. Videoların 100.000 izlenmeye ulaştığında burada görünecek.
          </div>
        ) : (
          <div className="tt-card overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-surface2 text-xs text-muted">
                <tr>
                  <th className="px-4 py-2 font-semibold">Tarih</th>
                  <th className="px-4 py-2 font-semibold">Açıklama</th>
                  <th className="px-4 py-2 text-right font-semibold">Puan</th>
                  <th className="px-4 py-2 text-right font-semibold">Bakiye</th>
                </tr>
              </thead>
              <tbody>
                {islemler.map((islem) => (
                  <tr key={islem.id} className="border-t border-line">
                    <td className="px-4 py-2 text-xs whitespace-nowrap text-muted">
                      {formatDateTime(islem.created_at)}
                    </td>
                    <td className="px-4 py-2">{islem.description}</td>
                    <td
                      className={`px-4 py-2 text-right font-bold ${
                        islem.amount > 0 ? "text-brand-strong" : "text-accent"
                      }`}
                    >
                      {islem.amount > 0 ? "+" : ""}
                      {formatNumber(islem.amount)}
                    </td>
                    <td className="px-4 py-2 text-right text-muted">
                      {formatNumber(islem.balance_after)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-muted">
          Puan hareketleri yalnızca veritabanı fonksiyonları tarafından oluşturulur; uygulama
          istemcisi puan ekleyemez veya değiştiremez.
        </p>
      </section>
    </div>
  );
}
