import type { GeminiMessage } from '../types'
import type { NormalizedMessage } from '../normalized'

/**
 * Convert internal message to Gemini format
 */
export function toGeminiMessage(
  message: NormalizedMessage,
): GeminiMessage {
  return {
    role: message.role === 'assistant' ? 'model' : message.role,
    parts: [{ text: message.content }],
  }
}

/**
 * Convert Gemini response to internal format
 */
export function fromGeminiMessage(
  geminiMessage: GeminiMessage,
): NormalizedMessage {
  return {
    role: geminiMessage.role === 'model' ? 'assistant' : (geminiMessage.role as 'user' | 'system'),
    content: geminiMessage.parts[0].text,
    timestamp: new Date(),
  }
}