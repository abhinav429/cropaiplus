import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"

/** In-memory latest reading — survives dev HMR via globalThis. */
type SensorPayload = {
  temperature?: number
  humidity?: number
  soil?: number
  gas?: number
  light?: number
  timestamp: string
}

type GlobalWithSensor = typeof globalThis & {
  __cropaiSensorData?: SensorPayload | null
}

const g = globalThis as GlobalWithSensor
if (g.__cropaiSensorData === undefined) {
  g.__cropaiSensorData = null
}

const KEYS = ["temperature", "humidity", "soil", "gas", "light"] as const

/**
 * Accept only numeric sensor fields; ignore unknown keys (ESP32 may send extras).
 */
function parseSensorBody(raw: unknown): SensorPayload | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const out: Partial<SensorPayload> = {}
  for (const k of KEYS) {
    const v = o[k]
    if (typeof v === "number" && Number.isFinite(v)) {
      out[k] = v
    } else if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v)
      if (Number.isFinite(n)) out[k] = n
    }
  }
  if (Object.keys(out).length === 0) return null
  return { ...out, timestamp: new Date().toISOString() }
}

export async function POST(req: Request) {
  const secret = process.env.SENSOR_INGEST_SECRET
  if (secret) {
    const auth = req.headers.get("authorization")
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON data" }, { status: 400 })
  }

  const parsed = parseSensorBody(raw)
  if (!parsed) {
    return NextResponse.json(
      { success: false, error: "Expected at least one numeric field: temperature, humidity, soil, gas, light" },
      { status: 400 }
    )
  }

  g.__cropaiSensorData = parsed

  logger.dev("sensor ingest ok", { keys: KEYS.filter((k) => parsed[k] !== undefined) })

  return NextResponse.json({ success: true, message: "Data received" })
}

export async function GET() {
  if (!g.__cropaiSensorData) {
    return NextResponse.json({ error: "No data available yet" }, { status: 404 })
  }
  return NextResponse.json(g.__cropaiSensorData)
}
