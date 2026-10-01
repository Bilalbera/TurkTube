/**
 * Veritabanı satır tipleri (supabase/sql şemasının TypeScript karşılığı).
 */

export type VideoVisibility = "public" | "unlisted" | "private";
export type PointTxKind = "view_milestone" | "premium_purchase" | "admin_adjust";

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  points: number;
  premium_until: string | null;
  premium_started_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Channel {
  id: string;
  owner_id: string;
  name: string;
  handle: string;
  description: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  subscriber_count: number;
  created_at: string;
  updated_at: string;
}

export interface Video {
  id: string;
  channel_id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number;
  visibility: VideoVisibility;
  view_count: number;
  like_count: number;
  dislike_count: number;
  comment_count: number;
  awarded_blocks: number;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  video_id: string;
  author_id: string;
  content: string;
  like_count: number;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface WatchHistoryRow {
  user_id: string;
  video_id: string;
  watched_at: string;
  position_seconds: number;
}

export interface Playlist {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  visibility: VideoVisibility;
  created_at: string;
  updated_at: string;
}

export interface PointTransaction {
  id: number;
  user_id: string;
  amount: number;
  balance_after: number;
  kind: PointTxKind;
  description: string;
  video_id: string | null;
  created_at: string;
}

export interface PremiumPurchase {
  id: number;
  user_id: string;
  points_spent: number;
  days: number;
  starts_at: string;
  ends_at: string;
  created_at: string;
}

/** İlişkili kanal bilgisiyle birlikte video. */
export type VideoWithChannel = Video & {
  channels:
    | Pick<Channel, "id" | "name" | "handle" | "avatar_url" | "owner_id" | "subscriber_count">
    | null;
};

/** İlişkili yazar bilgisiyle birlikte yorum. */
export type CommentWithAuthor = Comment & {
  profiles: Pick<Profile, "id" | "display_name" | "avatar_url"> | null;
};
