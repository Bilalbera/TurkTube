-- ═══════════════════════════════════════════════════════════════════════════
-- TürkTube · 0003_functions.sql
-- Sunucu tarafı iş kuralları (SECURITY DEFINER):
--   · Sayaç tetikleyicileri (beğeni, abone, yorum)
--   · Bildirim tetikleyicileri
--   · register_view()  → güvenli izlenme sayacı + TürkTube Puanı
--   · set_video_reaction() / toggle_subscription() / toggle_comment_like()
--   · purchase_premium() → sunucu tarafında doğrulanan Premium satın alma
--   · Premium analiz fonksiyonları
--
-- Bu fonksiyonlar postgres sahibiyle çalıştığı için RLS'i atlar;
-- bu yüzden yetki kontrolleri fonksiyon gövdesinde AÇIKÇA yapılır.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- Sabitler
-- ─────────────────────────────────────────────────────────────
create or replace function public.turktube_view_block_size() returns bigint
language sql immutable as $$ select 100000::bigint $$;

create or replace function public.turktube_points_per_block() returns integer
language sql immutable as $$ select 10 $$;

create or replace function public.turktube_premium_cost() returns integer
language sql immutable as $$ select 100 $$;

create or replace function public.turktube_premium_days() returns integer
language sql immutable as $$ select 30 $$;

-- ─────────────────────────────────────────────────────────────
-- Premium durumu (tek doğruluk kaynağı: veritabanı)
-- ─────────────────────────────────────────────────────────────
create or replace function public.is_premium(p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.premium_until > now() from public.profiles p where p.id = p_user),
    false
  );
$$;

grant execute on function public.is_premium(uuid) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- TETİKLEYİCİ: video_reactions → like_count / dislike_count
-- ─────────────────────────────────────────────────────────────
create or replace function public.tg_video_reaction_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.videos
       set like_count    = like_count    + case when new.reaction =  1 then 1 else 0 end,
           dislike_count = dislike_count + case when new.reaction = -1 then 1 else 0 end
     where id = new.video_id;
  elsif tg_op = 'DELETE' then
    update public.videos
       set like_count    = greatest(like_count    - case when old.reaction =  1 then 1 else 0 end, 0),
           dislike_count = greatest(dislike_count - case when old.reaction = -1 then 1 else 0 end, 0)
     where id = old.video_id;
  else
    update public.videos
       set like_count = greatest(
             like_count
             - case when old.reaction =  1 then 1 else 0 end
             + case when new.reaction =  1 then 1 else 0 end, 0),
           dislike_count = greatest(
             dislike_count
             - case when old.reaction = -1 then 1 else 0 end
             + case when new.reaction = -1 then 1 else 0 end, 0)
     where id = new.video_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_video_reaction_counts on public.video_reactions;
create trigger trg_video_reaction_counts
  after insert or update or delete on public.video_reactions
  for each row execute function public.tg_video_reaction_counts();

-- ─────────────────────────────────────────────────────────────
-- TETİKLEYİCİ: subscriptions → subscriber_count
-- ─────────────────────────────────────────────────────────────
create or replace function public.tg_subscription_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.channels
     set subscriber_count = subscriber_count + 1
   where id = new.channel_id;
  return null;
end;
$$;

create or replace function public.tg_subscription_after_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.channels
     set subscriber_count = greatest(subscriber_count - 1, 0)
   where id = old.channel_id;
  return null;
end;
$$;

drop trigger if exists trg_subscription_after_insert on public.subscriptions;
create trigger trg_subscription_after_insert
  after insert on public.subscriptions
  for each row execute function public.tg_subscription_after_insert();

drop trigger if exists trg_subscription_after_delete on public.subscriptions;
create trigger trg_subscription_after_delete
  after delete on public.subscriptions
  for each row execute function public.tg_subscription_after_delete();

-- ─────────────────────────────────────────────────────────────
-- TETİKLEYİCİ: comments → comment_count + yorum bildirimi
-- ─────────────────────────────────────────────────────────────
create or replace function public.tg_comment_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner  uuid;
  v_title  text;
  v_author text;
begin
  update public.videos
     set comment_count = comment_count + 1
   where id = new.video_id;

  select c.owner_id, v.title into v_owner, v_title
    from public.videos v
    join public.channels c on c.id = v.channel_id
   where v.id = new.video_id;

  select display_name into v_author from public.profiles where id = new.author_id;

  -- Video sahibine, kendisi yorum yapmadıysa bildirim gönder.
  if v_owner is not null and v_owner <> new.author_id then
    insert into public.notifications (user_id, type, title, body, link)
    values (
      v_owner,
      'yeni_yorum',
      'Videona yeni bir yorum geldi',
      coalesce(v_author, 'Bir kullanıcı') || ': ' || left(new.content, 120),
      '/izle/' || new.video_id::text
    );
  end if;

  return null;
end;
$$;

create or replace function public.tg_comment_after_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.videos
     set comment_count = greatest(comment_count - 1, 0)
   where id = old.video_id;
  return null;
end;
$$;

drop trigger if exists trg_comment_after_insert on public.comments;
create trigger trg_comment_after_insert
  after insert on public.comments
  for each row execute function public.tg_comment_after_insert();

drop trigger if exists trg_comment_after_delete on public.comments;
create trigger trg_comment_after_delete
  after delete on public.comments
  for each row execute function public.tg_comment_after_delete();

-- ─────────────────────────────────────────────────────────────
-- TETİKLEYİCİ: yeni video → abonelere bildirim
-- ─────────────────────────────────────────────────────────────
create or replace function public.tg_video_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if new.visibility = 'public' then
    select name into v_name from public.channels where id = new.channel_id;
    insert into public.notifications (user_id, type, title, body, link)
    select s.subscriber_id,
           'yeni_video',
           coalesce(v_name, 'Kanal') || ' yeni bir video yayınladı',
           new.title,
           '/izle/' || new.id::text
      from public.subscriptions s
     where s.channel_id = new.channel_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_video_after_insert on public.videos;
create trigger trg_video_after_insert
  after insert on public.videos
  for each row execute function public.tg_video_after_insert();

-- ═══════════════════════════════════════════════════════════════════════════
-- register_view()  ·  GÜVENLİ İZLENME SAYACI + TÜRKTUBE PUANI
-- ---------------------------------------------------------------------------
-- Kurallar (tamamı veritabanında doğrulanır, istemciye güvenilmez):
--   1) Video yoksa hata verir.
--   2) En az 5 saniye izlenmemişse sayılmaz.
--   3) Kanal sahibi kendi videosunu izlerse sayılmaz (sahte izlenme engeli).
--   4) Aynı izleyici (kullanıcı ya da IP+tarayıcı) aynı videoyu 6 saat
--      içinde tekrar izlerse sayılmaz.
--   5) Aynı izleyici 24 saatte en fazla 25 geçerli izlenme üretebilir.
--   6) Geçerli izlenme 100.000'i her aştığında video sahibi +10 TürkTube
--      Puanı kazanır (her yeni 100.000'lik blok için tekrar).
--      Ödül, videos.awarded_blocks alanı ile bir kez verilir.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.register_view(
  p_video_id      uuid,
  p_watch_seconds integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user        uuid := auth.uid();
  v_video       public.videos;
  v_owner       uuid;
  v_hash_input  text;
  v_hash        text;
  v_reason      text := null;
  v_counted     boolean := false;
  v_new_count   bigint;
  v_old_blocks  integer;
  v_blocks      integer;
  v_award       integer := 0;
  v_balance     integer;
  v_milestone   bigint;
  v_recent      integer;
  v_daily       integer;
begin
  select * into v_video from public.videos where id = p_video_id;
  if not found then
    raise exception 'Video bulunamadı.';
  end if;

  select owner_id into v_owner from public.channels where id = v_video.channel_id;

  -- (2) İzleme süresi yetersiz
  if coalesce(p_watch_seconds, 0) < 5 then
    v_reason := 'izleme_suresi_yetersiz';
  end if;

  -- İzleyici kimliği: giriş yapmışsa kullanıcı, değilse IP + tarayıcı
  if v_user is not null then
    v_hash_input := 'u:' || v_user::text;
  else
    v_hash_input := 'a:'
      || coalesce(split_part(coalesce(public.request_header('x-forwarded-for'), ''), ',', 1), '')
      || '|' || coalesce(public.request_header('user-agent'), '');
  end if;
  v_hash := encode(digest(v_hash_input, 'sha256'), 'hex');

  -- (3) Kanal sahibi kendi videosunu izliyor
  if v_reason is null and v_user is not null and v_owner = v_user then
    v_reason := 'kendi_videosu';
  end if;

  -- (4) Aynı videoyu 6 saat içinde tekrar izleme
  if v_reason is null then
    select count(*) into v_recent
      from public.video_views
     where video_id = p_video_id
       and viewer_hash = v_hash
       and is_counted
       and counted_at > now() - interval '6 hours';
    if v_recent > 0 then
      v_reason := 'tekrar_izleme';
    end if;
  end if;

  -- (5) Günlük izlenme üst sınırı (otomatik/spam tıklama koruması)
  if v_reason is null then
    select count(*) into v_daily
      from public.video_views
     where viewer_hash = v_hash
       and is_counted
       and counted_at > now() - interval '24 hours';
    if v_daily >= 25 then
      v_reason := 'gunluk_limit';
    end if;
  end if;

  v_counted := (v_reason is null);

  insert into public.video_views (video_id, user_id, viewer_hash, watch_seconds, is_counted, counted_at)
  values (
    p_video_id, v_user, v_hash, coalesce(p_watch_seconds, 0),
    v_counted, case when v_counted then now() else null end
  );

  -- İzleme geçmişi (yalnızca giriş yapmış kullanıcılar için)
  if v_user is not null then
    insert into public.watch_history (user_id, video_id, watched_at, position_seconds)
    values (v_user, p_video_id, now(), coalesce(p_watch_seconds, 0))
    on conflict (user_id, video_id) do update
      set watched_at       = excluded.watched_at,
          position_seconds = greatest(public.watch_history.position_seconds, excluded.position_seconds);
  end if;

  if v_counted then
    update public.videos
       set view_count = view_count + 1
     where id = p_video_id
    returning view_count, awarded_blocks into v_new_count, v_old_blocks;

    v_blocks := (v_new_count / public.turktube_view_block_size())::integer;

    if v_blocks > v_old_blocks then
      v_award     := (v_blocks - v_old_blocks) * public.turktube_points_per_block();
      v_milestone := v_blocks::bigint * public.turktube_view_block_size();

      update public.videos set awarded_blocks = v_blocks where id = p_video_id;

      update public.profiles
         set points = points + v_award
       where id = v_owner
      returning points into v_balance;

      insert into public.point_transactions (user_id, amount, balance_after, kind, description, video_id)
      values (
        v_owner, v_award, v_balance, 'view_milestone',
        format('"%s" videosu %s izlenmeye ulaştı (+%s puan)',
               v_video.title, to_char(v_milestone, 'FM999G999G999G999'), v_award),
        p_video_id
      );

      insert into public.notifications (user_id, type, title, body, link)
      values (
        v_owner, 'puan',
        'TürkTube Puanı kazandın! 🎉',
        format('"%s" videosu %s izlenmeye ulaştı ve sana +%s TürkTube Puanı kazandırdı.',
               v_video.title, to_char(v_milestone, 'FM999G999G999G999'), v_award),
        '/puanlar'
      );
    end if;
  end if;

  return jsonb_build_object(
    'sayildi',  v_counted,
    'sebep',    v_reason,
    'izlenme',  coalesce(v_new_count, v_video.view_count),
    'puan',     v_award
  );
end;
$$;

grant execute on function public.register_view(uuid, integer) to anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- set_video_reaction()  ·  Beğeni / beğenmeme (tekrar tıklayınca kaldırır)
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.set_video_reaction(
  p_video_id uuid,
  p_reaction smallint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user     uuid := auth.uid();
  v_existing smallint;
  v_result   smallint;
  v_like     integer;
  v_dislike  integer;
begin
  if v_user is null then
    raise exception 'Bu işlem için giriş yapmalısınız.';
  end if;
  if p_reaction is null or p_reaction not in (-1, 1) then
    raise exception 'Geçersiz tepki değeri.';
  end if;
  if not exists (select 1 from public.videos where id = p_video_id) then
    raise exception 'Video bulunamadı.';
  end if;

  select reaction into v_existing
    from public.video_reactions
   where video_id = p_video_id and user_id = v_user;

  if v_existing is null then
    insert into public.video_reactions (video_id, user_id, reaction)
    values (p_video_id, v_user, p_reaction);
    v_result := p_reaction;
  elsif v_existing = p_reaction then
    delete from public.video_reactions where video_id = p_video_id and user_id = v_user;
    v_result := 0;
  else
    update public.video_reactions set reaction = p_reaction
     where video_id = p_video_id and user_id = v_user;
    v_result := p_reaction;
  end if;

  select like_count, dislike_count into v_like, v_dislike
    from public.videos where id = p_video_id;

  return jsonb_build_object('tepki', v_result, 'begeni', v_like, 'begenmeme', v_dislike);
end;
$$;

grant execute on function public.set_video_reaction(uuid, smallint) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- toggle_subscription()  ·  Abone ol / çık
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.toggle_subscription(p_channel_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user     uuid := auth.uid();
  v_owner    uuid;
  v_handle   text;
  v_exists   boolean;
  v_count    integer;
  v_name     text;
begin
  if v_user is null then
    raise exception 'Abone olmak için giriş yapmalısınız.';
  end if;

  select owner_id, handle into v_owner, v_handle
    from public.channels where id = p_channel_id;

  if v_owner is null then
    raise exception 'Kanal bulunamadı.';
  end if;
  if v_owner = v_user then
    raise exception 'Kendi kanalınıza abone olamazsınız.';
  end if;

  select exists(
    select 1 from public.subscriptions
     where channel_id = p_channel_id and subscriber_id = v_user
  ) into v_exists;

  if v_exists then
    delete from public.subscriptions
     where channel_id = p_channel_id and subscriber_id = v_user;
  else
    insert into public.subscriptions (channel_id, subscriber_id)
    values (p_channel_id, v_user);

    select display_name into v_name from public.profiles where id = v_user;

    insert into public.notifications (user_id, type, title, body, link)
    values (
      v_owner, 'yeni_abone',
      'Yeni bir abonen var! 🎉',
      coalesce(v_name, 'Bir kullanıcı') || ' kanalına abone oldu.',
      '/kanal/' || coalesce(v_handle, '')
    );
  end if;

  select subscriber_count into v_count from public.channels where id = p_channel_id;

  return jsonb_build_object('abone', not v_exists, 'abone_sayisi', v_count);
end;
$$;

grant execute on function public.toggle_subscription(uuid) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- toggle_comment_like()  ·  Yorum beğen / beğeniyi kaldır
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.toggle_comment_like(p_comment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_exists boolean;
  v_count  integer;
begin
  if v_user is null then
    raise exception 'Yorumu beğenmek için giriş yapmalısınız.';
  end if;
  if not exists (select 1 from public.comments where id = p_comment_id) then
    raise exception 'Yorum bulunamadı.';
  end if;

  select exists(
    select 1 from public.comment_likes
     where comment_id = p_comment_id and user_id = v_user
  ) into v_exists;

  if v_exists then
    delete from public.comment_likes where comment_id = p_comment_id and user_id = v_user;
    update public.comments set like_count = greatest(like_count - 1, 0) where id = p_comment_id;
  else
    insert into public.comment_likes (comment_id, user_id) values (p_comment_id, v_user);
    update public.comments set like_count = like_count + 1 where id = p_comment_id;
  end if;

  select like_count into v_count from public.comments where id = p_comment_id;

  return jsonb_build_object('begenildi', not v_exists, 'begeni', v_count);
end;
$$;

grant execute on function public.toggle_comment_like(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- HAT (security hardening)
-- ─────────────────────────────────────────────────────────────
-- Tetikleyiciler ve profil-fabrika fonksiyonları RPC ile çağrılamaz;
-- yine de savunma katmanı olarak anon/authenticated erişimini kapatıyoruz.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.tg_set_updated_at() from public, anon, authenticated;
revoke execute on function public.tg_video_reaction_counts() from public, anon, authenticated;
revoke execute on function public.tg_subscription_after_insert() from public, anon, authenticated;
revoke execute on function public.tg_subscription_after_delete() from public, anon, authenticated;
revoke execute on function public.tg_comment_after_insert() from public, anon, authenticated;
revoke execute on function public.tg_comment_after_delete() from public, anon, authenticated;
revoke execute on function public.tg_video_after_insert() from public, anon, authenticated;
grant execute on function public.handle_new_user() to postgres;
grant execute on function public.tg_set_updated_at() to postgres;
grant execute on function public.tg_video_reaction_counts() to postgres;
grant execute on function public.tg_subscription_after_insert() to postgres;
grant execute on function public.tg_subscription_after_delete() to postgres;
grant execute on function public.tg_comment_after_insert() to postgres;
grant execute on function public.tg_comment_after_delete() to postgres;
grant execute on function public.tg_video_after_insert() to postgres;

-- Puan ve Premium iş kuralları yalnızca şu RPC'lerle değiştirilebilir;
-- bunların da yetkileri açıkça tanımlıdır.
revoke execute on function public.register_view(uuid, integer) from public;
revoke execute on function public.set_video_reaction(uuid, smallint) from public;
revoke execute on function public.toggle_subscription(uuid) from public;
revoke execute on function public.toggle_comment_like(uuid) from public;
grant execute on function public.register_view(uuid, integer) to anon, authenticated;
grant execute on function public.set_video_reaction(uuid, smallint) to authenticated;
grant execute on function public.toggle_subscription(uuid) to authenticated;
grant execute on function public.toggle_comment_like(uuid) to authenticated;
