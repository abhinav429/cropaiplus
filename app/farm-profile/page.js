"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Tractor, Save, Eraser } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { useLanguage } from "@/contexts/LanguageContext"
import { loadFarmProfile, saveFarmProfile, clearFarmProfile } from "@/lib/farmProfile"

const IRR_KEYS = ["drip", "sprinkler", "furrow", "rainfed", "other"]

export default function FarmProfilePage() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [mainCrop, setMainCrop] = useState("")
  const [location, setLocation] = useState("")
  const [irrigation, setIrrigation] = useState("other")
  const [farmSize, setFarmSize] = useState("")

  useEffect(() => {
    const p = loadFarmProfile()
    if (p) {
      setMainCrop(p.mainCrop || "")
      setLocation(p.location || "")
      setIrrigation(p.irrigation || "other")
      setFarmSize(p.farmSize || "")
    }
  }, [])

  const handleSave = () => {
    saveFarmProfile({ mainCrop, location, irrigation, farmSize })
    toast({
      title: t("farmProfile.savedTitle"),
      description: t("farmProfile.savedBody"),
    })
  }

  const handleClear = () => {
    clearFarmProfile()
    setMainCrop("")
    setLocation("")
    setIrrigation("other")
    setFarmSize("")
    toast({
      title: t("farmProfile.clearedTitle"),
      description: t("farmProfile.clearedBody"),
    })
  }

  return (
    <div className="container max-w-lg py-10 px-4 md:px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Tractor className="h-6 w-6 text-primary" aria-hidden />
              <CardTitle>{t("farmProfile.title")}</CardTitle>
            </div>
            <CardDescription>{t("farmProfile.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="mainCrop">{t("farmProfile.mainCrop")}</Label>
              <Input
                id="mainCrop"
                value={mainCrop}
                onChange={(e) => setMainCrop(e.target.value)}
                placeholder={t("farmProfile.mainCropPlaceholder")}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">{t("farmProfile.location")}</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t("farmProfile.locationPlaceholder")}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("farmProfile.irrigationLabel")}</Label>
              <Select value={irrigation} onValueChange={setIrrigation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IRR_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {t(`farmProfile.irrigation.${key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="farmSize">{t("farmProfile.farmSize")}</Label>
              <Input
                id="farmSize"
                value={farmSize}
                onChange={(e) => setFarmSize(e.target.value)}
                placeholder={t("farmProfile.farmSizePlaceholder")}
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button type="button" className="gap-2 flex-1" onClick={handleSave}>
                <Save className="h-4 w-4" />
                {t("farmProfile.save")}
              </Button>
              <Button type="button" variant="outline" className="gap-2 flex-1" onClick={handleClear}>
                <Eraser className="h-4 w-4" />
                {t("farmProfile.clear")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("farmProfile.privacyNote")}</p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
