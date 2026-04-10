'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { StockHeader } from '@/components/stocks/StockHeader'
import { StockChartSection } from '@/components/stocks/StockChartSection'
import { SignalPanel } from '@/components/stocks/SignalPanel'
import { NewsSection } from '@/components/stocks/NewsSection'
import { Skeleton } from '@/components/ui/skeleton'

export default function StockPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker: rawTicker } = use(params)
  const ticker = rawTicker.toUpperCase()

  const { data: quote, isLoading } = useQuery({
    queryKey: ['quote', ticker],
    queryFn: async () => {
      const res = await fetch(`/api/stocks/quote?ticker=${ticker}`)
      if (!res.ok) throw new Error('Not found')
      return res.json()
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 2,
  })

  return (
    <div className="space-y-6">
      {isLoading || !quote ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-full max-w-lg" />
          <Skeleton className="h-px w-full" />
          <div className="flex gap-6">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-4 w-20" />)}
          </div>
        </div>
      ) : (
        <StockHeader
          ticker={ticker}
          name={quote.name ?? ticker}
          quote={quote}
          description={quote.description ?? null}
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          <StockChartSection ticker={ticker} />
        </div>

        <div className="space-y-4">
          <SignalPanel ticker={ticker} currentPrice={quote?.price ?? 0} />
        </div>
      </div>

      <NewsSection ticker={ticker} />
    </div>
  )
}
