import { createClient } from "@/lib/supabase/server";
import type { Channel, CommentWithAuthor, Profile, Video, VideoWithChannel } from "@/lib/types";

/** Oturum sahibi kullanıcı + profili. */
export interface SessionInfo {
  userId: string | null;
  profile: Profile | null;
  isPremium: boolean;
  channel: Channel | null;
  unreadNotifications: number;
}

const VIDEO_WITH_CHANNEL =
  "id, channel_id, title, description, video_url, thumbnail_url, duration_seconds, visibility, view_count, like_count, dislike_count, comment_count, awarded_blocks, created_at, updated_at, channels(id, name, handle, avatar_url, owner_id, subscriber_count)";

/** Sunucu tarafı oturum bilgisini tek seferde toplar. */
export async function getSession(): Promise<SessionInfo> {
  const empty: SessionInfo = {
    userId: null,
    profile: null,
    isPremium: false,
    channel: null,
    unreadNotifications: 0,
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return empty;

  const [profileRes, channelRes, notifRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("channels").select("*").eq("owner_id", user.id).maybeSingle(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false),
  ]);

  const profile = (profileRes.data as Profile | null) ?? null;

  return {
    userId: user.id,
    profile,
    isPremium: Boolean(profile?.premium_until && new Date(profile.premium_until) > new Date()),
    channel: (channelRes.data as Channel | null) ?? null,
    unreadNotifications: notifRes.count ?? 0,
  };
}

/** Yalnızca kullanıcı kimliği gereken yerler için hafif sorgu. */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function listVideos(
  options: {
    limit?: number;
    orderBy?: "created_at" | "view_count";
    channelId?: string;
    excludeIds?: string[];
  } = {},
): Promise<VideoWithChannel[]> {
  const supabase = await createClient();
  const { limit = 24, orderBy = "created_at", channelId, excludeIds } = options;

  let query = supabase
    .from("videos")
    .select(VIDEO_WITH_CHANNEL)
    .eq("visibility", "public")
    .order(orderBy, { ascending: false })
    .limit(limit);

  if (channelId) query = query.eq("channel_id", channelId);
  if (excludeIds && excludeIds.length > 0) {
    query = query.not("id", "in", `(${excludeIds.join(",")})`);
  }

  const { data } = await query;
  return (data as unknown as VideoWithChannel[]) ?? [];
}

export async function searchVideos(term: string, limit = 40): Promise<VideoWithChannel[]> {
  const supabase = await createClient();
  const safe = term.replace(/[%,()]/g, " ").trim();
  if (!safe) return [];

  const { data } = await supabase
    .from("videos")
    .select(VIDEO_WITH_CHANNEL)
    .eq("visibility", "public")
    .or(`title.ilike.%${safe}%,description.ilike.%${safe}%`)
    .order("view_count", { ascending: false })
    .limit(limit);

  return (data as unknown as VideoWithChannel[]) ?? [];
}

export async function searchChannels(term: string, limit = 8): Promise<Channel[]> {
  const supabase = await createClient();
  const safe = term.replace(/[%,()]/g, " ").trim();
  if (!safe) return [];

  const { data } = await supabase
    .from("channels")
    .select("*")
    .or(`name.ilike.%${safe}%,handle.ilike.%${safe}%`)
    .order("subscriber_count", { ascending: false })
    .limit(limit);

  return (data as Channel[]) ?? [];
}

export async function getVideoById(id: string): Promise<VideoWithChannel | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("videos")
    .select(VIDEO_WITH_CHANNEL)
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as VideoWithChannel | null) ?? null;
}

export async function getChannelByHandle(handle: string): Promise<Channel | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("channels")
    .select("*")
    .eq("handle", handle.toLowerCase())
    .maybeSingle();
  return (data as Channel | null) ?? null;
}

export async function getChannelVideos(
  channelId: string,
  limit = 60,
  includePrivate = false,
): Promise<Video[]> {
  const supabase = await createClient();
  let query = supabase
    .from("videos")
    .select("*")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!includePrivate) query = query.neq("visibility", "private");

  const { data } = await query;
  return (data as Video[]) ?? [];
}

export async function getChannelVideosWithChannel(
  channelId: string,
  limit = 60,
  includePrivate = false,
): Promise<VideoWithChannel[]> {
  const supabase = await createClient();
  let query = supabase
    .from("videos")
    .select(VIDEO_WITH_CHANNEL)
    .eq("channel_id", channelId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!includePrivate) query = query.neq("visibility", "private");

  const { data } = await query;
  return (data as unknown as VideoWithChannel[]) ?? [];
}

export interface VideoAnalyticsPoint {
  gun: string;
  izlenme: number;
  benzersiz_izleyici: number;
}

export interface ChannelAnalyticsPoint {
  gun: string;
  izlenme: number;
  yeni_abone: number;
}

export async function getVideoAnalytics(
  videoId: string,
  days: number,
): Promise<{ data: VideoAnalyticsPoint[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_video_analytics", {
    p_video_id: videoId,
    p_days: days,
  });
  if (error) return { data: [], error: error.message };
  return { data: (data as VideoAnalyticsPoint[]) ?? [], error: null };
}

export async function getChannelAnalytics(
  channelId: string,
  days: number,
): Promise<{ data: ChannelAnalyticsPoint[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_channel_analytics", {
    p_channel_id: channelId,
    p_days: days,
  });
  if (error) return { data: [], error: error.message };
  return { data: (data as ChannelAnalyticsPoint[]) ?? [], error: null };
}

export async function getVideoComments(videoId: string, limit = 50): Promise<CommentWithAuthor[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("comments")
    .select(
      "id, video_id, author_id, content, like_count, created_at, profiles(id, display_name, avatar_url)",
    )
    .eq("video_id", videoId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as unknown as CommentWithAuthor[]) ?? [];
}

/** Kullanıcının video tepkisi: 1 / -1 / 0 */
export async function getUserReaction(videoId: string, userId: string | null): Promise<number> {
  if (!userId) return 0;
  const supabase = await createClient();
  const { data } = await supabase
    .from("video_reactions")
    .select("reaction")
    .eq("video_id", videoId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as { reaction: number } | null)?.reaction ?? 0;
}

/** Kullanıcının beğendiği yorumların kimlikleri. */
export async function getLikedCommentIds(
  videoId: string,
  userId: string | null,
): Promise<string[]> {
  if (!userId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("comment_likes")
    .select("comment_id, comments!inner(video_id)")
    .eq("user_id", userId)
    .eq("comments.video_id", videoId);
  return ((data as unknown as { comment_id: string }[]) ?? []).map((row) => row.comment_id);
}

export async function isSubscribed(channelId: string, userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("channel_id")
    .eq("channel_id", channelId)
    .eq("subscriber_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export interface PlaylistSummary {
  id: string;
  title: string;
  visibility: string;
  created_at: string;
}

export async function listUserPlaylists(userId: string): Promise<PlaylistSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("playlists")
    .select("id, title, visibility, created_at")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });
  return (data as PlaylistSummary[]) ?? [];
}

