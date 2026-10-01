/**
 * Türkçe biçimlendirme yardımcıları.
 */

const compactFormatter = new Intl.NumberFormat("tr-TR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat("tr-TR");

const relativeFormatter = new Intl.RelativeTimeFormat("tr", { numeric: "auto" });

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** 12345 → "12,3 B" */
export function formatCompact(value: number): string {
  return compactFormatter.format(value ?? 0);
}

/** 12345 → "12.345" */
export function formatNumber(value: number): string {
  return numberFormatter.format(value ?? 0);
}

/** 12345 → "12.345 görüntülenme" */
export function formatViews(value: number): string {
  return `${formatNumber(value ?? 0)} görüntülenme`;
}

/** 12345 → "12,3 B abone" */
export function formatSubscribers(value: number): string {
  return `${compactFormatter.format(value ?? 0)} abone`;
}

/** ISO tarih → "3 gün önce" */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diffSeconds = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(diffSeconds);

  if (abs < 60) return relativeFormatter.format(diffSeconds, "second");
  if (abs < 3600) return relativeFormatter.format(Math.round(diffSeconds / 60), "minute");
  if (abs < 86400) return relativeFormatter.format(Math.round(diffSeconds / 3600), "hour");
  if (abs < 2592000) return relativeFormatter.format(Math.round(diffSeconds / 86400), "day");
  if (abs < 31536000) return relativeFormatter.format(Math.round(diffSeconds / 2592000), "month");
  return relativeFormatter.format(Math.round(diffSeconds / 31536000), "year");
}

/** ISO tarih → "01 Ekim 2026" */
export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

/** ISO tarih → "01.10.2026 14:35" */
export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

/** 3725 → "1:02:05" , 125 → "2:05" */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds ?? 0));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Premium bitiş tarihine kalan gün sayısı (negatifse süre dolmuş). */
export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

/** Basit e-posta doğrulaması. */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** 1234567 → "1.234.567" (izlenme sınırı gösterimi için) */
export function formatMilestone(value: number): string {
  return numberFormatter.format(value);
}

/** Kullanıcı adı / kanal adından URL dostu bir metin üretir. */
export function slugifyHandle(value: string): string {
  const map: Record<string, string> = {
    ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", I: "i", İ: "i",
    ö: "o", Ö: "o", ş: "s", Ş: "s", ü: "u", Ü: "u",
  };
  return value
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);
}

/** İsimden avatar baş harfleri. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR"))
    .join("");
}
