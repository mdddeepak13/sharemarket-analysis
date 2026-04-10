'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MAJOR_FUTURES } from '@/lib/utils/constants'
import { TrendingUp, Info } from 'lucide-react'

const CATEGORY_COLORS: Record<string, string> = {
  index: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  commodity: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  bond: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
}

export default function FuturesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Futures</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Major index, commodity, and bond futures
        </p>
      </div>

      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="flex items-start gap-3 py-4">
          <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Futures data requires a TradingView or paid market-data subscription. Live quotes are shown via TradingView widgets below. For programmatic access, add a Polygon paid plan or a dedicated futures data provider.
          </p>
        </CardContent>
      </Card>

      {/* Futures list */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MAJOR_FUTURES.map(f => (
          <Card key={f.symbol} className="bg-card border-border">
            <CardHeader className="pb-1 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-mono text-muted-foreground uppercase">{f.symbol}</CardTitle>
                <Badge variant="outline" className={`text-xs ${CATEGORY_COLORS[f.category]}`}>
                  {f.category}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-sm font-medium">{f.name}</p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> View on TradingView
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* TradingView widget placeholder */}
      <Card className="border-dashed">
        <CardContent className="py-16 text-center space-y-2">
          <p className="text-sm font-medium">Live Futures Charts</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Embed TradingView widgets here for live futures quotes, or integrate a paid futures data feed for real-time API access.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
