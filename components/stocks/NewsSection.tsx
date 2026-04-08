import { getNews } from '@/lib/polygon/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils/format'
import { ExternalLink, Newspaper } from 'lucide-react'

const SENTIMENT_STYLES: Record<string, string> = {
  positive: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  negative: 'bg-red-400/10 text-red-400 border-red-400/20',
  neutral:  'bg-muted text-muted-foreground',
}

export async function NewsSection({ ticker }: { ticker: string }) {
  const articles = await getNews(ticker, 6).catch(() => [])

  if (articles.length === 0) return null

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Newspaper className="h-4 w-4" /> Latest News
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {articles.map(article => {
          const sentiment = article.insights?.find(i => i.ticker === ticker)?.sentiment ?? 'neutral'
          return (
            <a
              key={article.id}
              href={article.article_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-3 group hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                  {article.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{article.publisher.name}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {formatDateTime(article.published_utc)}
                  </span>
                  <Badge variant="outline" className={`text-xs py-0 h-4 ${SENTIMENT_STYLES[sentiment]}`}>
                    {sentiment}
                  </Badge>
                </div>
              </div>
              <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          )
        })}
      </CardContent>
    </Card>
  )
}
