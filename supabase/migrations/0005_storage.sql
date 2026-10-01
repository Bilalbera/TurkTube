-- ═══════════════════════════════════════════════════════════════════════════
-- TürkTube · 0005_storage.sql
-- Supabase Storage kovaları ve politikaları.
--
-- MALİYET KONTROLÜ: Premium paketi "sınırsız depolama" İÇERMEZ.
-- Tüm kovalarda katı dosya boyutu ve MIME tipi limitleri uygulanır.
--   videos     : 100 MB  (video/*)
--   thumbnails : 5 MB    (görseller)
--   avatars    : 2 MB    (görseller)
--   banners    : 5 MB    (görseller)
-- Dosyalar her zaman "<kullanıcı_id>/<dosya_adı>" yolunda tutulur,
-- böylece kullanıcılar yalnızca kendi klasörlerine yazabilir.
-- ═══════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('videos',     'videos',     true, 104857600,
    array['video/mp4','video/webm','video/quicktime','video/ogg','video/x-matroska']),
  ('thumbnails', 'thumbnails', true,   5242880,
    array['image/png','image/jpeg','image/webp']),
  ('avatars',    'avatars',    true,   2097152,
    array['image/png','image/jpeg','image/webp','image/gif']),
  ('banners',    'banners',    true,   5242880,
    array['image/png','image/jpeg','image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ─────────────────────────────────────────────────────────────
-- Storage politikaları
-- ─────────────────────────────────────────────────────────────

-- Herkes okuyabilir (video izleme / kapak görselleri için gerekli).
drop policy if exists "turktube_storage_okuma" on storage.objects;
create policy "turktube_storage_okuma" on storage.objects
  for select
  using (bucket_id in ('videos', 'thumbnails', 'avatars', 'banners'));

-- Giriş yapmış kullanıcı yalnızca kendi klasörüne yükleyebilir.
drop policy if exists "turktube_storage_yukleme" on storage.objects;
create policy "turktube_storage_yukleme" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id in ('videos', 'thumbnails', 'avatars', 'banners')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Güncelleme / silme yalnızca kendi dosyalarında.
drop policy if exists "turktube_storage_guncelleme" on storage.objects;
create policy "turktube_storage_guncelleme" on storage.objects
  for update
  to authenticated
  using (
    bucket_id in ('videos', 'thumbnails', 'avatars', 'banners')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "turktube_storage_silme" on storage.objects;
create policy "turktube_storage_silme" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id in ('videos', 'thumbnails', 'avatars', 'banners')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
