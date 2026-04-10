import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getNews } from '@/lib/polygon/client'

const querySchema = z.object({
  ticker: z.string().min(1).max(10).toUpperCase(),
  limit: z.coerce.number().int().min(1).max(50).default(6),
})

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  }
  const { ticker, limit } = parsed.data

  try {
    const articles = await getNews(ticker, limit)
    return NextResponse.json({ articles })
  } catch (err) {
    console.error('[news] ticker=%s error=%s', ticker, err)
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 502 })
  }
}
