/**
 * Farmer / field context stored in localStorage (browser-only, like chat memory).
 * Sent with each AgriBot request so the LLM can tailor advice.
 */

export const FARM_PROFILE_KEY = "cropai-farm-profile"
export const FARM_PROFILE_UPDATED_EVENT = "cropai-farm-profile-updated"

/**
 * @typedef {Object} FarmProfilePayload
 * @property {string} mainCrop
 * @property {string} location — district / state (free text)
 * @property {string} irrigation — key: drip | sprinkler | furrow | rainfed | other
 * @property {string} farmSize — e.g. "2 acres" or "1 ha"
 * @property {string} [updatedAt] — ISO timestamp
 */

function clamp(str, max) {
  return String(str ?? "")
    .trim()
    .slice(0, max)
}

/** @param {Partial<FarmProfilePayload>} raw */
export function normalizeFarmProfile(raw) {
  if (!raw || typeof raw !== "object") return null
  const irrigation = clamp(raw.irrigation, 32)
  const allowed = ["drip", "sprinkler", "furrow", "rainfed", "other"]
  const irr = allowed.includes(irrigation) ? irrigation : "other"
  const mainCrop = clamp(raw.mainCrop, 120)
  const location = clamp(raw.location, 120)
  const farmSize = clamp(raw.farmSize, 60)
  if (!mainCrop && !location && !farmSize && irr === "other") return null
  return {
    mainCrop,
    location,
    irrigation: irr,
    farmSize,
    updatedAt: raw.updatedAt || new Date().toISOString(),
  }
}

/** @returns {FarmProfilePayload | null} */
export function loadFarmProfile() {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(FARM_PROFILE_KEY)
    if (!raw) return null
    return normalizeFarmProfile(JSON.parse(raw))
  } catch {
    return null
  }
}

/** @param {Partial<FarmProfilePayload>} profile */
export function saveFarmProfile(profile) {
  if (typeof window === "undefined") return
  const next = normalizeFarmProfile({ ...profile, updatedAt: new Date().toISOString() })
  try {
    if (!next) {
      localStorage.removeItem(FARM_PROFILE_KEY)
    } else {
      localStorage.setItem(FARM_PROFILE_KEY, JSON.stringify(next))
    }
    window.dispatchEvent(new CustomEvent(FARM_PROFILE_UPDATED_EVENT))
  } catch {
    /* quota / private mode */
  }
}

export function clearFarmProfile() {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(FARM_PROFILE_KEY)
    window.dispatchEvent(new CustomEvent(FARM_PROFILE_UPDATED_EVENT))
  } catch {
    /* ignore */
  }
}
