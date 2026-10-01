import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { IconPlay } from "@/components/icons";
import { formatDuration, formatViews, timeAgo } from "@/lib/format";
import { VIDEO_VISIBILITY_LABELS } from "@/lib/constants";
import type { VideoWithChannel } from "@/lib/types";

interface VideoCardProps {
  video: VideoWithChannel;
  /** Kanal bilgisini gizlemek için (kanal sayfasında kullanılır). */
  hideChannel?: boolean;
}

export function VideoCard({ video, hideChannel = false }: VideoCardProps) {
  const kanal = video.channels;

  return (
    <article className="group flex flex-col gap-2.5">
      <Link
        href={`/izle/${video.id}`}
        className="relative block aspect-video w-full overflow-hidden rounded-card bg-surface2"
      >
        {video.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-muted">
            <IconPlay className="h-10 w-10 opacity-40" />
          </span>
        )}

        {video.duration_seconds > 0 ? (
          <span className="absolute right-2 bottom-2 rounded-md bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold text-white">
            {formatDuration(video.duration_seconds)}
          </span>
        ) : null}

        {video.visibility !== "public" ? (
          <span className="absolute top-2 left-2 rounded-md bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold text-white">
            {VIDEO_VISIBILITY_LABELS[video.visibility]}
          </span>
        ) : null}
      </Link>

      <div className="flex gap-3">
        {!hideChannel && kanal ? (
          <Link href={`/kanal/${kanal.handle}`} className="mt-0.5 shrink-0">
            <Avatar name={kanal.name} src={kanal.avatar_url} size={36} />
          </Link>
        ) : null}

        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm leading-snug font-semibold">
            <Link href={`/izle/${video.id}`} className="hover:text-brand">
              {video.title}
            </Link>
          </h3>

          {!hideChannel && kanal ? (
            <Link href={`/kanal/${kanal.handle}`} className="mt-1 block truncate text-xs text-muted hover:text-fg">
              {kanal.name}
            </Link>
          ) : null}

          <p className="mt-0.5 text-xs text-muted">
            {formatViews(video.view_count)} · {timeAgo(video.created_at)}
          </p>
        </div>
      </div>
    </article>
  );
}
