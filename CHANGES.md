# Changes relative to the original CropAIplus codebase

This document summarizes **features and fixes** added during development. Use it so teammates know what differs from the earlier “base” project (Next.js app + `CropAPI` FastAPI service + Firebase auth patterns).

**Detailed friend handoff** (memory / knowledge layer + step-by-step tests): **`FRIEND_CHANGES.md`**.

---

## 1. Internationalization (multilingual UI)

- **`contexts/LanguageContext.tsx`** (+ shim **`LanguageContext.js`**, **`LanguageContext.d.ts`**) — `LanguageProvider`, `useLanguage()`, `t(key)`, persisted locale (`cropai-locale`).
- **`lib/i18n.js`**, **`lib/locales/en.json`**, **`hi.json`**, **`ta.json`** — English, Hindi, Tamil.
- **`components/LanguageSwitcher.js`** — navbar language control.
- **Updated:** `app/layout.js`, `components/navbar.js`, `components/footer.js`, main pages and marketplace — strings via `t()`.

---

## 2. Diagnosis → AgriBot “case handoff”

- **`lib/detectCase.js`** — `sessionStorage` for the latest detection (`cropai-detect-case`).
- **`app/detect/page.js`** — writes case after ML response; link to `/chat?from=detect`.
- **`app/chat/page.js`** — reads case, banner, sends `caseContext` in `POST /api/chat`.
- **`app/api/chat/route.js`** — `caseContext` merged into the system prompt; also used for **knowledge retrieval** scoring.

---

## 3. Disease API proxy

- **`app/api/predict-tea/route.js`** — proxies to `ML_API_URL` (default `http://127.0.0.1:8000`).
- **`app/detect/page.js`** — calls `/api/predict-tea` instead of the browser hitting port 8000 directly.

---

## 4. CropAPI (`CropAPI/app.py`) portability

- Model and CSV paths use **`Path(__file__).parent`**.
- CORS allows **`http://127.0.0.1:3000`** and **`http://localhost:3000`**.

---

## 5. Chat “memory” (local persistence)

- **`lib/chatStorage.js`** — message list in `localStorage` (`cropai-chat-messages`).
- **`app/chat/page.js`** — restore/save thread; clear conversation.

---

## 6. Farm profile (farmer / field context for AgriBot)

- **`lib/farmProfile.js`** — `loadFarmProfile` / `saveFarmProfile` / `clearFarmProfile` (`cropai-farm-profile`); event `cropai-farm-profile-updated`.
- **`app/farm-profile/page.js`** — form for crop, location, irrigation, farm size.
- **`app/chat/page.js`** — sends `farmProfile` in chat requests; banner when profile is active.
- **`app/api/chat/route.js`** — `buildFarmProfileSystemAddendum()` appended to the system prompt; **`farmProfile`** also feeds **knowledge retrieval**.

---

## 7. Server knowledge layer (wiki → AgriBot)

- **`knowledge/`** — `index.md`, `pages/*.md`, optional YAML front-matter, **`manifest.json`**.
- **`lib/knowledge/retrieve.js`**, **`frontMatter.js`**, **`manifest.js`** — keyword retrieval, context hints (`caseContext`, `farmProfile`, `sensorContext`), `Sources used:` line.
- **`lib/agribot-prompt.js`** — injects curated excerpt into the system prompt.
- Design notes: **`KNOWLEDGE_INTEGRATION_PLAN.md`** / **`KNOWLEDGE_LAYER_ENHANCEMENT_PLAN.md`** (if present in repo).

---

## 8. Live sensors, logging, env hardening

- **`app/sensor/route.ts`** — validated ingest; optional **`SENSOR_INGEST_SECRET`** (Bearer) on `POST`.
- **`lib/sensorContext.js`**, **`app/live-sensor/page.tsx`** — poll `/sensor`, hand off to chat.
- **`lib/logger.js`** — dev vs prod logging for API / knowledge / proxy.
- **`lib/firebase.js`** — optional **`NEXT_PUBLIC_FIREBASE_*`** with safe fallbacks.
- **`next.config.mjs`** — removed experimental parallel webpack flags that could corrupt dev cache; **`npm run clean`** / **`npm run dev:clean`** in **`package.json`**.

---

## 9. Smaller fixes / polish

- Marketplace template and payment image path fixes; auth routes **`/auth/login`**, **`/auth/signup`**.

---

## 10. GitHub push helper

- **`scripts/push-to-abhinav.sh`** — pushes `main` to remote `abhinav` (`abhinav429/cropaiplus`); **`npm run push:github`** runs it.
- **`README.md`** — runbook; remote may be **`origin`** (`msquarex/CropAIplus` or other).

---

## Files to send

- Send the **whole project folder** (or a **git archive**). Do **not** commit `node_modules`; run `npm install`.
- Include **`.env.example`** — never commit real API keys or **`.env.local`** (gitignored via `.env*`).
