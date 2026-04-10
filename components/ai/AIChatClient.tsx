'use client'

import { useState, useRef, useCallback, FormEvent, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Send, Bot, User, Loader2, ExternalLink, Trash2, TrendingUp } from 'lucide-react'

interface Source {
  title: string
  source: string
  url: string
  date: string
  relevance: number
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
}

const SUGGESTED = [
  { label: 'Why is NVDA declining?', ticker: 'NVDA' },
  { label: 'Is AAPL a buy right now?', ticker: 'AAPL' },
  { label: 'Analyse TSLA technicals', ticker: 'TSLA' },
  { label: 'What is the Fed impact on tech stocks?', ticker: '' },
  { label: 'SPY outlook this week', ticker: 'SPY' },
  { label: 'Compare MSFT vs GOOGL', ticker: '' },
]

// Extract a ticker from user message if one isn't already set
function extractTicker(text: string): string {
  const match = text.match(/\b([A-Z]{1,5})\b/)
  return match?.[1] ?? ''
}

const SESSION_KEY = 'sharmarket_ai_chat'

function loadSession(): { messages: Message[]; ticker: string } {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : { messages: [], ticker: '' }
  } catch {
    return { messages: [], ticker: '' }
  }
}

function saveSession(messages: Message[], ticker: string) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ messages, ticker }))
  } catch { /* quota exceeded — skip */ }
}

export function AIChatClient() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [ticker, setTicker] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Restore session on mount
  useEffect(() => {
    const session = loadSession()
    if (session.messages.length > 0) setMessages(session.messages)
    if (session.ticker) setTicker(session.ticker)
  }, [])

  // Persist session whenever messages or ticker change
  useEffect(() => {
    saveSession(messages, ticker)
  }, [messages, ticker])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (question: string, forceTicker?: string) => {
    if (!question.trim() || loading) return

    const activeTicker = (forceTicker ?? ticker).toUpperCase()
    const userMsg: Message = { role: 'user', content: question }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    const assistantMsg: Message = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMsg])

    try {
      const res = await fetch('/api/rag/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question,
          ticker: activeTicker || undefined,
          // Send prior conversation turns for multi-turn context
          history: newMessages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok || !res.body) throw new Error('Stream failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let sources: Source[] = []
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const event = JSON.parse(data)
            if (event.type === 'sources') {
              sources = event.sources
            } else if (event.type === 'text' || event.type === 'error') {
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last?.role === 'assistant') {
                  updated[updated.length - 1] = { ...last, content: last.content + event.content }
                }
                return updated
              })
            }
          } catch { /* skip malformed */ }
        }
      }

      if (sources.length > 0) {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { ...updated[updated.length - 1], sources }
          return updated
        })
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: 'Something went wrong. Please try again.',
        }
        return updated
      })
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [loading, ticker, messages])

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }, [input, sendMessage])

  const handleSuggestion = useCallback((label: string, sugTicker: string) => {
    if (sugTicker) setTicker(sugTicker)
    sendMessage(label, sugTicker)
  }, [sendMessage])

  const clearChat = useCallback(() => {
    setMessages([])
    setTicker('')
    setInput('')
  }, [])

  return (
    <Card className="flex flex-col flex-1 bg-card border-border overflow-hidden" style={{ minHeight: '560px' }}>
      <CardContent className="flex flex-col h-full p-0 overflow-hidden">

        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Bot className="h-3.5 w-3.5" />
            <span>ShareMarket AI</span>
            {ticker && (
              <Badge variant="outline" className="font-mono text-xs h-5 px-1.5">
                <TrendingUp className="h-3 w-3 mr-1" />{ticker}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs h-5 px-1.5 text-emerald-400 border-emerald-400/30">
              Live data
            </Badge>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={clearChat}>
              <Trash2 className="h-3 w-3 mr-1" /> Clear
            </Button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 min-h-0">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center py-8">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Bot className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-base">Ask the AI Analyst</p>
                <p className="text-muted-foreground text-sm mt-1 max-w-xs">
                  Grounded in live prices, technical signals, and recent news for any US stock
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {SUGGESTED.map(({ label, ticker: t }) => (
                  <button
                    key={label}
                    onClick={() => handleSuggestion(label, t)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted hover:border-primary/40 transition-colors text-left"
                  >
                    {t && <span className="font-mono font-semibold text-primary mr-1">{t}</span>}
                    {label.replace(t, '').trim()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
              )}

              <div className={`space-y-2 ${msg.role === 'user' ? 'max-w-md items-end' : 'max-w-2xl'}`}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-muted text-foreground rounded-tl-sm'
                }`}>
                  {msg.role === 'assistant' && !msg.content && loading && i === messages.length - 1 ? (
                    <div className="flex gap-1 items-center py-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
                    </div>
                  ) : msg.role === 'assistant' ? (
                    <div className="prose prose-sm prose-invert max-w-none
                      prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1
                      prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-strong:text-foreground
                      prose-code:bg-background/50 prose-code:px-1 prose-code:rounded prose-code:text-xs">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>

                {msg.sources && msg.sources.length > 0 && (
                  <div className="space-y-1 pl-1">
                    <p className="text-xs text-muted-foreground font-medium">Sources:</p>
                    {msg.sources.map((s, j) => (
                      <a
                        key={j}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-1.5 text-xs text-muted-foreground hover:text-foreground group"
                      >
                        <ExternalLink className="h-3 w-3 mt-0.5 shrink-0" />
                        <span className="line-clamp-1 group-hover:underline">{s.title}</span>
                        <Badge variant="outline" className="text-xs py-0 h-4 ml-auto shrink-0">
                          {Math.round(s.relevance * 100)}%
                        </Badge>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="border-t border-border p-3 bg-card">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              placeholder="Ticker"
              className="w-20 shrink-0 font-mono uppercase text-sm h-9"
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase())}
              maxLength={5}
            />
            <Input
              ref={inputRef}
              placeholder="Ask about any stock, sector, or macro topic…"
              className="flex-1 h-9 text-sm"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
            />
            <Button type="submit" size="sm" disabled={loading || !input.trim()} className="h-9 px-3">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-1.5 px-1">
            Set a ticker to inject live price, technicals, and news into every response
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
