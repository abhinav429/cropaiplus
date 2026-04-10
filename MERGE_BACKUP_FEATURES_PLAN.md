# Feature Implementation Plan

**Overall Progress:** `100%` _(completed steps ÷ 8 × 100)_

---

## TLDR

Bring **`backup/local-before-msquarex-main`** features back into the current app—**multilingual UI (en / hi / ta)**, **farm profile**, **chat/detect handoff helpers**, **predict proxy**, **live-sensor pages**, and related polish—while **keeping** the **OpenRouter**-based **`/api/chat`** flow and the **`knowledge/`** wiki-style context layer. Work is **merge + conflict resolution + wiring**, not a rewrite.

---

## Critical Decisions

- **Merge source** — Use **`backup/local-before-msquarex-main`** as the authoritative snapshot of your old work (3 commits on top of `d7fc504`).
- **Preserve server chat** — Keep **OpenRouter** in `app/api/chat/route.js` and **`retrieveKnowledgeContext`** / **`buildAgribotSystemPrompt`**; do **not** replace with an older Together-only route. Where the backup branch added a different chat API, **merge behavior** (i18n strings, storage hooks) into the **current** route + **`app/chat/page.js`**.
- **Single chat path** — Client calls **`POST /api/chat`** only; restore **`lib/chatStorage.js`** and UI from backup if it assumed a different API shape—**adapt** calls to the current JSON + stream contract.
- **Env** — Unify **`.env.example` / `.env.local`**: **`OPENROUTER_*`**, **`ML_API_URL`**, plus any keys the backup branch expected (e.g. Firebase `NEXT_PUBLIC_*` already in use).
- **i18n** — Restore **`LanguageContext`**, **`lib/locales/*`**, **`LanguageSwitcher`**, and wrap existing providers in **`app/layout.js`** without duplicating `AuthProvider` / `CartProvider` trees.

---

## Tasks

- [x] 🟩 **Step 1: Save current OpenRouter + knowledge work**
  - [x] 🟩 **Commit** (or stash) all pending changes: `knowledge/`, `lib/agribot-prompt.js`, `lib/knowledge/`, `app/api/chat/`, `next.config.mjs` env mapping, `package.json` / lockfile, `.env.example`, `.gitignore`, modified `app/chat/page.js`, `app/detect/page.js`, docs.
  - [x] 🟩 Confirm **`npm run build`** passes on this snapshot before merging.

- [x] 🟩 **Step 2: Merge backup branch**
  - [x] 🟩 Run **`git merge backup/local-before-msquarex-main`** into `main` (or merge into a throwaway branch first).
  - [x] 🟩 List **conflict files**; expect overlaps on **`app/chat/page.js`**, **`app/detect/page.js`**, **`components/navbar.js`**, **`app/layout.js`**, **`package.json`**, **`lib/firebase.js`**, **`contexts/AuthContext.js`**, **`CropAPI/app.py`**, possibly **`app/api/chat/route.js`** if backup added a parallel file.

- [x] 🟩 **Step 3: Resolve `app/api/chat` — OpenRouter + knowledge wins**
  - [x] 🟩 Keep **OpenRouter** streaming + **`retrieveKnowledgeContext`** + **`buildAgribotSystemPrompt`**.
  - [x] 🟩 If backup introduced duplicate routes (**`/api/predict-tea`** etc.), **keep** them as long as they don’t replace `/api/chat`; fix imports/paths after merge.

- [x] 🟩 **Step 4: Restore i18n in the shell**
  - [x] 🟩 Bring back **`contexts/LanguageContext.js`**, **`lib/i18n.js`**, **`lib/locales/en.json`**, **`hi.json`**, **`ta.json`**, **`components/LanguageSwitcher.js`**.
  - [x] 🟩 Update **`app/layout.js`** to nest **`LanguageProvider`** (and match backup order with **`AuthProvider`** / **`CartProvider`**).
  - [x] 🟩 Wire **`components/navbar.js`** and **`components/footer.js`** to use translation keys + **`LanguageSwitcher`** (desktop + mobile sheet).

- [x] 🟩 **Step 5: Reconcile `app/chat/page.js`**
  - [x] 🟩 Merge **streaming `fetch('/api/chat')`** (current) with backup UX (suggestions, **`chatStorage`**, i18n `t()` calls, any image/voice UI).
  - [x] 🟩 Ensure message payload shape matches **`POST /api/chat`** (`messages` array + optional `caseContext` / `farmProfile`).

- [x] 🟩 **Step 6: Restore satellite features from backup**
  - [x] 🟩 **`app/farm-profile/page.js`**, **`lib/farmProfile.js`** — restore routes/links from navbar if backup had them.
  - [x] 🟩 **`lib/detectCase.js`**, handoff wiring in **`app/detect/page.js`** — merge with **`ML_API_URL`** / **`NEXT_PUBLIC_ML_API_URL`** (current) and **`/api/predict-tea`** proxy.
  - [x] 🟩 **`app/live-sensor/page.tsx`**, **`app/sensor/route.ts`** — restore if still desired; fix any broken imports after merge.
  - [x] 🟩 **Marketplace** — merge **`lib/marketplaceCats.js`** + **`CartContext`** / pages with current payment flow; resolve string duplication with i18n.

- [x] 🟩 **Step 7: Docs, scripts, CropAPI**
  - [x] 🟩 Restore **`CHANGES.md`**, **`README.md`**, **`FEATURE_PLAN_CASE_HANDOFF.md`**, **`scripts/push-to-abhinav.sh`** only if you still want them; avoid duplicate conflicting READMEs—**one** top-level story.
  - [x] 🟩 **`CropAPI/app.py`** — merge path/env fixes from backup with any local path you use now.

- [x] 🟩 **Step 8: Verification**
  - [x] 🟩 **`npm run build`**, smoke **`/chat`** (stream + knowledge), **`/detect`**, language switch **en/hi/ta**, **`/farm-profile`** if linked, marketplace checkout path.
  - [x] 🟩 Confirm **no API keys** in client bundles; **`.env.local`** documents **OpenRouter** + **ML** + Firebase.

---

## Progress formula

```
Overall Progress = round( ( completed_steps / 8 ) × 100 )%
```

Mark a **Step** 🟩 when all its subtasks are 🟩. Use 🟨 while resolving that step.

When all eight steps are 🟩, set **Overall Progress** to `100%`.

---

## Out of scope (this plan)

- New patent features, new backends, or replacing OpenRouter.
- Full redesign of `cropai-knowledge-base/` subproject.
- Resolving **abhinav** remote or push targets (optional script only).

---

## Merge resolution notes (implementation)

- **`app/api/chat/route.js`**: Streaming OpenRouter + `retrieveKnowledgeContext` + `buildAgribotSystemPrompt`; optional **`caseContext`** / **`farmProfile`** appended to the system prompt (from backup helpers).
- **`app/chat/page.js`**: i18n, storage, detect handoff, **`Suspense`** for `useSearchParams`; client streams plain-text response; sends **`messages`** + optional context keys.
- **`app/detect/page.js`**: Uses **`POST /api/predict-tea`** (same-origin proxy to `ML_API_URL`).
- **`.gitignore`**: Tracks **`!.env.example`** and **`!.env.local.example`**.
