import { Suspense } from 'react'
import { MarketOverview } from '@/components/stocks/MarketOverview'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Market Overview' }

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Market Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Real-time indices, top movers, and AI market summary
        </p>
      </div>

      <Suspense fallback={<MarketOverviewSkeleton />}>
        <MarketOverview />
      </Suspense>
    </div>
  )
}

function MarketOverviewSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-16" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-24 mb-1" />
            <Skeleton className="h-3 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
