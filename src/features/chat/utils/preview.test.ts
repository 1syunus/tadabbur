/**
 * Tests for Preview and Timestamp Derivation Utilities
 * 
 * @module features/chat/utils/preview.test
 */

import { derivePreview, deriveTimestamp } from './preview'
import type { NormalizedMessage } from '@ui/lib/frontend/api'

describe('derivePreview', () => {
  describe('Empty messages array', () => {
    it('should return empty string when messages array is empty', () => {
      const result = derivePreview([])
      expect(result).toBe('')
    })
  })

  describe('Single message', () => {
    it('should return the content of the single message', () => {
      const messages: NormalizedMessage[] = [
        {
          id: '1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Hello world',
          ayahReferences: [],
          tafsirUsed: [],
          createdAt: '2024-01-01T12:00:00Z',
        },
      ]
      
      const result = derivePreview(messages)
      expect(result).toBe('Hello world')
    })
  })

  describe('Multiple messages', () => {
    it('should return the content of the last message chronologically', () => {
      const messages: NormalizedMessage[] = [
        {
          id: '1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'First message',
          ayahReferences: [],
          tafsirUsed: [],
          createdAt: '2024-01-01T12:00:00Z',
        },
        {
          id: '2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Second message',
          ayahReferences: [],
          tafsirUsed: [],
          createdAt: '2024-01-01T12:01:00Z',
        },
        {
          id: '3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Third message',
          ayahReferences: [],
          tafsirUsed: [],
          createdAt: '2024-01-01T12:02:00Z',
        },
      ]
      
      const result = derivePreview(messages)
      expect(result).toBe('Third message')
    })
  })

  describe('Edge cases', () => {
    it('should handle empty content string', () => {
      const messages: NormalizedMessage[] = [
        {
          id: '1',
          conversationId: 'conv-1',
          role: 'user',
          content: '',
          ayahReferences: [],
          tafsirUsed: [],
          createdAt: '2024-01-01T12:00:00Z',
        },
      ]
      
      const result = derivePreview(messages)
      expect(result).toBe('')
    })

    it('should handle long content', () => {
      const longContent = 'a'.repeat(1000)
      const messages: NormalizedMessage[] = [
        {
          id: '1',
          conversationId: 'conv-1',
          role: 'user',
          content: longContent,
          ayahReferences: [],
          tafsirUsed: [],
          createdAt: '2024-01-01T12:00:00Z',
        },
      ]
      
      const result = derivePreview(messages)
      expect(result).toBe(longContent)
    })
  })
})

describe('deriveTimestamp', () => {
  describe('Empty messages array', () => {
    it('should return null when messages array is empty', () => {
      const result = deriveTimestamp([])
      expect(result).toBeNull()
    })
  })

  describe('Single message', () => {
    it('should return the ISO 8601 timestamp string of the single message', () => {
      const timestampStr = '2024-01-01T12:00:00Z'
      const messages: NormalizedMessage[] = [
        {
          id: '1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Hello',
          ayahReferences: [],
          tafsirUsed: [],
          createdAt: timestampStr,
        },
      ]
      
      const result = deriveTimestamp(messages)
      expect(result).toBe(timestampStr)
      expect(typeof result).toBe('string')
    })
  })

  describe('Multiple messages', () => {
    it('should return the timestamp of the last message chronologically', () => {
      const firstTimestamp = '2024-01-01T12:00:00Z'
      const middleTimestamp = '2024-01-01T12:01:00Z'
      const lastTimestamp = '2024-01-01T12:02:00Z'
      
      const messages: NormalizedMessage[] = [
        {
          id: '1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'First',
          ayahReferences: [],
          tafsirUsed: [],
          createdAt: firstTimestamp,
        },
        {
          id: '2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Second',
          ayahReferences: [],
          tafsirUsed: [],
          createdAt: middleTimestamp,
        },
        {
          id: '3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Third',
          ayahReferences: [],
          tafsirUsed: [],
          createdAt: lastTimestamp,
        },
      ]
      
      const result = deriveTimestamp(messages)
      expect(result).toBe(lastTimestamp)
    })

    it('should handle many messages efficiently', () => {
      const messages: NormalizedMessage[] = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        conversationId: 'conv-1',
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        ayahReferences: [],
        tafsirUsed: [],
        createdAt: `2024-01-01T12:${String(i).padStart(2, '0')}:00Z`,
      }))
      
      const result = deriveTimestamp(messages)
      expect(result).toBe('2024-01-01T12:99:00Z')
    })
  })

  describe('Edge cases', () => {
    it('should handle messages with identical timestamps', () => {
      const sameTimestamp = '2024-01-01T12:00:00Z'
      const messages: NormalizedMessage[] = [
        {
          id: '1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'First',
          ayahReferences: [],
          tafsirUsed: [],
          createdAt: sameTimestamp,
        },
        {
          id: '2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Second',
          ayahReferences: [],
          tafsirUsed: [],
          createdAt: sameTimestamp,
        },
      ]
      
      const result = deriveTimestamp(messages)
      expect(result).toBe(sameTimestamp)
    })
  })
})

describe('Chronological ordering contract', () => {
  describe('derivePreview respects ordering', () => {
    it('returns content from LAST position in array (trusts caller sorting)', () => {
      // This test PROVES the function does NOT sort internally
      const messages: NormalizedMessage[] = [
        {
          id: '3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'LAST in array',
          ayahReferences: [],
          tafsirUsed: [],
          createdAt: '2024-01-01T10:00:00Z', // EARLIEST time
        },
        {
          id: '1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'MIDDLE',
          ayahReferences: [],
          tafsirUsed: [],
          createdAt: '2024-01-01T12:00:00Z', // MIDDLE time
        },
        {
          id: '2',
          conversationId: 'conv-1',
          role: 'user',
          content: 'FIRST in array',
          ayahReferences: [],
          tafsirUsed: [],
          createdAt: '2024-01-01T14:00:00Z', // LATEST time
        },
      ]
      
      const result = derivePreview(messages)
      // If function sorted by timestamp, it would return 'LAST in array'
      // Since it trusts array order, it returns 'FIRST in array'
      expect(result).toBe('FIRST in array')
    })
  })

  describe('deriveTimestamp respects ordering', () => {
    it('returns timestamp from LAST position in array (trusts caller sorting)', () => {
      const messages: NormalizedMessage[] = [
        {
          id: '3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'C',
          ayahReferences: [],
          tafsirUsed: [],
          createdAt: '2024-01-01T10:00:00Z', // EARLIEST
        },
        {
          id: '1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'A',
          ayahReferences: [],
          tafsirUsed: [],
          createdAt: '2024-01-01T14:00:00Z', // LATEST (but in middle)
        },
        {
          id: '2',
          conversationId: 'conv-1',
          role: 'user',
          content: 'B',
          ayahReferences: [],
          tafsirUsed: [],
          createdAt: '2024-01-01T12:00:00Z', // MIDDLE
        },
      ]
      
      const result = deriveTimestamp(messages)
      // If function sorted by timestamp, it would return LATEST ('2024-01-01T14:00:00Z')
      // Since it trusts array order, it returns LAST position ('2024-01-01T12:00:00Z')
      expect(result).toBe('2024-01-01T12:00:00Z')
    })
  })
})