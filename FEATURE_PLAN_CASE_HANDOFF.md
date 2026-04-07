# Feature Implementation Plan — Diagnosis → AgriBot Case Handoff

**Overall Progress:** `100%`

## TLDR

After a successful disease prediction on `/detect`, the app stores a structured case in `sessionStorage` and offers **Ask AgriBot about this result**. `/chat` shows an **active case banner**, sends `caseContext` to `/api/chat`, and the server merges a case summary into the system prompt so AgriBot answers in context—**no ML or hardware changes**.

## Critical Decisions

- **Storage:** `sessionStorage` via `lib/detectCase.js` — session-scoped, no new backend store.
- **API:** `POST /api/chat` accepts optional `caseContext`; appended to the existing system prompt.
- **Navigation:** `/chat?from=detect` → strip query with `router.replace("/chat")` after load.

## Tasks

- [x] 🟩 **Step 1: Define case payload and write on detect**
  - [x] 🟩 Build JSON after successful `predict_tea_disease` (disease, confidences, ISO time, locale, treatment lines).
  - [x] 🟩 `sessionStorage` via `writeDetectCase()`; `clearDetectCase()` on image clear.

- [x] 🟩 **Step 2: “Ask AgriBot about this result” on `/detect`**
  - [x] 🟩 Shown when `detectionResult` exists; `Link` to `/chat?from=detect`.

- [x] 🟩 **Step 3: Consume case on `/chat` and banner**
  - [x] 🟩 `readDetectCase()` on mount; banner with disease + confidence; **Clear case** clears storage + state.
  - [x] 🟩 Greeting switches to `chat.greetingWithCase` when a case active (single-message thread only).
  - [x] 🟩 `Suspense` wrapper for `useSearchParams`.

- [x] 🟩 **Step 4: Pass case to `/api/chat`**
  - [x] 🟩 Request body includes `caseContext` when `activeCase` is set.
  - [x] 🟩 `buildCaseContextSystemAddendum()` merged into system content in `app/api/chat/route.js`.

- [x] 🟩 **Step 5: Smoke test**
  - [x] 🟩 Code paths verified; lint clean on touched files.

## i18n

- [x] 🟩 Keys added: `detect.askAgriBot`, `chat.greetingWithCase`, `chat.caseBannerTitle`, `chat.caseClear`, `chat.caseHint` (en / hi / ta).

---

*Last updated: implementation complete.*
