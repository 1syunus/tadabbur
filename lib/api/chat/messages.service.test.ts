import { MessagesService } from './messages.service'
import { createMockSupabaseClient } from '@/__mocks__/supabase'
import { Database } from '@/types/supabase'

type Message = Database['public']['Tables']['messages']['Row']

describe('MessagesService', () => {
  describe('getConversationMessages', () => {
    it('should return messages ordered by created_at ASC', async () => {
      const mockMessages: Message[] = [
        {
          id: '1',
          conversation_id: 'conv-1',
          role: 'user',
          content: 'First message',
          ayah_references: [],
          tafsir_used: [],
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          conversation_id: 'conv-1',
          role: 'assistant',
          content: 'Second message',
          ayah_references: ['2:255'],
          tafsir_used: [],
          created_at: '2024-01-01T00:00:01Z',
        },
      ]

      const mockClient = createMockSupabaseClient(mockMessages)
      const service = new MessagesService(mockClient)

      const result = await service.getConversationMessages('conv-1')

      expect(result).toEqual(mockMessages)
    })

    it('should return empty array when no messages exist', async () => {
      const mockClient = createMockSupabaseClient([])
      const service = new MessagesService(mockClient)

      const result = await service.getConversationMessages('empty-conv')

      expect(result).toEqual([])
    })
  })

  describe('getMessageById', () => {
    it('should return message when found', async () => {
      const mockMessage: Message = {
        id: '123',
        conversation_id: 'conv-1',
        role: 'user',
        content: 'Test message',
        ayah_references: [],
        tafsir_used: [],
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockClient = createMockSupabaseClient(mockMessage)
      const service = new MessagesService(mockClient)

      const result = await service.getMessageById('123')

      expect(result).toEqual(mockMessage)
    })

    it('should return null when not found', async () => {
      const mockError = { code: 'PGRST116' } as any
      const mockClient = createMockSupabaseClient(null, mockError)
      const service = new MessagesService(mockClient)

      const result = await service.getMessageById('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('createMessage', () => {
    it('should create user message', async () => {
      const mockMessage: Message = {
        id: 'new-id',
        conversation_id: 'conv-1',
        role: 'user',
        content: 'User question',
        ayah_references: [],
        tafsir_used: [],
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockClient = createMockSupabaseClient(mockMessage)
      const service = new MessagesService(mockClient)

      const result = await service.createMessage({
        conversation_id: 'conv-1',
        role: 'user',
        content: 'User question',
      })

      expect(result.role).toBe('user')
      expect(result.content).toBe('User question')
    })

    it('should create assistant message with ayah references', async () => {
      const mockMessage: Message = {
        id: 'new-id',
        conversation_id: 'conv-1',
        role: 'assistant',
        content: 'AI response',
        ayah_references: ['2:255', '3:159'],
        tafsir_used: [{ source: 'Ibn Kathir', excerpt: 'Commentary...' }],
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockClient = createMockSupabaseClient(mockMessage)
      const service = new MessagesService(mockClient)

      const result = await service.createMessage({
        conversation_id: 'conv-1',
        role: 'assistant',
        content: 'AI response',
        ayah_references: ['2:255', '3:159'],
        tafsir_used: [{ source: 'Ibn Kathir', excerpt: 'Commentary...' }],
      })

      expect(result.ayah_references).toHaveLength(2)
      expect(result.tafsir_used).toHaveLength(1)
    })

    it('should create system message', async () => {
      const mockMessage: Message = {
        id: 'new-id',
        conversation_id: 'conv-1',
        role: 'system',
        content: 'System notification',
        ayah_references: [],
        tafsir_used: [],
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockClient = createMockSupabaseClient(mockMessage)
      const service = new MessagesService(mockClient)

      const result = await service.createMessage({
        conversation_id: 'conv-1',
        role: 'system',
        content: 'System notification',
      })

      expect(result.role).toBe('system')
    })
  })

  describe('getRecentMessages', () => {
    it('should return last N messages in chronological order (oldest first)', async () => {
      const mockMessages: Message[] = [
        {
          id: '3',
          conversation_id: 'conv-1',
          role: 'user',
          content: 'Message 3',
          ayah_references: [],
          tafsir_used: [],
          created_at: '2024-01-01T00:00:03Z',
        },
        {
          id: '2',
          conversation_id: 'conv-1',
          role: 'assistant',
          content: 'Message 2',
          ayah_references: [],
          tafsir_used: [],
          created_at: '2024-01-01T00:00:02Z',
        },
      ]

      const mockClient = createMockSupabaseClient(mockMessages)
      const service = new MessagesService(mockClient)

      const result = await service.getRecentMessages('conv-1', 2)

      // Should be reversed to chronological order
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('2'); // Oldest is first
      expect(result[1].id).toBe('3'); // Newest is last
    })
  })

  describe('getMessageCount', () => {
    it('should return message count for conversation', async () => {
      const mockClient = createMockSupabaseClient([
        { id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }
      ])
      const service = new MessagesService(mockClient)

      const count = await service.getMessageCount('conv-1')

      expect(count).toBe(4)
    })

    it('should return 0 for empty conversation', async () => {
      const mockClient = createMockSupabaseClient([])
      const service = new MessagesService(mockClient)

      const count = await service.getMessageCount('empty-conv')

      expect(count).toBe(0)
    })
  })
})