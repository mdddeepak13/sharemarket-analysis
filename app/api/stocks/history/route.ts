import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAggregates } from '@/lib/polygon/client'
import { CACHE_TTL } from '@/lib/utils/constants'

const querySchema = z.object({
  ticker: z.string().min(1).max(10).toUpperCase(),
  period: z.enum(['1D', '1W', '1M', '3M', '6M', '1Y', '5Y']).default('1Y'),
})

function getPeriodDates(period: string): { from: string; to: string; timespan: 'minute' | 'hour' | 'day' } {
  const to = new Date()
  const from = new Date()
  let timespan: 'minute' | 'hour' | 'day' = 'day'

  switch (period) {
    case '1D': from.setDate(from.getDate() - 1); timespan = 'minute'; break
    case '1W': from.setDate(from.getDate() - 7); timespan = 'hour'; break
    case '1M': from.setMonth(from.getMonth() - 1); timespan = 'day'; break
    case '3M': from.setMonth(from.getMonth() - 3); timespan = 'day'; break
    case '6M': from.setMonth(from.getMonth() - 6); timespan = 'day'; break
    case '5Y': from.setFullYear(from.getFullYear() - 5); timespan = 'day'; break
    default:   from.setFullYear(from.getFullYear() - 1); timespan = 'day'; break
  }

  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
    timespan,
  }
}

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams)
  const parsed = querySchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  }
  const { ticker, period } = parsed.data
  const { from, to, timespan } = getPeriodDates(period)

  try {
    const bars = await getAggregates(ticker, from, to, timespan)
    return NextResponse.json(
      { ticker, period, bars },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_TTL.HISTORY}, stale-while-revalidate=60`,
        },
      },
    )
  } catch (err) {
    console.error('[history]', err)
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 502 })
  }
}
