import { FIBONACCI_RATIOS } from '@/lib/utils/constants'

export interface FibLevel {
  ratio: number
  label: string
  price: number
  isKeyLevel: boolean  // 38.2, 61.8 are key
}

export interface FibAnalysis {
  swingHigh: number
  swingLow: number
  swingHighIndex: number
  swingLowIndex: number
  levels: FibLevel[]
  nearestLevel: FibLevel
  nearestLevelDistance: number  // % from current price
  trend: 'uptrend' | 'downtrend'
  isAtSupport: boolean
  isAtResistance: boolean
}

const LEVEL_LABELS: Record<number, string> = {
  0: '0%',
  0.236: '23.6%',
  0.382: '38.2%',
  0.5: '50.0%',
  0.618: '61.8%',
  0.786: '78.6%',
  1.0: '100%',
}

export function calculateFibonacciLevels(prices: number[], lookback = 200): FibAnalysis {
  const window = prices.slice(-lookback)
  let highIdx = 0
  let lowIdx = 0

  for (let i = 1; i < window.length; i++) {
    if (window[i] > window[highIdx]) highIdx = i
    if (window[i] < window[lowIdx]) lowIdx = i
  }

  const swingHigh = window[highIdx]
  const swingLow = window[lowIdx]
  const range = swingHigh - swingLow
  const trend: 'uptrend' | 'downtrend' = highIdx > lowIdx ? 'uptrend' : 'downtrend'

  // Fibonacci levels are drawn from high to low (retracement)
  const levels: FibLevel[] = FIBONACCI_RATIOS.map(ratio => ({
    ratio,
    label: LEVEL_LABELS[ratio],
    price: parseFloat((swingHigh - ratio * range).toFixed(2)),
    isKeyLevel: ratio === 0.382 || ratio === 0.618 || ratio === 0.5,
  }))

  const currentPrice = prices[prices.length - 1]

  // Find nearest level
  let nearest = levels[0]
  let nearestDist = Infinity
  for (const level of levels) {
    const dist = Math.abs(level.price - currentPrice)
    if (dist < nearestDist) {
      nearestDist = dist
      nearest = level
    }
  }
  const nearestLevelDistance = (nearestDist / currentPrice) * 100

  // Support = price is just above a level; Resistance = price is just below
  const tolerance = 0.02  // 2% tolerance
  const isAtSupport = nearest.price < currentPrice && nearestLevelDistance <= tolerance * 100
  const isAtResistance = nearest.price > currentPrice && nearestLevelDistance <= tolerance * 100

  const offset = prices.length - lookback
  return {
    swingHigh,
    swingLow,
    swingHighIndex: highIdx + offset,
    swingLowIndex: lowIdx + offset,
    levels,
    nearestLevel: nearest,
    nearestLevelDistance,
    trend,
    isAtSupport,
    isAtResistance,
  }
}

export function getFibScore(fib: FibAnalysis, currentPrice: number): number {
  let score = 50 // neutral baseline

  // Trend direction
  if (fib.trend === 'uptrend') score += 10
  else score -= 10

  // Price position relative to key levels
  const { 0: level0, 1: level236, 2: level382, 3: level50, 4: level618 } = fib.levels

  if (currentPrice > level618.price) score += 20      // above 61.8% = strong
  else if (currentPrice > level50.price) score += 10  // above 50%
  else if (currentPrice > level382.price) score -= 5  // above 38.2% but below 50%
  else score -= 20                                      // below 38.2% = weak

  // At support bonus
  if (fib.isAtSupport) score += 15
  // At resistance penalty
  if (fib.isAtResistance) score -= 10

  // Close to golden ratio (61.8%) support
  const goldenLevel = fib.levels.find(l => l.ratio === 0.618)!
  if (goldenLevel) {
    const distToGolden = Math.abs(currentPrice - goldenLevel.price) / currentPrice
    if (distToGolden < 0.01 && currentPrice >= goldenLevel.price) score += 15 // right at golden support
  }

  return Math.max(0, Math.min(100, score))
}
