import { Suspense } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopNav } from '@/components/layout/TopNav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar uses usePathname — wrap in Suspense for PPR */}
      <Suspense fallback={<div className="w-56 shrink-0 border-r border-border bg-card" />}>
        <Sidebar />
      </Suspense>
      <div className="flex flex-col flex-1 overflow-hidden">
        <Suspense fallback={<div className="h-14 border-b border-border bg-card" />}>
          <TopNav />
        </Suspense>
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}
