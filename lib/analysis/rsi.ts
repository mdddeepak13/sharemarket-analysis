import { RSI_THRESHOLDS } from '@/lib/utils/constants'

export interface RSIResult {
  values: number[]
  current: number
  signal: 'overbought' | 'oversold' | 'neutral'
}

export function calculateRSI(prices: number[], period = 14): RSIResult {
  if (prices.length < period + 1) {
    return { values: [], current: 50, signal: 'neutral' }
  }

  const values: number[] = new Array(prices.length).fill(NaN)
  let avgGain = 0
  let avgLoss = 0

  // Initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1]
    if (diff >= 0) avgGain += diff
    else avgLoss += Math.abs(diff)
  }
  avgGain /= period
  avgLoss /= period

  const rs = avgGain / (avgLoss || 1)
  values[period] = 100 - 100 / (1 + rs)

  // Wilder's smoothing
  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1]
    const gain = diff >= 0 ? diff : 0
    const loss = diff < 0 ? Math.abs(diff) : 0

    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period

    const rs = avgGain / (avgLoss || 1)
    values[i] = 100 - 100 / (1 + rs)
  }

  const current = values[values.length - 1] ?? 50
  let signal: RSIResult['signal'] = 'neutral'
  if (current >= RSI_THRESHOLDS.OVERBOUGHT) signal = 'overbought'
  else if (current <= RSI_THRESHOLDS.OVERSOLD) signal = 'oversold'

  return { values, current, signal }
}

export function getRSIScore(rsi: RSIResult): number {
  const v = rsi.current
  // RSI score: favor 40–60 (neutral momentum), penalize extremes
  // Oversold (< 30) = potential buy → high score
  // Overbought (> 70) = potential sell → low score
  if (v <= 20) return 85
  if (v <= 30) return 75
  if (v <= 40) return 65
  if (v <= 50) return 55
  if (v <= 60) return 50
  if (v <= 70) return 40
  if (v <= 80) return 25
  return 15
}
