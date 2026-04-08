import { embed } from 'ai'

// Use a gateway-routed embedding model
const EMBEDDING_MODEL = 'openai/text-embedding-3-small'

export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: EMBEDDING_MODEL,
    value: text.slice(0, 8000), // token safety limit
  })
  return embedding
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const results = await Promise.all(texts.map(t => generateEmbedding(t)))
  return results
}

export function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const words = text.split(/\s+/)
  const chunks: string[] = []
  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    chunks.push(words.slice(i, i + chunkSize).join(' '))
    if (i + chunkSize >= words.length) break
  }
  return chunks.filter(c => c.trim().length > 50)
}
