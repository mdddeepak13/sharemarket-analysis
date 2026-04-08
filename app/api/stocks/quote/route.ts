import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSnapshot, getTickerDetails } from '@/lib/polygon/client'
import { Redis } from '@upstash/redis'
import { CACHE_TTL } from '@/lib/utils/constants'

const querySchema = z.object({ ticker: z.string().min(1).max(10).toUpperCase() })

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams)
  const parsed = querySchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 })
  }
  const { ticker } = parsed.data

  // Try Redis cache first
  let redis: Redis | null = null
  try {
    redis = Redis.fromEnv()
    const cached = await redis.get(`quote:${ticker}`)
    if (cached) return NextResponse.json(cached)
  } catch { /* Redis not configured — skip cache */ }

  try {
    const [quote, details] = await Promise.allSettled([
      getSnapshot(ticker),
      getTickerDetails(ticker),
    ])

    const quoteData = quote.status === 'fulfilled' ? quote.value : null
    const detailsData = details.status === 'fulfilled' ? details.value : null

    if (!quoteData) {
      return NextResponse.json({ error: 'Ticker not found' }, { status: 404 })
    }

    const response = {
      ...quoteData,
      name: detailsData?.name ?? ticker,
      marketCap: detailsData?.market_cap ?? null,
      description: detailsData?.description ?? null,
      exchange: detailsData?.primary_exchange ?? null,
      logoUrl: detailsData?.branding?.logo_url ?? null,
    }

    if (redis) {
      await redis.set(`quote:${ticker}`, response, { ex: CACHE_TTL.QUOTE })
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('[quote]', err)
    return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 502 })
  }
}
