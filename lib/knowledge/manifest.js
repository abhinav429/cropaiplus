/**
 * Versioned knowledge pack manifest (`knowledge/manifest.json`).
 * Optional: if missing or invalid, retrieval proceeds without a pack header.
 */

import fs from "fs/promises"
import path from "path"

const MANIFEST_FILE = path.join(process.cwd(), "knowledge", "manifest.json")

/**
 * @typedef {Object} KnowledgeManifest
 * @property {string} packId
 * @property {string} version
 * @property {string} [effectiveFrom] — ISO date string
 * @property {string} [packChecksum] — optional short audit hash
 * @property {Record<string, { version?: string, sha256?: string }>} [pages]
 */

/**
 * @returns {Promise<KnowledgeManifest | null>}
 */
export async function loadManifest() {
  try {
    const raw = await fs.readFile(MANIFEST_FILE, "utf-8")
    const j = JSON.parse(raw)
    if (!j || typeof j.packId !== "string" || typeof j.version !== "string") {
      return null
    }
    return j
  } catch {
    return null
  }
}

/**
 * Single markdown-safe line(s) prefixed to the knowledge excerpt for LLM provenance.
 *
 * @param {KnowledgeManifest | null} m
 * @returns {string} Empty string if no manifest.
 */
export function formatKnowledgePackHeader(m) {
  if (!m) return ""
  let line = `Knowledge pack: ${m.packId} v${m.version} | effective: ${m.effectiveFrom || "unknown"}`
  if (typeof m.packChecksum === "string" && m.packChecksum.trim()) {
    const short = m.packChecksum.trim().slice(0, 32)
    line += ` | manifest checksum: ${short}`
  }
  return `${line}\n\n`
}
