import { POST } from './route'
import { createGeminiService } from '@/lib/services/gemini'
import { GeminiServiceError } from '@/lib/external/gemini/types'
import type { NormalizedMessage } from '@/lib/external/gemini/normalized'
import { requireAuth } from '@/lib/api/auth'
import { AuthError } from '@/lib/api/errors'

// TODO: standardize all route errors using ApiError classes

const mockService = {
    generateResponse: jest.fn(),
  }
  const mockSingle = jest.fn()
  const mockEq2 = jest.fn(() => ({ single: mockSingle })) // Returns object with STABLE mockSingle
  const mockEq1 = jest.fn(() => ({ eq: mockEq2 }))       // Returns object with STABLE mockEq2
  const mockSelect = jest.fn(() => ({ eq: mockEq1 }))
  const mockFrom = jest.fn(() => ({ select: mockSelect }))

  const mockSupabase = {
    from: mockFrom,
  }

  // 2. Mock Dependencies
jest.mock('@/lib/services/gemini', () => ({
  createGeminiService: jest.fn(),
}))

jest.mock('@/lib/api/auth', () => ({
  requireAuth: jest.fn(),
}))

describe('/api/ai/chat route', () => {
  // mock service!
  const mockGenerateResponse = jest.fn()
  const mockGeminiService = {
    generateResponse: mockGenerateResponse,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // hook up service factory
    ;(createGeminiService as jest.Mock).mockReturnValue(mockGeminiService)
    
    // auth needs to return raw supabase
    ;(requireAuth as jest.Mock).mockResolvedValue({
      user: {id: 'test-user123'},
      supabase: mockSupabase
    })
    
    // default behavior to found convo
    mockSingle.mockResolvedValue({
      data: {id: 'conv-123', user_id: 'test-user-123'},
      error: null,
    })
  })

  // ==========================================
  // HELPER: Create Mock Request
  // ==========================================

  async function createRequest(body: unknown) {
    return new Request('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body),
    })
  }

  // ==========================================
  // Fixtures
  // ==========================================
  
  const fixtures = {
    conversation: {
      valid: '550e8400-e29b-41d4-a716-446655440000',
      otherUser: '550e8400-e29b-41d4-a716-446655440001',
      invalid: 'not-a-uuid',
    },
  }

  // ==========================================
  // 1. HAPPY PATH (Data Flow)
  // ==========================================

  describe('Happy Path - AI Response Generation', () => {
    it('should generate AI response and return enriched message', async () => {
      const mockAIResponse: NormalizedMessage = {
        // id: 'msg-123',
        // conversationId: fixtures.conversation.valid: '550e8400-e29b-41d4-a716-446655440000',
        role: 'assistant',
        content: 'Patience (sabr) is mentioned frequently in the Quran. For example, in Surah Al-Baqarah (2:153)...',
        ayahReferences: ['2:153'],
        tafsirUsed: ['Tafsir Ibn Kathir'],
        timestamp: new Date(),
      }

      mockGenerateResponse.mockResolvedValueOnce(mockAIResponse)
      
      const request = await createRequest({
        conversationId: fixtures.conversation.valid,
        message: 'Tell me about patience in the Quran',
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe(mockAIResponse.content)
      expect(data.ayahReferences).toEqual(['2:153'])

      expect(mockGenerateResponse).toHaveBeenCalledWith(fixtures.conversation.valid, 'Tell me about patience in the Quran')
    })

    it('should handle AI response with no ayah references', async () => {
      const mockAIResponse: NormalizedMessage = {
        // id: 'msg-456',
        // conversationId: fixtures.conversation.valid: '550e8400-e29b-41d4-a716-446655440000',
        role: 'assistant',
        content: 'I understand your question. Let me help you explore this topic.',
        ayahReferences: [],
        tafsirUsed: [],
        timestamp: new Date()
        // createdAt: new Date(),
      }

      mockGenerateResponse.mockResolvedValueOnce(mockAIResponse)

      const request = await createRequest({
        conversationId: fixtures.conversation.valid,
        message: 'Can you help me?',
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ayahReferences).toEqual([])
      expect(data.tafsirUsed).toEqual([])
    })
  })

  // ==========================================
  // 2. INPUT VALIDATION (Fail-Fast)
  // ==========================================

  describe('Input Validation', () => {
    it('should return 400 for missing conversationId', async () => {
      const request = await createRequest({
        message: 'Test message',
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
      expect(mockGenerateResponse).not.toHaveBeenCalled()
    })

    it('should return 400 for invalid conversationId format', async () => {
      const request = await createRequest({
        conversationId: fixtures.conversation.invalid,
        message: 'Test message',
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid conversation ID')
      expect(mockGenerateResponse).not.toHaveBeenCalled()
    })

    it('should return 400 for missing message', async () => {
      const request = await createRequest({
        conversationId: fixtures.conversation.valid,
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
      expect(mockGenerateResponse).not.toHaveBeenCalled()
    })

    it('should return 400 for empty message', async () => {
      const request = await createRequest({
        conversationId: fixtures.conversation.valid,
        message: '   ',
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
      expect(mockGenerateResponse).not.toHaveBeenCalled()
    })

    it('should return 400 for message exceeding max length', async () => {
      const request = await createRequest({
        conversationId: fixtures.conversation.valid,
        message: 'a'.repeat(5001),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
      expect(mockGenerateResponse).not.toHaveBeenCalled()
    })

    it('should return 400 for conversation owned by another user', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Row not found' },
      })
      
      const request = await createRequest({
        conversationId: fixtures.conversation.otherUser, // Different conversation
        message: 'Test message',
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Conversation not found or unauthorized')
      expect(mockGenerateResponse).not.toHaveBeenCalled()
    })
  })

  // ==========================================
  // 3. ERROR TRANSLATION & STATUS MAPPING
  // ==========================================

  describe('Error Translation from Service Layer', () => {
    it('should return 429 for rate limit errors', async () => {
      mockGenerateResponse.mockRejectedValueOnce(
        new GeminiServiceError('Rate limit exceeded', 'RATE_LIMIT'),
      )

      const request = await createRequest({
        conversationId: fixtures.conversation.valid,
        message: 'Test message',
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toContain('Rate limit exceeded')
    })

    it('should return 500 for validation errors from service', async () => {
      mockGenerateResponse.mockRejectedValueOnce(
        new GeminiServiceError('Invalid response format', 'VALIDATION'),
      )

      const request = await createRequest({
        conversationId: fixtures.conversation.valid,
        message: 'Test message',
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })

    it('should return 500 for API key errors', async () => {
      mockGenerateResponse.mockRejectedValueOnce(
        new GeminiServiceError('Invalid', 'VALIDATION'),
      )

      const request = await createRequest({
        conversationId: fixtures.conversation.valid,
        message: 'Test message',
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })

    it('should return 500 for timeout errors', async () => {
      mockGenerateResponse.mockRejectedValueOnce(
        new GeminiServiceError('Request timed out', 'TIMEOUT'),
      )

      const request = await createRequest({
        conversationId: fixtures.conversation.valid,
        message: 'Test message',
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })

    it('should return 500 for unknown service errors', async () => {
      mockGenerateResponse.mockRejectedValueOnce(
        new GeminiServiceError('Unknown error', 'UNKNOWN'),
      )

      const request = await createRequest({
        conversationId: fixtures.conversation.valid,
        message: 'Test message',
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })

    it('should return 500 for unexpected errors', async () => {
      mockGenerateResponse.mockRejectedValueOnce(
        new Error('Unexpected error'),
      )

      const request = await createRequest({
        conversationId: fixtures.conversation.valid,
        message: 'Test message',
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })
  })

  // ==========================================
  // 4. ARGUMENT PASSING (Service Called Correctly)
  // ==========================================

  describe('Argument Passing to Service', () => {
    it('should pass correct conversationId and message to service', async () => {
      mockGenerateResponse.mockResolvedValueOnce({
        id: 'msg-123',
        conversationId: fixtures.conversation.valid,
        role: 'assistant',
        content: 'Response',
        ayahReferences: [],
        tafsirUsed: [],
        createdAt: new Date(),
      } as NormalizedMessage)

      const request = await createRequest({
        conversationId: fixtures.conversation.valid,
        message: 'What is sabr?',
      })

      await POST(request as any)

      expect(mockGenerateResponse).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        'What is sabr?',
      )
    })

    it('should trim message whitespace before passing to service', async () => {
      mockGenerateResponse.mockResolvedValueOnce({
        id: 'msg-456',
        conversationId: fixtures.conversation.valid,
        role: 'assistant',
        content: 'Response',
        ayahReferences: [],
        tafsirUsed: [],
        createdAt: new Date(),
      } as NormalizedMessage)

      const request = await createRequest({
        conversationId: fixtures.conversation.valid,
        message: '  Tell me about taqwa  ',
      })

      await POST(request as any)

      expect(mockGenerateResponse).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        'Tell me about taqwa',
      )
    })

    it('should pass authenticated Supabase client to service factory', async () => {
      mockGenerateResponse.mockResolvedValueOnce({
        id: 'msg-789',
        conversationId: fixtures.conversation.valid,
        role: 'assistant',
        content: 'Response',
        ayahReferences: [],
        tafsirUsed: [],
        createdAt: new Date(),
      } as NormalizedMessage)

      const request = await createRequest({
        conversationId: fixtures.conversation.valid,
        message: 'Test',
      })

      await POST(request as any)

      expect(createGeminiService).toHaveBeenCalledWith(expect.any(Object))
    })
  })

  // ==========================================
  // 5. AUTHENTICATION & AUTHORIZATION
  // ==========================================

  describe('Authentication & Authorization', () => {
    it('should require authentication', async () => {
      
      (requireAuth as jest.Mock).mockRejectedValueOnce(
        new AuthError('Unauthorized')
      )

      const unauthRequest = new Request('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: fixtures.conversation.valid,
          message: 'Test',
        }),
      })

      const response = await POST(unauthRequest as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBeDefined()
      expect(mockGenerateResponse).not.toHaveBeenCalled()
    })
  })
})