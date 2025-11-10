import { ConversationsService } from './conversations.service'
import { createMockSupabaseClient } from '@/__mocks__/supabase'
import { Database } from '@/types/supabase'

type Conversation = Database['public']['Tables']['conversations']['Row']

describe('ConversationsService', () => {
  describe('getAllConversations', () => {
    it('should return active conversations ordered by updated_at DESC', async () => {
      const mockConversations: Conversation[] = [
        {
          id: '1',
          user_id: 'user-1',
          title: 'Recent Chat',
          archived: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-03T00:00:00Z',
        },
        {
          id: '2',
          user_id: 'user-1',
          title: 'Older Chat',
          archived: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ]

      const mockClient = createMockSupabaseClient(mockConversations)
      const service = new ConversationsService(mockClient)

      const result = await service.getAllConversations()

      expect(result).toEqual(mockConversations)
      expect(mockClient.from).toHaveBeenCalledWith('conversations')
    })

    it('should return empty array when no conversations exist', async () => {
      const mockClient = createMockSupabaseClient([])
      const service = new ConversationsService(mockClient)

      const result = await service.getAllConversations()

      expect(result).toEqual([])
    })

    it('should throw error when query fails', async () => {
      const mockError = new Error('Database error')
      const mockClient = createMockSupabaseClient(null, mockError)
      const service = new ConversationsService(mockClient)

      await expect(service.getAllConversations()).rejects.toThrow()
    })
  })

  describe('getArchivedConversations', () => {
    it('should return only archived conversations', async () => {
      const mockConversations: Conversation[] = [
        {
          id: '1',
          user_id: 'user-1',
          title: 'Archived Chat',
          archived: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ]

      const mockClient = createMockSupabaseClient(mockConversations)
      const service = new ConversationsService(mockClient)

      const result = await service.getArchivedConversations()

      expect(result).toEqual(mockConversations)
      expect(result[0].archived).toBe(true)
    })
  })

  describe('getConversationById', () => {
    it('should return conversation when found', async () => {
      const mockConversation: Conversation = {
        id: '123',
        user_id: 'user-1',
        title: 'Test Chat',
        archived: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const mockClient = createMockSupabaseClient(mockConversation)
      const service = new ConversationsService(mockClient)

      const result = await service.getConversationById('123')

      expect(result).toEqual(mockConversation)
    })

    it('should return null when not found', async () => {
      const mockError = { code: 'PGRST116' } as any
      const mockClient = createMockSupabaseClient(null, mockError)
      const service = new ConversationsService(mockClient)

      const result = await service.getConversationById('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('createConversation', () => {
    it('should create conversation with title', async () => {
      const mockConversation: Conversation = {
        id: 'new-id',
        user_id: 'user-1',
        title: 'New Chat',
        archived: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const mockClient = createMockSupabaseClient(mockConversation)
      const service = new ConversationsService(mockClient)

      const result = await service.createConversation({
        user_id: 'user-1',
        title: 'New Chat',
      })

      expect(result).toEqual(mockConversation)
    })

    it('should create conversation without title', async () => {
      const mockConversation: Conversation = {
        id: 'new-id',
        user_id: 'user-1',
        title: null,
        archived: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const mockClient = createMockSupabaseClient(mockConversation)
      const service = new ConversationsService(mockClient)

      const result = await service.createConversation({
        user_id: 'user-1',
      })

      expect(result.title).toBeNull()
    })
  })

  describe('updateConversation', () => {
    it('should update conversation title', async () => {
      const mockConversation: Conversation = {
        id: '123',
        user_id: 'user-1',
        title: 'Updated Title',
        archived: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      }

      const mockClient = createMockSupabaseClient(mockConversation)
      const service = new ConversationsService(mockClient)

      const result = await service.updateConversation('123', {
        title: 'Updated Title',
      })

      expect(result.title).toBe('Updated Title')
    })
  })

  describe('archiveConversation', () => {
    it('should set archived to true', async () => {
      const mockConversation: Conversation = {
        id: '123',
        user_id: 'user-1',
        title: 'Archived',
        archived: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      }

      const mockClient = createMockSupabaseClient(mockConversation)
      const service = new ConversationsService(mockClient)

      const result = await service.archiveConversation('123')

      expect(result.archived).toBe(true)
    })
  })

  describe('unarchiveConversation', () => {
    it('should set archived to false', async () => {
      const mockConversation: Conversation = {
        id: '123',
        user_id: 'user-1',
        title: 'Unarchived',
        archived: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      }

      const mockClient = createMockSupabaseClient(mockConversation)
      const service = new ConversationsService(mockClient)

      const result = await service.unarchiveConversation('123')

      expect(result.archived).toBe(false)
    })
  })

  describe('deleteConversation', () => {
    it('should permanently delete conversation', async () => {
      const mockClient = createMockSupabaseClient(null)
      const service = new ConversationsService(mockClient)

      await expect(service.deleteConversation('123')).resolves.not.toThrow()
    })
  })
})