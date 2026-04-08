import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getSnapshot, getTickerDetails } from '@/lib/polygon/client'
import { Skeleton } from '@/components/ui/skeleton'
import { StockHeader } from '@/components/stocks/StockHeader'
import { StockChartSection } from '@/components/stocks/StockChartSection'
import { SignalPanel } from '@/components/stocks/SignalPanel'
import { NewsSection } from '@/components/stocks/NewsSection'

export async function generateMetadata({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params
  return { title: ticker.toUpperCase() }
}

export default async function StockPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params
  const symbol = ticker.toUpperCase()

  // Parallel initial fetches
  const [quote, details] = await Promise.allSettled([
    getSnapshot(symbol),
    getTickerDetails(symbol),
  ])

  if (quote.status === 'rejected') notFound()

  const quoteData = quote.value
  const detailsData = details.status === 'fulfilled' ? details.value : null

  return (
    <div className="space-y-6">
      <StockHeader
        ticker={symbol}
        name={detailsData?.name ?? symbol}
        quote={quoteData}
        description={detailsData?.description ?? null}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Chart — takes 2/3 width on xl */}
        <div className="xl:col-span-2 space-y-4">
          <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
            <StockChartSection ticker={symbol} />
          </Suspense>
        </div>

        {/* Signal panel — takes 1/3 width */}
        <div className="space-y-4">
          <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
            <SignalPanel ticker={symbol} currentPrice={quoteData.price} />
          </Suspense>
        </div>
      </div>

      <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
        <NewsSection ticker={symbol} />
      </Suspense>
    </div>
  )
}
