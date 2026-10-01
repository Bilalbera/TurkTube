"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction, signUpAction, type ActionState } from "@/lib/actions";

const baslangic: ActionState = {};

interface AuthFormProps {
  mod: "giris" | "kayit";
}

export function AuthForm({ mod }: AuthFormProps) {
  const action = mod === "kayit" ? signUpAction : signInAction;
  const [durum, formAction, bekliyor] = useActionState(action, baslangic);
  const kayitMi = mod === "kayit";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {kayitMi ? (
        <div>
          <label className="tt-label" htmlFor="display_name">
            Görünen ad
          </label>
          <input
            id="display_name"
            name="display_name"
            required
            minLength={2}
            maxLength={60}
            autoComplete="nickname"
            placeholder="Örn: Bilal Efendi"
            className="tt-input"
          />
        </div>
      ) : null}

      <div>
        <label className="tt-label" htmlFor="email">
          E-posta
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="ornek@turktube.com"
          className="tt-input"
        />
      </div>

      <div>
        <label className="tt-label" htmlFor="password">
          Şifre
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete={kayitMi ? "new-password" : "current-password"}
          placeholder="En az 6 karakter"
          className="tt-input"
        />
      </div>

      {durum.error ? (
        <p className="rounded-xl bg-surface2 px-3 py-2 text-sm text-accent">{durum.error}</p>
      ) : null}

      {durum.success ? (
        <p className="rounded-xl bg-brand-soft px-3 py-2 text-sm text-brand-strong">{durum.success}</p>
      ) : null}

      <button type="submit" disabled={bekliyor} className="tt-btn tt-btn-primary h-11 w-full">
        {bekliyor ? "İşleniyor..." : kayitMi ? "Hesap oluştur" : "Giriş yap"}
      </button>

      <p className="text-center text-sm text-muted">
        {kayitMi ? (
          <>
            Zaten hesabın var mı?{" "}
            <Link href="/giris" className="font-semibold text-brand">
              Giriş yap
            </Link>
          </>
        ) : (
          <>
            Hesabın yok mu?{" "}
            <Link href="/kayit" className="font-semibold text-brand">
              Ücretsiz kayıt ol
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
