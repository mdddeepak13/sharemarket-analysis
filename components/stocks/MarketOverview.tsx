'use client'

import { useQueries } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPrice, formatPercent, getChangeColor } from '@/lib/utils/format'
import { MARKET_INDICES } from '@/lib/utils/constants'
import { TrendingUp, TrendingDown } from 'lucide-react'

async function fetchQuote(ticker: string) {
  const res = await fetch(`/api/stocks/quote?ticker=${ticker}`)
  if (!res.ok) throw new Error(`Failed to fetch ${ticker}`)
  return res.json()
}

export function MarketOverview() {
  const results = useQueries({
    queries: MARKET_INDICES.map(idx => ({
      queryKey: ['quote', idx.ticker],
      queryFn: () => fetchQuote(idx.ticker),
      staleTime: 60_000,
      refetchInterval: 60_000,
      retry: 2,
    })),
  })

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      {MARKET_INDICES.map((idx, i) => {
        const result = results[i]
        return (
          <IndexCard
            key={idx.ticker}
            ticker={idx.ticker}
            name={idx.name}
            data={result.data ?? null}
            loading={result.isLoading}
          />
        )
      })}
    </div>
  )
}

function IndexCard({
  ticker,
  name,
  data,
  loading,
}: {
  ticker: string
  name: string
  data: { price: number; changePercent: number; change: number } | null
  loading: boolean
}) {
  const isPositive = (data?.changePercent ?? 0) >= 0
  const Icon = isPositive ? TrendingUp : TrendingDown

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-1 pt-4 px-4">
        <CardTitle className="text-xs font-mono text-muted-foreground uppercase">{ticker}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {loading ? (
          <>
            <Skeleton className="h-6 w-24 mb-1" />
            <Skeleton className="h-3 w-16" />
          </>
        ) : data ? (
          <>
            <div className="text-xl font-semibold font-mono tabular-nums">
              {formatPrice(data.price)}
            </div>
            <div className={`flex items-center gap-1 mt-1 text-xs ${getChangeColor(data.changePercent)}`}>
              <Icon className="h-3 w-3" />
              <span>{formatPercent(data.changePercent)}</span>
            </div>
          </>
        ) : (
          <div className="text-muted-foreground text-sm">—</div>
        )}
      </CardContent>
    </Card>
  )
}
