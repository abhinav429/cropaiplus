# CropAIplus — runbook for your machine

Quick guide to run the **Next.js frontend** and optional **Python disease-detection API** on Windows (or macOS/Linux).

---

## What you need installed

| Tool | Notes |
|------|--------|
| **Node.js** | LTS (e.g. 20.x or 22.x) — includes `npm` |
| **Python 3.10+** | Only if you run **CropAPI** (disease detection) |
| **Git** | Optional; only if you clone from a repo |

---

## 1. Frontend (required for the web app)

```bash
cd CropAIplus
npm install
npm run dev
```

Open **http://localhost:3000** (or **http://127.0.0.1:3000**).

### Environment variables

Copy **`.env.local.example`** to **`.env.local`** and edit, or create **`.env.local`** manually in the **project root** (same folder as `package.json`):

```env
# Required for AgriBot chat (OpenRouter)
OPENROUTER_API_KEY=your_key_here

# Optional: if CropAPI runs somewhere other than http://127.0.0.1:8000
# ML_API_URL=http://127.0.0.1:8000
```

Restart `npm run dev` after changing `.env.local`.

### Firebase (login / signup)

The app expects Firebase config in **`lib/firebase.js`**. Replace placeholders with your project’s keys if you use authentication.

---

## 2. Disease detection API (optional)

Used by **Disease Detection** (`/detect`). The Next app talks to it via **`/api/predict-tea`**, which proxies to the URL in **`ML_API_URL`** (default `http://127.0.0.1:8000`).

```bash
cd CropAPI
python -m venv .venv
.venv\Scripts\activate
pip install fastapi uvicorn python-multipart pillow numpy pandas tensorflow
```

Place **`tea_VGG16_model.h5`** and use **`tea diseases.csv`** next to **`app.py`** (paths are relative to that folder).

```bash
uvicorn app:app --host 0.0.0.0 --port 8000
```

Or:

```bash
python app.py
```

If this service is **not** running, the UI should show a clear “ML service offline” style message when you try to analyze an image.

---

## 3. Ports

| Service | Port |
|---------|------|
| Next.js (`npm run dev`) | **3000** |
| CropAPI (uvicorn) | **8000** |

Keep both running in **two terminals** if you need full disease detection.

---

## 4. Hardware / live sensors (optional)

The **live sensor** page reads data from **`GET /sensor`** (Next.js route). An ESP32 or similar can **`POST` JSON** to `/sensor`. No extra install beyond the Next app.

---

## 5. Multilingual UI

Use the **language control in the navbar** (English / हिंदी / தமிழ்). Choice is stored in the browser.

---

## 5b. Farm profile (optional)

Open **`/farm-profile`** (also linked from the navbar when logged in and from the footer). Enter crop, location, irrigation, and farm size — **saved in `localStorage`** (`cropai-farm-profile`) on this browser only.  
When you use **AgriBot** (`/chat`), that profile is sent as **`farmProfile`** in each chat request and merged into the assistant’s system prompt so answers match your farm context.

---

## 6. Troubleshooting

| Issue | What to try |
|-------|-------------|
| `npm` / `next` errors | Delete `node_modules`, run `npm install` again |
| Chat always errors | Set **`OPENROUTER_API_KEY`** in `.env.local` |
| Disease detection fails | Start CropAPI on port **8000**; confirm **`tea_VGG16_model.h5`** exists beside `app.py` |
| TensorFlow won’t import | Install a **CPU build** matching your OS/arch (Windows x64 vs Apple Silicon differ) |

---

## 7. Project map (short)

- **`app/`** — Next.js App Router pages and API routes (`api/chat`, `api/predict-tea`, `sensor`, …); **`app/farm-profile/`** — farmer/farm context (browser `localStorage`, used by AgriBot prompts)
- **`CropAPI/`** — FastAPI + TensorFlow model for tea disease prediction
- **`lib/locales/`** — UI translations
- **`CHANGES.md`** — feature changelog vs earlier base (for teammates)

---

## 8. Push this repo to GitHub (`abhinav429/cropaiplus`)

The remote **`abhinav`** is set to [github.com/abhinav429/cropaiplus](https://github.com/abhinav429/cropaiplus). **You must sign in once** (this machine cannot push without your credentials).

**Option A — run the helper script** (from the project root):

```bash
chmod +x scripts/push-to-abhinav.sh   # once
./scripts/push-to-abhinav.sh
# or: npm run push:github
```

When Git asks to authenticate, use **GitHub → Settings → Developer settings → Personal access tokens** and paste a token with **`repo`** scope as the password (HTTPS), or set up **SSH keys** and switch the remote:

```bash
git remote set-url abhinav git@github.com:abhinav429/cropaiplus.git
git push -u abhinav main
```

After a successful push, the repo page shows your files **immediately** (no long wait).

---

## Security reminder

Do **not** commit **`.env.local`**, API keys, or Firebase secrets. Share **`.env.local.example`** (template only) with your team.
