export interface MACDResult {
  macdLine: number[]
  signalLine: number[]
  histogram: number[]
  current: {
    macd: number
    signal: number
    histogram: number
  }
  trend: 'bullish' | 'bearish' | 'neutral'
  crossover: 'bullish_cross' | 'bearish_cross' | 'none'
}

function calculateEMA(prices: number[], period: number): number[] {
  const result: number[] = new Array(prices.length).fill(NaN)
  const multiplier = 2 / (period + 1)

  // Seed with SMA
  let sum = 0
  for (let i = 0; i < period; i++) sum += prices[i]
  result[period - 1] = sum / period

  for (let i = period; i < prices.length; i++) {
    result[i] = (prices[i] - result[i - 1]) * multiplier + result[i - 1]
  }
  return result
}

export function calculateMACD(
  prices: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): MACDResult {
  const ema12 = calculateEMA(prices, fastPeriod)
  const ema26 = calculateEMA(prices, slowPeriod)

  const macdLine: number[] = prices.map((_, i) => {
    if (isNaN(ema12[i]) || isNaN(ema26[i])) return NaN
    return ema12[i] - ema26[i]
  })

  // Signal line = EMA of MACD line
  const validMacd = macdLine.filter(v => !isNaN(v))
  const signalEMA = calculateEMA(validMacd, signalPeriod)

  const signalLine: number[] = new Array(prices.length).fill(NaN)
  let sigIdx = 0
  for (let i = 0; i < prices.length; i++) {
    if (!isNaN(macdLine[i])) {
      if (sigIdx < signalEMA.length && !isNaN(signalEMA[sigIdx])) {
        signalLine[i] = signalEMA[sigIdx]
      }
      sigIdx++
    }
  }

  const histogram: number[] = macdLine.map((m, i) => {
    if (isNaN(m) || isNaN(signalLine[i])) return NaN
    return m - signalLine[i]
  })

  const lastIdx = prices.length - 1
  const currentMacd = macdLine[lastIdx] ?? 0
  const currentSignal = signalLine[lastIdx] ?? 0
  const currentHistogram = histogram[lastIdx] ?? 0

  // Detect crossovers
  let crossover: MACDResult['crossover'] = 'none'
  for (let i = lastIdx; i > Math.max(0, lastIdx - 5); i--) {
    if (isNaN(macdLine[i]) || isNaN(signalLine[i])) continue
    const prevDiff = macdLine[i - 1] - signalLine[i - 1]
    const currDiff = macdLine[i] - signalLine[i]
    if (!isNaN(prevDiff)) {
      if (prevDiff <= 0 && currDiff > 0) { crossover = 'bullish_cross'; break }
      if (prevDiff >= 0 && currDiff < 0) { crossover = 'bearish_cross'; break }
    }
  }

  const trend: MACDResult['trend'] =
    currentMacd > 0 && currentHistogram > 0 ? 'bullish' :
    currentMacd < 0 && currentHistogram < 0 ? 'bearish' : 'neutral'

  return {
    macdLine,
    signalLine,
    histogram,
    current: { macd: currentMacd, signal: currentSignal, histogram: currentHistogram },
    trend,
    crossover,
  }
}

export function getMACDScore(macd: MACDResult): number {
  let score = 50

  if (macd.trend === 'bullish') score += 20
  else if (macd.trend === 'bearish') score -= 20

  if (macd.crossover === 'bullish_cross') score += 20
  else if (macd.crossover === 'bearish_cross') score -= 20

  // Histogram direction (momentum)
  if (macd.current.histogram > 0) score += 5
  else if (macd.current.histogram < 0) score -= 5

  return Math.max(0, Math.min(100, score))
}
