import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { after } from 'next/server'
import { getClosePrices, getAggregates } from '@/lib/polygon/client'
import { generateSignal } from '@/lib/analysis/signals'
import { Redis } from '@upstash/redis'
import { CACHE_TTL } from '@/lib/utils/constants'

const querySchema = z.object({
  ticker: z.string().min(1).max(10).toUpperCase(),
  period: z.enum(['3M', '6M', '1Y']).default('1Y'),
})

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  }
  const { ticker, period } = parsed.data
  const cacheKey = `signals:${ticker}:${period}`

  let redis: Redis | null = null
  try {
    redis = Redis.fromEnv()
    const cached = await redis.get(cacheKey)
    if (cached) return NextResponse.json(cached)
  } catch { /* skip cache */ }

  try {
    const days = period === '3M' ? 120 : period === '6M' ? 210 : 365
    const lookback = days + 60 // buffer for non-trading days

    const to = new Date().toISOString().split('T')[0]
    const from = new Date(Date.now() - lookback * 86400000).toISOString().split('T')[0]

    const bars = await getAggregates(ticker, from, to)
    if (bars.length < 50) {
      return NextResponse.json({ error: 'Not enough data for analysis' }, { status: 422 })
    }

    const prices = bars.map(b => b.close)
    const volumes = bars.map(b => b.volume)
    const signal = generateSignal(prices, volumes)

    const response = { ticker, ...signal, generatedAt: new Date().toISOString() }

    // Cache in background after sending response
    after(async () => {
      try {
        if (redis) await redis.set(cacheKey, response, { ex: CACHE_TTL.SIGNALS })
      } catch (err) {
        console.error('[signals] cache write error', err)
      }
    })

    return NextResponse.json(response)
  } catch (err) {
    console.error('[signals] ticker=%s error=%s', ticker, err)
    return NextResponse.json({ error: 'Failed to generate signals' }, { status: 502 })
  }
}
