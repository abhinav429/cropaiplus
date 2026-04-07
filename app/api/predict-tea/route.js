import { NextResponse } from "next/server"

/**
 * Proxies crop images to the FastAPI CropAPI service.
 * Browser → same-origin (no CORS). Server → ML_API_URL (default http://127.0.0.1:8000).
 *
 * Set ML_API_URL in .env.local if your Python app runs elsewhere.
 */
const ML_BASE = (process.env.ML_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "")

export async function POST(request) {
  let incoming
  try {
    incoming = await request.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  try {
    const upstream = await fetch(`${ML_BASE}/predict_tea_disease`, {
      method: "POST",
      body: incoming,
    })

    const text = await upstream.text()
    if (!upstream.ok) {
      return NextResponse.json(
        { error: "ML_UPSTREAM_ERROR", detail: text || upstream.statusText },
        { status: upstream.status >= 500 ? 502 : upstream.status }
      )
    }

    try {
      const data = JSON.parse(text)
      return NextResponse.json(data)
    } catch {
      return NextResponse.json({ error: "Invalid JSON from ML service" }, { status: 502 })
    }
  } catch (err) {
    console.error("[predict-tea] proxy to ML server failed:", err)
    return NextResponse.json(
      {
        error: "ML_SERVICE_UNREACHABLE",
        message:
          "Could not connect to the disease-detection API. Start CropAPI (e.g. uvicorn on port 8000) or set ML_API_URL.",
      },
      { status: 503 }
    )
  }
}
