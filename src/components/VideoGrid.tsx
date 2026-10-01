import { VideoCard } from "@/components/VideoCard";
import type { VideoWithChannel } from "@/lib/types";

interface VideoGridProps {
  videos: VideoWithChannel[];
  hideChannel?: boolean;
  /** Geniş ekranda daha sık kolonlar (kanal sayfası) */
  dense?: boolean;
}

export function VideoGrid({ videos, hideChannel = false, dense = false }: VideoGridProps) {
  return (
    <div
      className={
        dense
          ? "grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
          : "grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      }
    >
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} hideChannel={hideChannel} />
      ))}
    </div>
  );
}
