import type { GeminiClient } from '@/lib/external/gemini/client'
import type { ConversationRepo } from '@/lib/db/ConversationRepo'
import type { NormalizedMessage } from '@/lib/external/gemini/normalized'
import { extractAyahReferences, extractTafsirNames } from '@/lib/external/gemini/utils/extractors'
import {
  GeminiServiceError,
  GeminiRateLimitError,
  GeminiValidationError,
} from '@/lib/external/gemini/types'

const DEFAULT_MEMORY_WINDOW = 10 // Last 10 messages

/**
 * Gemini AI Service Layer
 * 
 * Responsibilities:
 * - Enforce 10-message memory window
 * - Fetch conversation history from repository
 * - Save new messages to database
 * - Delegate to client for AI generation
 * 
 * Does NOT handle system prompt (client layer enforces)
 */
export class GeminiService {
  constructor(
    private client: GeminiClient,
    private repo: ConversationRepo,
    private memoryWindow: number = DEFAULT_MEMORY_WINDOW,
  ) {}

  /**
   * Generate AI response with conversation context
   * 
   * @param conversationId - Conversation UUID
   * @param userMessage - New user message
   * @returns AI-generated response
   * 
   * @throws {GeminiServiceError} On service-level errors
   * 
   * @example
   * const response = await service.generateResponse(
   *   'conv-uuid',
   *   'What does the Quran say about patience?'
   * )
   */
  async generateResponse(
    conversationId: string,
    userMessage: string,
  ): Promise<NormalizedMessage> {
    try {
      // 1. Fetch last N messages from database
      const history = await this.repo.getRecentMessages(
        conversationId,
        this.memoryWindow,
      )

      // 2. Append new user message
      const newUserMessage: NormalizedMessage = {
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      }

      await this.repo.saveMessage(conversationId, newUserMessage)

      // 3. Build context (last N messages + new message)
      const context = [...history, newUserMessage]

      // 4. Generate AI response (client enforces system prompt)
      const aiResponse = await this.client.generateResponse(context)

      // 5. Exract metadata from AI response
      aiResponse.ayahReferences = extractAyahReferences(aiResponse.content)
      aiResponse.tafsirUsed = extractTafsirNames(aiResponse.content)
      
      // 6. Save messages
      await this.repo.saveMessage(conversationId, aiResponse)

      return aiResponse
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * Map client errors to service errors
   */
  private handleError(error: unknown): never {
    const e = error as Error
    if (e instanceof GeminiRateLimitError || e.name === 'GeminiRateLimitError') {
      throw new GeminiServiceError('Rate limit exceeded', 'RATE_LIMIT')
    }

    if (error instanceof GeminiValidationError) {
      throw new GeminiServiceError('Validation failed', 'VALIDATION')
    }

    console.error('[GeminiService] Unexpected error:', error)
    throw new GeminiServiceError('Unknown error', 'UNKNOWN')
  }
}