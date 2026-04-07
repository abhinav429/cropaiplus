"use client"

import { Languages } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLanguage } from "@/contexts/LanguageContext"

export default function LanguageSwitcher({ className = "" }) {
  const { locale, setLocale, t } = useLanguage()

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Languages className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
      <Select value={locale} onValueChange={setLocale}>
        <SelectTrigger
          className="h-9 w-[130px] md:w-[150px] text-xs md:text-sm"
          aria-label={t("nav.language")}
        >
          <SelectValue placeholder={t("nav.language")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">{t("lang.en")}</SelectItem>
          <SelectItem value="hi">{t("lang.hi")}</SelectItem>
          <SelectItem value="ta">{t("lang.ta")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
