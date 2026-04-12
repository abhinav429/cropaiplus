# CropAI Knowledge Base

Internal tool for **CropAIplus**: ingest documents, maintain a compiled markdown wiki (`wiki/`), and query it with LLM-backed answers and citations.

## Features

- **Ingest** — Paste a URL or text; content is cleaned, stored under `raw/`, and summarized into the wiki.
- **Query** — Ask questions; answers use wiki pages only, with source links.
- **Lint** — Check for orphan pages, staleness, missing cross-references, and (with an API key) possible contradictions.
- **Browse** — Index, per-page view, link graph, optional export.

## Quick start

```bash
cd cropai-knowledge-base
pnpm install
# Create .env.local with at least one LLM provider (see SCHEMA.md)
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Configure providers under **Settings** or via env vars (see `SCHEMA.md`).

## Docs

| File | Purpose |
|------|---------|
| `WIKI_VISION.md` | Why compiled wiki vs. one-off retrieval |
| `SCHEMA.md` | Page rules, ingest/query/lint behavior, env vars |
| `PROJECT.md` | Stack, layout, integration note |

## Environment

Typical variables (use what your provider needs):

- `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` / Ollama: `OLLAMA_BASE_URL` or `OLLAMA_MODEL`
- `LLM_MODEL` — optional override
- `WIKI_DIR` / `RAW_DIR` / `DATA_DIR` — optional paths for wiki and raw roots

## License

See repository root for CropAIplus licensing. Third-party dependencies retain their respective licenses.
