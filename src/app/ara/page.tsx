import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { VideoGrid } from "@/components/VideoGrid";
import { IconSearch } from "@/components/icons";
import { searchChannels, searchVideos } from "@/lib/queries";
import { formatSubscribers } from "@/lib/format";

export const dynamic = "force-dynamic";

interface AraSayfasiProps {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: AraSayfasiProps) {
  const { q } = await searchParams;
  return { title: q ? `"${q}" için sonuçlar` : "Arama" };
}

export default async function AraSayfasi({ searchParams }: AraSayfasiProps) {
  const { q } = await searchParams;
  const terim = (q ?? "").trim();

  if (!terim) {
    return (
      <EmptyState
        baslik="Ne izlemek istersin?"
        aciklama="Yukarıdaki arama alanına bir video başlığı veya kanal adı yaz."
        ikon={<IconSearch className="h-10 w-10" />}
      />
    );
  }

  const [videolar, kanallar] = await Promise.all([
    searchVideos(terim, 40),
    searchChannels(terim, 6),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-extrabold tracking-tight">
          &ldquo;{terim}&rdquo; için sonuçlar
        </h1>
        <p className="text-sm text-muted">
          {videolar.length} video · {kanallar.length} kanal bulundu
        </p>
      </header>

      {kanallar.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold tracking-wide text-muted uppercase">Kanallar</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {kanallar.map((kanal) => (
              <Link
                key={kanal.id}
                href={`/kanal/${kanal.handle}`}
                className="tt-card flex items-center gap-3 p-3 transition hover:border-brand"
              >
                <Avatar name={kanal.name} src={kanal.avatar_url} size={48} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{kanal.name}</p>
                  <p className="truncate text-xs text-muted">
                    @{kanal.handle} · {formatSubscribers(kanal.subscriber_count)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold tracking-wide text-muted uppercase">Videolar</h2>
        {videolar.length === 0 ? (
          <EmptyState
            baslik="Video bulunamadı"
            aciklama="Farklı bir arama terimi deneyebilir veya Keşfet sayfasına göz atabilirsin."
            ikon={<IconSearch className="h-10 w-10" />}
            aksiyon={{ etiket: "Keşfet", href: "/kesfet" }}
          />
        ) : (
          <VideoGrid videos={videolar} />
        )}
      </section>
    </div>
  );
}
