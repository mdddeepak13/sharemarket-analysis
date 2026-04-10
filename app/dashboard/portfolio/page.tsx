'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { formatPrice, formatPercent, getChangeColor } from '@/lib/utils/format'
import { Plus, Trash2, Briefcase, TrendingUp, TrendingDown } from 'lucide-react'

const STORAGE_KEY = 'sharmarket_portfolio'

interface Position {
  ticker: string
  shares: number
  avgCost: number
}

function loadPortfolio(): Position[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function savePortfolio(positions: Position[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(positions))
}

export default function PortfolioPage() {
  const [positions, setPositions] = useState<Position[]>([])
  const [ticker, setTicker] = useState('')
  const [shares, setShares] = useState('')
  const [avgCost, setAvgCost] = useState('')

  useEffect(() => {
    setPositions(loadPortfolio())
  }, [])

  const results = useQueries({
    queries: positions.map(p => ({
      queryKey: ['quote', p.ticker],
      queryFn: async () => {
        const res = await fetch(`/api/stocks/quote?ticker=${p.ticker}`)
        if (!res.ok) throw new Error('not found')
        return res.json()
      },
      staleTime: 60_000,
      refetchInterval: 60_000,
      retry: false,
    })),
  })

  const addPosition = useCallback(() => {
    const sym = ticker.trim().toUpperCase()
    const sh = parseFloat(shares)
    const cost = parseFloat(avgCost)
    if (!sym || isNaN(sh) || isNaN(cost) || sh <= 0 || cost <= 0) return

    const updated = positions.some(p => p.ticker === sym)
      ? positions.map(p => p.ticker === sym ? { ...p, shares: sh, avgCost: cost } : p)
      : [...positions, { ticker: sym, shares: sh, avgCost: cost }]

    setPositions(updated)
    savePortfolio(updated)
    setTicker(''); setShares(''); setAvgCost('')
  }, [ticker, shares, avgCost, positions])

  const removePosition = (t: string) => {
    const updated = positions.filter(p => p.ticker !== t)
    setPositions(updated)
    savePortfolio(updated)
  }

  // Compute portfolio summary
  let totalCost = 0
  let totalValue = 0
  for (let i = 0; i < positions.length; i++) {
    const p = positions[i]
    const quote = results[i]?.data
    totalCost += p.shares * p.avgCost
    if (quote?.price) totalValue += p.shares * quote.price
  }
  const totalGain = totalValue - totalCost
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
        <p className="text-muted-foreground text-sm mt-1">Track positions and P&L</p>
      </div>

      {/* Summary cards */}
      {positions.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs text-muted-foreground">Market Value</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-semibold font-mono tabular-nums">
                {totalValue > 0 ? formatPrice(totalValue) : '—'}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs text-muted-foreground">Total Cost</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-semibold font-mono tabular-nums">{formatPrice(totalCost)}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs text-muted-foreground">Total P&L</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className={`text-xl font-semibold font-mono tabular-nums ${getChangeColor(totalGain)}`}>
                {totalValue > 0 ? formatPrice(totalGain) : '—'}
              </div>
              {totalValue > 0 && (
                <div className={`text-xs font-mono ${getChangeColor(totalGainPct)}`}>
                  {formatPercent(totalGainPct)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add position form */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Add / Update Position</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Input
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase())}
              placeholder="Ticker"
              className="font-mono w-28"
            />
            <Input
              type="number"
              value={shares}
              onChange={e => setShares(e.target.value)}
              placeholder="Shares"
              className="w-28"
              min={0}
            />
            <Input
              type="number"
              value={avgCost}
              onChange={e => setAvgCost(e.target.value)}
              placeholder="Avg cost ($)"
              className="w-36"
              min={0}
              step={0.01}
            />
            <Button onClick={addPosition}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Positions table */}
      {positions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-2">
            <Briefcase className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">No positions yet</p>
            <p className="text-xs text-muted-foreground">Add your first position above</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Ticker</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Shares</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Avg Cost</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Current</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Market Value</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">P&L</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">P&L %</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {positions.map((p, i) => {
                    const result = results[i]
                    const quote = result?.data
                    const loading = result?.isLoading
                    const currentPrice = quote?.price
                    const marketValue = currentPrice != null ? p.shares * currentPrice : null
                    const costBasis = p.shares * p.avgCost
                    const pnl = marketValue != null ? marketValue - costBasis : null
                    const pnlPct = pnl != null ? (pnl / costBasis) * 100 : null
                    const isUp = (pnlPct ?? 0) >= 0
                    const Icon = isUp ? TrendingUp : TrendingDown

                    return (
                      <tr key={p.ticker} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold">{p.ticker}</td>
                        <td className="px-4 py-3 text-right font-mono">{p.shares.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatPrice(p.avgCost)}</td>
                        <td className="px-4 py-3 text-right font-mono">
                          {loading ? <Skeleton className="h-4 w-16 ml-auto" /> : currentPrice != null ? formatPrice(currentPrice) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {loading ? <Skeleton className="h-4 w-20 ml-auto" /> : marketValue != null ? formatPrice(marketValue) : '—'}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono ${getChangeColor(pnl)}`}>
                          {loading ? <Skeleton className="h-4 w-16 ml-auto" /> : pnl != null ? formatPrice(pnl) : '—'}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono ${getChangeColor(pnlPct)}`}>
                          {loading ? <Skeleton className="h-4 w-12 ml-auto" /> : pnlPct != null ? (
                            <span className="flex items-center justify-end gap-1">
                              <Icon className="h-3 w-3" />
                              {formatPercent(pnlPct)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-red-400"
                            onClick={() => removePosition(p.ticker)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
