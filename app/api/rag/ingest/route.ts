import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { after } from 'next/server'
import { getNews } from '@/lib/polygon/client'
import { ingestNewsArticles } from '@/lib/rag/ingestion'

const bodySchema = z.object({
  tickers: z.array(z.string().min(1).max(10).toUpperCase()).min(1).max(20),
})

export async function POST(req: NextRequest) {
  // Validate n8n webhook secret
  const secret = req.headers.get('x-webhook-secret')
  if (secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // Acknowledge immediately, ingest in background
  after(async () => {
    for (const ticker of parsed.data.tickers) {
      try {
        const articles = await getNews(ticker, 10)
        const count = await ingestNewsArticles(articles, ticker)
        console.log(`[ingest] ${ticker}: ingested ${count} chunks`)
      } catch (err) {
        console.error(`[ingest] ${ticker} error:`, err)
      }
    }
  })

  return NextResponse.json({ status: 'ingestion_started', tickers: parsed.data.tickers })
}
