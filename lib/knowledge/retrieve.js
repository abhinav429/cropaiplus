/**
 * Server-only: load curated markdown from /knowledge and score pages against the
 * current conversation for injection into AgriBot. No vector DB — keyword overlap
 * on index blurbs + page bodies (minimal v1, aligned with the integration plan).
 *
 * Optional `contextHints` (disease case, farm profile, sensor snapshot) extend the
 * scoring query so pages align with the same context sent in the system prompt addenda.
 *
 * **Knowledge pack:** `knowledge/manifest.json` declares version/effective date; a header
 * line is prefixed to the excerpt when the manifest loads.
 *
 * **Front-matter:** Pages may include YAML `crops`, `topics`, `risk` — see `frontMatter.js`.
 * Tag overlap with case/farm context adds a boost; topic tags add a smaller boost vs user query.
 */

import fs from "fs/promises"
import path from "path"
import { parsePageFile, normalizePageMeta } from "@/lib/knowledge/frontMatter"
import { loadManifest, formatKnowledgePackHeader } from "@/lib/knowledge/manifest"
import { logger } from "@/lib/logger"

const PAGES_DIR = path.join(process.cwd(), "knowledge", "pages")
const INDEX_FILE = path.join(process.cwd(), "knowledge", "index.md")

/** Max characters of knowledge text passed to the LLM (rough budget). */
const MAX_KNOWLEDGE_CHARS = 12_000

/** Max pages to include after ranking. */
const MAX_PAGES = 5

/** Boost when `crops`/`topics` tags align with disease label or main crop (substring/token). */
const CONTEXT_TAG_BOOST = 3

/** Smaller boost when `topics` tags overlap the tokenized user query. */
const TOPIC_QUERY_BOOST = 1

const STOP = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "to", "of", "in", "on", "for", "with", "by", "at", "from", "as", "or", "and",
  "it", "its", "this", "that", "these", "those", "i", "you", "we", "they",
  "what", "how", "when", "where", "why", "which", "who", "does", "do", "did",
  "can", "could", "would", "should", "will", "my", "your", "our", "their",
])

/**
 * @param {string} text
 * @returns {string[]}
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
}

/**
 * @param {{ slug: string, title: string, blurb: string, body: string }[]} entries
 * @param {string} queryText
 * @returns {number[]}
 */
function scoreEntries(entries, queryText) {
  const qTokens = new Set(tokenize(queryText))
  if (qTokens.size === 0) return entries.map(() => 0)

  return entries.map((e) => {
    const hay = `${e.title} ${e.blurb} ${e.body}`.toLowerCase()
    let score = 0
    for (const t of qTokens) {
      if (hay.includes(t)) score += 1
    }
    return score
  })
}

/**
 * +CONTEXT_TAG_BOOST if any crop/topic tag matches disease text or main crop (case-insensitive).
 *
 * @param {string[]} crops
 * @param {string[]} topics
 * @param {{
 *   caseContext?: object,
 *   farmProfile?: object,
 * }} contextHints
 * @returns {number} 0 or CONTEXT_TAG_BOOST
 */
function computeContextTagBoost(crops, topics, contextHints) {
  const tags = [...crops, ...topics]
    .map((t) => String(t).toLowerCase().trim())
    .filter((t) => t.length > 1)
  if (!tags.length) return 0

  const disease =
    contextHints?.caseContext && typeof contextHints.caseContext.disease === "string"
      ? contextHints.caseContext.disease.toLowerCase()
      : ""
  const mainCrop =
    contextHints?.farmProfile && typeof contextHints.farmProfile.mainCrop === "string"
      ? contextHints.farmProfile.mainCrop.toLowerCase()
      : ""
  const hay = `${disease} ${mainCrop}`.trim()
  if (!hay) return 0

  for (const tag of tags) {
    if (hay.includes(tag)) return CONTEXT_TAG_BOOST
    for (const part of tag.split(/[\s/]+/).filter((p) => p.length > 2)) {
      if (hay.includes(part)) return CONTEXT_TAG_BOOST
    }
  }
  return 0
}

/**
 * +TOPIC_QUERY_BOOST if any front-matter `topics` entry overlaps tokenized query text.
 *
 * @param {string[]} topicTags
 * @param {string} queryText
 * @returns {number} 0 or TOPIC_QUERY_BOOST
 */
function computeTopicQueryBoost(topicTags, queryText) {
  const qTokens = new Set(tokenize(queryText))
  if (!qTokens.size) return 0
  const tops = (topicTags || []).map((t) => String(t).toLowerCase())
  for (const t of tops) {
    for (const qt of qTokens) {
      if (t.includes(qt) || qt.includes(t)) return TOPIC_QUERY_BOOST
    }
  }
  return 0
}

/**
 * Last few user turns only (same as legacy behavior).
 * @param {{ role: string, content?: string }[]} messages
 * @returns {string}
 */
function extractQueryText(messages) {
  const users = messages.filter((m) => m.role === "user").slice(-4)
  return users.map((m) => m.content || "").join(" ").slice(0, 8000)
}

/**
 * Combines chat text with optional API context so keyword scoring matches
 * disease labels, farm crop/location, and sensor-derived terms.
 *
 * @param {{ role: string, content?: string }[]} messages
 * @param {{
 *   caseContext?: object,
 *   farmProfile?: object,
 *   sensorContext?: object,
 * }} [contextHints]
 * @returns {string}
 */
export function buildRetrievalQueryText(messages, contextHints = {}) {
  const bits = [extractQueryText(messages)]

  const c = contextHints.caseContext
  if (c && typeof c === "object") {
    if (typeof c.disease === "string" && c.disease.trim()) bits.push(c.disease.trim())
    if (Array.isArray(c.treatmentSummaries)) bits.push(c.treatmentSummaries.filter(Boolean).join(" "))
  }

  const f = contextHints.farmProfile
  if (f && typeof f === "object") {
    if (typeof f.mainCrop === "string" && f.mainCrop.trim()) bits.push(f.mainCrop.trim())
    if (typeof f.location === "string" && f.location.trim()) bits.push(f.location.trim())
    if (typeof f.farmSize === "string" && f.farmSize.trim()) bits.push(f.farmSize.trim())
    if (f.irrigation != null && f.irrigation !== "" && f.irrigation !== "other") {
      bits.push(String(f.irrigation))
    }
  }

  const s = contextHints.sensorContext
  if (s && typeof s === "object") {
    const sensorBits = []
    if (typeof s.temperature === "number") sensorBits.push(`temperature ${s.temperature}`)
    if (typeof s.humidity === "number") sensorBits.push(`humidity ${s.humidity}`)
    if (typeof s.soil === "number") sensorBits.push(`soil moisture ${s.soil}`)
    if (typeof s.light === "number") sensorBits.push(`light ${s.light}`)
    if (typeof s.gas === "number") sensorBits.push(`air quality ${s.gas}`)
    if (sensorBits.length) bits.push(sensorBits.join(" "))
  }

  return bits.filter(Boolean).join(" ").slice(0, 8000)
}

/** Safe slug: only lowercase letters, numbers, hyphens. */
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/

/**
 * Parse index.md for `[title](pages/foo.md)` lines; fallback to directory listing.
 * @returns {Promise<{ slug: string, title: string, blurb: string, file: string }[]>}
 */
async function listIndexEntries() {
  let indexRaw = ""
  try {
    indexRaw = await fs.readFile(INDEX_FILE, "utf-8")
  } catch {
    indexRaw = ""
  }

  const entries = []
  for (const line of indexRaw.split("\n")) {
    const m = line.match(/\[([^\]]+)\]\(\s*pages\/([a-z0-9][a-z0-9-]*\.md)\s*\)/i)
    if (!m) continue
    const title = m[1].trim()
    const file = m[2].trim().toLowerCase()
    if (!SAFE_SLUG.test(file)) continue
    const after = line.slice(line.indexOf(")") + 1)
    const blurb = after.replace(/^\s*[—\-–]\s*/, "").trim()
    entries.push({ slug: file.replace(/\.md$/, ""), title, blurb, file })
  }

  if (entries.length > 0) return entries

  try {
    const files = await fs.readdir(PAGES_DIR)
    for (const f of files) {
      if (!SAFE_SLUG.test(f)) continue
      const slug = f.replace(/\.md$/, "")
      entries.push({ slug, title: slug, blurb: "", file: f })
    }
  } catch {
    // no pages dir yet
  }
  return entries
}

/**
 * Read raw file from disk and split front-matter from body for scoring.
 * @param {{ slug: string, title: string, blurb: string, file: string }} meta
 */
async function loadParsedPage(meta) {
  const full = path.join(PAGES_DIR, meta.file)
  let raw = ""
  try {
    raw = await fs.readFile(full, "utf-8")
  } catch {
    return null
  }
  const { frontMatter, body } = parsePageFile(raw)
  const { crops, topics, risk } = normalizePageMeta(frontMatter)
  return {
    slug: meta.slug,
    title: meta.title,
    blurb: meta.blurb,
    body,
    crops,
    topics,
    risk,
  }
}

/**
 * @param {string[]} slugs
 * @returns {string}
 */
function buildSourcesLine(slugs) {
  if (!slugs.length) return ""
  return `\n\nSources used: ${slugs.join(", ")}\n`
}

/**
 * Rank entries by base keyword score + metadata boosts; soft-prioritize tag-matched pages
 * when any page has a positive context-tag boost (Decision 3 in metadata plan).
 *
 * @param {Array<{ slug: string, title: string, blurb: string, body: string, crops: string[], topics: string[], risk: string }>} entries
 * @param {string} queryText
 * @param {object} contextHints
 */
function rankWithMetadata(entries, queryText, contextHints) {
  const baseScores = scoreEntries(entries, queryText)
  const enriched = entries.map((e, i) => {
    const baseScore = baseScores[i]
    const contextBoost = computeContextTagBoost(e.crops, e.topics, contextHints)
    const topicBoost = computeTopicQueryBoost(e.topics, queryText)
    const finalScore = baseScore + contextBoost + topicBoost
    return { ...e, baseScore, contextBoost, topicBoost, finalScore }
  })

  const anyContextBoost = enriched.some((e) => e.contextBoost > 0)

  enriched.sort((a, b) => {
    if (anyContextBoost) {
      const priA = a.contextBoost > 0 ? 0 : 1
      const priB = b.contextBoost > 0 ? 0 : 1
      if (priA !== priB) return priA - priB
    }
    return b.finalScore - a.finalScore
  })

  return enriched
}

/**
 * Load ranked knowledge excerpts for the given conversation.
 *
 * @param {{ role: string, content?: string }[]} messages — chat history (user/assistant only expected).
 * @param {{
 *   caseContext?: object,
 *   farmProfile?: object,
 *   sensorContext?: object,
 * }} [contextHints] — same optional payloads as POST /api/chat; improves scoring.
 * @returns {Promise<string>} Markdown block to append to system prompt, or empty string.
 */
export async function retrieveKnowledgeContext(messages, contextHints = {}) {
  const queryText = buildRetrievalQueryText(messages, contextHints)
  const manifest = await loadManifest()
  if (!manifest) {
    logger.devWarn("[retrieveKnowledgeContext] knowledge/manifest.json missing or invalid — pack header omitted.")
  }

  const packHeader = formatKnowledgePackHeader(manifest)

  const metas = await listIndexEntries()
  if (metas.length === 0) return ""

  const loaded = await Promise.all(metas.map((meta) => loadParsedPage(meta)))
  const withBody = loaded.filter((e) => e && e.body.length > 0)
  if (withBody.length === 0) return ""

  const ranked = rankWithMetadata(withBody, queryText, contextHints)

  /** If nothing matched on base keyword score, still provide light context (first pages after metadata sort). */
  const hasKeywordHit = ranked.some((e) => e.baseScore > 0)
  const picked = hasKeywordHit ? ranked.filter((r) => r.baseScore > 0).slice(0, MAX_PAGES) : ranked.slice(0, Math.min(2, ranked.length))

  const blocks = []
  const slugsIncluded = []
  const sep = "\n---\n\n"

  for (const p of picked) {
    const block = `### ${p.title} (${p.slug})\n${p.body}\n`
    const nextBlocks = [...blocks, block]
    const nextSlugs = [...slugsIncluded, p.slug]
    const bodyTry = nextBlocks.join(sep)
    const excerptTry = packHeader + bodyTry + buildSourcesLine(nextSlugs)
    if (excerptTry.length > MAX_KNOWLEDGE_CHARS) break
    blocks.push(block)
    slugsIncluded.push(p.slug)
  }

  if (blocks.length === 0) return ""

  let excerpt = packHeader + blocks.join(sep) + buildSourcesLine(slugsIncluded)

  while (excerpt.length > MAX_KNOWLEDGE_CHARS && blocks.length > 1) {
    blocks.pop()
    slugsIncluded.pop()
    excerpt = packHeader + blocks.join(sep) + buildSourcesLine(slugsIncluded)
  }
  if (excerpt.length > MAX_KNOWLEDGE_CHARS) {
    const sources = buildSourcesLine(slugsIncluded)
    const maxBody = MAX_KNOWLEDGE_CHARS - packHeader.length - sources.length
    let bodyOnly = blocks.join(sep)
    if (bodyOnly.length > maxBody) {
      bodyOnly = bodyOnly.slice(0, Math.max(0, maxBody - 3)) + "..."
    }
    excerpt = packHeader + bodyOnly + sources
  }

  if (slugsIncluded.length) {
    logger.dev("[retrieveKnowledgeContext] Sources used:", slugsIncluded.join(", "))
  }

  return excerpt
}
