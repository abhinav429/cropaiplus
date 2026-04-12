# Feature Implementation Plan

**Overall Progress:** `100%` _(completed steps ÷ 3 × 100)_

## TLDR

Improve the **existing** wiki-style knowledge path (`knowledge/` + `retrieveKnowledgeContext` → system prompt) so retrieval **uses the same optional context** the chat API already has (disease case, farm profile, sensor snapshot)—**without** embeddings, vector DBs, or new infrastructure. Small, targeted code changes only.

## Critical Decisions

- **Decision 1: No new ML stack** — Keep keyword overlap scoring in `lib/knowledge/retrieve.js`; only extend **what text** is used to score pages (richer “query” string).
- **Decision 2: Server-only changes** — Extend `POST /api/chat` to pass **optional** fields into retrieval (same `body` already parsed for addenda). Client (`app/chat/page.js`) **unchanged** if the route already forwards `caseContext` / `farmProfile` / `sensorContext`.
- **Decision 3: Provenance for debugging** — Append a short **“Sources used:”** line to the knowledge excerpt (slug list) so the model and logs reflect which pages were injected; dev logging uses `lib/logger.js` (`logger.dev`).

## Tasks

- [x] 🟩 **Step 1: Pass context into retrieval**
  - [x] 🟩 Add a helper (e.g. `buildRetrievalQueryText(messages, opts)`) in `lib/knowledge/retrieve.js` (or adjacent) that combines: last user lines (existing behavior) **+** optional strings from `caseContext` (e.g. disease label), `farmProfile` (e.g. main crop, location), `sensorContext` (e.g. one-line numeric summary)—**only when present**.
  - [x] 🟩 Change `retrieveKnowledgeContext` to accept a second argument `contextHints` (object) and use it inside scoring / `extractQueryText` replacement.
  - [x] 🟩 In `app/api/chat/route.js`, call `retrieveKnowledgeContext(messages, { caseContext, farmProfile, sensorContext })` **before** building addenda (order unchanged).

- [x] 🟩 **Step 2: Slug list / “Sources used” in the injected block**
  - [x] 🟩 After picking pages, append a single line to the markdown excerpt: e.g. `Sources used: slug-a, slug-b` (only non-empty slugs), so the LLM sees explicit provenance without new UI.
  - [x] 🟩 Keep within `MAX_KNOWLEDGE_CHARS` budget (truncate or omit line if over budget—prefer trimming body text first per existing loop).

- [x] 🟩 **Step 3: Verify and document**
  - [x] 🟩 Smoke-test: chat with/without active case/profile/sensors; confirm different pages rank higher when labels match `knowledge/pages` content.
  - [x] 🟩 Cross-link from `KNOWLEDGE_INTEGRATION_PLAN.md` to this file.

---

**Out of scope (explicit):** Embeddings, vector DB, YAML front-matter overhaul, new npm dependencies, UI changes, farmer-facing “citations” panel.

**Progress formula:** `Overall Progress = round((completed_steps / 3) × 100)%` — mark each step 🟩 when all its subtasks are 🟩; use 🟨 while in progress.
