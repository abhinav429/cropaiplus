"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { getByPath } from "@/lib/i18n"
import en from "@/lib/locales/en.json"
import hi from "@/lib/locales/hi.json"
import ta from "@/lib/locales/ta.json"

const STORAGE_KEY = "cropai-locale"

const locales = ["en", "hi", "ta"] as const
export type Locale = (typeof locales)[number]

const dictionaries: Record<Locale, typeof en> = { en, hi, ta }

export type LanguageContextValue = {
  locale: Locale
  setLocale: (next: string) => void
  t: (key: string) => string
  locales: readonly Locale[]
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en")

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && stored in dictionaries) {
        setLocaleState(stored as Locale)
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale
    }
  }, [locale])

  const setLocale = useCallback((next: string) => {
    if (!(next in dictionaries)) return
    setLocaleState(next as Locale)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const t = useCallback(
    (key: string) => {
      const dict = dictionaries[locale] ?? en
      const fallback = en
      let value = getByPath(dict, key)
      if (value === undefined) value = getByPath(fallback, key)
      return value !== undefined ? value : key
    },
    [locale]
  )

  const value = useMemo(
    () => ({ locale, setLocale, t, locales } satisfies LanguageContextValue),
    [locale, setLocale, t]
  )

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider")
  }
  return ctx
}
