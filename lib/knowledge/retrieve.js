/**
 * Server-only: load curated markdown from /knowledge and score pages against the
 * current conversation for injection into AgriBot. No vector DB — keyword overlap
 * on index blurbs + page bodies (minimal v1, aligned with the integration plan).
 */

import fs from "fs/promises"
import path from "path"

const PAGES_DIR = path.join(process.cwd(), "knowledge", "pages")
const INDEX_FILE = path.join(process.cwd(), "knowledge", "index.md")

/** Max characters of knowledge text passed to the LLM (rough budget). */
const MAX_KNOWLEDGE_CHARS = 12_000

/** Max pages to include after ranking. */
const MAX_PAGES = 5

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
 * @param {{ role: string, content?: string }[]} messages
 * @returns {string}
 */
function extractQueryText(messages) {
  const users = messages.filter((m) => m.role === "user").slice(-4)
  return users.map((m) => m.content || "").join(" ").slice(0, 8000)
}

/** Safe slug: only lowercase letters, numbers, hyphens. */
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/

/**
 * Parse index.md for `[title](pages/foo.md)` lines; fallback to directory listing.
 * @returns {Promise<{ slug: string, title: string, blurb: string }[]>}
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
 * @param {{ slug: string, title: string, blurb: string, file: string }} meta
 * @returns {Promise<string>}
 */
async function readPageBody(meta) {
  const full = path.join(PAGES_DIR, meta.file)
  try {
    return await fs.readFile(full, "utf-8")
  } catch {
    return ""
  }
}

/**
 * Load ranked knowledge excerpts for the given conversation.
 * @param {{ role: string, content?: string }[]} messages — chat history (user/assistant only expected).
 * @returns {Promise<string>} Markdown block to append to system prompt, or empty string.
 */
export async function retrieveKnowledgeContext(messages) {
  const queryText = extractQueryText(messages)
  const metas = await listIndexEntries()
  if (metas.length === 0) return ""

  const loaded = await Promise.all(
    metas.map(async (meta) => ({
      slug: meta.slug,
      title: meta.title,
      blurb: meta.blurb,
      body: await readPageBody(meta),
    }))
  )

  const withBody = loaded.filter((e) => e.body.length > 0)
  if (withBody.length === 0) return ""

  const scores = scoreEntries(withBody, queryText)
  const ranked = withBody
    .map((e, i) => ({ ...e, score: scores[i] }))
    .sort((a, b) => b.score - a.score)

  /** If nothing matched, still provide light context from top of index order (first pages). */
  const picked =
    ranked[0].score > 0 ? ranked.filter((r) => r.score > 0).slice(0, MAX_PAGES) : ranked.slice(0, Math.min(2, ranked.length))

  const parts = []
  let total = 0
  for (const p of picked) {
    const block = `### ${p.title} (${p.slug})\n${p.body}\n`
    if (total + block.length > MAX_KNOWLEDGE_CHARS) break
    parts.push(block)
    total += block.length
  }

  return parts.join("\n---\n\n")
}
