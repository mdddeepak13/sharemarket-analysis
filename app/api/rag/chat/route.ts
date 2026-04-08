import { NextRequest } from 'next/server'
import { z } from 'zod'
import { generateEmbedding } from '@/lib/rag/embeddings'
import { querySimilar } from '@/lib/rag/pinecone'
import { buildRAGSystemPrompt, buildRAGUserPrompt } from '@/lib/ai/prompts'
import { createRAGStream } from '@/lib/ai/claude'

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  ticker: z.string().max(10).toUpperCase().optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400 })
  }
  const { message, ticker } = parsed.data

  try {
    // Retrieve relevant context from Pinecone
    const embedding = await generateEmbedding(message)
    const matches = await querySimilar(embedding, 5, ticker ? { ticker } : undefined)

    const context = matches
      .map((m, i) => `[${i + 1}] ${m.metadata.title} (${m.metadata.source}, ${m.metadata.publishedAt?.split('T')[0]})\n${m.metadata.text}`)
      .join('\n\n')

    const systemPrompt = buildRAGSystemPrompt()
    const userPrompt = buildRAGUserPrompt(message, context, ticker)

    const stream = createRAGStream(systemPrompt, userPrompt)

    // Return the stream as a text stream response
    const textStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        // First send sources as a JSON event
        const sources = matches.map(m => ({
          title: m.metadata.title,
          source: m.metadata.source,
          url: m.metadata.url,
          date: m.metadata.publishedAt,
          relevance: m.score,
        }))
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`))

        // Stream the text
        for await (const chunk of (await stream).textStream) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`))
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    return new Response(textStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (err) {
    console.error('[rag/chat] error=%s', err)
    return new Response(JSON.stringify({ error: 'Failed to process query' }), { status: 502 })
  }
}
