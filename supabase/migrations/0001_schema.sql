-- ═══════════════════════════════════════════════════════════════════════════
-- TürkTube · 0001_schema.sql
-- Temel şema: profil, kanal, video, yorum, beğeni, abonelik, bildirim,
-- izleme geçmişi, izlenme kayıtları, oynatma listeleri,
-- TürkTube Puanı defteri ve Premium kayıtları.
--
-- Bu dosyayı Supabase panelinde "SQL Editor" içinde çalıştırın.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Yardımcı fonksiyonlar
-- ─────────────────────────────────────────────────────────────

-- updated_at kolonunu otomatik günceller
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- PostgREST isteğinden bir HTTP başlığını güvenli şekilde okur.
-- (İzlenme puanlamasında spam tespiti için x-forwarded-for / user-agent kullanılır.)
create or replace function public.request_header(p_name text)
returns text
language plpgsql
stable
as $$
declare
  v_value text;
begin
  begin
    v_value := current_setting('request.headers', true)::jsonb ->> p_name;
  exception when others then
    v_value := null;
  end;
  return v_value;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- ENUM tipleri
-- ─────────────────────────────────────────────────────────────
do $$ begin
  create type public.video_visibility as enum ('public', 'unlisted', 'private');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.point_tx_kind as enum ('view_milestone', 'premium_purchase', 'admin_adjust');
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────
-- PROFILES  (auth.users ile 1-1)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  display_name       text not null check (char_length(display_name) between 1 and 60),
  avatar_url         text,
  bio                text check (bio is null or char_length(bio) <= 500),
  points             integer not null default 0 check (points >= 0),
  premium_until      timestamptz,
  premium_started_at timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on column public.profiles.points is
  'TürkTube Puanı. Yalnızca SECURITY DEFINER fonksiyonlar değiştirebilir.';
comment on column public.profiles.premium_until is
  'Premium bitiş tarihi. premium_until > now() ise Premium aktiftir.';

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.tg_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- CHANNELS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.channels (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null unique references auth.users(id) on delete cascade,
  name             text not null check (char_length(name) between 2 and 60),
  handle           text not null unique check (handle ~ '^[a-z0-9_]{3,30}$'),
  description      text check (description is null or char_length(description) <= 1000),
  avatar_url       text,
  banner_url       text,
  subscriber_count integer not null default 0 check (subscriber_count >= 0),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_channels_handle on public.channels (handle);

drop trigger if exists trg_channels_updated_at on public.channels;
create trigger trg_channels_updated_at
  before update on public.channels
  for each row execute function public.tg_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- VIDEOS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.videos (
  id               uuid primary key default gen_random_uuid(),
  channel_id       uuid not null references public.channels(id) on delete cascade,
  title            text not null check (char_length(title) between 1 and 120),
  description      text check (description is null or char_length(description) <= 5000),
  video_url        text not null,
  thumbnail_url    text,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  visibility       public.video_visibility not null default 'public',
  view_count       bigint not null default 0 check (view_count >= 0),
  like_count       integer not null default 0 check (like_count >= 0),
  dislike_count    integer not null default 0 check (dislike_count >= 0),
  comment_count    integer not null default 0 check (comment_count >= 0),
  -- Puan sistemi: bu videodan dolayı ödül verilmiş 100.000'lik blok sayısı.
  awarded_blocks   integer not null default 0 check (awarded_blocks >= 0),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_videos_channel_created on public.videos (channel_id, created_at desc);
create index if not exists idx_videos_created on public.videos (created_at desc);
create index if not exists idx_videos_views on public.videos (view_count desc);

drop trigger if exists trg_videos_updated_at on public.videos;
create trigger trg_videos_updated_at
  before update on public.videos
  for each row execute function public.tg_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- COMMENTS + COMMENT_LIKES
-- ─────────────────────────────────────────────────────────────
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  video_id   uuid not null references public.videos(id) on delete cascade,
  author_id  uuid not null references auth.users(id) on delete cascade,
  content    text not null check (char_length(content) between 1 and 2000),
  like_count integer not null default 0 check (like_count >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_comments_video on public.comments (video_id, created_at desc);

create table if not exists public.comment_likes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

-- ─────────────────────────────────────────────────────────────
-- VIDEO_REACTIONS  (beğeni / beğenmeme)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.video_reactions (
  video_id   uuid not null references public.videos(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  reaction   smallint not null check (reaction in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (video_id, user_id)
);

-- ─────────────────────────────────────────────────────────────
-- SUBSCRIPTIONS  (abonelik)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.subscriptions (
  channel_id    uuid not null references public.channels(id) on delete cascade,
  subscriber_id uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (channel_id, subscriber_id)
);

create index if not exists idx_subscriptions_subscriber on public.subscriptions (subscriber_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- NOTIFICATIONS  (bildirimler)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  link       text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications (user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- WATCH_HISTORY  (izleme geçmişi)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.watch_history (
  user_id          uuid not null references auth.users(id) on delete cascade,
  video_id         uuid not null references public.videos(id) on delete cascade,
  watched_at       timestamptz not null default now(),
  position_seconds integer not null default 0 check (position_seconds >= 0),
  primary key (user_id, video_id)
);

create index if not exists idx_watch_history_user on public.watch_history (user_id, watched_at desc);

-- ─────────────────────────────────────────────────────────────
-- VIDEO_VIEWS  (ham izlenme kayıtları - spam tespiti için)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.video_views (
  id            bigserial primary key,
  video_id      uuid not null references public.videos(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete set null,
  viewer_hash   text not null,
  watch_seconds integer not null default 0 check (watch_seconds >= 0),
  is_counted    boolean not null default false,
  counted_at    timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists idx_video_views_video_counted on public.video_views (video_id, counted_at);
create index if not exists idx_video_views_viewer on public.video_views (viewer_hash, counted_at);

-- ─────────────────────────────────────────────────────────────
-- PLAYLISTS + PLAYLIST_ITEMS  (oynatma listeleri)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.playlists (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  description text check (description is null or char_length(description) <= 1000),
  visibility  public.video_visibility not null default 'public',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_playlists_updated_at on public.playlists;
create trigger trg_playlists_updated_at
  before update on public.playlists
  for each row execute function public.tg_set_updated_at();

create table if not exists public.playlist_items (
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  video_id    uuid not null references public.videos(id) on delete cascade,
  position    integer not null default 0,
  added_at    timestamptz not null default now(),
  primary key (playlist_id, video_id)
);

-- ─────────────────────────────────────────────────────────────
-- POINT_TRANSACTIONS  (TürkTube Puanı kazanma / harcama defteri)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.point_transactions (
  id            bigserial primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  amount        integer not null,
  balance_after integer not null check (balance_after >= 0),
  kind          public.point_tx_kind not null,
  description   text not null,
  video_id      uuid references public.videos(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_point_tx_user on public.point_transactions (user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- PREMIUM_PURCHASES  (Premium satın alım geçmişi)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.premium_purchases (
  id           bigserial primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  points_spent integer not null check (points_spent > 0),
  days         integer not null check (days > 0),
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_premium_purchases_user on public.premium_purchases (user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- Yeni kullanıcı için otomatik profil oluştur
-- ─────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      split_part(coalesce(new.email, 'kullanici'), '@', 1)
    ),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
