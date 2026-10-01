-- ═══════════════════════════════════════════════════════════════════════════
-- TürkTube · 0002_rls.sql
-- Row Level Security politikaları ve KOLON SEVİYESİNDE yetkiler.
--
-- GÜVENLİK MODELİ:
--  1) Tüm tablolarda RLS açılır ve varsayılan olarak "hiç kimse" erişemez.
--  2) anon / authenticated rollerine yalnızca GEREKLİ kolonlar için yetki verilir.
--  3) profiles.points, profiles.premium_until, videos.view_count,
--     channels.subscriber_count gibi SUNUCU tarafından yönetilen kolonlar
--     istemciye HİÇBİR ŞEKİLDE yazma yetkisi verilmez.
--     Bu kolonları yalnızca SECURITY DEFINER fonksiyonlar (0003_functions.sql)
--     değiştirebilir.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1) VARSAYILAN YETKİLERİ KALDIR
-- ─────────────────────────────────────────────────────────────
revoke all on public.profiles            from anon, authenticated;
revoke all on public.channels            from anon, authenticated;
revoke all on public.videos              from anon, authenticated;
revoke all on public.comments            from anon, authenticated;
revoke all on public.comment_likes       from anon, authenticated;
revoke all on public.video_reactions     from anon, authenticated;
revoke all on public.subscriptions       from anon, authenticated;
revoke all on public.notifications       from anon, authenticated;
revoke all on public.watch_history       from anon, authenticated;
revoke all on public.video_views         from anon, authenticated;
revoke all on public.playlists           from anon, authenticated;
revoke all on public.playlist_items      from anon, authenticated;
revoke all on public.point_transactions  from anon, authenticated;
revoke all on public.premium_purchases   from anon, authenticated;
revoke all on sequence public.video_views_id_seq        from anon, authenticated;
revoke all on sequence public.point_transactions_id_seq from anon, authenticated;
revoke all on sequence public.premium_purchases_id_seq  from anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2) KOLON SEVİYESİNDE OKUMA / YAZMA YETKİLERİ
-- ─────────────────────────────────────────────────────────────

-- PROFILES: herkes okur. Kullanıcı yalnızca kendi görünen bilgilerini yazar.
-- points & premium_until ASLA istemciden yazılamaz.
grant select on public.profiles to anon, authenticated;
grant update (display_name, avatar_url, bio, updated_at) on public.profiles to authenticated;

-- CHANNELS: herkes okur. subscriber_count istemciden yazılamaz.
grant select on public.channels to anon, authenticated;
grant insert (owner_id, name, handle, description, avatar_url, banner_url) on public.channels to authenticated;
grant update (name, handle, description, avatar_url, banner_url, updated_at) on public.channels to authenticated;
grant delete on public.channels to authenticated;

-- VIDEOS: sayaçlar (view_count, like_count, dislike_count, comment_count,
-- awarded_blocks) istemciden yazılamaz.
grant select on public.videos to anon, authenticated;
grant insert (channel_id, title, description, video_url, thumbnail_url, duration_seconds, visibility)
  on public.videos to authenticated;
grant update (title, description, thumbnail_url, duration_seconds, visibility, updated_at)
  on public.videos to authenticated;
grant delete on public.videos to authenticated;

-- COMMENTS
grant select on public.comments to anon, authenticated;
grant insert (video_id, author_id, content) on public.comments to authenticated;
grant delete on public.comments to authenticated;
-- like_count istemciden yazılamaz

-- COMMENT_LIKES: yalnızca okuma (yazma işlemleri RPC fonksiyonlarından geçer)
grant select on public.comment_likes to authenticated;

-- VIDEO_REACTIONS: yalnızca okuma (yazma işlemleri RPC fonksiyonlarından geçer)
grant select on public.video_reactions to authenticated;

-- SUBSCRIPTIONS: yalnızca okuma (yazma işlemleri RPC fonksiyonlarından geçer)
grant select on public.subscriptions to authenticated;

-- NOTIFICATIONS: kullanıcı yalnızca okundu işaretleyebilir / silebilir.
grant select on public.notifications to authenticated;
grant update (is_read) on public.notifications to authenticated;
grant delete on public.notifications to authenticated;

-- WATCH_HISTORY
grant select on public.watch_history to authenticated;
grant insert (user_id, video_id, watched_at, position_seconds) on public.watch_history to authenticated;
grant update (watched_at, position_seconds) on public.watch_history to authenticated;
grant delete on public.watch_history to authenticated;

-- VIDEO_VIEWS: hiçbir doğrudan erişim yok (yalnızca sunucu tarafı fonksiyonlar).
-- (grant yok = erişim yok)

-- PLAYLISTS
grant select on public.playlists to anon, authenticated;
grant insert (owner_id, title, description, visibility) on public.playlists to authenticated;
grant update (title, description, visibility, updated_at) on public.playlists to authenticated;
grant delete on public.playlists to authenticated;

-- PLAYLIST_ITEMS
grant select on public.playlist_items to anon, authenticated;
grant insert (playlist_id, video_id, position) on public.playlist_items to authenticated;
grant update (position) on public.playlist_items to authenticated;
grant delete on public.playlist_items to authenticated;

-- POINT_TRANSACTIONS: yalnızca kullanıcı kendi geçmişini OKUR.
-- Yazma yetkisi YOK - puan hareketleri sadece veritabanı fonksiyonlarıyla oluşur.
grant select on public.point_transactions to authenticated;

-- PREMIUM_PURCHASES: yalnızca kullanıcı kendi geçmişini OKUR.
grant select on public.premium_purchases to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 3) ROW LEVEL SECURITY'Yİ AÇ
-- ─────────────────────────────────────────────────────────────
alter table public.profiles           enable row level security;
alter table public.channels           enable row level security;
alter table public.videos             enable row level security;
alter table public.comments           enable row level security;
alter table public.comment_likes      enable row level security;
alter table public.video_reactions    enable row level security;
alter table public.subscriptions      enable row level security;
alter table public.notifications      enable row level security;
alter table public.watch_history      enable row level security;
alter table public.video_views        enable row level security;
alter table public.playlists          enable row level security;
alter table public.playlist_items     enable row level security;
alter table public.point_transactions enable row level security;
alter table public.premium_purchases  enable row level security;

-- ─────────────────────────────────────────────────────────────
-- 4) POLİTİKALAR
-- ─────────────────────────────────────────────────────────────

-- PROFILES ────────────────────────────────────────────────────
drop policy if exists "profiles_okuma" on public.profiles;
create policy "profiles_okuma" on public.profiles
  for select using (true);

drop policy if exists "profiles_kendi_guncelleme" on public.profiles;
create policy "profiles_kendi_guncelleme" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- CHANNELS ────────────────────────────────────────────────────
drop policy if exists "channels_okuma" on public.channels;
create policy "channels_okuma" on public.channels
  for select using (true);

drop policy if exists "channels_kendi_olusturma" on public.channels;
create policy "channels_kendi_olusturma" on public.channels
  for insert with check (auth.uid() = owner_id);

drop policy if exists "channels_kendi_guncelleme" on public.channels;
create policy "channels_kendi_guncelleme" on public.channels
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "channels_kendi_silme" on public.channels;
create policy "channels_kendi_silme" on public.channels
  for delete using (auth.uid() = owner_id);

-- VIDEOS ──────────────────────────────────────────────────────
-- "private" videolar yalnızca kanal sahibi tarafından görülür.
drop policy if exists "videos_okuma" on public.videos;
create policy "videos_okuma" on public.videos
  for select using (
    visibility <> 'private'
    or exists (
      select 1 from public.channels c
      where c.id = videos.channel_id and c.owner_id = auth.uid()
    )
  );

drop policy if exists "videos_kendi_kanalina_ekleme" on public.videos;
create policy "videos_kendi_kanalina_ekleme" on public.videos
  for insert with check (
    exists (
      select 1 from public.channels c
      where c.id = videos.channel_id and c.owner_id = auth.uid()
    )
  );

drop policy if exists "videos_kendi_guncelleme" on public.videos;
create policy "videos_kendi_guncelleme" on public.videos
  for update using (
    exists (
      select 1 from public.channels c
      where c.id = videos.channel_id and c.owner_id = auth.uid()
    )
  );

drop policy if exists "videos_kendi_silme" on public.videos;
create policy "videos_kendi_silme" on public.videos
  for delete using (
    exists (
      select 1 from public.channels c
      where c.id = videos.channel_id and c.owner_id = auth.uid()
    )
  );

-- COMMENTS ────────────────────────────────────────────────────
drop policy if exists "comments_okuma" on public.comments;
create policy "comments_okuma" on public.comments
  for select using (true);

drop policy if exists "comments_yorum_yazma" on public.comments;
create policy "comments_yorum_yazma" on public.comments
  for insert with check (auth.uid() = author_id);

-- Yorum sahibi veya video sahibi silebilir (moderasyon).
drop policy if exists "comments_silme" on public.comments;
create policy "comments_silme" on public.comments
  for delete using (
    auth.uid() = author_id
    or exists (
      select 1 from public.videos v
      join public.channels c on c.id = v.channel_id
      where v.id = comments.video_id and c.owner_id = auth.uid()
    )
  );

-- COMMENT_LIKES ───────────────────────────────────────────────
drop policy if exists "comment_likes_kendi" on public.comment_likes;
create policy "comment_likes_kendi" on public.comment_likes
  for select using (auth.uid() = user_id);

-- VIDEO_REACTIONS ─────────────────────────────────────────────
drop policy if exists "video_reactions_kendi" on public.video_reactions;
create policy "video_reactions_kendi" on public.video_reactions
  for select using (auth.uid() = user_id);

-- SUBSCRIPTIONS ───────────────────────────────────────────────
drop policy if exists "subscriptions_kendi" on public.subscriptions;
create policy "subscriptions_kendi" on public.subscriptions
  for select using (auth.uid() = subscriber_id);

-- NOTIFICATIONS ───────────────────────────────────────────────
drop policy if exists "notifications_kendi_okuma" on public.notifications;
create policy "notifications_kendi_okuma" on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "notifications_kendi_guncelleme" on public.notifications;
create policy "notifications_kendi_guncelleme" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notifications_kendi_silme" on public.notifications;
create policy "notifications_kendi_silme" on public.notifications
  for delete using (auth.uid() = user_id);

-- WATCH_HISTORY ───────────────────────────────────────────────
drop policy if exists "watch_history_kendi_tumu" on public.watch_history;
create policy "watch_history_kendi_tumu" on public.watch_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- PLAYLISTS ───────────────────────────────────────────────────
drop policy if exists "playlists_okuma" on public.playlists;
create policy "playlists_okuma" on public.playlists
  for select using (visibility <> 'private' or auth.uid() = owner_id);

drop policy if exists "playlists_yonetim" on public.playlists;
create policy "playlists_yonetim" on public.playlists
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- PLAYLIST_ITEMS ──────────────────────────────────────────────
drop policy if exists "playlist_items_okuma" on public.playlist_items;
create policy "playlist_items_okuma" on public.playlist_items
  for select using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_items.playlist_id
        and (p.visibility <> 'private' or p.owner_id = auth.uid())
    )
  );

drop policy if exists "playlist_items_yonetim" on public.playlist_items;
create policy "playlist_items_yonetim" on public.playlist_items
  for all using (
    exists (select 1 from public.playlists p where p.id = playlist_items.playlist_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.playlists p where p.id = playlist_items.playlist_id and p.owner_id = auth.uid())
  );

-- POINT_TRANSACTIONS ──────────────────────────────────────────
drop policy if exists "point_transactions_kendi" on public.point_transactions;
create policy "point_transactions_kendi" on public.point_transactions
  for select using (auth.uid() = user_id);

-- PREMIUM_PURCHASES ───────────────────────────────────────────
drop policy if exists "premium_purchases_kendi" on public.premium_purchases;
create policy "premium_purchases_kendi" on public.premium_purchases
  for select using (auth.uid() = user_id);

-- VIDEO_VIEWS: politika tanımlanmaz. Yetki de verilmediği için
-- istemci bu tabloya hiçbir şekilde erişemez (yalnızca sunucu fonksiyonları).
