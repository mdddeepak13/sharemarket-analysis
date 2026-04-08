import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { searchTickers } from '@/lib/polygon/client'

const querySchema = z.object({ q: z.string().min(1).max(50) })

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
  if (!parsed.success) return NextResponse.json([], { status: 200 })

  try {
    const results = await searchTickers(parsed.data.q)
    return NextResponse.json(results, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    })
  } catch (err) {
    console.error('[search] query=%s error=%s', parsed.data.q, err)
    return NextResponse.json([], { status: 200 })
  }
}
