export interface PolygonQuote {
  ticker: string
  name: string
  market: string
  locale: string
  primary_exchange: string
  type: string
  active: boolean
  currency_name: string
  last_updated_utc: string
  day: {
    o: number
    h: number
    l: number
    c: number
    v: number
    vw: number
  }
  lastQuote: {
    P: number
    S: number
    p: number
    s: number
    t: number
  }
  lastTrade: {
    c: number[]
    i: string
    p: number
    s: number
    t: number
    x: number
  }
  min: {
    av: number
    vw: number
    o: number
    c: number
    h: number
    l: number
    v: number
    t: number
  }
  prevDay: {
    o: number
    h: number
    l: number
    c: number
    v: number
    vw: number
  }
}

export interface OHLCVBar {
  o: number    // open
  h: number    // high
  l: number    // low
  c: number    // close
  v: number    // volume
  vw: number   // volume-weighted average price
  t: number    // timestamp (unix ms)
  n: number    // number of transactions
}

export interface PolygonAggregatesResponse {
  ticker: string
  adjusted: boolean
  queryCount: number
  resultsCount: number
  status: string
  results: OHLCVBar[]
  count: number
}

export interface TickerDetails {
  ticker: string
  name: string
  market: string
  locale: string
  primary_exchange: string
  type: string
  active: boolean
  currency_name: string
  cik?: string
  composite_figi?: string
  share_class_figi?: string
  market_cap?: number
  phone_number?: string
  address?: {
    address1?: string
    city?: string
    state?: string
    postal_code?: string
  }
  description?: string
  sic_code?: string
  sic_description?: string
  ticker_root?: string
  homepage_url?: string
  total_employees?: number
  list_date?: string
  branding?: {
    logo_url?: string
    icon_url?: string
  }
  share_class_shares_outstanding?: number
  weighted_shares_outstanding?: number
}

export interface OptionsContract {
  break_even_price: number
  day: {
    change: number
    change_percent: number
    close: number
    high: number
    last_updated: number
    low: number
    open: number
    previous_close: number
    volume: number
    vwap: number
  }
  details: {
    contract_type: 'call' | 'put'
    exercise_style: string
    expiration_date: string
    shares_per_contract: number
    strike_price: number
    ticker: string
  }
  greeks: {
    delta: number
    gamma: number
    theta: number
    vega: number
  }
  implied_volatility: number
  last_quote: {
    ask: number
    ask_size: number
    bid: number
    bid_size: number
    last_updated: number
    midpoint: number
  }
  open_interest: number
  underlying_asset: {
    change_to_break_even: number
    last_updated: number
    price: number
    ticker: string
    timeframe: string
  }
}

export interface NewsArticle {
  id: string
  publisher: {
    name: string
    homepage_url: string
    logo_url: string
    favicon_url: string
  }
  title: string
  author: string
  published_utc: string
  article_url: string
  tickers: string[]
  image_url?: string
  description?: string
  keywords?: string[]
  insights?: {
    ticker: string
    sentiment: 'positive' | 'negative' | 'neutral'
    sentiment_reasoning: string
  }[]
}

export interface StockQuote {
  ticker: string
  name: string
  price: number
  open: number
  high: number
  low: number
  close: number
  previousClose: number
  change: number
  changePercent: number
  volume: number
  avgVolume: number
  marketCap?: number
  timestamp: number
}

export interface HistoricalBar {
  time: number   // unix seconds (for Lightweight Charts)
  open: number
  high: number
  low: number
  close: number
  volume: number
}
