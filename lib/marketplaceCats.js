/**
 * Internal category values in sample product data are English strings.
 * Maps them to locale JSON keys under marketplace.cats.<slug>.
 */
export const CATEGORY_SLUG = {
  "All Categories": "all",
  Pesticides: "pesticides",
  Fertilizers: "fertilizers",
  "Soil Management": "soilManagement",
  Irrigation: "irrigation",
  Equipment: "equipment",
  Structures: "structures",
  Education: "education",
}

/** @param {(key: string) => string} t - from useLanguage */
export function formatCategoryLabel(t, englishCategory) {
  const slug = CATEGORY_SLUG[englishCategory]
  if (!slug) return englishCategory
  return t(`marketplace.cats.${slug}`)
}
