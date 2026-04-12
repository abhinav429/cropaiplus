# Changes vs the original CropAIplus (friend handoff)

This file is for comparing **your original baseline** (Next.js app + Firebase-style auth, disease detection calling Python, basic AgriBot) with **the current tree**. It emphasizes the **memory and knowledge layers**—how the app remembers context and how curated docs feed the assistant.

For a full runbook (install, ports, env), see **`README.md`**. The compact bullet changelog lives in **`CHANGES.md`**.

---

## Terminology: “memory” in this project

| Layer | Where it lives | What it does |
|--------|----------------|--------------|
| **Browser / session memory** | `localStorage`, `sessionStorage` | Chat thread persistence, farm profile, disease “case” after `/detect`, optional sensor snapshot copied before opening chat. |
| **Server knowledge (“wiki”) memory** | `knowledge/` + `lib/knowledge/*` | Curated markdown is read on the server, scored against the conversation + optional hints, and injected into the LLM system prompt. No vector DB. |
| **Live sensor store** | In-memory on the Node server (`POST /sensor`) | Latest ESP32 reading; `/live-sensor` polls `GET /sensor`. |

Nothing here trains a custom embedding model; **OpenRouter** is still the only external LLM, and the API key stays **server-side** (`POST /api/chat`).

---

## A. Knowledge / memory layer (main focus)

### A1. Curated knowledge pack (`knowledge/`)

- **`knowledge/index.md`** — Catalog of topics with short blurbs; used with page bodies for **keyword overlap** scoring.
- **`knowledge/pages/*.md`** — Markdown articles (e.g. `crop-care.md`, `soil-health.md`). Pages can use **YAML front-matter** (`crops`, `topics`, `risk`) parsed by `lib/knowledge/frontMatter.js`; tags get a **boost** when they align with disease case or farm crop (see `retrieve.js`).
- **`knowledge/manifest.json`** — Pack id, version, effective date, per-page version metadata. When valid, a short **pack header** is prefixed to the excerpt sent to the model (`lib/knowledge/manifest.js`).

### A2. Server retrieval (`lib/knowledge/retrieve.js`)

- Loads the index + candidate pages from disk, **tokenizes** a composite “query” from recent user/assistant text.
- **Context-aware scoring:** the same optional payloads the chat API already accepts—**`caseContext`**, **`farmProfile`**, **`sensorContext`**—are folded into the retrieval query and tag boosts so the right pages rank higher without new infrastructure.
- Caps total injected text (**`MAX_KNOWLEDGE_CHARS`**, top **`MAX_PAGES`** pages).
- Appends a provenance line for the model, e.g. **`Sources used: crop-care, soil-health`** (slugs), within the budget.
- **Dev-only logging:** `logger.dev` / `logger.devWarn` for “sources used” and missing manifest (no noisy production logs).

### A3. Chat API wiring (`app/api/chat/route.js`)

- **`retrieveKnowledgeContext(messages, { caseContext, farmProfile, sensorContext })`** runs **before** building the final system prompt.
- **`buildAgribotSystemPrompt(knowledgeExcerpt)`** (`lib/agribot-prompt.js`) prepends AgriBot rules, then optional **reference knowledge** block.
- **Addenda** (same objects as hints): disease case, farm profile, live sensor readings—each appended as its own section so the model sees **structured context** alongside wiki text.

### A4. Client → API (no secrets on the wire)

- **`app/chat/page.js`** sends `messages` plus optional **`caseContext`**, **`farmProfile`**, **`sensorContext`** in the JSON body. The browser never holds `OPENROUTER_API_KEY`.

### A5. Related “memory” flows (handoff into chat)

- **`lib/detectCase.js`** — Session handoff after disease detection; chat reads it and sends `caseContext`.
- **`lib/farmProfile.js`** — Persistent farm fields; chat sends `farmProfile`.
- **`lib/sensorContext.js`** — Sensor snapshot for chat; **`app/live-sensor/page.tsx`** can write context and deep-link to **`/chat?from=live-sensor`**.
- **`lib/chatStorage.js`** — **Conversation memory** in the browser (restore/clear thread); does not replace server knowledge.

---

## B. Other notable deltas (short)

- **i18n:** `LanguageContext` (`LanguageContext.tsx` + shim `LanguageContext.js`), `lib/locales/*`, `LanguageSwitcher`, pages wired to `t()`.
- **Disease API:** Browser calls **`/api/predict-tea`**, which proxies to **`ML_API_URL`** (CropAPI), avoiding CORS and hard-coded :8000 in the client.
- **Sensor route:** `app/sensor/route.ts` validates numeric fields, optional **`SENSOR_INGEST_SECRET`** + `Authorization: Bearer …` for `POST`.
- **Firebase:** Client config can use **`NEXT_PUBLIC_FIREBASE_*`** env vars with fallbacks in `lib/firebase.js`.
- **Logging:** `lib/logger.js` for dev vs production logging; used in chat API, knowledge retrieval, predict-tea proxy, etc.
- **Next config:** Experimental parallel webpack options were removed to reduce corrupted `.next` dev cache; **`npm run clean`** / **`npm run dev:clean`** help after cache errors.
- **CropAPI:** Path/CORS tweaks for local dev (see **`CHANGES.md`**).

---

## How your friend should test the new behavior

Prerequisites: **Node**, **`npm install`**, **`.env.local`** with at least **`OPENROUTER_API_KEY`** (see **`.env.example`**). Run **`npm run dev`** (or **`npm run dev:clean`** if the app serves HTML but `/_next/static/*` 404s).

### 1. Knowledge layer (grounded answers + sources)

1. Open **`/chat`**.
2. Ask something that should match seeded content, e.g. *“How do I improve soil organic matter?”* or *“Tips for crop care in dry weather.”* (wording should overlap `knowledge/pages` and `knowledge/index.md`).
3. **Expect:** Answers that align with your markdown; tone stays AgriBot.
4. **Dev check:** With **`NODE_ENV=development`**, server logs may show **`[cropai] [retrieveKnowledgeContext] Sources used: …`** listing slugs. If **`knowledge/manifest.json`** is missing/invalid, you’ll see a dev warning and the pack header is omitted—chat should still work.

**Negative check:** Ask a generic greeting with no ag keywords; retrieval may inject little or nothing—replies should still work.

### 2. Farm profile → retrieval + prompt

1. Open **`/farm-profile`**, set **main crop**, **location**, **irrigation**, **farm size**, save.
2. Open **`/chat`**, ask about *that crop* and *region* (e.g. irrigation timing).
3. **Expect:** System prompt includes the farm addendum; retrieval query includes profile hints so tagged pages (e.g. `crops` in front-matter) can rank higher.

### 3. Disease detection → case memory → chat

1. Start **CropAPI** on port **8000** if testing ML (optional for this step if you only test handoff with mock data).
2. **`/detect`**: complete a detection so a case is written to **`sessionStorage`**.
3. Use the flow to **open AgriBot** (e.g. from detect → chat).
4. **Expect:** Chat sends **`caseContext`**; answers reference the predicted label and treatments; knowledge retrieval uses disease/crop tags when pages match.

### 4. Live sensors → context memory → chat

1. **`POST /sensor`** with JSON containing at least one of: `temperature`, `humidity`, `soil`, `gas`, `light` (numbers).  
   - If **`SENSOR_INGEST_SECRET`** is set in **`.env.local`**, send header **`Authorization: Bearer <same secret>`**.
2. Open **`/live-sensor`**; confirm readings update (polls every 2s).
3. Click **open AgriBot** (or equivalent) so **`sensorContext`** is written and you land on **`/chat`**.
4. **Expect:** Sensor addendum in the system prompt and retrieval hints including a short sensor summary; answers may reference temperature/humidity/soil when relevant.

**`GET /sensor` 404:** No data posted yet—expected until the first valid **`POST /sensor`**.

### 5. Chat thread persistence (browser memory)

1. Send several messages on **`/chat`**, refresh the page.
2. **Expect:** Thread restored from **`lib/chatStorage.js`** (same browser). Use the UI to clear if provided.

### 6. OpenRouter / API failures

- **402:** Billing/credits—add credits or set **`OPENROUTER_MODEL`** to a model you can run.
- **429:** Rate limit—wait or change model/plan; not an app bug.
- **503 ML:** CropAPI not running—start **`uvicorn`** or fix **`ML_API_URL`**.

---

## Files to share

Send the **whole repo** (without **`node_modules`**), **`knowledge/`** included, and **`.env.example`**. Never commit **`.env.local`** or real keys.

If anything in this doc drifts from code, treat the **`knowledge/`** tree and **`lib/knowledge/retrieve.js`** + **`app/api/chat/route.js`** as source of truth.
