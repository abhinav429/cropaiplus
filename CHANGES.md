# Changes relative to the original CropAIplus codebase

This document summarizes **features and fixes** added during development. Use it so teammates know what differs from the earlier “base” project (Next.js app + `CropAPI` FastAPI service + Firebase auth patterns).

---

## 1. Internationalization (multilingual UI)

- **`contexts/LanguageContext.js`** — `LanguageProvider`, `useLanguage()`, `t(key)`, persisted locale (`cropai-locale`).
- **`lib/i18n.js`**, **`lib/locales/en.json`**, **`hi.json`**, **`ta.json`** — English, Hindi, Tamil.
- **`components/LanguageSwitcher.js`** — navbar language control.
- **Updated:** `app/layout.js`, `components/navbar.js`, `components/footer.js`, main pages and marketplace — strings via `t()`.

---

## 2. Diagnosis → AgriBot “case handoff”

- **`lib/detectCase.js`** — `sessionStorage` for the latest detection (`cropai-detect-case`).
- **`app/detect/page.js`** — writes case after ML response; link to `/chat?from=detect`.
- **`app/chat/page.js`** — reads case, banner, sends `caseContext` in `POST /api/chat`.
- **`app/api/chat/route.js`** — `caseContext` merged into the system prompt.

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
- **`app/api/chat/route.js`** — `buildFarmProfileSystemAddendum()` appended to the system prompt.
- **Navbar / footer** — link to `/farm-profile`.

---

## 7. Smaller fixes / polish

- Marketplace template and payment image path fixes; auth routes **`/auth/login`**, **`/auth/signup`**.

---

## Files to send

- Send the **whole project folder** (or a **git archive**). Do **not** commit `node_modules`; run `npm install`.
- Include **`.env.local.example`** — never commit real API keys.
