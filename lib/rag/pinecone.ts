import { Pinecone, type RecordMetadata } from '@pinecone-database/pinecone'

let _client: Pinecone | null = null

export function getPineconeClient(): Pinecone {
  if (!_client) {
    _client = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! })
  }
  return _client
}

export function getIndex() {
  return getPineconeClient().index(process.env.PINECONE_INDEX_NAME ?? 'sharmarket-rag')
}

export interface DocumentMetadata extends RecordMetadata {
  ticker: string
  title: string
  source: string
  url: string
  publishedAt: string
  type: 'news' | 'filing' | 'earnings'
  chunk: number
  text: string
}

export async function upsertDocuments(
  documents: Array<{ id: string; embedding: number[]; metadata: DocumentMetadata }>,
) {
  const index = getIndex()
  const records = documents.map(doc => ({
    id: doc.id,
    values: doc.embedding,
    metadata: doc.metadata,
  }))

  // Pinecone v7 upsert requires { records: PineconeRecord[] }
  for (let i = 0; i < records.length; i += 100) {
    await index.upsert({ records: records.slice(i, i + 100) })
  }
}

export async function querySimilar(
  embedding: number[],
  topK = 5,
  filter?: { ticker?: string; type?: string },
): Promise<Array<{ id: string; score: number; metadata: DocumentMetadata }>> {
  const index = getIndex()
  const result = await index.query({
    vector: embedding,
    topK,
    includeMetadata: true,
    filter: filter ? buildFilter(filter) : undefined,
  })

  return (result.matches ?? []).map(m => ({
    id: m.id,
    score: m.score ?? 0,
    metadata: m.metadata as unknown as DocumentMetadata,
  }))
}

function buildFilter(filter: { ticker?: string; type?: string }): Record<string, unknown> {
  const conditions: Record<string, unknown> = {}
  if (filter.ticker) conditions.ticker = { $eq: filter.ticker }
  if (filter.type) conditions.type = { $eq: filter.type }
  return conditions
}
