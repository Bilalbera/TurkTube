# TürkTube · Veritabanı

Bu klasör, TürkTube'un Supabase (PostgreSQL) şemasını oluşturur.

## Kurulum

Supabase panelinde **SQL Editor**'ü açın ve `migrations/` içindeki dosyaları
**sırasıyla**, her birini tek başına çalıştırarak uygulayın:

| Sıra | Dosya | Ne yapar |
|------|-------|----------|
| 1 | `0001_schema.sql` | Tablolar, dizinler, tetikleyiciler, yeni kullanıcı için profil oluşturma |
| 2 | `0002_rls.sql` | Row Level Security politikaları + **kolon seviyesinde** yetkiler |
| 3 | `0003_functions.sql` | İzlenme sayacı, puan ödül sistemi, beğeni/abone/yorum iş kuralları, tetikleyiciler |
| 4 | `0004_premium.sql` | Premium satın alma, süre yönetimi, Premium analiz fonksiyonları |
| 5 | `0005_storage.sql` | Storage kovaları (videos/thumbnails/avatars/banners) ve politikalar |

> Dosyalar **idempotent** yazıldı (`create or replace`, `drop ... if exists`,
> `on conflict do nothing`), bu yüzden gerektiğinde yeniden çalıştırılabilirler.

## Tablolar

```
auth.users ──1:1── profiles          (display_name, avatar, bio, POINTS, premium_until)
      │
      └──1:1── channels              (name, handle, subscriber_count, avatar, banner)
                    │
                    └──*── videos     (view_count, like_count, awarded_blocks, visibility)
                                    │
                                    ├──*── comments ──*── comment_likes
                                    ├──*── video_reactions   (beğeni / beğenmeme)
                                    ├──*── video_views       (spam tespiti, istemci erişime kapalı)
                                    └──*── playlist_items ── playlists

users ──*── subscriptions ──*── channels
users ──*── notifications
users ──*── watch_history
users ──*── point_transactions   (PUAN DEFTERİ - sadece okunur)
users ──*── premium_purchases    (satın alım geçmişi - sadece okunur)
```

## Güvenlik modeli

### 1. Kolon seviyesinde yetkilendirme
Aşağıdaki kolonlara `anon` / `authenticated` rollerinin **UPDATE** yetkisi
**yoktur**. Yalnızca `SECURITY DEFINER` fonksiyonları (postgres sahibi) bunları
değiştirebilir:

| Tablo | Korunan kolonlar |
|-------|------------------|
| `profiles` | `points`, `premium_until`, `premium_started_at` |
| `channels` | `subscriber_count` |
| `videos` | `view_count`, `like_count`, `dislike_count`, `comment_count`, `awarded_blocks` |
| `comments` | `like_count` |
| `point_transactions` | **tümü** (INSERT yetkisi yok, yalnızca SELECT) |
| `premium_purchases` | **tümü** (yalnızca SELECT) |
| `video_views` | **hiçbiri** (tablo istemciye tamamen kapalı) |

### 2. Yalnızca bu RPC'lerle değiştirilebilir

| RPC | Amaç | Çağırabilecek |
|-----|------|---------------|
| `register_view(video_id, seconds)` | Güvenli izlenme + puan ödülü | `anon`, `authenticated` |
| `set_video_reaction(video_id, ±1)` | Beğeni/beğenmeme | `authenticated` |
| `toggle_subscription(channel_id)` | Abone ol / çık | `authenticated` |
| `toggle_comment_like(comment_id)` | Yorum beğenisi | `authenticated` |
| `purchase_premium()` | **Tek** Premium açma yolu | `authenticated` |
| `get_channel_analytics(channel_id, days)` | Premium kanal analizi | `authenticated` |
| `get_video_analytics(video_id, days)` | Premium video analizi | `authenticated` |

### 3. Puan kuralları (`register_view`)

1. `p_watch_seconds < 5` ise izlenme **sayılmaz**.
2. **Kendi videosunu** izleyen kullanıcı için izlenme sayılmaz.
3. Aynı izleyici (giriş yapmışsa kullanıcı id'si, değilse IP + user-agent
   SHA-256 hash'i) aynı videoyu **6 saat** içinde tekrar izlerse sayılmaz.
4. Bir izleyici **24 saatte en fazla 25** geçerli izlenme üretebilir.
5. Sayılan izlenme `videos.view_count` değerini artırır.
6. `view_count`, `awarded_blocks` üzerinden hesaplanan her **100.000'lük blok**
   için kanal sahibine **+10 puan** verilir ve `point_transactions` defterine
   kayıt düşülür. Blok sayısı yalnızca bir kez ödüllendirilir.

> Kullanım: `1.000.000` izlenme → `10` blok → toplam **+100 puan**.

### 4. Premium kuralları (`purchase_premium`)

- `profiles` satırı `SELECT ... FOR UPDATE` ile **kilitlenir** → çift harcama (race condition) imkânsız.
- Puan yetersizse hata fırlatır; puanı düşer.
- Süre `max(mevcut_bitiş, şimdi) + 30 gün` olarak **üst üste eklenir**.
- `point_transactions` ve `premium_purchases` kaydı oluşur.
- Durum **türevidir**: `premium_until > now()`. Süre bitince tüm Premium
  özellikleri otomatik kapanır.

## Spam / sahte izlenme engelleri

- Ham izlenmeler `video_views` tablosunda `is_counted` bayrağı ile saklanır;
  `false` olan kayıtlar `view_count`'a ve puan sistemine **katılmaz**.
- `viewer_hash`, giriş yapmış kullanıcı için `u:<id>`, anonim izleyici için
  `a:<ip>|<user-agent>` üzerinden SHA-256 ile üretilir.
- `x-forwarded-for` / `user-agent` başlıkları PostgREST'in
  `request.headers` ayarından okunur (`public.request_header`).

## İsteğe bağlı: Premium bitiş bildirimi

`public.notify_expired_premium()` yalnızca `service_role` tarafından
çağrılabilir. Supabase **Cron** (pg_cron) ile günlük çalıştırmak için:

```sql
select cron.schedule(
  'turktube-premium-expiry',
  '0 9 * * *',
  $cron$ select public.notify_expired_premium(); $cron$
);
```

Süre dolması durumu `notify_expired_premium` olmadan da doğru çalışır;
bu fonksiyon yalnızca kullanıcıya hatırlatma bildirimi gönderir.
