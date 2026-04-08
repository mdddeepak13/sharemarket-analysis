import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { after } from 'next/server'
import { Redis } from '@upstash/redis'

const bodySchema = z.object({
  type: z.enum(['news_updated', 'briefing', 'price_alert', 'eod_summary']),
  tickers: z.array(z.string()).optional(),
  content: z.string().optional(),
  alert: z.object({
    ticker: z.string(),
    alertType: z.string(),
    message: z.string(),
  }).optional(),
})

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-webhook-secret')
  if (secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const payload = parsed.data

  // Invalidate caches in background after acknowledging
  after(async () => {
    if (payload.type === 'news_updated' && payload.tickers) {
      try {
        const redis = Redis.fromEnv()
        // Invalidate signal and quote caches for updated tickers
        const keys = payload.tickers.flatMap(t => [
          `signals:${t}:1Y`,
          `signals:${t}:6M`,
          `signals:${t}:3M`,
          `quote:${t}`,
        ])
        await Promise.all(keys.map(k => redis.del(k)))
        console.log('[webhook] invalidated cache for', payload.tickers)
      } catch (err) {
        console.error('[webhook] cache invalidation error', err)
      }
    }
  })

  return NextResponse.json({ received: true, type: payload.type })
}
