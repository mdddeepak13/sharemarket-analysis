import { NextRequest } from 'next/server'
import { z } from 'zod'
import { generateEmbedding } from '@/lib/rag/embeddings'
import { querySimilar, type DocumentMetadata } from '@/lib/rag/pinecone'
import { buildRAGSystemPrompt, buildRAGUserPrompt } from '@/lib/ai/prompts'
import { createRAGStream } from '@/lib/ai/claude'
import { getSnapshot, getAggregates, getNews } from '@/lib/polygon/client'
import { generateSignal } from '@/lib/analysis/signals'

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  ticker: z.string().max(10).toUpperCase().optional(),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).max(20).optional(),
})

// Fetch live market data for a ticker to ground the AI's response
async function fetchLiveContext(ticker: string): Promise<string> {
  const sections: string[] = []

  // Quote + price data
  try {
    const quote = await getSnapshot(ticker)
    sections.push(`## Live Quote (${new Date().toLocaleDateString('en-US')})
- Price: $${quote.price.toFixed(2)}
- Change: ${quote.change >= 0 ? '+' : ''}${quote.change.toFixed(2)} (${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%)
- Open: $${quote.open.toFixed(2)} | High: $${quote.high.toFixed(2)} | Low: $${quote.low.toFixed(2)}
- Prev Close: $${quote.previousClose.toFixed(2)}
- Volume: ${(quote.volume / 1_000_000).toFixed(2)}M`)
  } catch { /* skip */ }

  // Technical signals from 1Y of daily bars
  try {
    const to = new Date().toISOString().split('T')[0]
    const from = new Date(Date.now() - 400 * 86400000).toISOString().split('T')[0]
    const bars = await getAggregates(ticker, from, to)
    if (bars.length >= 50) {
      const prices = bars.map(b => b.close)
      const volumes = bars.map(b => b.volume)
      const signal = generateSignal(prices, volumes)
      const t = signal.technicals

      sections.push(`## Technical Analysis
- Signal: **${signal.action}** (Confidence: ${signal.confidence}%)
- Time Horizon: ${signal.horizon}-term
- SMA 50: $${t.ma.currentSma50?.toFixed(2) ?? 'N/A'} — price is **${t.ma.priceVsSma50}** this level
- SMA 200: $${t.ma.currentSma200?.toFixed(2) ?? 'N/A'} — price is **${t.ma.priceVsSma200}** this level
- MA Crossover: ${t.ma.crossover === 'golden' ? '🟢 Golden Cross (bullish)' : t.ma.crossover === 'death' ? '🔴 Death Cross (bearish)' : 'None active'}
- RSI (14): ${t.rsi.current.toFixed(1)} → ${t.rsi.signal}
- MACD: ${t.macd.trend} trend, ${t.macd.crossover} crossover
- Nearest Fibonacci: ${t.fibonacci.nearestLevel.label} at $${t.fibonacci.nearestLevel.price}
- Price Targets: Bear $${signal.priceTargets.bear} | Base $${signal.priceTargets.base} | Bull $${signal.priceTargets.bull}
- Key Reasons: ${signal.reasons.slice(0, 3).join('; ')}`)
    }
  } catch { /* skip */ }

  // Recent news headlines
  try {
    const articles = await getNews(ticker, 5)
    if (articles.length > 0) {
      const headlines = articles.map(a => {
        const sentiment = a.insights?.find(i => i.ticker === ticker)?.sentiment ?? 'neutral'
        return `- [${sentiment.toUpperCase()}] "${a.title}" — ${a.publisher.name} (${a.published_utc.split('T')[0]})`
      }).join('\n')
      sections.push(`## Recent News Headlines\n${headlines}`)
    }
  } catch { /* skip */ }

  return sections.join('\n\n')
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400 })
  }
  const { message, ticker, history = [] } = parsed.data

  // Fetch live market data + RAG context in parallel
  const [liveContext, ragMatches] = await Promise.all([
    ticker ? fetchLiveContext(ticker) : Promise.resolve(''),
    (async () => {
      try {
        const embedding = await generateEmbedding(message)
        return await querySimilar(embedding, 3, ticker ? { ticker } : undefined)
      } catch {
        return [] as Array<{ id: string; score: number; metadata: DocumentMetadata }>
      }
    })(),
  ])

  const ragContext = ragMatches
    .map((m, i) => `[${i + 1}] ${m.metadata.title} (${m.metadata.source}, ${m.metadata.publishedAt?.split('T')[0]})\n${m.metadata.text}`)
    .join('\n\n')

  const systemPrompt = buildRAGSystemPrompt()
  const userPrompt = buildRAGUserPrompt(message, liveContext, ragContext, ticker)

  const sources = ragMatches.map(m => ({
    title: m.metadata.title,
    source: m.metadata.source,
    url: m.metadata.url,
    date: m.metadata.publishedAt,
    relevance: m.score,
  }))

  let streamResult: Awaited<ReturnType<typeof createRAGStream>>
  try {
    streamResult = await createRAGStream(systemPrompt, userPrompt, history)
  } catch (err) {
    console.error('[rag/chat] stream init error=%s', err)
    return new Response(JSON.stringify({ error: 'AI model unavailable' }), { status: 502 })
  }

  const textStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`))

      try {
        for await (const chunk of streamResult.textStream) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`))
        }
      } catch (streamErr) {
        console.error('[rag/chat] stream error=%s', streamErr)
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'error', content: 'Stream error. Please try again.' })}\n\n`
        ))
      }

      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })

  return new Response(textStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
