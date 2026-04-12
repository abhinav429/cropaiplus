# CropAI Knowledge Base — project context

Part of **CropAIplus**: a Next.js app that ingests sources, maintains interlinked markdown under `wiki/`, and answers questions with citations.

## Scope

- **Ingest** — URL or pasted text → `raw/` + wiki pages + index updates.
- **Query** — Natural-language questions against compiled wiki content (BM25, optional embeddings + fusion).
- **Lint** — Wiki health (orphans, staleness, cross-refs, contradiction hints when an LLM is configured).
- **Browse** — Index, page view, graph, export.

## Tech stack

- **Next.js** (App Router), **TypeScript**, **Tailwind**
- **Vercel AI SDK** (`ai`) for Anthropic, OpenAI, Google, Ollama
- **Filesystem** storage: `raw/` and `wiki/` (typically gitignored locally)
- **Tests**: Vitest

## Commands

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build
pnpm lint
pnpm test
```

## Layout

```
WIKI_VISION.md     # design notes (conceptual)
PROJECT.md         # this file
SCHEMA.md          # conventions and operation specs
src/               # application source
raw/               # source documents (local, often gitignored)
wiki/              # compiled wiki output (local, often gitignored)
```

## Configuration

LLM providers are selected via environment variables (see `SCHEMA.md`). Optional settings UI may write `.cropai-kb-config.json` in the app data directory.

## Integration with CropAIplus

This package can run standalone for development. The main CropAIplus app may call its APIs or share the same knowledge files for AgriBot-style answers—integration is done at the parent project level.
