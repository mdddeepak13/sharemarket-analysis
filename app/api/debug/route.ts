import { NextResponse } from 'next/server'

export async function GET() {
  const key = process.env.POLYGON_API_KEY
  const keyPrefix = key ? key.slice(0, 8) + '...' : 'MISSING'

  let polygonStatus = 'untested'
  try {
    const from = new Date(); from.setDate(from.getDate() - 10)
    const to = new Date()
    const url = `https://api.polygon.io/v2/aggs/ticker/SPY/range/1/day/${from.toISOString().split('T')[0]}/${to.toISOString().split('T')[0]}?adjusted=true&sort=asc&limit=5&apiKey=${key}`
    const res = await fetch(url, { cache: 'no-store' })
    const data = await res.json()
    polygonStatus = `HTTP ${res.status} | api_status=${data.status} | bars=${data.resultsCount ?? 0} | msg=${data.message ?? 'ok'}`
  } catch (e: unknown) {
    polygonStatus = `FETCH_ERROR: ${e instanceof Error ? e.message : String(e)}`
  }

  return NextResponse.json({ keyPrefix, polygonStatus })
}
