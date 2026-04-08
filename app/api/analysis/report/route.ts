import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAggregates, getNews, getTickerDetails } from '@/lib/polygon/client'
import { generateSignal } from '@/lib/analysis/signals'
import { generateAnalysisReport } from '@/lib/ai/claude'
import { buildAnalysisPrompt } from '@/lib/ai/prompts'

const bodySchema = z.object({
  ticker: z.string().min(1).max(10).toUpperCase(),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 })
  }
  const { ticker } = parsed.data

  try {
    const to = new Date().toISOString().split('T')[0]
    const from = new Date(Date.now() - 300 * 86400000).toISOString().split('T')[0]

    const [bars, news, details] = await Promise.all([
      getAggregates(ticker, from, to),
      getNews(ticker, 5),
      getTickerDetails(ticker).catch(() => null),
    ])

    if (bars.length < 50) {
      return NextResponse.json({ error: 'Insufficient price data' }, { status: 422 })
    }

    const prices = bars.map(b => b.close)
    const volumes = bars.map(b => b.volume)
    const signal = generateSignal(prices, volumes)
    const currentPrice = prices[prices.length - 1]

    const newsContext = news
      .map(a => `- ${a.title} (${a.published_utc.split('T')[0]}): ${a.description ?? ''}`)
      .join('\n')

    const prompt = buildAnalysisPrompt(
      ticker,
      details?.name ?? ticker,
      signal,
      currentPrice,
      newsContext,
    )

    const report = await generateAnalysisReport(prompt)

    return NextResponse.json({
      ticker,
      report,
      signal: {
        action: signal.action,
        confidence: signal.confidence,
        horizon: signal.horizon,
        priceTargets: signal.priceTargets,
      },
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[report] ticker=%s error=%s', ticker, err)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 502 })
  }
}
