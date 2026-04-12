/**
 * Minimal YAML front-matter parser for knowledge pages (no external deps).
 * Supported keys: crops, topics (arrays or comma-separated), risk (string).
 */

/**
 * Parse a list value: `[a, b]`, `[ "a", "b" ]`, or `a, b`
 * @param {string} val
 * @returns {string[]}
 */
function parseListValue(val) {
  const v = val.trim()
  if (v.startsWith("[") && v.endsWith("]")) {
    const inner = v.slice(1, -1).trim()
    if (!inner) return []
    return inner.split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean)
  }
  return v.split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean)
}

/**
 * Parse a small subset of YAML lines (key: value per line).
 * @param {string} yamlBlock — content between first --- and closing ---
 * @returns {Record<string, unknown>}
 */
function parseSimpleYaml(yamlBlock) {
  /** @type {Record<string, unknown>} */
  const out = {}
  for (const line of yamlBlock.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const m = trimmed.match(/^([\w-]+):\s*(.*)$/)
    if (!m) continue
    const key = m[1].toLowerCase()
    let val = m[2].trim()
    if (key === "crops" || key === "topics") {
      out[key] = parseListValue(val)
    } else if (key === "risk") {
      out[key] = val.replace(/^["']|["']$/g, "")
    }
  }
  return out
}

/**
 * Split raw file into optional front-matter and markdown body.
 * If the file does not start with `---\n`, the full string is returned as body.
 *
 * @param {string} raw — full file contents
 * @returns {{ frontMatter: Record<string, unknown>, body: string }}
 */
export function parsePageFile(raw) {
  if (typeof raw !== "string" || !raw.startsWith("---\n")) {
    return { frontMatter: {}, body: raw || "" }
  }
  const end = raw.indexOf("\n---\n", 4)
  if (end === -1) {
    return { frontMatter: {}, body: raw }
  }
  const yamlBlock = raw.slice(4, end)
  const body = raw.slice(end + 5)
  return { frontMatter: parseSimpleYaml(yamlBlock), body }
}

/**
 * Normalize front-matter into string arrays + optional risk label.
 * @param {Record<string, unknown>} fm
 * @returns {{ crops: string[], topics: string[], risk: string }}
 */
export function normalizePageMeta(fm) {
  const crops = Array.isArray(fm.crops) ? fm.crops.map(String) : []
  const topics = Array.isArray(fm.topics) ? fm.topics.map(String) : []
  const risk = typeof fm.risk === "string" ? fm.risk : ""
  return { crops, topics, risk }
}
