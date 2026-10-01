import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { UploadForm } from "@/components/UploadForm";
import { IconVideo } from "@/components/icons";
import { getSession } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Video yükle" };

export default async function YukleSayfasi() {
  const session = await getSession();

  if (!session.userId) redirect("/giris");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight">Video yükle</h1>
        <p className="text-sm text-muted">
          Videonu yayınla, izlenme topla ve her 100.000 gerçek izlenmede +10 TürkTube Puanı kazan.
        </p>
      </header>

      {!session.channel ? (
        <EmptyState
          baslik="Önce bir kanal oluşturmalısın"
          aciklama="Video yüklemek için kanal sayfasına ihtiyacın var. Ayarlardan birkaç saniyede kanalını oluşturabilirsin."
          ikon={<IconVideo className="h-10 w-10" />}
          aksiyon={{ etiket: "Kanal oluştur", href: "/profil/ayarlar" }}
        />
      ) : (
        <>
          <UploadForm
            userId={session.userId}
            kanalAdi={session.channel.name}
            isPremium={session.isPremium}
          />
          <p className="text-xs text-muted">
            Yüklenen videolar Supabase Storage üzerinde saklanır ve boyut sınırları uygulanır.
            İzlenmeler yalnızca gerçek izleyicilerden sayılır.{" "}
            <Link href="/puanlar" className="font-semibold text-brand">
              Puan sistemini incele →
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
