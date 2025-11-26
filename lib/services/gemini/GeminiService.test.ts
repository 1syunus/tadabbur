import { GeminiService } from './GeminiService'
import { GeminiClient } from '@/lib/external/gemini/client'
import { ConversationRepo } from '@/lib/db/ConversationRepo'
import {
  GeminiServiceError,
  GeminiRateLimitError,
  GeminiValidationError,
} from '@/lib/external/gemini/types'
import type { NormalizedMessage } from '@/lib/external/gemini/normalized'

// Mock dependencies
jest.mock('@/lib/external/gemini/client')
jest.mock('@/lib/db/ConversationRepo')

describe('GeminiService - Unit Tests', () => {
  let service: GeminiService
  let mockClient: jest.Mocked<GeminiClient>
  let mockRepo: jest.Mocked<ConversationRepo>

  beforeEach(() => {
    jest.clearAllMocks()

    // Create mock instances
    mockClient = {
      generateResponse: jest.fn(),
    } as any

    mockRepo = {
      getRecentMessages: jest.fn(),
      saveMessage: jest.fn(),
    } as any

    // Instantiate service with mocked dependencies
    service = new GeminiService(mockClient, mockRepo, 10)
  })

  // ==========================================
  // HAPPY PATH - Orchestration
  // ==========================================

  describe('Happy Path - Message Flow', () => {
    it('should fetch history, generate response, and save both messages', async () => {
      const mockHistory: NormalizedMessage[] = [
        {
          role: 'user',
          content: 'Previous message',
          timestamp: new Date(),
        },
      ]

      const mockAIResponse: NormalizedMessage = {
        role: 'assistant',
        content: 'According to [2:255], patience is mentioned in Tafsir Ibn Kathir...',
        timestamp: new Date(),
      }

      mockRepo.getRecentMessages.mockResolvedValueOnce(mockHistory)
      mockClient.generateResponse.mockResolvedValueOnce(mockAIResponse)
      mockRepo.saveMessage.mockResolvedValue(undefined)

      const result = await service.generateResponse('conv-123', 'Tell me about patience')

      // Verify order of operations
      expect(mockRepo.getRecentMessages).toHaveBeenCalledWith('conv-123', 10)
      expect(mockClient.generateResponse).toHaveBeenCalledTimes(1)
      expect(mockRepo.saveMessage).toHaveBeenCalledTimes(2) // User + AI

      // Verify metadata extraction
      expect(result.ayahReferences).toEqual(['2:255'])
      expect(result.tafsirUsed).toEqual(['Ibn Kathir'])
    })

    it('should include conversation history in context', async () => {
      const mockHistory: NormalizedMessage[] = [
        { role: 'user', content: 'First', timestamp: new Date() },
        { role: 'assistant', content: 'Response 1', timestamp: new Date() },
        { role: 'user', content: 'Second', timestamp: new Date() },
      ]

      mockRepo.getRecentMessages.mockResolvedValueOnce(mockHistory)
      mockClient.generateResponse.mockResolvedValueOnce({
        role: 'assistant',
        content: 'Response',
        timestamp: new Date(),
      })
      mockRepo.saveMessage.mockResolvedValue(undefined)

      await service.generateResponse('conv-123', 'Third message')

      const contextArg = mockClient.generateResponse.mock.calls[0][0]
      expect(contextArg).toHaveLength(4) // 3 history + 1 new
      expect(contextArg[3].content).toBe('Third message')
    })
  })

  // ==========================================
  // MEMORY WINDOW ENFORCEMENT
  // ==========================================

  describe('Memory Window', () => {
    it('should enforce 10-message limit', async () => {
      mockRepo.getRecentMessages.mockResolvedValueOnce([])
      mockClient.generateResponse.mockResolvedValueOnce({
        role: 'assistant',
        content: 'Response',
        timestamp: new Date(),
      })
      mockRepo.saveMessage.mockResolvedValue(undefined)

      await service.generateResponse('conv-123', 'Test')

      expect(mockRepo.getRecentMessages).toHaveBeenCalledWith('conv-123', 10)
    })

    it('should use custom memory window if configured', async () => {
      const customService = new GeminiService(mockClient, mockRepo, 5)

      mockRepo.getRecentMessages.mockResolvedValueOnce([])
      mockClient.generateResponse.mockResolvedValueOnce({
        role: 'assistant',
        content: 'Response',
        timestamp: new Date(),
      })
      mockRepo.saveMessage.mockResolvedValue(undefined)

      await customService.generateResponse('conv-123', 'Test')

      expect(mockRepo.getRecentMessages).toHaveBeenCalledWith('conv-123', 5)
    })
  })

  // ==========================================
  // METADATA EXTRACTION
  // ==========================================

  describe('Metadata Extraction', () => {
    it('should extract multiple ayah references', async () => {
      mockRepo.getRecentMessages.mockResolvedValueOnce([])
      mockClient.generateResponse.mockResolvedValueOnce({
        role: 'assistant',
        content: 'See [2:255] and [3:159] and Surah 4, verse 1',
        timestamp: new Date(),
      })
      mockRepo.saveMessage.mockResolvedValue(undefined)

      const result = await service.generateResponse('conv-123', 'Test')

      expect(result.ayahReferences).toEqual(['2:255', '3:159', '4:1'])
    })

    it('should extract multiple tafsir names', async () => {
      mockRepo.getRecentMessages.mockResolvedValueOnce([])
      mockClient.generateResponse.mockResolvedValueOnce({
        role: 'assistant',
        content: 'Tafsir Ibn Kathir and al-Jalalayn both mention...',
        timestamp: new Date(),
      })
      mockRepo.saveMessage.mockResolvedValue(undefined)

      const result = await service.generateResponse('conv-123', 'Test')

      expect(result.tafsirUsed).toContain('Ibn Kathir')
      expect(result.tafsirUsed).toContain('al-Jalalayn')
    })

    it('should handle responses with no metadata', async () => {
      mockRepo.getRecentMessages.mockResolvedValueOnce([])
      mockClient.generateResponse.mockResolvedValueOnce({
        role: 'assistant',
        content: 'General response without references',
        timestamp: new Date(),
      })
      mockRepo.saveMessage.mockResolvedValue(undefined)

      const result = await service.generateResponse('conv-123', 'Test')

      expect(result.ayahReferences).toEqual([])
      expect(result.tafsirUsed).toEqual([])
    })
  })

  // ==========================================
  // ERROR MAPPING
  // ==========================================

  describe('Error Translation', () => {
    it('should map GeminiRateLimitError → RATE_LIMIT', async () => {
      mockRepo.getRecentMessages.mockResolvedValueOnce([])
      mockClient.generateResponse.mockRejectedValueOnce(new GeminiRateLimitError())

      await expect(service.generateResponse('conv-123', 'Test')).rejects.toThrow(
        GeminiServiceError
      )
    })

    it('should map GeminiValidationError → VALIDATION', async () => {
      mockRepo.getRecentMessages.mockResolvedValueOnce([])
      mockClient.generateResponse.mockRejectedValueOnce(
        new GeminiValidationError('Invalid')
      )

      try {
        await service.generateResponse('conv-123', 'Test')
      } catch (error: any) {
        expect(error).toBeInstanceOf(GeminiServiceError)
        expect(error.code).toBe('VALIDATION')
      }
    })

    it('should map unknown errors → UNKNOWN', async () => {
      mockRepo.getRecentMessages.mockResolvedValueOnce([])
      mockClient.generateResponse.mockRejectedValueOnce(new Error('Random error'))

      try {
        await service.generateResponse('conv-123', 'Test')
      } catch (error: any) {
        expect(error.code).toBe('UNKNOWN')
      }
    })
  })

  // ==========================================
  // ORDER OF OPERATIONS
  // ==========================================

  describe('Operation Order', () => {
    it('should save messages in correct order (user first, then AI)', async () => {
      const saveCallOrder: string[] = []

      mockRepo.getRecentMessages.mockResolvedValueOnce([])
      mockClient.generateResponse.mockResolvedValueOnce({
        role: 'assistant',
        content: 'Response',
        timestamp: new Date(),
      })
      mockRepo.saveMessage.mockImplementation(async (_convId, message) => {
        saveCallOrder.push(message.role)
      })

      await service.generateResponse('conv-123', 'Test')

      expect(saveCallOrder).toEqual(['user', 'assistant'])
    })

    it('should save user message if AI generation fails', async () => {
      mockRepo.getRecentMessages.mockResolvedValueOnce([])
      mockClient.generateResponse.mockRejectedValueOnce(new Error('AI failed'))

      try {
        await service.generateResponse('conv-123', 'Test')
      } catch {
        // Expected
      }

      // User message should not have been saved
      expect(mockRepo.saveMessage).toHaveBeenCalledTimes(1)
      expect(mockRepo.saveMessage).toHaveBeenCalledWith('conv-123', expect.objectContaining({
          role: 'user',
          content: 'Test'
      }))
    })
  })

  // ==========================================
  // EDGE CASES
  // ==========================================

  describe('Edge Cases', () => {
    it('should handle empty conversation history', async () => {
      mockRepo.getRecentMessages.mockResolvedValueOnce([])
      mockClient.generateResponse.mockResolvedValueOnce({
        role: 'assistant',
        content: 'First response',
        timestamp: new Date(),
      })
      mockRepo.saveMessage.mockResolvedValue(undefined)

      const result = await service.generateResponse('conv-123', 'First message')

      expect(result).toBeDefined()
      expect(mockRepo.saveMessage).toHaveBeenCalledTimes(2)
    })

    it('should handle very long user messages', async () => {
      const longMessage = 'a'.repeat(5000)

      mockRepo.getRecentMessages.mockResolvedValueOnce([])
      mockClient.generateResponse.mockResolvedValueOnce({
        role: 'assistant',
        content: 'Response',
        timestamp: new Date(),
      })
      mockRepo.saveMessage.mockResolvedValue(undefined)

      await service.generateResponse('conv-123', longMessage)

      const userMessageArg = mockRepo.saveMessage.mock.calls[0][1]
      expect(userMessageArg.content).toHaveLength(5000)
    })
  })
})