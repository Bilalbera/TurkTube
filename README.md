# TürkTube

**TürkTube**, tamamen Türkçe arayüzlü, modern ve özgün bir video platformu.
Next.js (App Router) + Supabase ile geliştirilmiştir.

> **Made By Bilal Efendi**

---

## Özellikler

| Alan | Durum |
|------|-------|
| Ana sayfa (öne çıkanlar + yeni videolar) | ✅ |
| Keşfet | ✅ |
| Video izleme sayfası (oynatıcı, açıklama, ilgili videolar) | ✅ |
| Arama sistemi (video + kanal) | ✅ |
| Kanal oluşturma ve kanal sayfası | ✅ |
| Video yükleme (dosya veya bağlantı) | ✅ |
| Beğeni / beğenmeme | ✅ |
| Yorumlar + yorum beğenisi | ✅ |
| Abone olma | ✅ |
| Oynatma listeleri | ✅ |
| Kullanıcı profili | ✅ |
| Bildirim sistemi | ✅ |
| İzleme geçmişi | ✅ |
| Video paylaşma | ✅ |
| Responsive modern tasarım (mobil / tablet / masaüstü) | ✅ |
| TürkTube Puan sistemi | ✅ |
| TürkTube Premium | ✅ |

---

## Teknoloji

- **Next.js 16** — App Router, Server Components, Server Actions
- **TypeScript** (strict)
- **Tailwind CSS v4** — anlamsal renk değişkenleri, açık/koyu tema uyumu
- **Supabase**
  - Auth (e-posta/şifre, httpOnly oturum çerezleri, proxy/middleware ile yenileme)
  - PostgreSQL + **Row Level Security**
  - Storage (video, kapak, avatar, banner — boyut/MIME limitli)
  - `SECURITY DEFINER` RPC'ler

---

## Kurulum

### 1) Bağımlılıklar

```bash
npm install
```

### 2) Supabase projesi oluştur

[supabase.com](https://supabase.com) üzerinden yeni bir proje aç.

### 3) Veritabanını kur

SQL Editor'de `supabase/migrations/` içindeki dosyaları **sırasıyla** çalıştır:

```
0001_schema.sql → 0002_rls.sql → 0003_functions.sql → 0004_premium.sql → 0005_storage.sql
```

Ayrıntılar: [`supabase/README.md`](./supabase/README.md)

### 4) Ortam değişkenleri

`.env.local.example` dosyasını `.env.local` olarak kopyala:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> Değerleri Supabase → **Project Settings → API** bölümünde bulabilirsin.

### 5) Çalıştır

```bash
npm run dev
```

http://localhost:3000 adresinde çalışır. Supabase anahtarları girilmediğinde
uygulama **kurulum ekranını** gösterir ve hiçbir sayfa çökmekle kalmaz.

---

## Kullanılabilir komutlar

```bash
npm run dev        # geliştirme sunucusu
npm run build      # üretim derlemesi
npm run start      # üretim sunucusu
npm run typecheck  # TypeScript denetimi
```

---

## Puan sistemi (TürkTube Puanı)

Kural **veritabanında** uygulanır; istemci tarafında değiştirilemez.

- Video **100.000** gerçek izlenmeye ulaştığında sahibine **+10 puan**.
- Aynı video sonraki her 100.000 izlenmede **tekrar +10 puan**.
- **1.000.000** izlenme = toplam **+100 puan**.
- **100 puan = 30 gün** TürkTube Premium.

### Sahte izlenme engelleri

- < 5 saniye izleme sayılmaz.
- Kendi videonu izlemen sayılmaz.
- Aynı izleyici aynı videoyu **6 saat** içinde tekrar izlerse sayılmaz.
- Aynı izleyici **24 saatte en fazla 25** geçerli izlenme üretebilir.
- Ham kayıtlar `video_views.is_counted` bayrağıyla tutulur; `false` olanlar
  hem `view_count`'a hem de puan sistemine dahil edilmez.

---

## TürkTube Premium

**100 puan karşılığında 30 gün** geçerlidir. Süre bitince otomatik kapanır.

- Reklamsız video izleme
- Premium profil rozeti ve özel profil çerçevesi
- Özel profil temaları
- Gelişmiş kanal ve video istatistikleri
- Son **30 / 90 günlük** izlenme ve abone analizleri
- Detaylı izleyici istatistikleri (benzersiz izleyici)
- Hızlı video işleme kuyruğu
- Premium'a özel oynatma listesi seçenekleri
- İzleme geçmişinde gelişmiş filtreleme
- Profilde bitiş tarihi, ayarlarda aktif/pasif durumu
- Satın alım ve kullanım geçmişi

> **Maliyet notu:** Premium, **sınırsız depolama** üzerine kurulmamıştır.
> Video yüklemelerinde tüm kullanıcılar için aynı 100 MB / MIME sınırları
> geçerlidir.

---

## Güvenlik özeti

| Risk | Çözüm |
|------|-------|
| İstemcinin puan yazması | `profiles.points` → UPDATE yetkisi yok; yalnızca RPC |
| İstemcinin Premium açması | `premium_until` → UPDATE yetkisi yok; yalnızca `purchase_premium()` |
| Çift harcama | `purchase_premium()` içinde `SELECT ... FOR UPDATE` kilidi |
| Puan kaydının sahte eklenmesi | `point_transactions` → INSERT yetkisi yok |
| Izlenme sayısını manipülasyon | Spam tespiti tamamen SQL içinde (`register_view`) |
| Başkasının verisini okuması | RLS politikaları (her tabloda) |
| Başkasının verisini silmesi | RLS `WITH CHECK` + `USING` |
| Storage'a başkasının klasörüne yazma | `(storage.foldername(name))[1] = auth.uid()::text` |

Ayrıntılı dökümantasyon: [`supabase/README.md`](./supabase/README.md)

---

## Proje yapısı

```
TürkTube/
├── supabase/
│   └── migrations/          # SQL: şema, RLS, fonksiyonlar, storage
├── src/
│   ├── proxy.ts             # Next.js proxy → oturum çerezlerini yeniler
│   ├── app/
│   │   ├── page.tsx         # Ana sayfa
│   │   ├── kesfet/          # Keşfet
│   │   ├── ara/             # Arama
│   │   ├── izle/[id]/       # Video izleme
│   │   ├── kanal/[handle]/  # Kanal sayfası
│   │   ├── yukle/           # Video yükleme
│   │   ├── giris/ kayit/    # Kimlik doğrulama
│   │   ├── profil/ ayarlar/ # Profil + kanal ayarları
│   │   ├── puanlar/         # Puan özeti + geçmiş
│   │   ├── premium/         # Premium
│   │   ├── bildirimler/     # Bildirimler
│   │   ├── gecmis/          # İzleme geçmişi
│   │   ├── oynatma-listeleri/
│   │   ├── abonelikler/
│   │   └── auth/callback/   # E-posta doğrulama
│   ├── components/          # UI bileşenleri
│   └── lib/
│       ├── actions.ts       # Server Actions
│       ├── queries.ts       # Sunucu tarafı sorgular
│       ├── supabase/        # client / server / session / env
│       ├── constants.ts     # Puan & Premium sabitleri (gösterim amaçlı)
│       ├── format.ts        # Türkçe biçimlendirme
│       └── types.ts         # Veritabanı tipleri
```

---

**Made By Bilal Efendi**
