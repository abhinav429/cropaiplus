/**
 * Diagnosis → AgriBot case handoff
 *
 * Stores the latest successful disease-detection result in sessionStorage so /chat
 * can send structured context to the LLM without uploading images again.
 * Data never leaves the browser except when explicitly sent in chat API requests.
 */

export const DETECT_CASE_STORAGE_KEY = "cropai-detect-case"

/**
 * @typedef {Object} DetectCasePayload
 * @property {string} disease — Model class label (e.g. tea disease folder name)
 * @property {number} displayConfidence — 0–100, same as shown on /detect UI
 * @property {number} rawModelConfidence — Raw score from API (0–1 typical)
 * @property {string} capturedAt — ISO 8601 timestamp
 * @property {string} locale — App language code (en | hi | ta)
 * @property {string[]} treatmentSummaries — Short lines already surfaced on detect page
 */

/**
 * Persist case after a successful /predict_tea_disease response.
 * @param {DetectCasePayload} payload
 */
export function writeDetectCase(payload) {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(DETECT_CASE_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Quota or privacy mode — handoff silently disabled
  }
}

/**
 * @returns {DetectCasePayload | null}
 */
export function readDetectCase() {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(DETECT_CASE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.disease !== "string") return null
    return parsed
  } catch {
    return null
  }
}

export function clearDetectCase() {
  if (typeof window === "undefined") return
  try {
    sessionStorage.removeItem(DETECT_CASE_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
