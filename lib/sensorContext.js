/**
 * ESP32 live sensor → AgriBot context
 *
 * Stores the latest snapshot (from /live-sensor or refreshed from GET /sensor) in
 * sessionStorage so /chat can attach structured readings to each LLM request without
 * re-entering values. Cleared when the user dismisses the banner or ends the session.
 */

export const SENSOR_CONTEXT_STORAGE_KEY = "cropai-sensor-context"

/**
 * @typedef {Object} SensorContextPayload
 * @property {number} [temperature] — °C (e.g. DHT11)
 * @property {number} [humidity] — % relative humidity
 * @property {number} [soil] — soil moisture (raw / scaled per firmware)
 * @property {number} [gas] — air quality / MQ-style (e.g. 0/1)
 * @property {number} [light] — light intensity (e.g. 0/1 digital or raw)
 * @property {string} [timestamp] — ISO 8601 when sample was recorded
 */

/**
 * @param {SensorContextPayload} payload
 */
export function writeSensorContext(payload) {
  if (typeof window === "undefined") return
  try {
    const normalized = normalizeSensorPayload(payload)
    if (!normalized) return
    sessionStorage.setItem(SENSOR_CONTEXT_STORAGE_KEY, JSON.stringify(normalized))
  } catch {
    /* quota / private mode */
  }
}

/**
 * @returns {SensorContextPayload | null}
 */
export function readSensorContext() {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(SENSOR_CONTEXT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return normalizeSensorPayload(parsed)
  } catch {
    return null
  }
}

export function clearSensorContext() {
  if (typeof window === "undefined") return
  try {
    sessionStorage.removeItem(SENSOR_CONTEXT_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * Keep only known numeric/string fields for safe JSON round-trip.
 * @param {unknown} raw
 * @returns {SensorContextPayload | null}
 */
export function normalizeSensorPayload(raw) {
  if (!raw || typeof raw !== "object") return null
  const o = /** @type {Record<string, unknown>} */ (raw)
  const out = {}
  for (const key of ["temperature", "humidity", "soil", "gas", "light"]) {
    const v = o[key]
    let n = null
    if (typeof v === "number" && Number.isFinite(v)) n = v
    else if (typeof v === "string" && v.trim() !== "") {
      const p = Number(v)
      if (Number.isFinite(p)) n = p
    }
    if (n !== null) out[key] = n
  }
  if (typeof o.timestamp === "string") out.timestamp = o.timestamp
  return Object.keys(out).length > 0 ? out : null
}
