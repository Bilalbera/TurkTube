import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUserId } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Giriş yap" };

export default async function GirisSayfasi() {
  // Zaten giriş yapmış kullanıcıyı doğrudan ana sayfaya yönlendir.
  if (await getCurrentUserId()) redirect("/");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 py-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight">Tekrar hoş geldin</h1>
        <p className="text-sm text-muted">
          TürkTube hesabına giriş yaparak beğen, yorum yap, abone ol ve puan kazan.
        </p>
      </header>

      <div className="tt-card p-5">
        <AuthForm mod="giris" />
      </div>
    </div>
  );
}
