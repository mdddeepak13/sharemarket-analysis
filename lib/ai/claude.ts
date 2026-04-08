import { generateText, streamText } from 'ai'

// Model routed through Vercel AI Gateway — note dot-notation for version
export const CLAUDE_MODEL = 'anthropic/claude-sonnet-4.6'
export const CLAUDE_FAST_MODEL = 'anthropic/claude-haiku-4.5'

export async function generateAnalysisReport(prompt: string): Promise<string> {
  const { text } = await generateText({
    model: CLAUDE_MODEL,
    maxOutputTokens: 1024,
    prompt,
    providerOptions: {
      gateway: { tags: ['feature:analysis', 'env:production'] },
    },
  })
  return text
}

export async function analyzeSentiment(prompt: string): Promise<{
  score: number
  label: string
  summary: string
}> {
  const { text } = await generateText({
    model: CLAUDE_FAST_MODEL,
    maxOutputTokens: 256,
    prompt,
    providerOptions: {
      gateway: { tags: ['feature:sentiment'] },
    },
  })
  try {
    return JSON.parse(text)
  } catch {
    return { score: 0, label: 'neutral', summary: text }
  }
}

export function createRAGStream(systemPrompt: string, userPrompt: string) {
  return streamText({
    model: CLAUDE_MODEL,
    maxOutputTokens: 1024,
    system: systemPrompt,
    prompt: userPrompt,
    providerOptions: {
      gateway: { tags: ['feature:rag-chat'] },
    },
  })
}
