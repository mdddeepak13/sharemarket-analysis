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

export async function getSnapshot(ticker: string): Promise<StockQuote> {
  const data = await polygonFetch<{
    ticker: {
      ticker: string
      day: { o: number; h: number; l: number; c: number; v: number; vw: number }
      lastTrade: { p: number; s: number; t: number }
      prevDay: { o: number; h: number; l: number; c: number; v: number }
      todaysChangePerc: number
      todaysChange: number
      updated: number
    }
  }>(`/v2/snapshot/locale/us/markets/stocks/tickers/${ticker.toUpperCase()}`)

  const t = data.ticker
  const price = t.lastTrade?.p ?? t.day?.c ?? 0
  const prevClose = t.prevDay?.c ?? 0

  return {
    ticker: t.ticker,
    name: t.ticker,
    price,
    open: t.day?.o ?? 0,
    high: t.day?.h ?? 0,
    low: t.day?.l ?? 0,
    close: t.day?.c ?? 0,
    previousClose: prevClose,
    change: t.todaysChange ?? price - prevClose,
    changePercent: t.todaysChangePerc ?? ((price - prevClose) / prevClose) * 100,
    volume: t.day?.v ?? 0,
    avgVolume: 0,
    timestamp: t.updated ?? Date.now(),
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
