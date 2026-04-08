'use client'

import dynamic from 'next/dynamic'
import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { calculateSMA } from '@/lib/analysis/moving-averages'
import { calculateFibonacciLevels } from '@/lib/analysis/fibonacci'
import type { HistoricalBar } from '@/lib/polygon/types'

// Dynamic import — heavy charting library loaded only on client
const StockChart = dynamic(
  () => import('./StockChartClient').then(m => ({ default: m.StockChartClient })),
  { ssr: false, loading: () => <Skeleton className="h-[420px] w-full" /> },
)

const PERIODS = ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y'] as const
type Period = typeof PERIODS[number]

interface StockChartSectionProps {
  ticker: string
}

export function StockChartSection({ ticker }: StockChartSectionProps) {
  const [period, setPeriod] = useState<Period>('1Y')

  const { data, isLoading } = useQuery({
    queryKey: ['history', ticker, period],
    queryFn: async () => {
      const res = await fetch(`/api/stocks/history?ticker=${ticker}&period=${period}`)
      if (!res.ok) throw new Error('Failed to fetch history')
      return res.json() as Promise<{ bars: HistoricalBar[] }>
    },
  })

  const handlePeriodChange = useCallback((p: string) => setPeriod(p as Period), [])

  const bars = data?.bars ?? []
  const prices = bars.map(b => b.close)
  const sma50 = prices.length >= 50 ? calculateSMA(prices, 50) : undefined
  const sma200 = prices.length >= 200 ? calculateSMA(prices, 200) : undefined
  const fib = prices.length >= 50 ? calculateFibonacciLevels(prices) : undefined

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-blue-500 inline-block" /> SMA 50</span>
            <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-orange-500 inline-block" /> SMA 200</span>
            <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-emerald-500 inline-block" /> Fib 61.8%</span>
          </div>
          <Tabs value={period} onValueChange={handlePeriodChange}>
            <TabsList className="h-7">
              {PERIODS.map(p => (
                <TabsTrigger key={p} value={p} className="text-xs px-2 h-6">{p}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        {isLoading ? (
          <Skeleton className="h-[420px] w-full" />
        ) : (
          <StockChart
            bars={bars}
            sma50={sma50}
            sma200={sma200}
            fibLevels={fib?.levels}
          />
        )}
      </CardContent>
    </Card>
  )
}
