import { generateEmbedding, chunkText } from './embeddings'
import { upsertDocuments, type DocumentMetadata } from './pinecone'
import type { NewsArticle } from '@/lib/polygon/types'

export async function ingestNewsArticles(articles: NewsArticle[], ticker: string) {
  const documents: Array<{ id: string; embedding: number[]; metadata: DocumentMetadata }> = []

  for (const article of articles) {
    const text = [article.title, article.description ?? ''].join(' ')
    const chunks = chunkText(text)

    for (let i = 0; i < chunks.length; i++) {
      const id = `news-${article.id}-chunk-${i}`
      const embedding = await generateEmbedding(chunks[i])
      documents.push({
        id,
        embedding,
        metadata: {
          ticker,
          title: article.title,
          source: article.publisher.name,
          url: article.article_url,
          publishedAt: article.published_utc,
          type: 'news',
          chunk: i,
          text: chunks[i].slice(0, 1000),
        },
      })
    }
  }

  if (documents.length > 0) {
    await upsertDocuments(documents)
  }
  return documents.length
}

export async function ingestPlainText(
  text: string,
  metadata: Omit<DocumentMetadata, 'chunk' | 'text'>,
  idPrefix: string,
) {
  const chunks = chunkText(text)
  const documents: Array<{ id: string; embedding: number[]; metadata: DocumentMetadata }> = []

  for (let i = 0; i < chunks.length; i++) {
    const embedding = await generateEmbedding(chunks[i])
    documents.push({
      id: `${idPrefix}-chunk-${i}`,
      embedding,
      metadata: { ...metadata, chunk: i, text: chunks[i].slice(0, 1000) } as DocumentMetadata,
    })
  }

  if (documents.length > 0) {
    await upsertDocuments(documents)
  }
  return documents.length
}
