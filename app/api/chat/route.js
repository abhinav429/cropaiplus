import { buildAgribotSystemPrompt } from "@/lib/agribot-prompt"
import { retrieveKnowledgeContext } from "@/lib/knowledge/retrieve"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** OpenRouter model id (see https://openrouter.ai/models). */
const DEFAULT_OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct:free"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

/**
 * Normalize client messages: only user/assistant roles, string content, no timestamps.
 * @param {unknown[]} raw
 */
function sanitizeMessages(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((m) => m && (m.role === "user" || m.role === "assistant"))
    .map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : "",
    }))
}

/**
 * Optional payload from Disease Detection handoff (browser → /api/chat).
 * Tailor replies to this specific field case without re-uploading images.
 */
function buildCaseContextSystemAddendum(caseContext) {
  if (!caseContext || typeof caseContext.disease !== "string") return ""
  const treatments = Array.isArray(caseContext.treatmentSummaries)
    ? caseContext.treatmentSummaries.join("; ")
    : ""
  return [
    "CURRENT FIELD CASE (from CropAI disease detection — use this context to tailor all advice; do not invent a different diagnosis):",
    `- Predicted condition label: ${caseContext.disease}`,
    `- Model confidence (raw): ${caseContext.rawModelConfidence ?? "unknown"}`,
    `- Display confidence (UI): ${caseContext.displayConfidence ?? "unknown"}%`,
    `- Farmer app language code: ${caseContext.locale ?? "en"}`,
    `- Captured at: ${caseContext.capturedAt ?? "unknown"}`,
    `- Treatment hints already shown to the farmer: ${treatments || "none listed"}`,
    "Give actionable next steps for this case. If model confidence is low or the farmer asks, recommend confirming with a local extension officer or agronomist and/or submitting a clearer leaf photo.",
  ].join("\n")
}

/** Optional farmer context from /farm-profile (localStorage → client → API). */
function buildFarmProfileSystemAddendum(farmProfile) {
  if (!farmProfile || typeof farmProfile !== "object") return ""
  const crop = farmProfile.mainCrop
  const loc = farmProfile.location
  const size = farmProfile.farmSize
  const irr = farmProfile.irrigation
  if (!crop && !loc && !size && (irr === undefined || irr === null || irr === "other")) return ""
  return [
    "FARMER CONTEXT (saved in CropAI farm profile — tailor irrigation, timing, and scale of advice; if disease diagnosis context is also present, do not contradict it):",
    `- Main crop / focus: ${crop || "not specified"}`,
    `- District / state (as entered by user): ${loc || "not specified"}`,
    `- Irrigation type (code): ${irr || "unknown"}`,
    `- Farm size (as entered): ${size || "not specified"}`,
    "Prefer region-appropriate recommendations when location is known; prefer scale-appropriate inputs (labour, water, inputs) when farm size is known.",
  ].join("\n")
}

/**
 * Stream OpenRouter SSE (OpenAI-compatible) and forward text deltas to the client.
 * @param {ReadableStream<Uint8Array> | null} body
 */
async function* streamOpenRouterDeltas(body) {
  if (!body) return
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith("data:")) continue
        const data = trimmed.slice(5).trim()
        if (data === "[DONE]") return
        try {
          const json = JSON.parse(data)
          const text = json.choices?.[0]?.delta?.content
          if (text) yield text
        } catch {
          /* ignore partial JSON lines */
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * POST /api/chat
 * Body: {
 *   messages: { role: 'user'|'assistant', content: string }[],
 *   caseContext?: object,
 *   farmProfile?: object,
 * }
 * Response: streamed plain text (UTF-8) chunks from the model.
 *
 * Uses OpenRouter (OPENROUTER_API_KEY) — OpenAI-compatible API.
 * Augments the AgriBot + knowledge system prompt with optional detect handoff and farm profile.
 */
export async function POST(request) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return Response.json(
      { error: "Server misconfiguration: OPENROUTER_API_KEY is not set." },
      { status: 503 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const messages = sanitizeMessages(body.messages)
  if (messages.length === 0) {
    return Response.json(
      { error: "messages must include at least one user or assistant entry." },
      { status: 400 }
    )
  }

  const caseContext = body.caseContext
  const farmProfile = body.farmProfile

  const knowledgeExcerpt = await retrieveKnowledgeContext(messages)
  let systemPrompt = buildAgribotSystemPrompt(knowledgeExcerpt)

  const caseAddendum = buildCaseContextSystemAddendum(caseContext)
  const farmAddendum = buildFarmProfileSystemAddendum(farmProfile)
  if (caseAddendum) {
    systemPrompt = `${systemPrompt}\n\n---\n${caseAddendum}`
  }
  if (farmAddendum) {
    systemPrompt = `${systemPrompt}\n\n---\n${farmAddendum}`
  }

  const model = process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL

  const upstream = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://cropai.local",
      "X-Title": "CropAIplus AgriBot",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 4096,
      temperature: 0.7,
      top_p: 0.7,
      stream: true,
    }),
  })

  if (!upstream.ok) {
    let detail = upstream.statusText
    try {
      const errJson = await upstream.json()
      if (errJson.error?.message) detail = errJson.error.message
      else if (typeof errJson.error === "string") detail = errJson.error
    } catch {
      /* ignore */
    }
    console.error("OpenRouter error:", upstream.status, detail)
    return Response.json({ error: detail || "Upstream model error." }, { status: 502 })
  }

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const text of streamOpenRouterDeltas(upstream.body)) {
          controller.enqueue(encoder.encode(text))
        }
        controller.close()
      } catch (e) {
        controller.error(e)
      }
    },
  })

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  })
}
