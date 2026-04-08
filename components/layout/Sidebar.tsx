'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3, TrendingUp, BookMarked, Briefcase,
  MessageSquareText, Settings, Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/dashboard', label: 'Market Overview', icon: Activity },
  { href: '/dashboard/stocks', label: 'Stocks', icon: TrendingUp },
  { href: '/dashboard/options', label: 'Options', icon: BarChart3 },
  { href: '/dashboard/futures', label: 'Futures', icon: BarChart3 },
  { href: '/dashboard/watchlist', label: 'Watchlist', icon: BookMarked },
  { href: '/dashboard/portfolio', label: 'Portfolio', icon: Briefcase },
  { href: '/dashboard/ai-chat', label: 'AI Analyst', icon: MessageSquareText },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border bg-card px-3 py-4 shrink-0">
      {/* Logo */}
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <TrendingUp className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-sm tracking-tight">ShareMarket</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-border pt-3">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </aside>
  )
}
