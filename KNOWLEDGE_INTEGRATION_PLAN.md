# Feature Implementation Plan

**Overall Progress:** `100%`

---

## TLDR

Add a **server-side, wiki-style knowledge layer** to CropAIplus: curated markdown under `knowledge/` (index + pages), loaded into the AgriBot prompt so answers are grounded in your content. **No separate service** and **no farmer-facing wiki** in v1—only a better `/chat` experience. Route **LLM calls through a Next.js API route** so keys stay off the client.

---

## Critical Decisions

- **Backend-only context** — Retrieval and LLM calls run on the server; the browser sends messages only.
- **Same LLM stack** — AgriBot uses **OpenRouter** (`OPENROUTER_API_KEY`, optional `OPENROUTER_MODEL`); keys stay server-side only.
- **Flat knowledge tree in the main app** — Use a `knowledge/` folder in CropAIplus (`index.md` + `pages/*.md`), aligned with the pattern used in `cropai-knowledge-base/`, without importing the full second app unless you later choose to.
- **Minimal retrieval v1** — Read the index, pick relevant pages (e.g. keyword/BM25-style scoring or small-index “load all”), cap tokens; **no** new paid infra beyond the existing LLM API.

---

## Tasks

- [x] 🟩 **Step 1: Environment & remove client API key**
  - [x] 🟩 Add `OPENROUTER_API_KEY` (and optional `OPENROUTER_MODEL` / `ML_API_URL`) to `.env.local`; document in `.env.example`.
  - [x] 🟩 Remove any hardcoded API keys from `app/chat/page.js` so nothing secret ships in client bundles.

- [x] 🟩 **Step 2: Knowledge directory & seed content**
  - [x] 🟩 Add `knowledge/index.md` (short catalog of topics / one-line blurbs).
  - [x] 🟩 Add at least one starter page under `knowledge/pages/` (e.g. general agronomy / CropAI scope) so retrieval has real text to inject.

- [x] 🟩 **Step 3: Server retrieval helper**
  - [x] 🟩 Implement a small server-only module (e.g. `lib/knowledge/retrieve.js` or `.ts`) that: reads the index, selects candidate page paths from the user’s latest message (and optionally recent turns), reads those `.md` files, and returns a bounded string for the prompt.
  - [x] 🟩 Keep logic minimal—reuse ideas from `cropai-knowledge-base`’s query flow only as far as copy/paste clarity allows; avoid pulling the whole sub-app into the build unless necessary.

- [x] 🟩 **Step 4: Chat API route**
  - [x] 🟩 Add `POST` handler under `app/api/chat/` (or `app/api/agribot/`) that: validates input, runs retrieval, builds system + user messages (existing AgriBot rules + **wiki excerpts** + conversation history), calls the model server-side, returns the response (streaming if the UI already streams; otherwise match current behavior).
  - [x] 🟩 On missing/empty knowledge, answer still works; wiki block is optional context only.

- [x] 🟩 **Step 5: Wire `app/chat/page.js` to the API**
  - [x] 🟩 Remove direct LLM SDK usage from the client; call the new route with the same message list shape you use today.
  - [x] 🟩 Preserve current UX (loading, errors, streaming if any).

- [x] 🟩 **Step 6: Smoke check**
  - [x] 🟩 Manual test: chat with and without relevant keywords to see grounded vs generic behavior; confirm no key in network tab or source.

---

## Progress formula

```
Overall Progress = round( ( completed_step_count / 6 ) × 100 )%
```

Mark a **Step** 🟩 **Done** when all its subtasks are 🟩. Use 🟨 **In Progress** only while actively working that step.

When all six steps are 🟩, set **Overall Progress** to `100%`.

---

## Implementation notes (post-delivery)

- **Env:** Copy `.env.example` to `.env.local`. AgriBot uses **`OPENROUTER_API_KEY`** (and optional **`OPENROUTER_MODEL`**) — OpenRouter’s OpenAI-compatible API. Disease detection uses **`ML_API_URL`** (mapped to **`NEXT_PUBLIC_ML_API_URL`** in `next.config.mjs` for the client detect page).
- **Smoke:** Run `npm run dev`, open `/chat`, send a message; confirm no API key in client bundle and `/api/chat` returns streamed text.
- **Knowledge:** Edit `knowledge/index.md` and `knowledge/pages/*.md` to grow the curated layer; retrieval ranks by simple keyword overlap with recent user text.
