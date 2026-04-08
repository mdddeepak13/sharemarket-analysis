'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import {
  Command, CommandEmpty, CommandGroup, CommandItem, CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useDebounce } from '@/hooks/useDebounce'

export function TopNav() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)

  const { data: results = [] } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 1) return []
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(debouncedQuery)}`)
      return res.json()
    },
    enabled: debouncedQuery.length > 0,
  })

  const handleSelect = useCallback((ticker: string) => {
    setOpen(false)
    setQuery('')
    router.push(`/dashboard/stocks/${ticker}`)
  }, [router])

  return (
    <header className="flex h-14 items-center border-b border-border bg-card px-4 gap-4">
      <Popover open={open && results.length > 0} onOpenChange={setOpen}>
        <PopoverTrigger className="flex-1 max-w-sm text-left">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search ticker or company…"
              className="pl-9 h-9 bg-muted border-0 focus-visible:ring-1"
              value={query}
              onClick={e => e.stopPropagation()}
              onChange={e => { setQuery(e.target.value); setOpen(true) }}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command>
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Stocks">
                {results.map((r: { ticker: string; name: string }) => (
                  <CommandItem
                    key={r.ticker}
                    onSelect={() => handleSelect(r.ticker)}
                    className="flex justify-between cursor-pointer"
                  >
                    <span className="font-mono font-semibold text-sm">{r.ticker}</span>
                    <span className="text-muted-foreground text-xs truncate ml-2">{r.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-mono">LIVE</span>
      </div>
    </header>
  )
}
