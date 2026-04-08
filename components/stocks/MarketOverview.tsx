import { getSnapshot } from '@/lib/polygon/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatPrice, formatPercent, getChangeColor } from '@/lib/utils/format'
import { MARKET_INDICES } from '@/lib/utils/constants'
import { TrendingUp, TrendingDown } from 'lucide-react'

export async function MarketOverview() {
  // Parallel fetch all indices
  const snapshots = await Promise.allSettled(
    MARKET_INDICES.map(idx => getSnapshot(idx.ticker))
  )

  const quotes = snapshots.map((result, i) => ({
    ...MARKET_INDICES[i],
    data: result.status === 'fulfilled' ? result.value : null,
  }))

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      {quotes.map(({ ticker, name, data }) => (
        <IndexCard key={ticker} ticker={ticker} name={name} data={data} />
      ))}
    </div>
  )
}

function IndexCard({
  ticker,
  name,
  data,
}: {
  ticker: string
  name: string
  data: { price: number; changePercent: number; change: number } | null
}) {
  const isPositive = (data?.changePercent ?? 0) >= 0
  const Icon = isPositive ? TrendingUp : TrendingDown

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-1 pt-4 px-4">
        <CardTitle className="text-xs font-mono text-muted-foreground uppercase">{ticker}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {data ? (
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
