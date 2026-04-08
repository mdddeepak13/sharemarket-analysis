'use client'

import { StockChart } from '@/components/charts/StockChart'
import type { HistoricalBar } from '@/lib/polygon/types'
import type { FibLevel } from '@/lib/analysis/fibonacci'

interface StockChartClientProps {
  bars: HistoricalBar[]
  sma50?: number[]
  sma200?: number[]
  fibLevels?: FibLevel[]
}

// Thin wrapper so dynamic import can resolve a named export from a 'use client' module
export function StockChartClient(props: StockChartClientProps) {
  return <StockChart {...props} />
}
