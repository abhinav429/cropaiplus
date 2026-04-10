/** Key for persisting AgriBot message list in the browser (survives refresh; same device only). */
export const CHAT_MESSAGES_KEY = "cropai-chat-messages"

const MAX_CHARS = 400_000 // avoid blowing localStorage quota (~5MB typical)

/**
 * @param {Array<{ role: string, content: string, timestamp?: string }>} messages
 */
export function saveChatMessages(messages) {
  if (typeof window === "undefined") return
  try {
    const raw = JSON.stringify(messages)
    if (raw.length > MAX_CHARS) return
    localStorage.setItem(CHAT_MESSAGES_KEY, raw)
  } catch {
    // Quota exceeded or private mode
  }
}

/** @returns {Array<{ role: string, content: string, timestamp?: string }> | null} */
export function loadChatMessages() {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(CHAT_MESSAGES_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    return parsed
  } catch {
    return null
  }
}

export function clearChatMessagesStorage() {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(CHAT_MESSAGES_KEY)
  } catch {
    /* ignore */
  }
}
