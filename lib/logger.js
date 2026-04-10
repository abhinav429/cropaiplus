/**
 * Centralized logging for CropAIplus. Use instead of raw console.* for consistent
 * prefixes and to keep noisy diagnostics out of production where appropriate.
 *
 * - `dev` / `devWarn` — only when NODE_ENV === "development"
 * - `warn` / `error` — always (errors for real failures; avoid logging secrets/PII)
 */

export const logger = {
  dev(...args) {
    if (process.env.NODE_ENV === "development") {
      console.log("[cropai]", ...args)
    }
  },

  devWarn(...args) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[cropai]", ...args)
    }
  },

  warn(...args) {
    console.warn("[cropai]", ...args)
  },

  error(...args) {
    console.error("[cropai]", ...args)
  },
}
