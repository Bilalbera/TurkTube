-- ═══════════════════════════════════════════════════════════════════════════
-- TürkTube · 0004_premium.sql
-- TürkTube Premium: satın alma, süre yönetimi ve Premium analizleri.
--
-- GÜVENLİK:
--   · premium_until kolonu istemciye hiçbir şekilde açık değildir
--     (0002_rls.sql içinde GRANT UPDATE listesinde yer almaz).
--   · Premium yalnızca purchase_premium() fonksiyonu ile açılabilir.
--   · Satın alma sırasında profil satırı SELECT ... FOR UPDATE ile kilitlenir;
--     böylece aynı puanların iki kez harcanması (race condition) engellenir.
--   · Premium durumu TÜREVDİR: premium_until > now().
--     Süre bittiğinde tüm Premium özellikleri otomatik olarak kapanır.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.purchase_premium()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_cost    integer := public.turktube_premium_cost();
  v_days    integer := public.turktube_premium_days();
  v_now     timestamptz := now();
  v_profile public.profiles;
  v_start   timestamptz;
  v_end     timestamptz;
  v_balance integer;
begin
  if v_user is null then
    raise exception 'Premium satın almak için giriş yapmalısınız.';
  end if;

  -- Satırı kilitle: çift harcamayı engeller.
  select * into v_profile from public.profiles where id = v_user for update;
  if not found then
    raise exception 'Profil bulunamadı.';
  end if;

  if v_profile.points < v_cost then
    raise exception 'Yetersiz TürkTube Puanı. Gerekli: % puan, mevcut: % puan.', v_cost, v_profile.points;
  end if;

  -- Mevcut Premium varsa süreyi üstüne ekle (stack), yoksa şimdiden başlat.
  v_start := greatest(coalesce(v_profile.premium_until, v_now), v_now);
  v_end   := v_start + make_interval(days => v_days);

  update public.profiles
     set points             = points - v_cost,
         premium_until      = v_end,
         premium_started_at = coalesce(premium_started_at, v_now)
   where id = v_user
  returning points into v_balance;

  insert into public.point_transactions (user_id, amount, balance_after, kind, description)
  values (
    v_user, -v_cost, v_balance, 'premium_purchase',
    format('TürkTube Premium satın alındı (%s gün)', v_days)
  );

  insert into public.premium_purchases (user_id, points_spent, days, starts_at, ends_at)
  values (v_user, v_cost, v_days, v_start, v_end);

  insert into public.notifications (user_id, type, title, body, link)
  values (
    v_user, 'premium',
    'TürkTube Premium aktif! ⭐',
    format('Premium üyeliğin %s tarihine kadar geçerli.', to_char(v_end, 'DD.MM.YYYY HH24:MI')),
    '/premium'
  );

  return jsonb_build_object(
    'basarili',   true,
    'harcanan',   v_cost,
    'gun',        v_days,
    'baslangic',  v_start,
    'bitis',      v_end,
    'kalan_puan', v_balance
  );
end;
$$;

grant execute on function public.purchase_premium() to authenticated;

-- Satın alma ve analiz RPC'lerine anon erişimi kapatılır.
revoke execute on function public.purchase_premium() from public, anon;
grant execute on function public.purchase_premium() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Süresi dolan Premium üyelikler için bilgilendirme.
-- (Premium durumu zaten türevdir; bu fonksiyon yalnızca hatırlatma
--  bildirimi üretir. Supabase "Cron" ile günlük çalıştırılabilir.)
-- ─────────────────────────────────────────────────────────────
create or replace function public.notify_expired_premium()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  with expired as (
    select p.id
      from public.profiles p
     where p.premium_until is not null
       and p.premium_until <= now()
       and p.premium_until > now() - interval '1 day'
       and not exists (
         select 1 from public.notifications n
          where n.user_id = p.id and n.type = 'premium_bitti'
            and n.created_at > now() - interval '3 days'
       )
  ), ins as (
    insert into public.notifications (user_id, type, title, body, link)
    select id, 'premium_bitti', 'Premium üyeliğin sona erdi',
           'Premium üyeliğinin süresi doldu. Yeniden aktifleştirmek için puanlarını kullanabilirsin.',
           '/premium'
      from expired
    returning 1
  )
  select count(*) into v_count from ins;
  return v_count;
end;
$$;

-- Yalnızca yönetici / zamanlanmış görevler çağırmalı; anon ve
-- authenticated roller çağıramaz.
revoke execute on function public.notify_expired_premium() from public, anon, authenticated;
grant execute on function public.notify_expired_premium() to service_role;

-- ─────────────────────────────────────────────────────────────
-- PREMIUM ANALİZ: kanal istatistikleri (son N gün)
-- Yalnızca kanal sahibi ve Premium üye erişebilir.
-- ─────────────────────────────────────────────────────────────
create or replace function public.get_channel_analytics(
  p_channel_id uuid,
  p_days       integer default 30
)
returns table (gun date, izlenme bigint, yeni_abone bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_days integer := least(greatest(coalesce(p_days, 30), 1), 365);
begin
  if auth.uid() is null then
    raise exception 'Giriş yapmalısınız.';
  end if;
  if not public.is_premium(auth.uid()) then
    raise exception 'Bu özellik TürkTube Premium gerektirir.';
  end if;
  if not exists (
    select 1 from public.channels c
     where c.id = p_channel_id and c.owner_id = auth.uid()
  ) then
    raise exception 'Bu kanalın istatistiklerine erişemezsiniz.';
  end if;

  return query
  with gunler as (
    select generate_series(current_date - (v_days - 1), current_date, interval '1 day')::date as d
  )
  select g.d,
         (select count(*)
            from public.video_views vv
            join public.videos v on v.id = vv.video_id
           where v.channel_id = p_channel_id
             and vv.is_counted
             and vv.counted_at >= g.d
             and vv.counted_at <  g.d + interval '1 day')::bigint,
         (select count(*)
            from public.subscriptions s
           where s.channel_id = p_channel_id
             and s.created_at >= g.d
             and s.created_at <  g.d + interval '1 day')::bigint
    from gunler g
   order by g.d;
end;
$$;

grant execute on function public.get_channel_analytics(uuid, integer) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- PREMIUM ANALİZ: video istatistikleri (son N gün)
-- ─────────────────────────────────────────────────────────────
create or replace function public.get_video_analytics(
  p_video_id uuid,
  p_days     integer default 30
)
returns table (gun date, izlenme bigint, benzersiz_izleyici bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_days integer := least(greatest(coalesce(p_days, 30), 1), 365);
begin
  if auth.uid() is null then
    raise exception 'Giriş yapmalısınız.';
  end if;
  if not public.is_premium(auth.uid()) then
    raise exception 'Bu özellik TürkTube Premium gerektirir.';
  end if;
  if not exists (
    select 1
      from public.videos v
      join public.channels c on c.id = v.channel_id
     where v.id = p_video_id and c.owner_id = auth.uid()
  ) then
    raise exception 'Bu videonun istatistiklerine erişemezsiniz.';
  end if;

  return query
  with gunler as (
    select generate_series(current_date - (v_days - 1), current_date, interval '1 day')::date as d
  )
  select g.d,
         (select count(*)
            from public.video_views vv
           where vv.video_id = p_video_id
             and vv.is_counted
             and vv.counted_at >= g.d
             and vv.counted_at <  g.d + interval '1 day')::bigint,
         (select count(distinct vv.viewer_hash)
            from public.video_views vv
           where vv.video_id = p_video_id
             and vv.is_counted
             and vv.counted_at >= g.d
             and vv.counted_at <  g.d + interval '1 day')::bigint
    from gunler g
   order by g.d;
end;
$$;

grant execute on function public.get_video_analytics(uuid, integer) to authenticated;

-- Analiz fonksiyonlarına anon erişimi kapatılır.
revoke execute on function public.get_channel_analytics(uuid, integer) from public, anon;
revoke execute on function public.get_video_analytics(uuid, integer) from public, anon;
grant execute on function public.get_channel_analytics(uuid, integer) to authenticated;
grant execute on function public.get_video_analytics(uuid, integer) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- BİTİŞ NOTU
-- ─────────────────────────────────────────────────────────────
-- · profiles.points ve profiles.premium_until istemciye asla yazdırılmaz;
--   yalnızca yukarıdaki SECURITY DEFINER fonksiyonları değiştirir.
-- · Premium durumu türevdir (premium_until > now()). Süre bitince tüm
--   Premium özellikleri anında kapanır; ayrıca bir kapatma işlemi gerekmez.
-- · notify_expired_premium() yalnızca service_role tarafından çağrılabilir.
