"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Mic, MicOff, Cpu, User, ChevronRight, Loader2, ImagePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"

const initialMessages = [
  {
    role: "assistant",
    content: "Hello! (Be Polite, Say Hi Back.)",
    timestamp: new Date().toISOString(),
  },
]

const suggestions = [
  "What's the best way to prevent tomato blight?",
  "How often should I water my corn during a drought?",
  "What are natural pesticides for aphids?",
  "When is the best time to harvest wheat?",
  "How do I test my soil's pH level?",
]

/** Strip timestamps for the API (server builds system prompt + knowledge). */
function toApiMessages(list) {
  return list.map(({ role, content }) => ({ role, content }))
}

export default function ChatPage() {
  const [messages, setMessages] = useState(initialMessages)
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const messagesEndRef = useRef(null)
  const { toast } = useToast()
  const [image, setImage] = useState(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async () => {
    const text = inputValue.trim()
    if (!text || isTyping) return

    const userMessage = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    }

    const historyForApi = toApiMessages([...messages, userMessage])

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsTyping(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historyForApi }),
      })

      if (!res.ok) {
        let detail = "Could not get a response."
        try {
          const errJson = await res.json()
          if (errJson.error) detail = errJson.error
        } catch {
          /* ignore */
        }
        toast({ title: "Chat error", description: detail, variant: "destructive" })
        setIsTyping(false)
        return
      }

      setIsTyping(false)

      const assistantShell = {
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantShell])

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setMessages((prev) => {
          const next = [...prev]
          const last = next.length - 1
          if (last >= 0 && next[last].role === "assistant") {
            next[last] = { ...next[last], content: accumulated }
          }
          return next
        })
      }

      if (!accumulated.trim()) {
        console.warn("Empty streamed response from /api/chat")
      }
    } catch (error) {
      console.error("Error fetching AI response:", error)
      toast({
        title: "Network error",
        description: error instanceof Error ? error.message : "Request failed.",
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
        title: "Voice Recording Started",
        description: "Speak clearly into your microphone...",
      })

      setTimeout(() => {
        setIsRecording(false)
        setInputValue("When should I plant soybeans in the Midwest?")

        toast({
          title: "Voice Recording Complete",
          description: "Your question has been transcribed.",
        })
      }, 3000)
    } else {
      toast({
        title: "Voice Recording Stopped",
        description: "Recording has been cancelled.",
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
        title: "Upload Error",
        description: "Please select a valid image file.",
      })
    }
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="container py-8 px-4 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 text-center"
      >
        <h1 className="text-3xl font-bold">AI Agricultural Assistant</h1>
        <p className="text-muted-foreground">Ask any farming or crop-related questions</p>
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
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {message.content || (message.role === "assistant" ? "\u00a0" : "")}
                        </p>
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
                  placeholder="Ask a farming question..."
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
          <h3 className="text-sm font-medium mb-3">Suggested Questions</h3>
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
            <h3 className="text-sm font-medium mb-2">Voice Commands</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Click the microphone icon to ask questions using your voice. Speak clearly and naturally.
            </p>
            <Button variant="secondary" size="sm" className="w-full" onClick={handleVoiceInput}>
              <Mic className="h-4 w-4 mr-2" />
              {isRecording ? "Stop Recording" : "Start Voice Input"}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
