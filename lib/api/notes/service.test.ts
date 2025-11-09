import { NotesService } from './service'
import { createMockSupabaseClient } from '@/__mocks__/supabase'
import { Database } from '@/types/supabase'

type NotePage = Database['public']['Tables']['note_pages']['Row']

describe('NotesService - Edge Cases', () => {
  describe('empty results', () => {
    it('should return empty array when no notes exist', async () => {
      const mockClient = createMockSupabaseClient([])
      const service = new NotesService(mockClient)

      const result = await service.getAllNotes()

      expect(result).toEqual([])
    })

    it('should return empty array when section has no notes', async () => {
      const mockClient = createMockSupabaseClient([])
      const service = new NotesService(mockClient)

      const result = await service.getNotesBySection('empty-section')

      expect(result).toEqual([])
    })

    it('should return empty array when no deleted notes', async () => {
      const mockClient = createMockSupabaseClient([])
      const service = new NotesService(mockClient)

      const result = await service.getDeletedNotes()

      expect(result).toEqual([])
    })
  })

  describe('already deleted notes', () => {
    it('should handle soft deleting already deleted note', async () => {
      const mockError = { code: 'PGRST116', message: 'Not found' } as any
      const mockClient = createMockSupabaseClient(null, mockError)
      const service = new NotesService(mockClient)

      // Should throw because RLS/query won't find deleted note
      await expect(service.softDeleteNote('already-deleted')).rejects.toThrow()
    })
  })

  describe('non-existent notes', () => {
    it('should throw error when updating non-existent note', async () => {
      const mockError = { code: 'PGRST116' } as any
      const mockClient = createMockSupabaseClient(null, mockError)
      const service = new NotesService(mockClient)

      await expect(service.updateNote('fake-id', { title: 'New' })).rejects.toThrow()
    })

    it('should not throw when permanently deleting non-existent note', async () => {
      // Supabase DELETE doesn't error on non-existent IDs
      const mockClient = createMockSupabaseClient(null)
      const service = new NotesService(mockClient)

      await expect(service.permanentlyDeleteNote('fake-id')).resolves.not.toThrow()
    })
  })

  describe('minimal data', () => {
    it('should create note with only content (no title)', async () => {
      const mockNote: NotePage = {
        id: 'new-id',
        user_id: 'user-1',
        section_id: null,
        title: null,
        content: 'Just content',
        order_index: 0,
        deleted_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }
      const mockClient = createMockSupabaseClient(mockNote)
      const service = new NotesService(mockClient)

      const result = await service.createNote({
        user_id: 'user-1',
        content: 'Just content',
      })

      expect(result.content).toBe('Just content')
      expect(result.title).toBeNull()
    })

    it('should update single field without affecting others', async () => {
      const mockNote: NotePage = {
        id: '123',
        user_id: 'user-1',
        section_id: null,
        title: 'Original Title',
        content: 'Updated Content',
        order_index: 0,
        deleted_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      }
      const mockClient = createMockSupabaseClient(mockNote)
      const service = new NotesService(mockClient)

      const result = await service.updateNote('123', { content: 'Updated Content' })

      expect(result.content).toBe('Updated Content')
      expect(result.title).toBe('Original Title')
    })
  })

  describe('restore behavior', () => {
    it('should handle restoring already active note', async () => {
      const mockNote: NotePage = {
        id: '123',
        user_id: 'user-1',
        section_id: null,
        title: 'Active Note',
        content: 'Content',
        order_index: 0,
        deleted_at: null, // Already null
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }
      const mockClient = createMockSupabaseClient(mockNote)
      const service = new NotesService(mockClient)

      const result = await service.restoreNote('123')

      expect(result.deleted_at).toBeNull()
    })
  })
})