import { MarketOverview } from '@/components/stocks/MarketOverview'

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

      <MarketOverview />
    </div>
  )
}
