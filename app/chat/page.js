"use client"

import { useState, useRef, useEffect, useMemo, Suspense } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Send,
  Mic,
  MicOff,
  Cpu,
  User,
  ChevronRight,
  Loader2,
  ImagePlus,
  Sprout,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"
import { useLanguage } from "@/contexts/LanguageContext"
import { useRouter, useSearchParams } from "next/navigation"
import { readDetectCase, clearDetectCase } from "@/lib/detectCase"
import { loadChatMessages, saveChatMessages, clearChatMessagesStorage } from "@/lib/chatStorage"
import { loadFarmProfile, FARM_PROFILE_UPDATED_EVENT } from "@/lib/farmProfile"

function ChatLoadingFallback() {
  const { t } = useLanguage()
  return (
    <div className="container py-16 max-w-5xl mx-auto text-center text-muted-foreground">{t("common.loading")}</div>
  )
}

/**
 * Chat UI + AgriBot. When a disease case exists in sessionStorage (from /detect),
 * we pass `caseContext` to `/api/chat` so replies reference that diagnosis.
 */
function ChatPageContent() {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const suggestions = useMemo(() => {
    const s = t("chat.suggestions")
    return Array.isArray(s) ? s : []
  }, [t])

  /** Active handoff from Disease Detection; cleared on user action or session end */
  const [activeCase, setActiveCase] = useState(() =>
    typeof window !== "undefined" ? readDetectCase() : null
  )
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const messagesEndRef = useRef(null)
  const { toast } = useToast()
  const [image, setImage] = useState(null)
  /** Saved farm context from /farm-profile — merged into LLM system prompt on each send */
  const [farmProfile, setFarmProfile] = useState(() =>
    typeof window !== "undefined" ? loadFarmProfile() : null
  )

  useEffect(() => {
    const sync = () => setFarmProfile(loadFarmProfile())
    window.addEventListener(FARM_PROFILE_UPDATED_EVENT, sync)
    return () => window.removeEventListener(FARM_PROFILE_UPDATED_EVENT, sync)
  }, [])

  // If user landed with ?from=detect, strip query after read (keeps URL clean)
  useEffect(() => {
    if (searchParams.get("from") === "detect") {
      router.replace("/chat", { scroll: false })
    }
  }, [searchParams, router])

  // Restore thread from localStorage, or start with a fresh greeting (one-time on mount)
  useEffect(() => {
    const saved = loadChatMessages()
    if (saved && saved.length > 0) {
      setMessages(saved)
      return
    }
    const ac = readDetectCase()
    const greeting = ac ? t("chat.greetingWithCase") : t("chat.greeting")
    setMessages([
      {
        role: "assistant",
        content: greeting,
        timestamp: new Date().toISOString(),
      },
    ])
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: init only; t/activeCase handled below for single-message updates
  }, [])

  // Re-translate lone greeting when language or detect case changes
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === "assistant") {
        const greeting = activeCase ? t("chat.greetingWithCase") : t("chat.greeting")
        return [{ ...prev[0], content: greeting }]
      }
      return prev
    })
  }, [t, activeCase])

  // Persist full conversation so refresh keeps the same LLM context (same device / browser)
  useEffect(() => {
    if (messages.length === 0) return
    saveChatMessages(messages)
  }, [messages])

  const handleClearCase = () => {
    clearDetectCase()
    setActiveCase(null)
  }

  const handleClearConversation = () => {
    clearChatMessagesStorage()
    const greeting = activeCase ? t("chat.greetingWithCase") : t("chat.greeting")
    setMessages([
      {
        role: "assistant",
        content: greeting,
        timestamp: new Date().toISOString(),
      },
    ])
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return

    const userMessage = {
      role: "user",
      content: inputValue,
      timestamp: new Date().toISOString(),
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInputValue("")
    setIsTyping(true)

    try {
      const payload = {
        messages: updatedMessages,
        ...(activeCase ? { caseContext: activeCase } : {}),
        ...(farmProfile ? { farmProfile } : {}),
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("Error fetching AI response:", errorData)
        toast({
          title: t("chat.errorTitle"),
          description: t("chat.errorContact"),
          variant: "destructive",
        })
        return
      }

      const data = await response.json()
      const aiResponseContent = data.reply || ""

      if (aiResponseContent.trim()) {
        const aiResponse = {
          role: "assistant",
          content: aiResponseContent,
          timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, aiResponse])
      } else {
        console.warn("Received an empty response from AI.")
      }
    } catch (error) {
      console.error("Error fetching AI response:", error)
      toast({
        title: t("chat.errorTitle"),
        description: t("chat.errorReach"),
        variant: "destructive",
      })
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleVoiceInput = () => {
    setIsRecording(!isRecording)

    if (!isRecording) {
      toast({
        title: t("chat.voiceStarted"),
        description: t("chat.voiceStartedBody"),
      })

      setTimeout(() => {
        setIsRecording(false)
        setInputValue("When should I plant soybeans in the Midwest?")

        toast({
          title: t("chat.voiceComplete"),
          description: t("chat.voiceCompleteBody"),
        })
      }, 3000)
    } else {
      toast({
        title: t("chat.voiceStopped"),
        description: t("chat.voiceStoppedBody"),
      })
    }
  }

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion)
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const fileUrl = URL.createObjectURL(file)
      setImage(fileUrl)
    } else {
      toast({
        title: t("chat.uploadErrorTitle"),
        description: t("chat.uploadErrorBody"),
      })
    }
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="container py-8 px-4 max-w-5xl mx-auto">
      {farmProfile && (farmProfile.mainCrop || farmProfile.location || farmProfile.farmSize || farmProfile.irrigation !== "other") && (
        <div
          className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-muted-foreground"
          role="status"
        >
          <p className="font-medium text-foreground">{t("chat.farmProfileBannerTitle")}</p>
          <p className="mt-1 text-xs sm:text-sm">
            {[
              farmProfile.mainCrop,
              farmProfile.location,
              farmProfile.farmSize,
              farmProfile.irrigation && farmProfile.irrigation !== "other"
                ? t(`farmProfile.irrigation.${farmProfile.irrigation}`)
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      )}

      {activeCase && (
        <div
          className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          role="status"
          aria-live="polite"
        >
          <div className="flex gap-2 items-start">
            <Sprout className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="font-medium text-foreground">{t("chat.caseBannerTitle")}</p>
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">{activeCase.disease}</span>
                {" · "}
                {typeof activeCase.displayConfidence === "number"
                  ? `${activeCase.displayConfidence.toFixed(1)}%`
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{t("chat.caseHint")}</p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleClearCase} className="shrink-0">
            {t("chat.caseClear")}
          </Button>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 text-center space-y-3"
      >
        <h1 className="text-3xl font-bold">{t("chat.title")}</h1>
        <p className="text-muted-foreground">{t("chat.subtitle")}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className="max-w-md">{t("chat.persistHint")}</span>
          <Button type="button" variant="outline" size="sm" onClick={handleClearConversation} className="gap-1.5 shrink-0">
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            {t("chat.clearConversation")}
          </Button>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-[3fr_1fr] gap-6">
        <div className="flex flex-col h-[70vh] bg-card rounded-xl border shadow-sm overflow-hidden">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 pb-4">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex gap-3 max-w-[80%] ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                    <Avatar className={message.role === "assistant" ? "bg-primary/20" : "bg-secondary/20"}>
                      <AvatarFallback>
                        {message.role === "assistant" ? <Cpu className="h-5 w-5" /> : <User className="h-5 w-5" />}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div
                        className={`rounded-lg p-3 ${
                          message.role === "assistant"
                            ? "bg-muted border border-border"
                            : "bg-primary text-primary-foreground"
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{formatTime(message.timestamp)}</p>
                    </div>
                  </div>
                </motion.div>
              ))}

              <AnimatePresence>
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex justify-start"
                  >
                    <div className="flex gap-3 max-w-[80%]">
                      <Avatar className="bg-primary/20">
                        <AvatarFallback>
                          <Cpu className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="rounded-lg p-3 bg-muted border border-border">
                        <div className="flex space-x-2">
                          <div className="h-2 w-2 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="h-2 w-2 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="h-2 w-2 rounded-full bg-primary/40 animate-bounce"></div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="border-t p-4">
            <div className="flex gap-2">
              <Button variant="outline" size="icon" className="shrink-0">
                <ImagePlus className="h-5 w-5" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="image-upload"
                />
              </Button>
              <div className="relative flex-1">
                <Textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t("chat.placeholder")}
                  className="min-h-10 resize-none pr-20"
                  rows={1}
                />
                <div className="absolute right-2 bottom-1 flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleVoiceInput}>
                    {isRecording ? <MicOff className="h-4 w-4 text-destructive" /> : <Mic className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isTyping}
                  >
                    {isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            {image && (
              <div className="mt-2">
                <img src={image} alt="Uploaded" className="max-w-full h-auto rounded" />
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-3">{t("chat.suggestedTitle")}</h3>
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                className="w-full justify-start gap-2 h-auto py-3 text-left"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <ChevronRight className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm">{suggestion}</span>
              </Button>
            ))}
          </div>

          <Card className="mt-6 p-4 bg-primary/5 border-primary/20">
            <h3 className="text-sm font-medium mb-2">{t("chat.voiceTitle")}</h3>
            <p className="text-xs text-muted-foreground mb-4">{t("chat.voiceBody")}</p>
            <Button variant="secondary" size="sm" className="w-full" onClick={handleVoiceInput}>
              <Mic className="h-4 w-4 mr-2" />
              {isRecording ? t("chat.stopVoice") : t("chat.startVoice")}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<ChatLoadingFallback />}>
      <ChatPageContent />
    </Suspense>
  )
}
