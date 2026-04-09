export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price)
}

export function formatChange(change: number, percent: number): string {
  const sign = change >= 0 ? '+' : ''
  return `${sign}${formatPrice(change)} (${sign}${percent.toFixed(2)}%)`
}

export function formatVolume(volume: number): string {
  if (volume >= 1_000_000_000) return `${(volume / 1_000_000_000).toFixed(2)}B`
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(2)}M`
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}K`
  return volume.toString()
}

export function formatMarketCap(cap: number): string {
  if (cap >= 1_000_000_000_000) return `$${(cap / 1_000_000_000_000).toFixed(2)}T`
  if (cap >= 1_000_000_000) return `$${(cap / 1_000_000_000).toFixed(2)}B`
  if (cap >= 1_000_000) return `$${(cap / 1_000_000).toFixed(2)}M`
  return `$${cap.toLocaleString()}`
}

export function formatPercent(value: number | null | undefined, decimals = 2): string {
  if (value == null || !isFinite(value)) return '—'
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

export function formatDate(date: string | number | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | number | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function isPositive(value: number): boolean {
  return value > 0
}

export function getChangeColor(value: number | null | undefined): string {
  if (value == null || !isFinite(value)) return 'text-muted-foreground'
  if (value > 0) return 'text-emerald-400'
  if (value < 0) return 'text-red-400'
  return 'text-muted-foreground'
}

export function getSignalColor(action: string): string {
  switch (action) {
    case 'STRONG_BUY': return 'bg-emerald-500 text-white'
    case 'BUY': return 'bg-emerald-400/20 text-emerald-400 border-emerald-400/30'
    case 'HOLD': return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30'
    case 'SELL': return 'bg-red-400/20 text-red-400 border-red-400/30'
    case 'STRONG_SELL': return 'bg-red-500 text-white'
    default: return 'bg-muted text-muted-foreground'
  }
}
