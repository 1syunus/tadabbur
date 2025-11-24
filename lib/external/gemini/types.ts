import { z } from 'zod'

// ==========================================
// GEMINI API TYPES
// ==========================================

/**
 * Message role in Gemini API
 */
export const GeminiRoleSchema = z.enum(['user', 'model', 'system'])
export type GeminiRole = z.infer<typeof GeminiRoleSchema>

/**
 * Message content in Gemini API
 */
export const GeminiMessageSchema = z.object({
  role: GeminiRoleSchema,
  parts: z.array(
    z.object({
      text: z.string(),
    }),
  ),
})
export type GeminiMessage = z.infer<typeof GeminiMessageSchema>

/**
 * Gemini API response
 */
export const GeminiResponseSchema = z.object({
  candidates: z.array(
    z.object({
      content: z.object({
        parts: z.array(
          z.object({
            text: z.string(),
          }),
        ),
        role: z.string(),
      }),
      finishReason: z.string().optional(),
      safetyRatings: z.array(z.any()).optional(),
    }),
  ),
  promptFeedback: z
    .object({
      safetyRatings: z.array(z.any()).optional(),
    })
    .optional(),
})
export type GeminiResponse = z.infer<typeof GeminiResponseSchema>

// ==========================================
// ERROR CLASSES
// ==========================================

export class GeminiAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public cause?: Error,
  ) {
    super(message)
    this.name = 'GeminiAPIError'
  }
}

export class GeminiRateLimitError extends GeminiAPIError {
  constructor(cause?: Error) {
    super('Gemini API rate limit exceeded', 429, cause)
    this.name = 'GeminiRateLimitError'
  }
}

export class GeminiValidationError extends GeminiAPIError {
  constructor(message: string, cause?: Error) {
    super(message, undefined, cause)
    this.name = 'GeminiValidationError'
  }
}

export class GeminiServiceError extends Error {
  constructor(
    message: string,
    public code: 'RATE_LIMIT' | 'VALIDATION' | 'TIMEOUT' | 'UNKNOWN',
  ) {
    super(message)
    this.name = 'GeminiServiceError'
  }
}

// ==========================================
// CONFIGURATION
// ==========================================

export interface GeminiClientConfig {
  apiKey: string
  model?: string
  temperature?: number
  maxOutputTokens?: number
  timeout?: number
  retryAttempts?: number
  retryDelay?: number
}