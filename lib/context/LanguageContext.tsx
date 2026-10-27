"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import {
  LOCALES,
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  type SupportedLocale,
  type Translations,
} from "@/lib/i18n"

interface LanguageContextValue {
  locale: SupportedLocale
  t: Translations
  setLocale: (locale: SupportedLocale) => void
  tText: (path: string, fallback?: string) => string
}

function getNestedValue(obj: any, path: string): string | undefined {
  if (!obj || !path) return undefined
  const parts = path.split(".")
  let curr = obj
  for (const part of parts) {
    if (curr && typeof curr === "object" && part in curr) {
      curr = curr[part]
    } else {
      return undefined
    }
  }
  return typeof curr === "string" ? curr : undefined
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: DEFAULT_LOCALE,
  t: LOCALES[DEFAULT_LOCALE],
  setLocale: () => {},
  tText: (path: string, fallback?: string) => fallback || path,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(DEFAULT_LOCALE)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Read saved locale from localStorage
    try {
      const saved = localStorage.getItem(LOCALE_STORAGE_KEY) as SupportedLocale | null
      if (saved && saved in LOCALES) {
        setLocaleState(saved)
      }
    } catch {
      // localStorage not available (SSR)
    }
    setMounted(true)
  }, [])

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    setLocaleState(newLocale)
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale)
    } catch {
      // localStorage not available
    }
  }, [])

  // Prevent hydration mismatch by always starting with default
  const activeLocale = mounted ? locale : DEFAULT_LOCALE

  const tText = useCallback((path: string, fallback?: string): string => {
    const val = getNestedValue(LOCALES[activeLocale], path)
    if (val !== undefined) return val
    const trVal = getNestedValue(LOCALES[DEFAULT_LOCALE], path)
    if (trVal !== undefined) return trVal
    return fallback || path
  }, [activeLocale])

  return (
    <LanguageContext.Provider
      value={{
        locale: activeLocale,
        t: LOCALES[activeLocale],
        setLocale,
        tText,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext)
}
