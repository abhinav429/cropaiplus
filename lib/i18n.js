/**
 * Resolve nested keys like "home.features.0.title" including array indices.
 */
export function getByPath(obj, path) {
  if (!path || obj == null) return undefined
  const parts = path.split(".").filter(Boolean)
  return parts.reduce((current, key) => {
    if (current == null) return undefined
    const n = Number(key)
    if (!Number.isNaN(n) && String(n) === key && Array.isArray(current)) {
      return current[n]
    }
    return current[key]
  }, obj)
}
