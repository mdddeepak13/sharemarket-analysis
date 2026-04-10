'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatPrice } from '@/lib/utils/format'
import { Search, AlertCircle } from 'lucide-react'

type ContractType = 'call' | 'put'

interface OptionsContract {
  details: {
    contract_type: string
    strike_price: number
    expiration_date: string
    ticker: string
  }
  day: { open: number; high: number; low: number; close: number; volume: number; vwap: number }
  greeks?: { delta: number; gamma: number; theta: number; vega: number }
  implied_volatility?: number
  open_interest?: number
}

async function fetchOptions(ticker: string, type: ContractType) {
  const res = await fetch(`/api/stocks/options?ticker=${ticker}&contract_type=${type}`)
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json() as Promise<{ contracts: OptionsContract[] }>
}

export default function OptionsPage() {
  const [input, setInput] = useState('AAPL')
  const [ticker, setTicker] = useState('')
  const [contractType, setContractType] = useState<ContractType>('call')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['options', ticker, contractType],
    queryFn: () => fetchOptions(ticker, contractType),
    enabled: ticker.length > 0,
    retry: false,
  })

  const handleSearch = () => {
    const sym = input.trim().toUpperCase()
    if (sym) setTicker(sym)
  }

  const contracts = data?.contracts ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Options Chain</h1>
        <p className="text-muted-foreground text-sm mt-1">
          View calls and puts with Greeks and implied volatility
        </p>
      </div>

      {/* Search */}
      <div className="flex gap-2 max-w-sm">
        <Input
          value={input}
          onChange={e => setInput(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Ticker symbol (e.g. AAPL)"
          className="font-mono"
        />
        <Button onClick={handleSearch}>
          <Search className="h-4 w-4 mr-1" /> Search
        </Button>
      </div>

      {ticker && (
        <>
          <Tabs value={contractType} onValueChange={v => setContractType(v as ContractType)}>
            <TabsList>
              <TabsTrigger value="call">Calls</TabsTrigger>
              <TabsTrigger value="put">Puts</TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoading && (
            <Card>
              <CardContent className="p-4 space-y-2">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </CardContent>
            </Card>
          )}

          {error && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="flex items-start gap-3 py-6">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Options data unavailable</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Options snapshots require a Polygon paid plan. Upgrade at polygon.io to enable this feature.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {!isLoading && !error && contracts.length === 0 && ticker && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                No options contracts found for {ticker}
              </CardContent>
            </Card>
          )}

          {contracts.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {ticker} — {contractType === 'call' ? 'Calls' : 'Puts'} ({contracts.length} contracts)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Expiry</th>
                        <th className="px-4 py-2 text-right font-medium text-muted-foreground">Strike</th>
                        <th className="px-4 py-2 text-right font-medium text-muted-foreground">Last</th>
                        <th className="px-4 py-2 text-right font-medium text-muted-foreground">Volume</th>
                        <th className="px-4 py-2 text-right font-medium text-muted-foreground">OI</th>
                        <th className="px-4 py-2 text-right font-medium text-muted-foreground">IV</th>
                        <th className="px-4 py-2 text-right font-medium text-muted-foreground">Delta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {contracts.map((c, i) => (
                        <tr key={i} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-2 font-mono">{c.details.expiration_date}</td>
                          <td className="px-4 py-2 text-right font-mono font-medium">
                            {formatPrice(c.details.strike_price)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono">
                            {c.day?.close != null ? formatPrice(c.day.close) : '—'}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                            {c.day?.volume?.toLocaleString() ?? '—'}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                            {c.open_interest?.toLocaleString() ?? '—'}
                          </td>
                          <td className="px-4 py-2 text-right font-mono">
                            {c.implied_volatility != null
                              ? <Badge variant="outline" className="text-xs font-mono">
                                  {(c.implied_volatility * 100).toFixed(1)}%
                                </Badge>
                              : '—'}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                            {c.greeks?.delta?.toFixed(3) ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!ticker && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            Enter a ticker symbol above to view the options chain
          </CardContent>
        </Card>
      )}
    </div>
  )
}
