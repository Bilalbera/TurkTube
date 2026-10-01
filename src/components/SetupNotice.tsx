import { IconLogo } from "@/components/icons";

/** Supabase anahtarları girilmediğinde gösterilen kurulum ekranı. */
export function SetupNotice() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-5 py-16">
      <div className="flex items-center gap-3">
        <IconLogo className="h-10 w-10 text-brand" />
        <h1 className="text-3xl font-extrabold tracking-tight">
          Türk<span className="text-brand">Tube</span>
        </h1>
      </div>

      <div className="tt-card p-6">
        <h2 className="text-lg font-bold">Kurulum gerekli · Supabase bağlantısı yok</h2>
        <p className="mt-2 text-sm text-muted">
          Uygulama çalışıyor ancak veritabanı bağlantısı için ortam değişkenleri tanımlı değil.
          Aşağıdaki adımları tamamladıktan sonra geliştirme sunucusunu yeniden başlatın.
        </p>

        <ol className="mt-5 flex flex-col gap-4 text-sm">
          <li>
            <p className="font-semibold">1) Supabase projesi oluşturun</p>
            <p className="text-muted">
              <span className="font-mono">supabase.com</span> üzerinden yeni bir proje açın.
            </p>
          </li>
          <li>
            <p className="font-semibold">2) SQL dosyalarını sırayla çalıştırın</p>
            <p className="text-muted">
              Supabase panelindeki <span className="font-mono">SQL Editor</span> üzerinden
              <span className="font-mono"> supabase/migrations/</span> klasöründeki dosyaları
              <span className="font-mono"> 0001 → 0005</span> sırasıyla çalıştırın.
            </p>
          </li>
          <li>
            <p className="font-semibold">3) .env.local dosyasını oluşturun</p>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-surface2 p-4 font-mono text-xs leading-relaxed">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
NEXT_PUBLIC_SITE_URL=http://localhost:3000`}
            </pre>
          </li>
          <li>
            <p className="font-semibold">4) Yeniden başlatın</p>
            <p className="font-mono text-muted">npm run dev</p>
          </li>
        </ol>
      </div>

      <p className="text-center text-xs text-muted">Made By Bilal Efendi</p>
    </main>
  );
}
