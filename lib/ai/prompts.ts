import type { TradingSignal } from '@/lib/analysis/signals'

export function buildAnalysisPrompt(
  ticker: string,
  companyName: string,
  signal: TradingSignal,
  currentPrice: number,
  newsContext: string,
): string {
  const { technicals: t, scores, priceTargets } = signal

  return `You are a professional stock analyst. Generate a concise, factual investment analysis report for ${ticker} (${companyName}).

## Current Data
- Price: $${currentPrice}
- Signal: ${signal.action} (Confidence: ${signal.confidence}%)
- Time Horizon: ${signal.horizon}-term

## Technical Indicators
- SMA-50: $${t.ma.currentSma50?.toFixed(2) ?? 'N/A'} (Price is ${t.ma.priceVsSma50} this level)
- SMA-200: $${t.ma.currentSma200?.toFixed(2) ?? 'N/A'} (Price is ${t.ma.priceVsSma200} this level)
- MA Crossover: ${t.ma.crossover} (${t.ma.crossover === 'golden' ? 'Bullish' : t.ma.crossover === 'death' ? 'Bearish' : 'No active cross'})
- RSI (14): ${t.rsi.current.toFixed(1)} (${t.rsi.signal})
- MACD Trend: ${t.macd.trend} | Crossover: ${t.macd.crossover}
- Fibonacci Nearest Level: ${t.fibonacci.nearestLevel.label} at $${t.fibonacci.nearestLevel.price}
- Fibonacci Trend: ${t.fibonacci.trend}

## Scores
- MA Score: ${scores.ma}/100
- Fibonacci Score: ${scores.fibonacci}/100
- RSI Score: ${scores.rsi}/100
- MACD Score: ${scores.macd}/100
- Volume Score: ${scores.volume}/100

## Price Targets
- Bear Case: $${priceTargets.bear}
- Base Case: $${priceTargets.base}
- Bull Case: $${priceTargets.bull}

## Recent News & Context
${newsContext || 'No recent news available.'}

## Instructions
Generate a structured analysis report with these sections:
1. **Technical Outlook** (2-3 sentences about MA, Fibonacci, momentum)
2. **Key Signals** (bullet list of 3-4 most important factors)
3. **Risk Factors** (2-3 key risks to the thesis)
4. **Investment Thesis** (clear buy/sell/hold recommendation with reasoning)
5. **Price Targets** (brief explanation of bear/base/bull scenarios)

Be specific, use the data provided, cite indicator levels. Keep total length under 400 words. Use professional financial language.`
}

export function buildRAGSystemPrompt(): string {
  return `You are ShareMarket AI, an expert financial analyst assistant with deep knowledge of US equities, options, futures, macro-economics, and market dynamics. Your knowledge extends through early 2025.

Rules:
- Answer ALL questions using your financial expertise and training knowledge
- When retrieved context documents are provided, use them as primary sources and cite them inline as [Source: Title]
- When NO context documents are provided (empty), draw on your training knowledge to give a thorough, expert answer — do NOT refuse or ask for more context
- Provide specific data points, percentages, and named factors wherever possible
- Structure answers clearly with brief headers or bullet points for readability
- Frame analysis objectively — never give personalized "buy/sell" advice, but do explain bullish and bearish cases
- Keep responses concise: 150–300 words unless the question requires more depth
- Today's approximate date: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
}

export function buildRAGUserPrompt(
  question: string,
  liveContext: string,
  ragContext: string,
  ticker?: string,
): string {
  const parts: string[] = []

  if (ticker) parts.push(`**Ticker in focus: ${ticker}**`)
  if (liveContext.trim()) parts.push(`### Live Market Data\n${liveContext}`)
  if (ragContext.trim()) parts.push(`### Retrieved Documents\n${ragContext}`)
  if (!liveContext.trim() && !ragContext.trim()) {
    parts.push('_No live data or retrieved documents — answering from training knowledge._')
  }

  parts.push(`### Question\n${question}`)
  return parts.join('\n\n')
}

export function buildSentimentPrompt(headlines: string[]): string {
  return `Analyze the market sentiment of these ${headlines.length} news headlines for a stock:

${headlines.map((h, i) => `${i + 1}. "${h}"`).join('\n')}

Return a JSON object with:
- score: number from -1.0 (very bearish) to 1.0 (very bullish)
- label: "very_bearish" | "bearish" | "neutral" | "bullish" | "very_bullish"
- summary: one sentence explaining the sentiment

Respond with only valid JSON.`
}
