'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'
import { formatPrice, formatPercent, formatVolume, getChangeColor } from '@/lib/utils/format'
import { useDebounce } from '@/hooks/useDebounce'

type PopularQuote = { ticker: string; price: number; changePercent: number; volume: number }

const POPULAR_TICKERS = [
  'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN',
  'META', 'TSLA', 'AVGO', 'JPM', 'V',
  'UNH', 'XOM', 'LLY', 'MA', 'JNJ',
]

export default function StocksPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const { data: searchResults = [], isLoading: searching } = useQuery({
    queryKey: ['search', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch) return []
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(debouncedSearch)}`)
      return res.json()
    },
    enabled: debouncedSearch.length > 0,
  })

  const { data: popularQuotes = [], isLoading: loadingPopular } = useQuery({
    queryKey: ['popular-quotes'],
    queryFn: async () => {
      const results = await Promise.allSettled(
        POPULAR_TICKERS.map(t => fetch(`/api/stocks/quote?ticker=${t}`).then(r => r.json()))
      )
      return results
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<PopularQuote>).value)
    },
    staleTime: 60_000,
  })

  const handleSelect = useCallback((ticker: string) => {
    router.push(`/dashboard/stocks/${ticker}`)
  }, [router])

  const showSearch = debouncedSearch.length > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Stocks</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Search any US stock or select from popular tickers
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search ticker or company name…"
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />
      </div>

      {/* Search results */}
      {showSearch && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Search Results</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {searching ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : searchResults.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No results for "{debouncedSearch}"</p>
            ) : (
              <div className="divide-y divide-border">
                {searchResults.map((r: { ticker: string; name: string; market: string }) => (
                  <button
                    key={r.ticker}
                    onClick={() => handleSelect(r.ticker)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold text-sm w-16">{r.ticker}</span>
                      <span className="text-sm text-muted-foreground truncate max-w-xs">{r.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{r.market}</Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Popular stocks grid */}
      {!showSearch && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
            Popular Stocks
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {loadingPopular
              ? POPULAR_TICKERS.map(t => (
                  <Card key={t} className="cursor-pointer">
                    <CardContent className="p-4 space-y-2">
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-3 w-14" />
                    </CardContent>
                  </Card>
                ))
              : popularQuotes.map((q) => {
                  const isUp = q.changePercent >= 0
                  const Icon = isUp ? TrendingUp : TrendingDown
                  return (
                    <Card
                      key={q.ticker}
                      className="cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => handleSelect(q.ticker)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono font-semibold text-sm">{q.ticker}</span>
                          <Icon className={`h-3.5 w-3.5 ${getChangeColor(q.changePercent)}`} />
                        </div>
                        <div className="font-mono font-bold tabular-nums">
                          {formatPrice(q.price)}
                        </div>
                        <div className={`text-xs mt-1 font-mono ${getChangeColor(q.changePercent)}`}>
                          {formatPercent(q.changePercent)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Vol {formatVolume(q.volume)}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
            }
          </div>
        </div>
      )}
    </div>
  )
}
