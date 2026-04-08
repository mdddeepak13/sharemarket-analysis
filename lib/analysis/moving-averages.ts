export interface CrossEvent {
  index: number
  type: 'golden' | 'death'
  price: number
}

export interface MAResult {
  sma50: number[]
  sma200: number[]
  currentSma50: number
  currentSma200: number
  crossover: 'golden' | 'death' | 'none'
  latestCross?: CrossEvent
  priceVsSma50: 'above' | 'below'
  priceVsSma200: 'above' | 'below'
}

export function calculateSMA(prices: number[], period: number): number[] {
  const result: number[] = new Array(prices.length).fill(NaN)
  if (prices.length < period) return result

  let sum = 0
  for (let i = 0; i < period; i++) {
    sum += prices[i]
  }
  result[period - 1] = sum / period

  for (let i = period; i < prices.length; i++) {
    sum = sum - prices[i - period] + prices[i]
    result[i] = sum / period
  }
  return result
}

export function detectCrossovers(sma50: number[], sma200: number[]): CrossEvent[] {
  const events: CrossEvent[] = []
  for (let i = 1; i < sma50.length; i++) {
    if (isNaN(sma50[i]) || isNaN(sma200[i]) || isNaN(sma50[i - 1]) || isNaN(sma200[i - 1])) continue

    const prevDiff = sma50[i - 1] - sma200[i - 1]
    const currDiff = sma50[i] - sma200[i]

    if (prevDiff <= 0 && currDiff > 0) {
      events.push({ index: i, type: 'golden', price: sma50[i] })
    } else if (prevDiff >= 0 && currDiff < 0) {
      events.push({ index: i, type: 'death', price: sma50[i] })
    }
  }
  return events
}

export function analyzeMovingAverages(prices: number[]): MAResult {
  const sma50 = calculateSMA(prices, 50)
  const sma200 = calculateSMA(prices, 200)
  const crossovers = detectCrossovers(sma50, sma200)

  const lastIdx = prices.length - 1
  const currentSma50 = sma50[lastIdx]
  const currentSma200 = sma200[lastIdx]
  const currentPrice = prices[lastIdx]

  const latestCross = crossovers.length > 0 ? crossovers[crossovers.length - 1] : undefined

  // Determine current crossover regime based on last known state
  let crossover: 'golden' | 'death' | 'none' = 'none'
  if (!isNaN(currentSma50) && !isNaN(currentSma200)) {
    if (currentSma50 > currentSma200) crossover = 'golden'
    else if (currentSma50 < currentSma200) crossover = 'death'
  }

  return {
    sma50,
    sma200,
    currentSma50,
    currentSma200,
    crossover,
    latestCross,
    priceVsSma50: currentPrice >= currentSma50 ? 'above' : 'below',
    priceVsSma200: currentPrice >= currentSma200 ? 'above' : 'below',
  }
}

export function getMAScore(ma: MAResult, currentPrice: number): number {
  let score = 50 // neutral baseline

  // Price vs 200 SMA (trend direction)
  if (ma.priceVsSma200 === 'above') score += 15
  else score -= 15

  // Price vs 50 SMA (near-term momentum)
  if (ma.priceVsSma50 === 'above') score += 10
  else score -= 10

  // Golden/Death cross regime
  if (ma.crossover === 'golden') score += 15
  else if (ma.crossover === 'death') score -= 15

  // Recent cross bonus (within last 10 bars)
  if (ma.latestCross) {
    const recency = ma.sma50.length - 1 - ma.latestCross.index
    if (recency <= 10) {
      if (ma.latestCross.type === 'golden') score += 10
      else score -= 10
    }
  }

  return Math.max(0, Math.min(100, score))
}
