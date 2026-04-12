import { readFile } from "fs/promises";
import path from "path";
import {
  saveRawSource,
  writeWikiPageWithSideEffects,
  readWikiPageWithFrontmatter,
  serializeFrontmatter,
  listWikiPages,
  findRelatedPages,
  type Frontmatter,
} from "./wiki";
import { callLLM, hasLLMKey } from "./llm";
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import type { IngestResult } from "./types";

// Re-exported so existing imports (and the test suite) keep working after we
// moved the cross-ref helpers into wiki.ts to avoid a circular dependency
// between wiki.ts and ingest.ts.
export { findRelatedPages, updateRelatedPages } from "./wiki";

// ---------------------------------------------------------------------------
// Slug generation
// ---------------------------------------------------------------------------

/** Convert a title into a URL-safe slug (lowercase, hyphens, no special chars). */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// URL detection & fetching
// ---------------------------------------------------------------------------

/** Check if a string looks like a URL (starts with http:// or https://). */
export function isUrl(input: string): boolean {
  const trimmed = input.trim();
  return trimmed.startsWith("http://") || trimmed.startsWith("https://");
}

/**
 * Strip HTML to plain text using a simple regex-based approach.
 *
 * 1. Remove <script>, <style>, <nav>, <header>, <footer> elements entirely
 * 2. Strip remaining HTML tags
 * 3. Decode common HTML entities
 * 4. Collapse whitespace
 */
export function stripHtml(html: string): string {
  let text = html;

  // Remove elements whose content should be discarded entirely
  const removeTags = ["script", "style", "nav", "header", "footer", "noscript"];
  for (const tag of removeTags) {
    const re = new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`, "gi");
    text = text.replace(re, " ");
  }

  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    // Common named HTML5 entities
    .replace(/&mdash;/g, "\u2014")
    .replace(/&ndash;/g, "\u2013")
    .replace(/&hellip;/g, "\u2026")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&rdquo;/g, "\u201D")
    .replace(/&ldquo;/g, "\u201C")
    .replace(/&trade;/g, "\u2122")
    .replace(/&copy;/g, "\u00A9")
    .replace(/&reg;/g, "\u00AE")
    .replace(/&bull;/g, "\u2022")
    .replace(/&middot;/g, "\u00B7")
    // Numeric entities: &#123; and &#x1F;
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

  // Collapse whitespace
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

/**
 * Extract the <title> content from HTML.
 * Falls back to empty string if not found.
 */
export function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return "";
  // Strip any inner tags and collapse whitespace
  return match[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

/** Maximum response body size in bytes (5 MB). */
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024;

/** Maximum extracted text content length passed downstream (100 K chars). */
const MAX_CONTENT_LENGTH = 100_000;

/** Fetch timeout in milliseconds (15 seconds). */
const FETCH_TIMEOUT_MS = 15_000;

/**
 * Extract article content from HTML using @mozilla/readability + linkedom.
 * Returns `null` when Readability cannot identify an article in the page.
 */
export function extractWithReadability(
  html: string,
): { title: string; textContent: string } | null {
  try {
    const { document } = parseHTML(html);
    const reader = new Readability(document);
    const article = reader.parse();

    if (article && article.textContent && article.textContent.trim().length > 0) {
      return {
        title: article.title || "",
        textContent: article.textContent.trim(),
      };
    }
    return null;
  } catch {
    // If linkedom/Readability throws, fall back to regex stripping
    return null;
  }
}

/**
 * Fetch a URL and extract its text content and title.
 *
 * Uses @mozilla/readability + linkedom for robust HTML-to-text extraction.
 * Falls back to regex-based `stripHtml()` when Readability can't parse the page.
 * Applies a 15-second timeout and a 5 MB response size limit for safety.
 */
export async function fetchUrlContent(
  url: string,
): Promise<{ title: string; content: string }> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "CropAI-KnowledgeBase/1.0",
      Accept: "text/html,application/xhtml+xml,*/*",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch URL: ${response.status} ${response.statusText}`,
    );
  }

  // Check Content-Length header before reading body
  const contentLength = response.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
    throw new Error(
      `Content too large: ${contentLength} bytes (max ${MAX_RESPONSE_SIZE})`,
    );
  }

  const html = await response.text();

  // Check actual body size after reading
  if (html.length > MAX_RESPONSE_SIZE) {
    throw new Error(
      `Content too large: ${html.length} chars (max ${MAX_RESPONSE_SIZE})`,
    );
  }

  let title: string;
  let content: string;

  // Try Readability first for proper article extraction
  const article = extractWithReadability(html);
  if (article) {
    title = article.title || extractTitle(html) || new URL(url).hostname;
    content = article.textContent;
  } else {
    // Fallback to regex-based stripping for non-article pages
    title = extractTitle(html) || new URL(url).hostname;
    content = stripHtml(html);
  }

  if (!content) {
    throw new Error("No text content could be extracted from the URL");
  }

  // Truncate very long extracted text to a reasonable size for LLM processing
  if (content.length > MAX_CONTENT_LENGTH) {
    content = content.slice(0, MAX_CONTENT_LENGTH) + "\n\n[Content truncated]";
  }

  return { title, content };
}

/**
 * Ingest a URL into the wiki.
 *
 * 1. Fetch and extract the page content
 * 2. Delegate to the standard `ingest()` pipeline
 */
export async function ingestUrl(
  url: string,
  options?: IngestOptions,
): Promise<IngestResult> {
  const { title, content } = await fetchUrlContent(url);
  return ingest(title, content, options);
}

// ---------------------------------------------------------------------------
// Fallback stub (no API key)
// ---------------------------------------------------------------------------

function generateFallbackPage(title: string, content: string): string {
  const preview = content.length > 200 ? content.slice(0, 200) + "..." : content;
  return `# ${title}\n\n## Summary\n\n${preview}\n\n## Raw Content\n\n${content}`;
}

// ---------------------------------------------------------------------------
// Summary extraction
// ---------------------------------------------------------------------------

/**
 * Extract a short summary from content by finding the first sentence.
 *
 * Uses sentence-ending punctuation followed by whitespace (`[.!?]\s`) or
 * paragraph breaks (`\n\n`) as boundaries — avoids splitting on abbreviations
 * like "Dr." or "U.S." where the period is not followed by a space that starts
 * a new sentence (though it's a heuristic, not perfect).
 *
 * Returns at most `maxLen` characters.
 */
export function extractSummary(content: string, maxLen = 200): string {
  const trimmed = content.trim();
  if (!trimmed) return "";

  // Look for a sentence boundary: period/exclamation/question followed by a space
  const sentenceEnd = trimmed.search(/[.!?]\s/);
  // Look for a paragraph break
  const paraBreak = trimmed.indexOf("\n\n");

  // Pick the earliest valid boundary
  let cutoff = -1;
  if (sentenceEnd !== -1 && paraBreak !== -1) {
    cutoff = Math.min(sentenceEnd + 1, paraBreak); // +1 to include the punctuation
  } else if (sentenceEnd !== -1) {
    cutoff = sentenceEnd + 1;
  } else if (paraBreak !== -1) {
    cutoff = paraBreak;
  }

  let summary: string;
  if (cutoff !== -1 && cutoff <= maxLen) {
    summary = trimmed.slice(0, cutoff).trim();
  } else {
    // No sentence boundary found or it's too far — just truncate
    summary =
      trimmed.length > maxLen
        ? trimmed.slice(0, maxLen).trim() + "..."
        : trimmed.trim();
  }

  return summary;
}

// ---------------------------------------------------------------------------
// Cross-referencing
// ---------------------------------------------------------------------------
//
// `findRelatedPages` and `updateRelatedPages` used to live here but were
// moved into `wiki.ts` so that `writeWikiPageWithSideEffects` could call them
// without creating a circular import. They are re-exported at the top of
// this file for backwards compatibility with existing tests and callers.

// ---------------------------------------------------------------------------
// Content chunking
// ---------------------------------------------------------------------------

/**
 * Maximum number of characters to send to the LLM in a single call.
 *
 * 12,000 chars ≈ 3,000 tokens — conservative enough for all providers and
 * leaves ample room for the system prompt and output tokens within even the
 * smallest context windows (8K tokens).
 */
export const MAX_LLM_INPUT_CHARS = 12_000;

/**
 * Split text into chunks of at most `maxChars` characters.
 *
 * Strategy:
 * 1. Split on paragraph boundaries (`\n\n`).
 * 2. Greedily combine paragraphs into chunks up to `maxChars`.
 * 3. If a single paragraph exceeds `maxChars`, split it on sentence
 *    boundaries (`. `, `! `, `? ` followed by whitespace or end-of-string).
 * 4. If a single sentence still exceeds `maxChars`, hard-split at `maxChars`.
 *
 * Returns an array of chunks, each ≤ `maxChars`.
 */
export function chunkText(text: string, maxChars: number = MAX_LLM_INPUT_CHARS): string[] {
  if (text.length <= maxChars) return [text];

  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    // If this single paragraph fits in the current chunk, append it
    if (current.length === 0 && para.length <= maxChars) {
      current = para;
      continue;
    }

    if (current.length > 0 && current.length + 2 + para.length <= maxChars) {
      current += "\n\n" + para;
      continue;
    }

    // Flush current chunk if non-empty
    if (current.length > 0) {
      chunks.push(current);
      current = "";
    }

    // If the paragraph itself fits in a chunk, start a new chunk with it
    if (para.length <= maxChars) {
      current = para;
      continue;
    }

    // Oversized paragraph — split on sentence boundaries
    const sentences = splitSentences(para);
    for (const sentence of sentences) {
      if (sentence.length > maxChars) {
        // Hard-split an oversized sentence
        for (let i = 0; i < sentence.length; i += maxChars) {
          const piece = sentence.slice(i, i + maxChars);
          if (current.length === 0) {
            chunks.push(piece);
          } else if (current.length + 1 + piece.length <= maxChars) {
            current += " " + piece;
          } else {
            chunks.push(current);
            chunks.push(piece);
            current = "";
          }
        }
        continue;
      }

      if (current.length === 0) {
        current = sentence;
      } else if (current.length + 1 + sentence.length <= maxChars) {
        current += " " + sentence;
      } else {
        chunks.push(current);
        current = sentence;
      }
    }
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

/**
 * Split a paragraph into sentences. Uses sentence-ending punctuation
 * followed by whitespace as the delimiter. Keeps the punctuation attached
 * to the sentence.
 */
function splitSentences(text: string): string[] {
  // Split after sentence-ending punctuation followed by whitespace
  const parts = text.split(/(?<=[.!?])\s+/);
  return parts.filter((s) => s.length > 0);
}

// ---------------------------------------------------------------------------
// Ingest pipeline
// ---------------------------------------------------------------------------

// Conventions are documented in SCHEMA.md at the repo root.
const INGEST_SYSTEM_PROMPT_BASE = `You are a wiki editor. Given a source document, generate a wiki article in markdown format.

Include:
- A title as a level-1 heading (# Title)
- A brief summary section (## Summary)
- Key points or takeaways (## Key Points)
- Notable entities, concepts, or terms worth remembering (## Concepts)

Output pure markdown and nothing else. Do not wrap in code fences.`;

/**
 * System prompt for continuation chunks when a long source document has been
 * split into multiple parts. The LLM receives the article produced so far and
 * a new batch of source material and should produce only the *additional*
 * sections — no duplicate title or summary.
 */
const CONTINUATION_SYSTEM_PROMPT = `You are a wiki editor. You have already started a wiki article from earlier parts of a long source document. You are now given additional source material.

Add new key points, concepts, and details from the additional source material. Do NOT repeat the title, summary, or any content already in the article. Only output the new sections or bullet points to append.

Output pure markdown and nothing else. Do not wrap in code fences.`;

/**
 * Read the "Page conventions" section out of SCHEMA.md at repo root so the
 * ingest prompt can include it verbatim. This makes SCHEMA.md the source of
 * truth — change the doc, change ingest behavior on the next call.
 *
 * Extracts from the `## Page conventions` heading up to (but not including)
 * the next `## ` heading. Returns empty string if SCHEMA.md is missing or
 * the section can't be found, so ingest degrades gracefully rather than
 * crashing on a fresh clone.
 *
 * Accepts an optional `schemaPath` override for tests; defaults to
 * `<cwd>/SCHEMA.md`.
 */
export async function loadPageConventions(
  schemaPath?: string,
): Promise<string> {
  try {
    const resolved = schemaPath ?? path.join(process.cwd(), "SCHEMA.md");
    const schema = await readFile(resolved, "utf-8");
    const startIdx = schema.indexOf("## Page conventions");
    if (startIdx === -1) return "";
    const afterStart = schema.slice(startIdx);
    // Find the next top-level section heading after the Page conventions one
    const nextHeadingMatch = afterStart
      .slice("## Page conventions".length)
      .match(/\n## /);
    const section = nextHeadingMatch
      ? afterStart.slice(
          0,
          "## Page conventions".length + nextHeadingMatch.index!,
        )
      : afterStart;
    return section.trim();
  } catch {
    return "";
  }
}

/**
 * Build the ingest system prompt by composing the base prompt with the
 * "Page conventions" slice of SCHEMA.md loaded at runtime. Read on every
 * call (no caching) so live edits to SCHEMA.md take effect immediately —
 * the whole point is to keep prompt and schema co-evolving.
 */
export async function buildIngestSystemPrompt(): Promise<string> {
  const conventions = await loadPageConventions();
  if (conventions === "") return INGEST_SYSTEM_PROMPT_BASE;
  return `${INGEST_SYSTEM_PROMPT_BASE}

The wiki you are editing follows these conventions (from SCHEMA.md):

${conventions}

Follow these conventions when generating the page.`;
}

// ---------------------------------------------------------------------------
// Ingest options
// ---------------------------------------------------------------------------

/** Options for the two-phase ingest workflow. */
export interface IngestOptions {
  /**
   * When `true`, run the LLM and return the generated wiki content without
   * writing anything to disk. The caller can display this for human review
   * before committing.
   */
  preview?: boolean;
  /**
   * Pre-generated wiki content from a prior preview call. When provided the
   * LLM is skipped entirely and this content is written to disk as-is. This
   * avoids paying for the LLM call twice (once for preview, once for commit).
   */
  generatedContent?: string;
}

/**
 * Ingest a source document into the wiki.
 *
 * Supports a two-phase preview workflow:
 *
 * 1. **Preview** (`options.preview = true`): run the LLM to generate wiki
 *    content and identify related pages, but do NOT write anything to disk.
 *    Returns the result with `previewContent` populated.
 *
 * 2. **Commit from preview** (`options.generatedContent` set): skip the LLM,
 *    use the pre-generated content and write everything to disk. This is the
 *    "approve" step after a human reviews the preview.
 *
 * 3. **Direct ingest** (no options / defaults): the original single-step
 *    behaviour — call the LLM and write immediately. Fully backward-compatible.
 */
export async function ingest(
  title: string,
  content: string,
  options?: IngestOptions,
): Promise<IngestResult> {
  const slug = slugify(title);

  if (slug === "") {
    throw new Error(
      "Cannot ingest: title produces an empty slug",
    );
  }

  const isPreview = options?.preview === true;
  const preGeneratedContent = options?.generatedContent;

  // 1. Generate wiki page content (or use pre-generated from preview)
  let wikiContent: string;
  if (preGeneratedContent) {
    // Commit-from-preview: skip the LLM, use the content the user approved
    wikiContent = preGeneratedContent;
  } else if (hasLLMKey()) {
    const systemPrompt = await buildIngestSystemPrompt();
    const chunks = chunkText(content, MAX_LLM_INPUT_CHARS);

    if (chunks.length === 1) {
      // Short content — single LLM call (no behaviour change)
      wikiContent = await callLLM(systemPrompt, chunks[0]);
    } else {
      // Long content — call LLM per chunk, merge results
      // First chunk produces the primary page structure
      wikiContent = await callLLM(systemPrompt, chunks[0]);

      // Subsequent chunks add supplemental content
      for (let i = 1; i < chunks.length; i++) {
        const continuation = await callLLM(
          CONTINUATION_SYSTEM_PROMPT,
          `# Existing article so far\n\n${wikiContent}\n\n# Additional source material (part ${i + 1} of ${chunks.length})\n\n${chunks[i]}`,
        );
        wikiContent += "\n\n" + continuation;
      }
    }
  } else {
    wikiContent = generateFallbackPage(title, content);
  }

  // 2. Compute the index summary from the *raw* source so the index reflects
  // the original document, not the LLM's reformatting.
  const summary = extractSummary(content);

  // --- Preview mode: return the generated content without writing ---
  if (isPreview) {
    // Identify which related pages would be updated (read-only check)
    const existingEntries = await listWikiPages();
    const relatedSlugs = await findRelatedPages(slug, content, existingEntries);

    return {
      rawPath: "",
      primarySlug: slug,
      relatedUpdated: relatedSlugs,
      wikiPages: [slug, ...relatedSlugs],
      indexUpdated: false,
      previewContent: wikiContent,
    };
  }

  // --- Normal commit path (direct ingest or commit-from-preview) ---

  // 3. Save raw source
  const rawPath = await saveRawSource(slug, content);

  // 4. Build / refresh the YAML frontmatter block. New pages get
  // created = updated = today and source_count = 1. Re-ingesting the same
  // slug preserves `created`, advances `updated`, increments `source_count`,
  // and preserves any user-edited tags.
  const now = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const frontmatter: Frontmatter = {
    created: now,
    updated: now,
    source_count: "1",
    tags: [],
  };

  const existing = await readWikiPageWithFrontmatter(slug);
  if (existing) {
    const existingCreated = existing.frontmatter.created;
    if (typeof existingCreated === "string" && existingCreated !== "") {
      frontmatter.created = existingCreated;
    }
    const prevCountRaw = existing.frontmatter.source_count;
    const prevCount =
      typeof prevCountRaw === "string" ? Number(prevCountRaw) : NaN;
    frontmatter.source_count = String(
      (Number.isFinite(prevCount) ? prevCount : 0) + 1,
    );
    if (Array.isArray(existing.frontmatter.tags)) {
      frontmatter.tags = existing.frontmatter.tags;
    }
  }

  const contentWithFm = serializeFrontmatter(frontmatter, wikiContent);

  // 5. Hand off to the unified write pipeline. We pass the raw `content` as
  // `crossRefSource` so the LLM sees the full document when picking related
  // pages, matching the previous behaviour.
  const { updatedSlugs } = await writeWikiPageWithSideEffects({
    slug,
    title,
    content: contentWithFm,
    summary,
    logOp: "ingest",
    crossRefSource: content,
    logDetails: ({ updatedSlugs }) =>
      `slug: ${slug} · updated ${updatedSlugs.length} related page(s)`,
  });

  return {
    rawPath,
    primarySlug: slug,
    relatedUpdated: updatedSlugs,
    wikiPages: [slug, ...updatedSlugs],
    indexUpdated: true,
  };
}
