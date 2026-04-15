import { NextResponse } from "next/server"
import { buildAgribotSystemPrompt } from "@/lib/agribot-prompt"
import { retrieveKnowledgeContext } from "@/lib/knowledge/retrieve"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

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

/**
 * Optional live ESP32 readings (DHT11, soil moisture, air quality, light) from GET /sensor
 * or session handoff — merged into system prompt so AgriBot can reason about microclimate.
 */
function buildSensorContextSystemAddendum(sensorContext) {
  if (!sensorContext || typeof sensorContext !== "object") return ""
  const s = sensorContext
  const lines = [
    "LIVE FIELD SENSOR READINGS (ESP32 — use to tailor irrigation, ventilation, and crop stress advice; these are point-in-time measurements, not a forecast):",
  ]
  if (typeof s.temperature === "number") lines.push(`- Air temperature (DHT11): ${s.temperature} °C`)
  if (typeof s.humidity === "number") lines.push(`- Relative humidity (DHT11): ${s.humidity}%`)
  if (typeof s.soil === "number") lines.push(`- Soil moisture (analog sensor): ${s.soil} (scale depends on device calibration)`)
  if (typeof s.light === "number") lines.push(`- Light intensity (sensor): ${s.light} (0/1 or raw per firmware)`)
  if (typeof s.gas === "number") lines.push(`- Air quality / gas (MQ-class): ${s.gas} (0/1 or threshold per firmware)`)
  if (typeof s.timestamp === "string") lines.push(`- Sample time (ISO): ${s.timestamp}`)
  lines.push(
    "If readings conflict with farm profile or disease case context, mention uncertainty and suggest confirming with local observation or extension advice."
  )
  return lines.length > 2 ? lines.join("\n") : ""
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

export async function POST(request) {
  try {
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
    }

    const { messages: rawMessages, caseContext, farmProfile, sensorContext } = body || {}
    const messages = sanitizeMessages(rawMessages)

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "No valid messages provided" },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      logger.error("OPENROUTER_API_KEY is not set")
      return NextResponse.json(
        { error: "Server is not configured with an AI API key" },
        { status: 500 }
      )
    }

    /** Same optional payloads as system addenda — improves keyword retrieval against \`knowledge/pages\`. */
    const knowledgeExcerpt = await retrieveKnowledgeContext(messages, {
      caseContext,
      farmProfile,
      sensorContext,
    })
    
    // Using current new feature: the built system prompt from the external file
    // Replaces the old static SYSTEM_PROMPT.
    const systemPrompt = buildAgribotSystemPrompt(knowledgeExcerpt)

    const caseAddendum = buildCaseContextSystemAddendum(caseContext)
    const farmAddendum = buildFarmProfileSystemAddendum(farmProfile)
    const sensorAddendum = buildSensorContextSystemAddendum(sensorContext)

    const combinedSystem = [systemPrompt]
    if (caseAddendum.length > 0) combinedSystem.push(`---\n${caseAddendum}`)
    if (farmAddendum.length > 0) combinedSystem.push(`---\n${farmAddendum}`)
    if (sensorAddendum.length > 0) combinedSystem.push(`---\n${sensorAddendum}`) // using the new feature
    const systemContent = combinedSystem.join("\n\n")

    const openRouterMessages = [
      {
        role: "system",
        content: systemContent,
      },
      ...messages,
    ]

    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // These headers are recommended by OpenRouter for identification
        "HTTP-Referer": "https://cropai.local", // replace with your deployed URL when available
        "X-Title": "CropAI Agricultural Assistant",
      },
      body: JSON.stringify({
        model: "qwen/qwen3-vl-235b-a22b-thinking",
        messages: openRouterMessages,
        max_tokens: 500, // kept as 500 as in the older snippet
      }),
    })

    if (!upstream.ok) {
      const errorText = await upstream.text().catch(() => "")
      logger.error("OpenRouter error:", upstream.status, errorText)
      return NextResponse.json(
        {
          error: "OpenRouter API request failed",
          details: errorText || undefined,
        },
        { status: upstream.status }
      )
    }

    const data = await upstream.json()
    let reply =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.delta?.content ??
      ""

    // Sometimes the model returns a JSON-formatted string like {"reply": "actual response"}
    try {
      const cleanedMatch = reply.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      const jsonString = cleanedMatch ? cleanedMatch[1] : reply;
      const parsed = JSON.parse(jsonString);
      if (parsed && typeof parsed.reply === "string") {
        reply = parsed.reply;
      } else if (parsed && typeof parsed.response === "string") {
        reply = parsed.response;
      }
    } catch {
      // It's not JSON, which is perfectly fine, use the raw reply
    }

    return new Response(reply, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    logger.error("Chat route error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
