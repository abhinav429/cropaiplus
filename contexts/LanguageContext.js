"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { getByPath } from "@/lib/i18n"
import en from "@/lib/locales/en.json"
import hi from "@/lib/locales/hi.json"
import ta from "@/lib/locales/ta.json"

const STORAGE_KEY = "cropai-locale"

const dictionaries = { en, hi, ta }

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [locale, setLocaleState] = useState("en")

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && dictionaries[stored]) {
        setLocaleState(stored)
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

  const setLocale = useCallback((next) => {
    if (!dictionaries[next]) return
    setLocaleState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const t = useCallback(
    (key) => {
      const dict = dictionaries[locale] || en
      const fallback = en
      let value = getByPath(dict, key)
      if (value === undefined) value = getByPath(fallback, key)
      return value !== undefined ? value : key
    },
    [locale]
  )

  const value = useMemo(
    () => ({ locale, setLocale, t, locales: ["en", "hi", "ta"] }),
    [locale, setLocale, t]
  )

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider")
  }
  return ctx
}
