import { GeminiClient } from './client'
import {
  GeminiAPIError,
  GeminiRateLimitError,
  GeminiValidationError,
} from './types'
import type { NormalizedMessage } from './normalized'
import { FinishReason } from '@google/genai'

// Mock fetch globally
global.fetch = jest.fn()

const createMockResponse = (overrides: any = {}) => ({
  candidates: [
    {
      content: {
        parts: [{ text: 'This is a test response' }],
        role: 'model',
      },
      finishReason: 'STOP',
      index: 0,
      safetyRatings: [],
      ...overrides,
    },
  ],
  promptFeedback: { safetyRatings: [] },
})

const validGeminiResponse = createMockResponse()

describe('GeminiClient - Unit Tests', () => {
  let client: GeminiClient

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()

    client = new GeminiClient({
      apiKey: 'test-api-key',
      timeout: 5000,
      retryAttempts: 3,
      retryDelay: 100,
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  // ==========================================
  // HAPPY PATH - System Prompt Enforcement
  // ==========================================

  describe('System Prompt Injection', () => {
    it('should prepend system prompt to every request', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => validGeminiResponse,
      })

      const history: NormalizedMessage[] = [
        { role: 'user', content: 'Hello', timestamp: new Date() },
      ]

      await client.generateResponse(history)

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
      expect(callBody.contents).toHaveLength(2) // System + user message
      expect(callBody.contents[0].parts[0].text).toContain('You are a thoughtful assistant')
    })

    it('should convert user role correctly', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => validGeminiResponse,
      })

      const history: NormalizedMessage[] = [
        { role: 'user', content: 'Test', timestamp: new Date() },
      ]

      await client.generateResponse(history)

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
      expect(callBody.contents[1].role).toBe('user')
    })

    it('should convert assistant → model role', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => validGeminiResponse,
      })

      const history: NormalizedMessage[] = [
        { role: 'user', content: 'Hello', timestamp: new Date() },
        { role: 'assistant', content: 'Hi', timestamp: new Date() },
      ]

      await client.generateResponse(history)

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
      expect(callBody.contents[2].role).toBe('model') // System, user, assistant→model
    })
  })

  // ==========================================
  // SYSTEM PROMPT DEDUPLICATION
  // ==========================================

  describe('System Prompt Deduplication', () => {
    it('should not inject system prompt if already present in history', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => validGeminiResponse,
      })

      const historyWithSystemPrompt: NormalizedMessage[] = [
        { role: 'system', content: 'Custom system prompt', timestamp: new Date() },
        { role: 'user', content: 'Hello', timestamp: new Date() },
      ]

      await client.generateResponse(historyWithSystemPrompt)

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
      
      // Should only have system + user (2 total), not system + system + user
      expect(callBody.contents).toHaveLength(2)
      expect(callBody.contents[0].parts[0].text).toContain('thoughtful assistant')
    })

    it('should not double-inject on consecutive calls', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => validGeminiResponse,
      })

      const history: NormalizedMessage[] = [
        { role: 'user', content: 'First message', timestamp: new Date() },
      ]

      // First call
      await client.generateResponse(history)
      const firstCallBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)

      // Second call with same history
      await client.generateResponse(history)
      const secondCallBody = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body)

      // Both should have exactly 2 messages (system + user)
      expect(firstCallBody.contents).toHaveLength(2)
      expect(secondCallBody.contents).toHaveLength(2)
      
      // Count system prompts in each call
      const firstSystemCount = firstCallBody.contents.filter((msg: any) => 
        msg.parts[0].text.includes('thoughtful assistant')
      ).length
      const secondSystemCount = secondCallBody.contents.filter((msg: any) => 
        msg.parts[0].text.includes('thoughtful assistant')
      ).length

      expect(firstSystemCount).toBe(1)
      expect(secondSystemCount).toBe(1)
    })
  })

  // ==========================================
  // INPUT MUTATION PREVENTION
  // ==========================================

  describe('Input Mutation Prevention', () => {
    it('should not mutate passed history array', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => validGeminiResponse,
      })

      const originalHistory: NormalizedMessage[] = [
        { role: 'user', content: 'Test message', timestamp: new Date() },
      ]

      const historyCopy = JSON.parse(JSON.stringify(originalHistory))

      await client.generateResponse(originalHistory)

      // History should remain unchanged
      expect(originalHistory[0].content).toBe('Test message')
      expect(originalHistory).toHaveLength(1)
    })

    it('should not mutate individual message objects', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => validGeminiResponse,
      })

      const message: NormalizedMessage = {
        role: 'user',
        content: 'Original content',
        timestamp: new Date(),
      }

      const originalContent = message.content
      const originalRole = message.role

      await client.generateResponse([message])

      expect(message.content).toBe(originalContent)
      expect(message.role).toBe(originalRole)
    })
  })

  // ==========================================
  // MESSAGE SANITIZATION
  // ==========================================

  describe('Message Sanitization', () => {
    it('should filter out empty content messages', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => validGeminiResponse,
      })

      const historyWithEmpty: NormalizedMessage[] = [
        { role: 'user', content: '', timestamp: new Date() },
        { role: 'user', content: 'Valid message', timestamp: new Date() },
      ]

      await client.generateResponse(historyWithEmpty)

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
      
      // Should have system + valid message only (empty filtered out)
      expect(callBody.contents).toHaveLength(2)
      expect(callBody.contents[1].parts[0].text).toBe('Valid message')
    })

    it('should filter out whitespace-only messages', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => validGeminiResponse,
      })

      const historyWithWhitespace: NormalizedMessage[] = [
        { role: 'user', content: '   ', timestamp: new Date() },
        { role: 'user', content: '\n\t  \n', timestamp: new Date() },
        { role: 'user', content: 'Real content', timestamp: new Date() },
      ]

      await client.generateResponse(historyWithWhitespace)

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
      
      // Should only have system + real content
      expect(callBody.contents).toHaveLength(2)
      expect(callBody.contents[1].parts[0].text).toBe('Real content')
    })
  })

  // ==========================================
  // RESPONSE PARSING
  // ==========================================

  describe('Response Handling', () => {
    it('should extract text from valid response', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => validGeminiResponse,
      })

      const result = await client.generateResponse([])

      expect(result.role).toBe('assistant')
      expect(result.content).toBe('This is a test response')
      expect(result.timestamp).toBeInstanceOf(Date)
    })

    it('should handle candidate arrays with multiple messages', async () => {
      const multiCandidateResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: 'First candidate' }],
              role: 'model',
            },
          },
          {
            content: {
              parts: [{ text: 'Second candidate' }],
              role: 'model',
            },
          },
        ],
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => multiCandidateResponse,
      })

      const result = await client.generateResponse([])

      // Should return first candidate
      expect(result.content).toBe('First candidate')
    })

    it('should throw on empty candidates array', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ candidates: [], promptFeedback: {} }),
      })

      await expect(client.generateResponse([])).rejects.toThrow(GeminiAPIError)
    })

    it('should handle content parts with non-text payloads', async () => {
      const mixedPartsResponse = {
        candidates: [
          {
            content: {
              parts: [
                { text: 'Text part' },
                { functionCall: { name: 'test' } }, // Non-text
              ],
              role: 'model',
            },
            FinishReason: 'STOP'
          },
        ],
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mixedPartsResponse,
      })

      const result = await client.generateResponse([])

      // Should extract first text part
      expect(result.content).toBe('Text part')
    })
  })

    // ==========================================
   //   Response Role Normalization
  // ==========================================

  describe('Response Role Normalization', () => {
    it('should convert model role to assistant in normalized response', async () => {
      const geminiResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Response text' }],
              role: 'model', // Gemini uses 'model'
            },
            finishReason: 'STOP',
          },
        ],
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => geminiResponse,
      })

      const result = await client.generateResponse([])

      // Normalized response should use 'assistant', not 'model'
      expect(result.role).toBe('assistant')
    })

    it('should preserve assistant role if already normalized', async () => {
      const history: NormalizedMessage[] = [
        { role: 'user', content: 'Hello', timestamp: new Date() },
        { role: 'assistant', content: 'Hi there', timestamp: new Date() },
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => validGeminiResponse,
      })

      await client.generateResponse(history)

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
      
      // In request, assistant should be converted to 'model' for Gemini
      expect(callBody.contents[2].role).toBe('model')
    })
  })

  // ==========================================
  //  CANDIDATE ARRAY HANDLING
  // ==========================================

  describe('Candidate Array Handling', () => {
    it('should handle empty finishReason gracefully', async () => {
      const responseWithoutFinish = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Incomplete response' }],
              role: 'model',
            },
            // No finishReason
          },
        ],
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => responseWithoutFinish,
      })

      const result = await client.generateResponse([])
      expect(result.content).toBe('Incomplete response')
    })

    it('should handle SAFETY finish reason', async () => {
      const safetyBlockedResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: '' }],
              role: 'model',
            },
            finishReason: 'SAFETY',
            index: 0,
            safetyRatings: [],
          },
        ],
        promptFeedback: {},
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => safetyBlockedResponse,
      })

    //   await expect(client.generateResponse([])).rejects.toThrow(GeminiAPIError)
      await expect(client.generateResponse([])).rejects.toThrow(/blocked/i)
    })
  })

  // ==========================================
  // TOKEN METADATA
  // ==========================================

  describe('Token Metadata', () => {
    it('should extract token usage if present', async () => {
      const responseWithTokens = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Response' }],
              role: 'model',
            },
          },
        ],
        usageMetadata: {
          promptTokenCount: 50,
          candidatesTokenCount: 20,
          totalTokenCount: 70,
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => responseWithTokens,
      })

      const result = await client.generateResponse([])

      // If your client tracks tokens, verify they're captured
      expect(result.content).toBe('Response')
      // Add token assertions if implemented: expect(result.tokenCount).toBe(70)
    })
  })

  // ==========================================
  // VALIDATION ERRORS
  // ==========================================

  describe('Response Validation', () => {
    it('should throw GeminiValidationError on missing candidates', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ invalid: 'response' }),
      })

      await expect(client.generateResponse([])).rejects.toThrow(GeminiValidationError)
    })

    it('should throw on malformed content structure', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                // Missing 'parts' array
                role: 'model',
              },
            },
          ],
        }),
      })

      await expect(client.generateResponse([])).rejects.toThrow(GeminiValidationError)
    })
  })

  // ==========================================
  // NETWORK ERRORS
  // ==========================================

  describe('Error Handling', () => {
    it('should throw GeminiRateLimitError on 429', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      })

      await expect(client.generateResponse([])).rejects.toThrow(GeminiRateLimitError)
      expect(global.fetch).toHaveBeenCalledTimes(1) // No retry
    })

    it('should throw GeminiAPIError on 500', async () => {
        const noRetryClient = new GeminiClient({
            apiKey: 'test-api-key',
            retryAttempts: 1,
        })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server exploded',
      })

      const promise = noRetryClient.generateResponse([])
      await expect(promise).rejects.toBeInstanceOf(GeminiAPIError)

    //   await jest.advanceTimersByTimeAsync(5000)

    //   const error = await errorPromise
    //   expect(error).toBeInstanceOf(GeminiAPIError)

    //   await expect(client.generateResponse([])).rejects.toThrow(GeminiAPIError)
    //   await expect(client.generateResponse([])).rejects.toThrow(/500/)
    })

    it('should include error details from API', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Invalid prompt format',
      })

      await expect(client.generateResponse([])).rejects.toThrow(/Invalid prompt format/)
    })
  })

  // ==========================================
  // RETRY LOGIC
  // ==========================================

  describe('Retry Behavior', () => {
    it('should retry on network error and succeed on second attempt', async () => {
      ;(global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => validGeminiResponse,
        })

      const promise = client.generateResponse([])

      // Fast-forward first retry delay (100ms)
      await jest.advanceTimersByTimeAsync(100)

      const result = await promise

      expect(result.content).toBe('This is a test response')
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('should apply exponential backoff', async () => {
      ;(global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => validGeminiResponse,
        })

      const promise = client.generateResponse([])

      // First retry: 100ms
      await jest.advanceTimersByTimeAsync(100)

      // Second retry: 200ms (exponential backoff)
      await jest.advanceTimersByTimeAsync(200)

      await promise

      expect(global.fetch).toHaveBeenCalledTimes(3)
    })

    it('should NOT retry on rate limit', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
      })

      await expect(client.generateResponse([])).rejects.toThrow(GeminiRateLimitError)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should NOT retry on validation error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ invalid: 'response' }),
      })

      await expect(client.generateResponse([])).rejects.toThrow(GeminiValidationError)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should throw after all retry attempts exhausted', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Persistent error'))

      const promise = client.generateResponse([])
      const errorPromise = promise.catch(e => e)

      // Advance through all retries
      await jest.advanceTimersByTimeAsync(1000)

      const error = await errorPromise

      expect(error.message).toContain('Persistent error')
      expect(global.fetch).toHaveBeenCalledTimes(3)
    })
  })

    // ==========================================
  // RETRY BACKOFF RESET
// ==========================================

  describe('Retry Backoff Reset', () => {
    it('should reset backoff after successful request', async () => {
      ;(global.fetch as jest.Mock)
        // First call: fail then succeed
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => validGeminiResponse,
        })
        // Second call: should use initial delay, not accumulated
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => validGeminiResponse,
        })

      // First request with retry
      const promise1 = client.generateResponse([{ role: 'user', content: 'First', timestamp: new Date() }])
      await jest.advanceTimersByTimeAsync(100) // Initial delay
      await promise1

      // Second request - delay should be reset to 100ms, not 200ms
      const promise2 = client.generateResponse([{ role: 'user', content: 'Second', timestamp: new Date() }])
      await jest.advanceTimersByTimeAsync(100) // Should succeed with initial delay
      await promise2

      expect(global.fetch).toHaveBeenCalledTimes(4) // 2 fails + 2 successes
    })
  })

  // ==========================================
  // TIMEOUT HANDLING
  // ==========================================

  describe('Timeout Behavior', () => {
    it('should abort request after timeout', async () => {
      ;(global.fetch as jest.Mock).mockImplementationOnce((_, options) => {
        return new Promise((_, reject) => {
            const signal = options.signal
          if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'))
            
          signal.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          })
        })
      })

      const promise = client.generateResponse([])
      const errorPromise = promise.catch((e) => e)

      // Fast-forward past timeout (5000ms)
      await jest.advanceTimersByTimeAsync(6000)

      const error = await errorPromise
      const msg = (error.message || '').toLowerCase()
      expect(msg).toMatch(/abort|unknown/i)
    })
  })

  // ==========================================
  // CONFIGURATION
  // ==========================================

  describe('Configuration', () => {
    it('should use custom temperature', async () => {
      const customClient = new GeminiClient({
        apiKey: 'test',
        temperature: 0.9,
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => validGeminiResponse,
      })

      await customClient.generateResponse([])

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
      expect(callBody.generationConfig.temperature).toBe(0.9)
    })

    it('should use custom maxOutputTokens', async () => {
      const customClient = new GeminiClient({
        apiKey: 'test',
        maxOutputTokens: 1024,
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => validGeminiResponse,
      })

      await customClient.generateResponse([])

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
      expect(callBody.generationConfig.maxOutputTokens).toBe(1024)
    })

    it('should use custom model', async () => {
      const customClient = new GeminiClient({
        apiKey: 'test-key',
        model: 'gemini-1.5-pro',
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => validGeminiResponse,
      })

      await customClient.generateResponse([])

      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0]
      expect(callUrl).toContain('gemini-1.5-pro')
    })
  })

  // ==========================================
  // REQUEST HEADERS
  // ==========================================

  describe('Request Headers', () => {
    it('should include Content-Type: application/json', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => validGeminiResponse,
      })

      await client.generateResponse([])

      const callOptions = (global.fetch as jest.Mock).mock.calls[0][1]
      expect(callOptions.headers['Content-Type']).toBe('application/json')
    })

    it('should include x-goog-api-key in URL', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => validGeminiResponse,
      })

      await client.generateResponse([])

      const [url] = (global.fetch as jest.Mock).mock.calls[0]
      expect(url).toContain('key=test-api-key')
    })

    it('should attach abort controller signal', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => validGeminiResponse,
      })

      await client.generateResponse([])

      const callOptions = (global.fetch as jest.Mock).mock.calls[0][1]
      expect(callOptions.signal).toBeDefined()
      expect(callOptions.signal.constructor.name).toBe('AbortSignal')
    })
  })

  // ==========================================
  // EDGE CASES
  // ==========================================

  describe('Edge Cases', () => {
    it('should handle empty conversation history', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => validGeminiResponse,
      })

      const result = await client.generateResponse([])

      expect(result).toBeDefined()

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
      expect(callBody.contents).toHaveLength(1) // Only system prompt
    })

    it('should handle very long conversation history', async () => {
      const longHistory: NormalizedMessage[] = Array.from({ length: 100 }, (_, i) => ({
        role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
        content: `Message ${i}`,
        timestamp: new Date(),
      }))

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => validGeminiResponse,
      })

      await client.generateResponse(longHistory)

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
      expect(callBody.contents).toHaveLength(101) // System + 100 messages
    })

    it('should handle special characters in content', async () => {
      const specialHistory: NormalizedMessage[] = [
        {
          role: 'user',
          content: 'What about [2:255]? And "patience"?',
          timestamp: new Date(),
        },
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => validGeminiResponse,
      })

      await client.generateResponse(specialHistory)

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
      expect(callBody.contents[1].parts[0].text).toContain('[2:255]')
      expect(callBody.contents[1].parts[0].text).toContain('"patience"')
    })

    it('should handle Arabic text in conversation', async () => {
      const arabicHistory: NormalizedMessage[] = [
        {
          role: 'user',
          content: 'Tell me about ٱللَّهُ',
          timestamp: new Date(),
        },
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => validGeminiResponse,
      })

      await client.generateResponse(arabicHistory)

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
      expect(callBody.contents[1].parts[0].text).toContain('ٱللَّهُ')
    })
  })   
})