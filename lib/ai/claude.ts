import { generateText, streamText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'

function getModel(fast = false) {
  const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  return anthropic(fast ? 'claude-haiku-4-5' : 'claude-sonnet-4-5')
}

export async function generateAnalysisReport(prompt: string): Promise<string> {
  const { text } = await generateText({
    model: getModel(),
    maxOutputTokens: 1024,
    prompt,
  })
  return text
}

export async function analyzeSentiment(prompt: string): Promise<{
  score: number
  label: string
  summary: string
}> {
  const { text } = await generateText({
    model: getModel(true),
    maxOutputTokens: 256,
    prompt,
  })
  try {
    return JSON.parse(text)
  } catch {
    return { score: 0, label: 'neutral', summary: text }
  }
}

interface ChatMessage { role: 'user' | 'assistant'; content: string }

export function createRAGStream(
  systemPrompt: string,
  userPrompt: string,
  history: ChatMessage[] = [],
) {
  const messages: ChatMessage[] = [
    ...history.slice(-10), // last 5 turns (10 messages) for context
    { role: 'user', content: userPrompt },
  ]

  return streamText({
    model: getModel(),
    maxOutputTokens: 1500,
    system: systemPrompt,
    messages,
  })
}
