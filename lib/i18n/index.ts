// i18n index - aggregates all locales and exports utilities
import { tr, type Translations } from "./locales/tr"
import { en } from "./locales/en"
import { es } from "./locales/es"
import { it } from "./locales/it"
import { fr } from "./locales/fr"
import { de } from "./locales/de"
import { ru } from "./locales/ru"

export type SupportedLocale = "tr" | "en" | "es" | "it" | "fr" | "de" | "ru"

export const LOCALES: Record<SupportedLocale, Translations> = {
  tr,
  en,
  es,
  it,
  fr,
  de,
  ru,
}

export const LOCALE_LABELS: Record<SupportedLocale, { label: string; flag: string }> = {
  tr: { label: "Türkçe", flag: "🇹🇷" },
  en: { label: "English", flag: "🇬🇧" },
  es: { label: "Español", flag: "🇪🇸" },
  it: { label: "Italiano", flag: "🇮🇹" },
  fr: { label: "Français", flag: "🇫🇷" },
  de: { label: "Deutsch", flag: "🇩🇪" },
  ru: { label: "Русский", flag: "🇷🇺" },
}

export const DEFAULT_LOCALE: SupportedLocale = "tr"

export const LOCALE_STORAGE_KEY = "app-language"

export type { Translations }
export { tr, en, es, it, fr, de, ru }
