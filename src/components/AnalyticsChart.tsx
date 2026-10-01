import Link from "next/link";
import { formatNumber } from "@/lib/format";

export interface AnalizNoktasi {
  gun: string;
  birincil: number;
  ikincil: number;
}

interface AnalyticsChartProps {
  baslik: string;
  birincilEtiket: string;
  ikincilEtiket: string;
  veri: AnalizNoktasi[];
  /** 30 / 90 gün seçenekleri için bağlantı üretir. */
  gunSecenekleri?: { gun: number; aktif: boolean; href: string }[];
}

/**
 * Basit çubuk grafik. Harici grafik kütüphanesi kullanmadan,
 * saf CSS ile performanslı ve modüler bir görselleştirme sağlar.
 */
export function AnalyticsChart({
  baslik,
  birincilEtiket,
  ikincilEtiket,
  veri,
  gunSecenekleri,
}: AnalyticsChartProps) {
  const maksimum = Math.max(1, ...veri.map((nokta) => nokta.birincil));
  const toplamBirincil = veri.reduce((acc, nokta) => acc + nokta.birincil, 0);
  const toplamIkincil = veri.reduce((acc, nokta) => acc + nokta.ikincil, 0);

  // Grafikte çok fazla çubuk olmasın diye günlük veriyi sadeleştir.
  const adim = Math.max(1, Math.ceil(veri.length / 45));
  const gosterilecek = veri.filter((_, index) => index % adim === 0);

  return (
    <section className="tt-card flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold">{baslik}</h3>
          <p className="text-xs text-muted">
            Toplam {formatNumber(toplamBirincil)} {birincilEtiket} · {formatNumber(toplamIkincil)}{" "}
            {ikincilEtiket}
          </p>
        </div>

        {gunSecenekleri && gunSecenekleri.length > 0 ? (
          <div className="flex gap-1.5">
            {gunSecenekleri.map((secenek) => (
              <Link
                key={secenek.gun}
                href={secenek.href}
                className={`tt-chip ${secenek.aktif ? "tt-chip-active" : ""}`}
              >
                Son {secenek.gun} gün
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {veri.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted">Bu aralıkta veri bulunmuyor.</p>
      ) : (
        <div className="flex h-40 items-end gap-1" role="img" aria-label={baslik}>
          {gosterilecek.map((nokta) => {
            const yukseklik = Math.max(2, Math.round((nokta.birincil / maksimum) * 100));
            return (
              <div
                key={nokta.gun}
                className="group relative flex-1 rounded-t bg-brand transition hover:bg-brand-strong"
                style={{ height: `${yukseklik}%` }}
                title={`${nokta.gun}: ${formatNumber(nokta.birincil)} ${birincilEtiket}, ${formatNumber(
                  nokta.ikincil,
                )} ${ikincilEtiket}`}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
