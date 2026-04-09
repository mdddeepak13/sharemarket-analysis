import { NextResponse } from 'next/server'
import { getSnapshot } from '@/lib/polygon/client'

export async function GET() {
  const key = process.env.POLYGON_API_KEY
  const keyPrefix = key ? key.slice(0, 8) + '...' : 'MISSING'

  // Test getSnapshot directly
  let snapshotResult: unknown = null
  let snapshotError: string | null = null
  try {
    snapshotResult = await getSnapshot('SPY')
  } catch (e: unknown) {
    snapshotError = e instanceof Error ? e.message : String(e)
  }

  // Also test raw fetch with no-store
  let rawFetch: string = 'untested'
  try {
    const from = new Date(); from.setDate(from.getDate() - 10)
    const to = new Date()
    const url = `https://api.polygon.io/v2/aggs/ticker/SPY/range/1/day/${from.toISOString().split('T')[0]}/${to.toISOString().split('T')[0]}?adjusted=true&sort=asc&limit=5&apiKey=${key}`
    const res = await fetch(url, { cache: 'no-store' })
    const data = await res.json()
    rawFetch = `HTTP ${res.status} | bars=${data.resultsCount ?? 0} | status=${data.status}`
  } catch (e: unknown) {
    rawFetch = `ERROR: ${e instanceof Error ? e.message : String(e)}`
  }

  return NextResponse.json({ keyPrefix, rawFetch, snapshotResult, snapshotError })
}
