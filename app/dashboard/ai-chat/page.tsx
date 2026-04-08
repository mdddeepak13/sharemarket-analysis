import { Metadata } from 'next'
import { AIChatClient } from '@/components/ai/AIChatClient'

export const metadata: Metadata = { title: 'AI Analyst' }

export default function AIChatPage() {
  return (
    <div className="h-full flex flex-col space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Analyst</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Ask questions about any US stock — powered by Claude with RAG on live news and filings
        </p>
      </div>
      <AIChatClient />
    </div>
  )
}
