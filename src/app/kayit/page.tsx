import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { IconCheck } from "@/components/icons";
import { getCurrentUserId } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kayıt ol" };

const AVANTAJLAR = [
  "Video yükle, kanal oluştur",
  "Her 100.000 gerçek izlenmede +10 TürkTube Puanı",
  "Puanlarınla TürkTube Premium'a geç",
  "Beğen, yorum yap, abone ol, bildirim al",
];

export default async function KayitSayfasi() {
  if (await getCurrentUserId()) redirect("/");

  return (
    <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-6 py-6 lg:grid-cols-[1fr_1.1fr]">
      <section className="flex flex-col gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight">TürkTube&apos;a katıl</h1>
        <p className="text-sm text-muted">
          Ücretsiz hesap oluştur, kanalını aç ve izlenme başına TürkTube Puanı kazanmaya başla.
        </p>

        <ul className="flex flex-col gap-2.5">
          {AVANTAJLAR.map((madde) => (
            <li key={madde} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-strong">
                <IconCheck className="h-3.5 w-3.5" />
              </span>
              {madde}
            </li>
          ))}
        </ul>
      </section>

      <div className="tt-card p-5">
        <AuthForm mod="kayit" />
      </div>
    </div>
  );
}
