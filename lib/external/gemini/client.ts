import { SYSTEM_PROMPT, validateSystemPrompt } from './prompt'
import { toGeminiMessage, fromGeminiMessage } from './normalizers/message'
import type { NormalizedMessage } from './normalized'
import {
  GeminiResponseSchema,
  GeminiAPIError,
  GeminiRateLimitError,
  GeminiValidationError,
  type GeminiClientConfig,
  type GeminiMessage,
} from './types'

const DEFAULT_MODEL = 'gemini-1.5-flash'
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

/**
 * Low-level Gemini API client
 * 
 * CRITICAL: This layer enforces the system prompt.
 * The service layer MUST NOT modify or omit the prompt.
 */
export class GeminiClient {
  private apiKey: string
  private model: string
  private temperature: number
  private maxOutputTokens: number
  private timeout: number
  private retryAttempts: number
  private retryDelay: number

  constructor(config: GeminiClientConfig) {
    validateSystemPrompt() // Ensure prompt is valid

    this.apiKey = config.apiKey
    this.model = config.model ?? DEFAULT_MODEL
    this.temperature = config.temperature ?? 0.7
    this.maxOutputTokens = config.maxOutputTokens ?? 2048
    this.timeout = config.timeout ?? 30000 // 30s
    this.retryAttempts = config.retryAttempts ?? 3
    this.retryDelay = config.retryDelay ?? 1000
  }

  /**
   * Generate AI response
   * 
   * CRITICAL: Automatically prepends system prompt
   * 
   * @param conversationHistory - Last N messages (service handles truncation)
   * @returns AI-generated response
   */
  async generateResponse(
    conversationHistory: NormalizedMessage[],
  ): Promise<NormalizedMessage> {
    // SECURITY: Prepend system prompt
    const systemMessage: NormalizedMessage = {
      role: 'system',
      content: SYSTEM_PROMPT,
    }

    const cleanHistory = conversationHistory.filter(msg => {
        const isSystem = msg.role === 'system'
        const isEmpty = !msg.content || msg.content.trim().length === 0
        return !isSystem && !isEmpty
    })

    const messages: GeminiMessage[] = [
      toGeminiMessage(systemMessage),
      ...cleanHistory.map(toGeminiMessage),
    ]

    const url = `${API_BASE}/${this.model}:generateContent?key=${this.apiKey}`

    let lastError: Error | null = null

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.timeout)

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: messages,
            generationConfig: {
              temperature: this.temperature,
              maxOutputTokens: this.maxOutputTokens,
            },
          }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        // Handle rate limiting
        if (response.status === 429) {
          throw new GeminiRateLimitError()
        }

        // Handle other errors
        if (!response.ok) {
          const errorText = await response.text()
          throw new GeminiAPIError(
            `Gemini API error: ${response.status} - ${errorText}`,
            Number(response.status),
            new Error(errorText)
          )
        }

        const data = await response.json()

        // Validate response
        let validated
        try {
          validated = GeminiResponseSchema.parse(data)
        } catch (error) {
          console.error('[GeminiClient] Invalid API response:', error)
          throw new GeminiValidationError('Invalid API response format', error as Error)
        }

        // Extract response message
        const candidate = validated.candidates[0]
        if (!candidate) {
          throw new GeminiValidationError('No response generated')
        }

        if (candidate.finishReason && candidate.finishReason !== 'STOP') {
            throw new GeminiAPIError(`Gemini blocked response: ${candidate.finishReason}`)
        }

        const geminiMessage: GeminiMessage = {
          role: 'model',
          parts: candidate.content.parts,
        }

        return fromGeminiMessage(geminiMessage)
      } catch (error) {

        if (error instanceof DOMException && error.name === 'AbortError') {
            throw new GeminiAPIError('Request aborted (timeout)', 408)
        }

        lastError = error as Error

        // Don't retry rate limits or validation errors
        if (
          error instanceof GeminiRateLimitError ||
          error instanceof GeminiValidationError ||
          (error instanceof GeminiAPIError && error.message.includes('blocked'))
        ) {
          throw error
        }

        // Don't retry on 4xx errors
        if (error instanceof GeminiAPIError && error.status && error.status >= 400 && error.status < 500) {
             throw error
        }

        // Exponential backoff for retries
        if (attempt < this.retryAttempts - 1) {
          const delay = this.retryDelay * Math.pow(2, attempt)
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }
      }
    }

    throw lastError || new GeminiAPIError('Unknown error')
  }
}

/**
 * Factory function
 */
export function createGeminiClient(config: GeminiClientConfig): GeminiClient {
  return new GeminiClient(config)
}