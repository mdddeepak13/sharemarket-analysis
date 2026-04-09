import { POLYGON_BASE_URL, CACHE_TTL } from '@/lib/utils/constants'
import type {
  PolygonAggregatesResponse,
  OHLCVBar,
  TickerDetails,
  OptionsContract,
  NewsArticle,
  StockQuote,
  HistoricalBar,
} from './types'

const API_KEY = process.env.POLYGON_API_KEY!

async function polygonFetch<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(`${POLYGON_BASE_URL}${path}`)
  url.searchParams.set('apiKey', API_KEY)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value))
  }

  const res = await fetch(url.toString(), {
    next: { revalidate: CACHE_TTL.QUOTE },
    headers: { 'Accept': 'application/json' },
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Polygon API error ${res.status}: ${error}`)
  }

  return res.json() as Promise<T>
}

// ─── Quotes ──────────────────────────────────────────────────────────────────
// Free-tier Polygon plan does not include real-time snapshots.
// We derive price/change from the last two available daily bars instead.

export async function getSnapshot(ticker: string): Promise<StockQuote> {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 10) // 10 calendar days → at least 2 trading days

  const data = await polygonFetch<PolygonAggregatesResponse>(
    `/v2/aggs/ticker/${ticker.toUpperCase()}/range/1/day/${from.toISOString().split('T')[0]}/${to.toISOString().split('T')[0]}`,
    { adjusted: 'true', sort: 'asc', limit: 10 },
  )

  const bars = data.results ?? []
  if (bars.length === 0) throw new Error(`No data for ${ticker}`)

  const latest = bars[bars.length - 1]
  const prev   = bars.length > 1 ? bars[bars.length - 2] : null

  const price      = latest.c
  const prevClose  = prev?.c ?? latest.o
  const change     = price - prevClose
  const changePct  = prevClose !== 0 ? (change / prevClose) * 100 : 0

  return {
    ticker: ticker.toUpperCase(),
    name: ticker.toUpperCase(),
    price,
    open: latest.o,
    high: latest.h,
    low: latest.l,
    close: latest.c,
    previousClose: prevClose,
    change: isFinite(change) ? change : 0,
    changePercent: isFinite(changePct) ? changePct : 0,
    volume: latest.v,
    avgVolume: 0,
    timestamp: latest.t,
  }
}

// ─── Historical Bars ─────────────────────────────────────────────────────────

export async function getAggregates(
  ticker: string,
  from: string,
  to: string,
  timespan: 'minute' | 'hour' | 'day' | 'week' | 'month' = 'day',
  multiplier = 1,
): Promise<HistoricalBar[]> {
  const data = await polygonFetch<PolygonAggregatesResponse>(
    `/v2/aggs/ticker/${ticker.toUpperCase()}/range/${multiplier}/${timespan}/${from}/${to}`,
    { adjusted: 'true', sort: 'asc', limit: 50000 },
  )

  return (data.results ?? []).map((bar: OHLCVBar) => ({
    time: Math.floor(bar.t / 1000),  // ms → seconds for Lightweight Charts
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v,
  }))
}

export async function getClosePrices(ticker: string, days: number): Promise<number[]> {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - days - 50) // buffer for non-trading days

  const bars = await getAggregates(
    ticker,
    from.toISOString().split('T')[0],
    to.toISOString().split('T')[0],
  )
  return bars.slice(-days).map(b => b.close)
}

// ─── Ticker Details ───────────────────────────────────────────────────────────

export async function getTickerDetails(ticker: string): Promise<TickerDetails> {
  const data = await polygonFetch<{ results: TickerDetails }>(
    `/v3/reference/tickers/${ticker.toUpperCase()}`,
  )
  return data.results
}

// ─── Options Chain ────────────────────────────────────────────────────────────

export async function getOptionsChain(
  ticker: string,
  expirationDate?: string,
  contractType?: 'call' | 'put',
): Promise<OptionsContract[]> {
  const params: Record<string, string> = {
    limit: '250',
    sort: 'strike_price',
  }
  if (expirationDate) params.expiration_date = expirationDate
  if (contractType) params.contract_type = contractType

  const data = await polygonFetch<{ results: OptionsContract[] }>(
    `/v3/snapshot/options/${ticker.toUpperCase()}`,
    params,
  )
  return data.results ?? []
}

// ─── News ─────────────────────────────────────────────────────────────────────

export async function getNews(ticker: string, limit = 10): Promise<NewsArticle[]> {
  const data = await polygonFetch<{ results: NewsArticle[] }>(
    '/v2/reference/news',
    { ticker: ticker.toUpperCase(), limit, sort: 'published_utc', order: 'desc' },
  )
  return data.results ?? []
}

// ─── Ticker Search ────────────────────────────────────────────────────────────

export async function searchTickers(query: string): Promise<{ ticker: string; name: string; market: string }[]> {
  const data = await polygonFetch<{
    results: { ticker: string; name: string; market: string; type: string }[]
  }>('/v3/reference/tickers', {
    search: query,
    active: 'true',
    market: 'stocks',
    limit: 10,
  })
  return (data.results ?? []).map(r => ({
    ticker: r.ticker,
    name: r.name,
    market: r.market,
  }))
}
