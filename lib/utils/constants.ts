export const MARKET_INDICES = [
  { ticker: 'SPY', name: 'S&P 500 ETF', description: 'Tracks S&P 500' },
  { ticker: 'QQQ', name: 'NASDAQ 100 ETF', description: 'Tracks NASDAQ 100' },
  { ticker: 'DIA', name: 'Dow Jones ETF', description: 'Tracks DJIA' },
  { ticker: 'IWM', name: 'Russell 2000 ETF', description: 'Tracks small caps' },
  { ticker: 'VIX', name: 'Volatility Index', description: 'Market fear gauge' },
]

export const MAJOR_FUTURES = [
  { symbol: 'ES1!', name: 'S&P 500 Futures', category: 'index' },
  { symbol: 'NQ1!', name: 'NASDAQ Futures', category: 'index' },
  { symbol: 'YM1!', name: 'Dow Futures', category: 'index' },
  { symbol: 'RTY1!', name: 'Russell 2000 Futures', category: 'index' },
  { symbol: 'CL1!', name: 'Crude Oil Futures', category: 'commodity' },
  { symbol: 'GC1!', name: 'Gold Futures', category: 'commodity' },
  { symbol: 'NG1!', name: 'Natural Gas Futures', category: 'commodity' },
  { symbol: 'ZN1!', name: '10-Year T-Note Futures', category: 'bond' },
]

export const FIBONACCI_RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0] as const

export const SIGNAL_WEIGHTS = {
  ma: 0.30,
  fibonacci: 0.20,
  rsi: 0.20,
  macd: 0.15,
  volume: 0.10,
  sentiment: 0.05,
} as const

export const SIGNAL_THRESHOLDS = {
  STRONG_BUY: 80,
  BUY: 60,
  HOLD: 40,
  SELL: 20,
} as const

export const RSI_THRESHOLDS = {
  OVERBOUGHT: 70,
  OVERSOLD: 30,
  NEUTRAL_HIGH: 60,
  NEUTRAL_LOW: 40,
} as const

export const CACHE_TTL = {
  QUOTE: 60,           // 1 minute
  HISTORY: 3600,       // 1 hour
  TECHNICALS: 900,     // 15 minutes
  SIGNALS: 900,        // 15 minutes
  NEWS: 600,           // 10 minutes
  OPTIONS: 300,        // 5 minutes
} as const

export const POLYGON_BASE_URL = 'https://api.polygon.io'
export const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1'
export const FRED_BASE_URL = 'https://api.stlouisfed.org/fred'

export const DEFAULT_LOOKBACK_DAYS = 365
export const MA_PERIODS = { SHORT: 50, LONG: 200 } as const
