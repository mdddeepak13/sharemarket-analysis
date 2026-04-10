'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueries } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPrice, formatPercent, getChangeColor } from '@/lib/utils/format'
import { Plus, Trash2, TrendingUp, TrendingDown, BookMarked } from 'lucide-react'

const STORAGE_KEY = 'sharmarket_watchlist'

function loadWatchlist(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveWatchlist(tickers: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickers))
}

export default function WatchlistPage() {
  const router = useRouter()
  const [tickers, setTickers] = useState<string[]>([])
  const [input, setInput] = useState('')

  useEffect(() => {
    setTickers(loadWatchlist())
  }, [])

  const results = useQueries({
    queries: tickers.map(t => ({
      queryKey: ['quote', t],
      queryFn: async () => {
        const res = await fetch(`/api/stocks/quote?ticker=${t}`)
        if (!res.ok) throw new Error('not found')
        return res.json()
      },
      staleTime: 60_000,
      refetchInterval: 60_000,
      retry: false,
    })),
  })

  const addTicker = () => {
    const sym = input.trim().toUpperCase()
    if (!sym || tickers.includes(sym)) { setInput(''); return }
    const updated = [...tickers, sym]
    setTickers(updated)
    saveWatchlist(updated)
    setInput('')
  }

  const removeTicker = (t: string) => {
    const updated = tickers.filter(x => x !== t)
    setTickers(updated)
    saveWatchlist(updated)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Watchlist</h1>
        <p className="text-muted-foreground text-sm mt-1">Track your favourite tickers</p>
      </div>

      {/* Add ticker */}
      <div className="flex gap-2 max-w-sm">
        <Input
          value={input}
          onChange={e => setInput(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && addTicker()}
          placeholder="Add ticker (e.g. TSLA)"
          className="font-mono"
        />
        <Button onClick={addTicker}><Plus className="h-4 w-4 mr-1" /> Add</Button>
      </div>

      {tickers.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-2">
            <BookMarked className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Your watchlist is empty</p>
            <p className="text-xs text-muted-foreground">Add tickers above to track them here</p>
          </CardContent>
        </Card>
      )}

      {tickers.length > 0 && (
        <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
          {tickers.map((ticker, i) => {
            const result = results[i]
            const quote = result?.data
            const loading = result?.isLoading
            const isUp = (quote?.changePercent ?? 0) >= 0
            const Icon = isUp ? TrendingUp : TrendingDown

            return (
              <div
                key={ticker}
                className="flex items-center justify-between px-4 py-3 bg-card hover:bg-muted/30 transition-colors cursor-pointer group"
                onClick={() => router.push(`/dashboard/stocks/${ticker}`)}
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono font-semibold w-16">{ticker}</span>
                  {loading ? (
                    <Skeleton className="h-4 w-32" />
                  ) : quote ? (
                    <span className="text-xs text-muted-foreground truncate max-w-48">{quote.name}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not found</span>
                  )}
                </div>

                <div className="flex items-center gap-6">
                  {loading ? (
                    <Skeleton className="h-4 w-20" />
                  ) : quote ? (
                    <>
                      <span className="font-mono font-medium tabular-nums">{formatPrice(quote.price)}</span>
                      <div className={`flex items-center gap-1 text-xs w-20 justify-end ${getChangeColor(quote.changePercent)}`}>
                        <Icon className="h-3 w-3" />
                        <span>{formatPercent(quote.changePercent)}</span>
                      </div>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all"
                    onClick={e => { e.stopPropagation(); removeTicker(ticker) }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
