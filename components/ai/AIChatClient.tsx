'use client'

import { useState, useRef, useCallback, FormEvent } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Send, Bot, User, Loader2, ExternalLink } from 'lucide-react'

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
  'Why is NVDA declining?',
  'Is AAPL a buy right now?',
  'What are the risks for TSLA?',
  'Explain the Fed impact on tech stocks',
]

export function AIChatClient() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [ticker, setTicker] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const sendMessage = useCallback(async (question: string) => {
    if (!question.trim() || loading) return

    const userMsg: Message = { role: 'user', content: question }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const assistantMsg: Message = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMsg])

    try {
      const res = await fetch('/api/rag/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, ticker: ticker || undefined }),
      })

      if (!res.ok || !res.body) throw new Error('Stream failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let sources: Source[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split('\n').filter(l => l.startsWith('data: '))

        for (const line of lines) {
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const event = JSON.parse(data)
            if (event.type === 'sources') {
              sources = event.sources
            } else if (event.type === 'text') {
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last.role === 'assistant') {
                  updated[updated.length - 1] = { ...last, content: last.content + event.content }
                }
                return updated
              })
            }
          } catch { /* skip malformed event */ }
        }
      }

      if (sources.length > 0) {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { ...updated[updated.length - 1], sources }
          return updated
        })
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { ...updated[updated.length - 1], content: 'Sorry, I encountered an error. Please try again.' }
        return updated
      })
    } finally {
      setLoading(false)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }, [loading, ticker])

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }, [input, sendMessage])

  return (
    <Card className="flex flex-col flex-1 bg-card border-border overflow-hidden" style={{ minHeight: '500px' }}>
      <CardContent className="flex flex-col h-full p-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center py-12">
              <Bot className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="font-medium">Ask the AI Analyst anything</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Grounded in real-time news, SEC filings, and earnings data
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {SUGGESTED.map(q => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className={`max-w-xl space-y-2 ${msg.role === 'user' ? 'items-end' : ''}`}>
                <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}>
                  {msg.content || (loading && i === messages.length - 1 && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ))}
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Sources:</p>
                    {msg.sources.map((s, j) => (
                      <a
                        key={j}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-1 text-xs text-muted-foreground hover:text-foreground group"
                      >
                        <ExternalLink className="h-3 w-3 mt-0.5 shrink-0" />
                        <span className="line-clamp-1 group-hover:underline">{s.title}</span>
                        <Badge variant="outline" className="text-xs py-0 h-4 ml-1 shrink-0">
                          {Math.round(s.relevance * 100)}%
                        </Badge>
                      </a>
                    ))}
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              placeholder="Ticker (optional)"
              className="w-24 shrink-0 font-mono uppercase h-9"
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase())}
              maxLength={5}
            />
            <Input
              placeholder="Ask about any stock…"
              className="flex-1 h-9"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
            />
            <Button type="submit" size="sm" disabled={loading || !input.trim()} className="h-9 w-9 p-0">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}
