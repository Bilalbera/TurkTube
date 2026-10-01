"use client";

import { useActionState } from "react";
import { IconStar } from "@/components/icons";
import { purchasePremiumAction, type ActionState } from "@/lib/actions";
import { PREMIUM_COST, PREMIUM_DURATION_DAYS } from "@/lib/constants";
import { formatNumber } from "@/lib/format";

const baslangic: ActionState = {};

interface PremiumPurchaseButtonProps {
  puan: number;
  girisYapildi: boolean;
}

/**
 * Premium satın alma butonu.
 *
 * Not: Buton yalnızca bir istek gönderir. Puan bakiyesi, süre hesabı ve
 * çift harcama kontrolü tamamen veritabanındaki "purchase_premium"
 * fonksiyonunda yapılır. İstemci tarafında puan/premium değiştirilemez.
 */
export function PremiumPurchaseButton({ puan, girisYapildi }: PremiumPurchaseButtonProps) {
  const [durum, formAction, bekliyor] = useActionState(purchasePremiumAction, baslangic);
  const yeterli = puan >= PREMIUM_COST;

  if (!girisYapildi) {
    return (
      <a href="/giris" className="tt-btn tt-btn-primary h-11 px-6">
        Giriş yap ve Premium al
      </a>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <form action={formAction}>
        <button
          type="submit"
          disabled={bekliyor || !yeterli}
          className="tt-btn tt-btn-primary h-11 px-6"
        >
          <IconStar className="h-4 w-4" />
          {bekliyor
            ? "İşleniyor..."
            : `${formatNumber(PREMIUM_COST)} puanla ${PREMIUM_DURATION_DAYS} gün Premium al`}
        </button>
      </form>

      {!yeterli ? (
        <p className="text-xs text-muted">
          Puanın yetersiz. Şu an {formatNumber(puan)} puanın var; {PREMIUM_COST - puan} puan daha
          gerekli.
        </p>
      ) : null}

      {durum.error ? <p className="text-sm text-accent">{durum.error}</p> : null}
      {durum.success ? <p className="text-sm text-brand-strong">{durum.success}</p> : null}
    </div>
  );
}
