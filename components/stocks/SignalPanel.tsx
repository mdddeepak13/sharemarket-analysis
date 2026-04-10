'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPrice, getSignalColor } from '@/lib/utils/format'
import { AlertTriangle, TrendingUp, Target, Clock } from 'lucide-react'

const SIGNAL_LABELS: Record<string, string> = {
  STRONG_BUY: 'Strong Buy',
  BUY: 'Buy',
  HOLD: 'Hold',
  SELL: 'Sell',
  STRONG_SELL: 'Strong Sell',
}

const HORIZON_LABELS: Record<string, string> = {
  short: 'Short-term (1–4 wk)',
  mid: 'Mid-term (1–6 mo)',
  long: 'Long-term (6–24 mo)',
}

export function SignalPanel({ ticker, currentPrice }: { ticker: string; currentPrice: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['signals', ticker],
    queryFn: async () => {
      const res = await fetch(`/api/analysis/signals?ticker=${ticker}&period=1Y`)
      if (!res.ok) throw new Error('Failed to fetch signals')
      return res.json()
    },
    staleTime: 15 * 60_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card><CardContent className="py-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
        <Card><CardContent className="py-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
      </div>
    )
  }

  if (!data || data.error) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-6 text-muted-foreground text-sm">
          <AlertTriangle className="h-4 w-4" />
          Not enough data for signal analysis
        </CardContent>
      </Card>
    )
  }

  const signal = data
  const t = signal.technicals

  return (
    <div className="space-y-4">
      {/* Main signal card */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">AI Signal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge className={`text-sm px-3 py-1 ${getSignalColor(signal.action)}`}>
              {SIGNAL_LABELS[signal.action]}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {HORIZON_LABELS[signal.horizon]}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Confidence</span>
              <span className="font-mono font-medium">{signal.confidence}%</span>
            </div>
            <Progress value={signal.confidence} className="h-2" />
          </div>

          <Separator />

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Key Signals</p>
            {signal.reasons?.map((reason: string, i: number) => (
              <div key={i} className="flex gap-2 text-xs">
                <span className="text-primary mt-0.5">•</span>
                <span className="text-muted-foreground">{reason}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Price targets */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Target className="h-4 w-4" /> Price Targets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { label: 'Bull', price: signal.priceTargets?.bull, color: 'text-emerald-400' },
            { label: 'Base', price: signal.priceTargets?.base, color: 'text-yellow-400' },
            { label: 'Bear', price: signal.priceTargets?.bear, color: 'text-red-400' },
          ].map(({ label, price, color }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{label} Case</span>
              <span className={`font-mono font-medium ${color}`}>{price != null ? formatPrice(price) : '—'}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Technical snapshot */}
      {t && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Technicals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <TechRow label="SMA 50" value={`$${t.ma?.currentSma50?.toFixed(2) ?? '—'}`}
              badge={t.ma?.priceVsSma50 === 'above' ? 'above' : 'below'}
              badgeColor={t.ma?.priceVsSma50 === 'above' ? 'text-emerald-400' : 'text-red-400'} />
            <TechRow label="SMA 200" value={`$${t.ma?.currentSma200?.toFixed(2) ?? '—'}`}
              badge={t.ma?.priceVsSma200 === 'above' ? 'above' : 'below'}
              badgeColor={t.ma?.priceVsSma200 === 'above' ? 'text-emerald-400' : 'text-red-400'} />
            <TechRow label="MA Cross" value={t.ma?.crossover === 'golden' ? 'Golden ✓' : t.ma?.crossover === 'death' ? 'Death ✗' : 'None'}
              badgeColor={t.ma?.crossover === 'golden' ? 'text-emerald-400' : t.ma?.crossover === 'death' ? 'text-red-400' : 'text-muted-foreground'} />
            <TechRow label="RSI (14)" value={t.rsi?.current?.toFixed(1) ?? '—'}
              badge={t.rsi?.signal}
              badgeColor={t.rsi?.signal === 'oversold' ? 'text-emerald-400' : t.rsi?.signal === 'overbought' ? 'text-red-400' : 'text-muted-foreground'} />
            <TechRow label="MACD" value={t.macd?.current?.macd?.toFixed(3) ?? '—'}
              badge={t.macd?.trend}
              badgeColor={t.macd?.trend === 'bullish' ? 'text-emerald-400' : t.macd?.trend === 'bearish' ? 'text-red-400' : 'text-muted-foreground'} />
            <TechRow label="Fib Level" value={t.fibonacci?.nearestLevel?.label ?? '—'}
              badge={t.fibonacci?.nearestLevel?.price != null ? `$${t.fibonacci.nearestLevel.price}` : undefined}
              badgeColor="text-purple-400" />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function TechRow({
  label,
  value,
  badge,
  badgeColor,
}: {
  label: string
  value: string
  badge?: string
  badgeColor?: string
}) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono font-medium">{value}</span>
        {badge && <span className={`capitalize ${badgeColor}`}>{badge}</span>}
      </div>
    </div>
  )
}
