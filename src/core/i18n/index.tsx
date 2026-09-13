"use client";

// i18n = @wasnaker/web-core (merge penuh, keputusan split plan Task 3).
// Kamus core satu-satunya di paket (src/i18n/core/*.json — 257 key).
// Re-export menjaga seluruh import "@/core/i18n" tetap jalan.
export {
  I18nProvider,
  useT,
  LOCALES,
  isLocale,
  type Locale,
  type T,
} from "@wasnaker/web-core";