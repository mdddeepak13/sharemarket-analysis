import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatPrice, formatPercent, formatVolume, getChangeColor } from '@/lib/utils/format'
import { TrendingUp, TrendingDown } from 'lucide-react'
import type { StockQuote } from '@/lib/polygon/types'

interface StockHeaderProps {
  ticker: string
  name: string
  quote: StockQuote
  description: string | null
}

export function StockHeader({ ticker, name, quote, description }: StockHeaderProps) {
  const isPositive = quote.changePercent >= 0
  const Icon = isPositive ? TrendingUp : TrendingDown

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold font-mono">{ticker}</h1>
            <Badge variant="outline" className="text-xs font-normal">{name}</Badge>
          </div>
          {description && (
            <p className="text-muted-foreground text-sm mt-1 max-w-2xl line-clamp-2">{description}</p>
          )}
        </div>

        <div className="text-right">
          <div className="text-3xl font-bold font-mono tabular-nums">
            {formatPrice(quote.price)}
          </div>
          <div className={`flex items-center justify-end gap-1 mt-1 ${getChangeColor(quote.changePercent)}`}>
            <Icon className="h-4 w-4" />
            <span className="font-mono text-sm font-medium">
              {isPositive ? '+' : ''}{formatPrice(quote.change)} ({formatPercent(quote.changePercent)})
            </span>
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex gap-6 text-sm flex-wrap">
        <StatItem label="Open" value={formatPrice(quote.open)} />
        <StatItem label="High" value={formatPrice(quote.high)} />
        <StatItem label="Low" value={formatPrice(quote.low)} />
        <StatItem label="Prev Close" value={formatPrice(quote.previousClose)} />
        <StatItem label="Volume" value={formatVolume(quote.volume)} />
      </div>
    </div>
  )
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-mono font-medium">{value}</span>
    </div>
  )
}
