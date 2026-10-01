/**
 * TürkTube sabitleri.
 *
 * UYARI: Bu değerler yalnızca arayüzde bilgilendirme amaçlı kullanılır.
 * Puan ve Premium kurallarının GERÇEK kaynağı veritabanıdır
 * (supabase/migrations/*.sql). İstemci tarafında bu değerler değiştirilse
 * bile sunucu tarafındaki doğrulama etkilenmez.
 */

/** Her 100.000 gerçek izlenme için verilen puan. */
export const POINTS_PER_VIEW_BLOCK = 10;

/** Puan ödülünün tetiklendiği izlenme bloğu. */
export const VIEW_BLOCK_SIZE = 100_000;

/** Premium üyelik maliyeti (TürkTube Puanı). */
export const PREMIUM_COST = 100;

/** Premium üyelik süresi (gün). */
export const PREMIUM_DURATION_DAYS = 30;

/** Bir izlenmenin sayılması için gereken en kısa izleme süresi (saniye). */
export const MIN_WATCH_SECONDS = 5;

export const SITE_NAME = "TürkTube";

export const VIDEO_VISIBILITY_LABELS: Record<string, string> = {
  public: "Herkese açık",
  unlisted: "Liste dışı",
  private: "Özel",
};

export const POINT_KIND_LABELS: Record<string, string> = {
  view_milestone: "İzlenme ödülü",
  premium_purchase: "Premium satın alma",
  admin_adjust: "Yönetici düzeltmesi",
};

export const PREMIUM_FEATURES: { baslik: string; aciklama: string }[] = [
  { baslik: "Reklamsız izleme", aciklama: "Tüm videoları reklam kesintisi olmadan izle." },
  { baslik: "Premium profil rozeti", aciklama: "Adının yanında ⭐ Premium rozeti görünür." },
  { baslik: "Özel profil çerçevesi", aciklama: "Avatarın Premium çerçeveyle öne çıkar." },
  { baslik: "Özel profil temaları", aciklama: "Kanal sayfanda farklı renk temaları seç." },
  { baslik: "Gelişmiş kanal istatistikleri", aciklama: "Kanalının izlenme ve abone analizlerini gör." },
  { baslik: "Gelişmiş video istatistikleri", aciklama: "Video bazında ayrıntılı performans verisi." },
  { baslik: "30 / 90 günlük analizler", aciklama: "Son 30 veya 90 günü karşılaştırmalı incele." },
  { baslik: "Detaylı izleyici istatistikleri", aciklama: "Benzersiz izleyici ve izlenme dağılımı." },
  { baslik: "Hızlı video işleme kuyruğu", aciklama: "Yüklediğin videolar öncelikli olarak yayına alınır." },
  { baslik: "Özel oynatma listesi seçenekleri", aciklama: "Gelişmiş sıralama ve görünürlük ayarları." },
  { baslik: "Gelişmiş izleme geçmişi filtreleri", aciklama: "Geçmişini tarih ve kanala göre filtrele." },
];
