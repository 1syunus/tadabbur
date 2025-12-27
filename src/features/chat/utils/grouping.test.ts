/**
 * Tests for Time-Based Conversation Grouping Utility
 * 
 * Tests pure function with explicit time dependency (no global Date mocking).
 * Uses UTC day boundaries for timezone-independent, deterministic testing.
 * 
 * @module features/chat/utils/grouping.test
 */

import { groupConversationsByTime } from './grouping'
import type { ConversationWithPreview } from '../types'

// Reference time for all tests (explicit, not mocked globally)
const REFERENCE_TIME = new Date('2024-01-15T14:30:00Z')

describe('groupConversationsByTime', () => {
  /**
   * Helper to create a conversation with proper NormalizedConversation fields
   * 
   * NOTE: userId is NOT included - it's stripped by the normalizer for security.
   * Backend RLS policies enforce ownership; frontend doesn't need user_id.
   */
  const createConversation = (
    id: string,
    timestamp: string | null
  ): ConversationWithPreview => ({
    // Fields from NormalizedConversation (userId deliberately omitted for security)
    id,
    title: `Conversation ${id}`,
    isArchived: false,
    createdAt: '2024-01-15T14:30:00Z',
    updatedAt: '2024-01-15T14:30:00Z',
    
    // Fields added by ConversationWithPreview
    previewText: 'Preview text',
    lastMessageTimestamp: timestamp,
  })

  describe('Empty conversations array', () => {
    it('should return empty object when conversations array is empty', () => {
      const result = groupConversationsByTime([], REFERENCE_TIME)
      expect(result).toEqual({})
      
      // Type assertion: result should be Partial<Record<...>>
      expect(result['Today']).toBeUndefined()
      expect(result['Yesterday']).toBeUndefined()
    })
  })

  describe('Conversations with null timestamps', () => {
    it('should exclude conversations with null lastMessageTimestamp', () => {
      const conversations: ConversationWithPreview[] = [
        createConversation('1', null),
        createConversation('2', null),
      ]
      
      const result = groupConversationsByTime(conversations, REFERENCE_TIME)
      expect(result).toEqual({})
      
      // Verify all groups are undefined (omitted)
      expect(result['Today']).toBeUndefined()
      expect(result['Yesterday']).toBeUndefined()
      expect(result['Previous 7 Days']).toBeUndefined()
      expect(result['Previous 30 Days']).toBeUndefined()
    })
  })

  describe('Today group', () => {
    it('should group conversations from today', () => {
      const now = REFERENCE_TIME
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      
      const conversations: ConversationWithPreview[] = [
        createConversation('1', new Date(todayStart.getTime() + 3600000).toISOString()), // 1 hour after midnight
        createConversation('2', REFERENCE_TIME.toISOString()), // Current time
      ]
      
      const result = groupConversationsByTime(conversations, REFERENCE_TIME)
      
      expect(result['Today']).toHaveLength(2)
      expect(result['Today']?.[0].id).toBe('2') // Newest first
      expect(result['Today']?.[1].id).toBe('1')
    })

    it('should include conversations at exactly midnight today', () => {
      const now = REFERENCE_TIME
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      
      const conversations: ConversationWithPreview[] = [
        createConversation('1', todayStart.toISOString()),
      ]
      
      const result = groupConversationsByTime(conversations, REFERENCE_TIME)
      
      expect(result['Today']).toHaveLength(1)
      expect(result['Today']?.[0].id).toBe('1')
    })
  })

  describe('Yesterday group', () => {
    it('should group conversations from yesterday', () => {
      const now = REFERENCE_TIME
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      const yesterdayStart = new Date(todayStart.getTime() - 86400000)
      
      const conversations: ConversationWithPreview[] = [
        createConversation('1', new Date(yesterdayStart.getTime() + 3600000).toISOString()), // Yesterday morning
        createConversation('2', new Date(yesterdayStart.getTime() + 43200000).toISOString()), // Yesterday noon
      ]
      
      const result = groupConversationsByTime(conversations, REFERENCE_TIME)
      
      expect(result['Yesterday']).toHaveLength(2)
      expect(result['Yesterday']?.[0].id).toBe('2') // Newest first
      expect(result['Yesterday']?.[1].id).toBe('1')
    })

    it('should include conversations at exactly midnight yesterday', () => {
      const now = REFERENCE_TIME
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      const yesterdayStart = new Date(todayStart.getTime() - 86400000)
      
      const conversations: ConversationWithPreview[] = [
        createConversation('1', yesterdayStart.toISOString()),
      ]
      
      const result = groupConversationsByTime(conversations, REFERENCE_TIME)
      
      expect(result['Yesterday']).toHaveLength(1)
      expect(result['Yesterday']?.[0].id).toBe('1')
    })
  })

  describe('Previous 7 Days group', () => {
    it('should group conversations from 2-8 days ago', () => {
      const now = REFERENCE_TIME
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      const twoDaysAgo = new Date(todayStart.getTime() - 2 * 86400000)
      const eightDaysAgo = new Date(todayStart.getTime() - 8 * 86400000)
      
      const conversations: ConversationWithPreview[] = [
        createConversation('1', twoDaysAgo.toISOString()), // 2 days ago
        createConversation('2', eightDaysAgo.toISOString()), // 7 days ago
      ]
      
      const result = groupConversationsByTime(conversations, REFERENCE_TIME)
      
      expect(result['Previous 7 Days']).toHaveLength(2)
      expect(result['Previous 7 Days']?.[0].id).toBe('1') // Newest first
      expect(result['Previous 7 Days']?.[1].id).toBe('2')
    })

    it('should include conversations at exactly 2 days ago boundary', () => {
      const now = REFERENCE_TIME
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      const twoDaysAgo = new Date(todayStart.getTime() - 2 * 86400000)
      
      const conversations: ConversationWithPreview[] = [
        createConversation('1', twoDaysAgo.toISOString()),
      ]
      
      const result = groupConversationsByTime(conversations, REFERENCE_TIME)
      
      expect(result['Previous 7 Days']).toHaveLength(1)
      expect(result['Previous 7 Days']?.[0].id).toBe('1')
    })
  })

  describe('Previous 30 Days group', () => {
    it('should group conversations from 9-30 days ago', () => {
      const now = REFERENCE_TIME
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      const nineDaysAgo = new Date(todayStart.getTime() - 9 * 86400000)
      const thirtyDaysAgo = new Date(todayStart.getTime() - 30 * 86400000)
      
      const conversations: ConversationWithPreview[] = [
        createConversation('1', nineDaysAgo.toISOString()), // 8 days ago
        createConversation('2', thirtyDaysAgo.toISOString()), // 30 days ago
      ]
      
      const result = groupConversationsByTime(conversations, REFERENCE_TIME)
      
      expect(result['Previous 30 Days']).toHaveLength(2)
      expect(result['Previous 30 Days']?.[0].id).toBe('1') // Newest first
      expect(result['Previous 30 Days']?.[1].id).toBe('2')
    })

    it('should include conversations at exactly 8 days ago boundary', () => {
      const now = REFERENCE_TIME
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      const nineDaysAgo = new Date(todayStart.getTime() - 9 * 86400000)
      
      const conversations: ConversationWithPreview[] = [
        createConversation('1', nineDaysAgo.toISOString()),
      ]
      
      const result = groupConversationsByTime(conversations, REFERENCE_TIME)
      
      expect(result['Previous 30 Days']).toHaveLength(1)
      expect(result['Previous 30 Days']?.[0].id).toBe('1')
    })
  })

  describe('Conversations older than 30 days', () => {
    it('should exclude conversations older than 30 days from all groups', () => {
      const now = REFERENCE_TIME
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      const thirtyOneDaysAgo = new Date(todayStart.getTime() - 31 * 86400000)
      
      const conversations: ConversationWithPreview[] = [
        createConversation('1', thirtyOneDaysAgo.toISOString()),
        createConversation('2', new Date(todayStart.getTime() - 100 * 86400000).toISOString()),
      ]
      
      const result = groupConversationsByTime(conversations, REFERENCE_TIME)
      
      expect(result).toEqual({})
    })
  })

  describe('Mixed conversations across multiple groups', () => {
    it('should correctly distribute conversations across groups', () => {
      const now = REFERENCE_TIME
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      
      const conversations: ConversationWithPreview[] = [
        createConversation('today-1', REFERENCE_TIME.toISOString()),
        createConversation('today-2', todayStart.toISOString()),
        createConversation('yesterday', new Date(todayStart.getTime() - 86400000).toISOString()),
        createConversation('week', new Date(todayStart.getTime() - 5 * 86400000).toISOString()),
        createConversation('month', new Date(todayStart.getTime() - 20 * 86400000).toISOString()),
        createConversation('old', new Date(todayStart.getTime() - 50 * 86400000).toISOString()),
        createConversation('no-timestamp', null),
      ]
      
      const result = groupConversationsByTime(conversations, REFERENCE_TIME)
      
      expect(result['Today']).toHaveLength(2)
      expect(result['Yesterday']).toHaveLength(1)
      expect(result['Previous 7 Days']).toHaveLength(1)
      expect(result['Previous 30 Days']).toHaveLength(1)
      
      // Verify old conversation and null timestamp are excluded
      expect(result['Today']?.find(c => c.id === 'old')).toBeUndefined()
      expect(result['Today']?.find(c => c.id === 'no-timestamp')).toBeUndefined()
    })
  })

  describe('Sorting within groups', () => {
    it('should sort conversations by timestamp descending (newest first)', () => {
      const now = REFERENCE_TIME
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      
      // Create with intentionally mixed order
      const conversations: ConversationWithPreview[] = [
        createConversation('2', new Date(todayStart.getTime() + 7200000).toISOString()), // 2 hours
        createConversation('1', new Date(todayStart.getTime() + 3600000).toISOString()), // 1 hour
        createConversation('3', new Date(todayStart.getTime() + 10800000).toISOString()), // 3 hours
      ]
      
      const result = groupConversationsByTime(conversations, REFERENCE_TIME)
      
      expect(result['Today']).toHaveLength(3)
      expect(result['Today']?.[0].id).toBe('3') // 3 hours (newest)
      expect(result['Today']?.[1].id).toBe('2') // 2 hours
      expect(result['Today']?.[2].id).toBe('1') // 1 hour (oldest)
    })

    it('should handle conversations with identical timestamps', () => {
      const sameTime = REFERENCE_TIME.toISOString()
      
      const conversations: ConversationWithPreview[] = [
        createConversation('1', sameTime),
        createConversation('2', sameTime),
        createConversation('3', sameTime),
      ]
      
      const result = groupConversationsByTime(conversations, REFERENCE_TIME)
      
      expect(result['Today']).toHaveLength(3)
      // Order is stable (maintains array order when timestamps equal)
      expect(result['Today']?.map(c => c.id).sort()).toEqual(['1', '2', '3'])
    })
  })

  describe('Empty groups are omitted (Partial<Record> semantics)', () => {
    it('should only include groups with conversations', () => {
      const now = REFERENCE_TIME
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      
      const conversations: ConversationWithPreview[] = [
        createConversation('1', todayStart.toISOString()), // Only today
      ]
      
      const result = groupConversationsByTime(conversations, REFERENCE_TIME)
      
      // Only Today should be present
      expect(result['Today']).toBeDefined()
      expect(result['Yesterday']).toBeUndefined()
      expect(result['Previous 7 Days']).toBeUndefined()
      expect(result['Previous 30 Days']).toBeUndefined()
      
      // Verify object only has one key
      expect(Object.keys(result)).toEqual(['Today'])
    })

    it('should omit all groups when only null timestamps exist', () => {
      const conversations: ConversationWithPreview[] = [
        createConversation('1', null),
        createConversation('2', null),
      ]
      
      const result = groupConversationsByTime(conversations, REFERENCE_TIME)
      
      expect(Object.keys(result)).toHaveLength(0)
      expect(result).toEqual({})
    })
  })

  describe('Edge cases', () => {
    it('should handle very large arrays efficiently', () => {
      const now = REFERENCE_TIME
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      
      // Create 1000 conversations
      const conversations: ConversationWithPreview[] = Array.from({ length: 1000 }, (_, i) => {
        const daysAgo = Math.floor(i / 100) // 100 per day, 10 days total
        const timestamp = new Date(todayStart.getTime() - daysAgo * 86400000)
        return createConversation(`conv-${i}`, timestamp.toISOString())
      })
      
      const startTime = Date.now()
      const result = groupConversationsByTime(conversations, REFERENCE_TIME)
      const endTime = Date.now()
      
      // Should complete in reasonable time (< 100ms for 1000 items)
      expect(endTime - startTime).toBeLessThan(100)
      
      // Verify grouping is correct
      expect(result['Today']).toHaveLength(100)
      expect(result['Yesterday']).toHaveLength(100)
      expect(result['Previous 7 Days']).toHaveLength(700) // 2-8 days = 7 days * 100
      expect(result['Previous 30 Days']).toHaveLength(100) // 9 days * 100
    })

    it('should handle conversations at exact day boundaries', () => {
      const now = REFERENCE_TIME
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      const yesterdayStart = new Date(todayStart.getTime() - 86400000)
      const eightDaysAgo = new Date(todayStart.getTime() - 8 * 86400000)
      
      const conversations: ConversationWithPreview[] = [
        createConversation('today-boundary', todayStart.toISOString()),
        createConversation('yesterday-boundary', yesterdayStart.toISOString()),
        createConversation('8days-boundary', eightDaysAgo.toISOString()),
      ]
      
      const result = groupConversationsByTime(conversations, REFERENCE_TIME)
      
      expect(result['Today']?.[0].id).toBe('today-boundary')
      expect(result['Yesterday']?.[0].id).toBe('yesterday-boundary')
      expect(result['Previous 7 Days']?.[0].id).toBe('8days-boundary')
    })
  })
})