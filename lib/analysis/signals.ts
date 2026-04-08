import { SIGNAL_WEIGHTS, SIGNAL_THRESHOLDS } from '@/lib/utils/constants'
import { analyzeMovingAverages, getMAScore, type MAResult } from './moving-averages'
import { calculateFibonacciLevels, getFibScore, type FibAnalysis } from './fibonacci'
import { calculateRSI, getRSIScore, type RSIResult } from './rsi'
import { calculateMACD, getMACDScore, type MACDResult } from './macd'

export type SignalAction = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL'
export type TimeHorizon = 'short' | 'mid' | 'long'

export interface TradingSignal {
  action: SignalAction
  confidence: number
  horizon: TimeHorizon
  reasons: string[]
  compositeScore: number
  technicals: {
    ma: MAResult
    fibonacci: FibAnalysis
    rsi: RSIResult
    macd: MACDResult
  }
  scores: {
    ma: number
    fibonacci: number
    rsi: number
    macd: number
    volume: number
    sentiment: number
  }
  priceTargets: {
    bear: number
    base: number
    bull: number
  }
}

function getVolumeScore(volumes: number[]): number {
  if (volumes.length < 20) return 50
  const recentVol = volumes[volumes.length - 1]
  const avgVol = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20
  const ratio = recentVol / avgVol
  if (ratio > 2.0) return 75
  if (ratio > 1.5) return 65
  if (ratio > 1.0) return 55
  if (ratio > 0.5) return 45
  return 35
}

function scoreToAction(score: number): SignalAction {
  if (score >= SIGNAL_THRESHOLDS.STRONG_BUY) return 'STRONG_BUY'
  if (score >= SIGNAL_THRESHOLDS.BUY) return 'BUY'
  if (score >= SIGNAL_THRESHOLDS.HOLD) return 'HOLD'
  if (score >= SIGNAL_THRESHOLDS.SELL) return 'SELL'
  return 'STRONG_SELL'
}

function buildReasons(
  ma: MAResult,
  fib: FibAnalysis,
  rsi: RSIResult,
  macd: MACDResult,
  scores: Record<string, number>,
): string[] {
  const reasons: string[] = []

  // MA reasons
  if (ma.crossover === 'golden') reasons.push('Golden Cross active — SMA-50 above SMA-200 (bullish trend)')
  else if (ma.crossover === 'death') reasons.push('Death Cross active — SMA-50 below SMA-200 (bearish trend)')
  if (ma.priceVsSma200 === 'above') reasons.push('Price trading above 200-day MA (long-term uptrend)')
  else reasons.push('Price below 200-day MA (long-term downtrend)')

  // Fibonacci reasons
  if (fib.isAtSupport) reasons.push(`Price at Fibonacci support (${fib.nearestLevel.label}) — bounce potential`)
  else if (fib.isAtResistance) reasons.push(`Price at Fibonacci resistance (${fib.nearestLevel.label}) — watch for rejection`)
  if (fib.trend === 'uptrend' && !fib.isAtResistance) reasons.push('Fibonacci structure shows uptrend intact')

  // RSI reasons
  if (rsi.signal === 'oversold') reasons.push(`RSI oversold at ${rsi.current.toFixed(1)} — potential mean reversion bounce`)
  else if (rsi.signal === 'overbought') reasons.push(`RSI overbought at ${rsi.current.toFixed(1)} — near-term pullback risk`)

  // MACD reasons
  if (macd.crossover === 'bullish_cross') reasons.push('MACD bullish crossover — momentum shifting positive')
  else if (macd.crossover === 'bearish_cross') reasons.push('MACD bearish crossover — momentum weakening')
  else if (macd.trend === 'bullish') reasons.push('MACD above signal line (bullish momentum)')
  else if (macd.trend === 'bearish') reasons.push('MACD below signal line (bearish momentum)')

  return reasons.slice(0, 4)
}

function calculatePriceTargets(currentPrice: number, fib: FibAnalysis, action: SignalAction): {
  bear: number; base: number; bull: number
} {
  const range = fib.swingHigh - fib.swingLow
  const bullTarget = fib.levels.find(l => l.ratio === 0)?.price ?? currentPrice * 1.1
  const baseTarget = fib.levels.find(l => l.ratio === 0.236)?.price ?? currentPrice * 1.05
  const bearTarget = fib.levels.find(l => l.ratio === 0.618)?.price ?? currentPrice * 0.95

  if (action === 'SELL' || action === 'STRONG_SELL') {
    return {
      bull: parseFloat((currentPrice * 1.05).toFixed(2)),
      base: parseFloat(bearTarget.toFixed(2)),
      bear: parseFloat((fib.swingLow).toFixed(2)),
    }
  }

  return {
    bear: parseFloat(bearTarget.toFixed(2)),
    base: parseFloat(baseTarget.toFixed(2)),
    bull: parseFloat(bullTarget.toFixed(2)),
  }
}

export function generateSignal(
  prices: number[],
  volumes: number[],
  sentimentScore = 0,
): TradingSignal {
  const currentPrice = prices[prices.length - 1]

  // Calculate all indicators
  const ma = analyzeMovingAverages(prices)
  const fib = calculateFibonacciLevels(prices)
  const rsi = calculateRSI(prices)
  const macd = calculateMACD(prices)

  // Individual scores (0–100)
  const scores = {
    ma: getMAScore(ma, currentPrice),
    fibonacci: getFibScore(fib, currentPrice),
    rsi: getRSIScore(rsi),
    macd: getMACDScore(macd),
    volume: getVolumeScore(volumes),
    sentiment: Math.round(((sentimentScore + 1) / 2) * 100), // -1..1 → 0..100
  }

  // Weighted composite score
  const compositeScore = Math.round(
    scores.ma * SIGNAL_WEIGHTS.ma +
    scores.fibonacci * SIGNAL_WEIGHTS.fibonacci +
    scores.rsi * SIGNAL_WEIGHTS.rsi +
    scores.macd * SIGNAL_WEIGHTS.macd +
    scores.volume * SIGNAL_WEIGHTS.volume +
    scores.sentiment * SIGNAL_WEIGHTS.sentiment
  )

  const action = scoreToAction(compositeScore)
  const reasons = buildReasons(ma, fib, rsi, macd, scores)

  // Horizon based on signal strength and MA regime
  let horizon: TimeHorizon = 'mid'
  if (ma.crossover !== 'none' && ma.priceVsSma200 === 'above') horizon = 'long'
  else if (rsi.signal !== 'neutral' || macd.crossover !== 'none') horizon = 'short'

  const priceTargets = calculatePriceTargets(currentPrice, fib, action)

  return {
    action,
    confidence: compositeScore,
    horizon,
    reasons,
    compositeScore,
    technicals: { ma, fibonacci: fib, rsi, macd },
    scores,
    priceTargets,
  }
}
