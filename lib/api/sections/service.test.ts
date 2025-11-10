import { SectionsService } from './service'
import { createMockSupabaseClient } from '@/__mocks__/supabase'
import { Database } from '@/types/supabase'

type NoteSection = Database['public']['Tables']['note_sections']['Row']

describe('SectionsService', () => {
  describe('getAllSections', () => {
    it('should return all sections ordered by order_index', async () => {
      const mockSections: NoteSection[] = [
        {
          id: '1',
          user_id: 'user-1',
          name: 'First Section',
          color: '#3B82F6',
          order_index: 0,
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          user_id: 'user-1',
          name: 'Second Section',
          color: '#10B981',
          order_index: 1,
          created_at: '2024-01-02T00:00:00Z',
        },
      ]

      const mockClient = createMockSupabaseClient(mockSections)
      const service = new SectionsService(mockClient)

      const result = await service.getAllSections()

      expect(result).toEqual(mockSections)
    })

    it('should return empty array when no sections exist', async () => {
      const mockClient = createMockSupabaseClient([])
      const service = new SectionsService(mockClient)

      const result = await service.getAllSections()

      expect(result).toEqual([])
    })

    it('should throw error when query fails', async () => {
      const mockError = new Error('Database error')
      const mockClient = createMockSupabaseClient(null, mockError)
      const service = new SectionsService(mockClient)

      await expect(service.getAllSections()).rejects.toThrow()
    })
  })

  describe('getSectionById', () => {
    it('should return section when found', async () => {
      const mockSection: NoteSection = {
        id: '123',
        user_id: 'user-1',
        name: 'Test Section',
        color: '#EF4444',
        order_index: 0,
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockClient = createMockSupabaseClient(mockSection)
      const service = new SectionsService(mockClient)

      const result = await service.getSectionById('123')

      expect(result).toEqual(mockSection)
    })

    it('should return null when section not found', async () => {
      const mockError = { code: 'PGRST116', message: 'Not found' } as any
      const mockClient = createMockSupabaseClient(null, mockError)
      const service = new SectionsService(mockClient)

      const result = await service.getSectionById('nonexistent')

      expect(result).toBeNull()
    })

    it('should throw error for other database errors', async () => {
      const mockError = new Error('Database connection failed')
      const mockClient = createMockSupabaseClient(null, mockError)
      const service = new SectionsService(mockClient)

      await expect(service.getSectionById('123')).rejects.toThrow()
    })
  })

  describe('createSection', () => {
    it('should create and return new section', async () => {
      const mockSection: NoteSection = {
        id: 'new-id',
        user_id: 'user-1',
        name: 'New Section',
        color: '#8B5CF6',
        order_index: 0,
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockClient = createMockSupabaseClient(mockSection)
      const service = new SectionsService(mockClient)

      const input = {
        user_id: 'user-1',
        name: 'New Section',
        color: '#8B5CF6',
        order_index: 0,
      }

      const result = await service.createSection(input)

      expect(result).toEqual(mockSection)
    })

    it('should create section without color', async () => {
      const mockSection: NoteSection = {
        id: 'new-id',
        user_id: 'user-1',
        name: 'No Color Section',
        color: null,
        order_index: 0,
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockClient = createMockSupabaseClient(mockSection)
      const service = new SectionsService(mockClient)

      const result = await service.createSection({
        user_id: 'user-1',
        name: 'No Color Section',
        order_index: 0,
      })

      expect(result.color).toBeNull()
    })

    it('should throw error when creation fails', async () => {
      const mockError = new Error('Validation failed')
      const mockClient = createMockSupabaseClient(null, mockError)
      const service = new SectionsService(mockClient)

      await expect(service.createSection({
        user_id: 'user-1',
        name: 'Test',
      })).rejects.toThrow()
    })
  })

  describe('updateSection', () => {
    it('should update and return section', async () => {
      const mockSection: NoteSection = {
        id: '123',
        user_id: 'user-1',
        name: 'Updated Name',
        color: '#F59E0B',
        order_index: 0,
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockClient = createMockSupabaseClient(mockSection)
      const service = new SectionsService(mockClient)

      const result = await service.updateSection('123', {
        name: 'Updated Name',
        color: '#F59E0B',
      })

      expect(result).toEqual(mockSection)
    })

    it('should update single field only', async () => {
      const mockSection: NoteSection = {
        id: '123',
        user_id: 'user-1',
        name: 'Original Name',
        color: '#10B981',
        order_index: 0,
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockClient = createMockSupabaseClient(mockSection)
      const service = new SectionsService(mockClient)

      const result = await service.updateSection('123', { color: '#10B981' })

      expect(result.color).toBe('#10B981')
    })

    it('should throw error when update fails', async () => {
      const mockError = new Error('Section not found')
      const mockClient = createMockSupabaseClient(null, mockError)
      const service = new SectionsService(mockClient)

      await expect(service.updateSection('123', { name: 'New' })).rejects.toThrow()
    })
  })

  describe('deleteSection', () => {
    it('should delete section without returning data', async () => {
      const mockClient = createMockSupabaseClient(null)
      const service = new SectionsService(mockClient)

      await expect(service.deleteSection('123')).resolves.not.toThrow()
    })

    it('should not throw when deleting non-existent section', async () => {
      // Supabase DELETE doesn't error on non-existent IDs
      const mockClient = createMockSupabaseClient(null)
      const service = new SectionsService(mockClient)

      await expect(service.deleteSection('nonexistent')).resolves.not.toThrow()
    })

    it('should throw error when delete fails', async () => {
      const mockError = new Error('Delete failed')
      const mockClient = createMockSupabaseClient(null, mockError)
      const service = new SectionsService(mockClient)

      await expect(service.deleteSection('123')).rejects.toThrow()
    })
  })

  describe('reorderSections', () => {
    it('should update order_index for multiple sections', async () => {
      const mockClient = createMockSupabaseClient(null)
      const service = new SectionsService(mockClient)

      const sectionOrders = [
        { id: 'section-1', order_index: 2 },
        { id: 'section-2', order_index: 0 },
        { id: 'section-3', order_index: 1 },
      ]

      await service.reorderSections(sectionOrders)
      expect(mockClient.from).toHaveBeenCalledWith('note_sections')
      await expect(service.reorderSections(sectionOrders)).resolves.not.toThrow()
    })

    it('should throw error if any update fails', async () => {
      const mockError = new Error('Update failed')
      const mockClient = createMockSupabaseClient(null, mockError)
      const service = new SectionsService(mockClient)

      await expect(service.reorderSections([
        { id: 'section-1', order_index: 0 }
      ])).rejects.toThrow('Failed to reorder sections')
    })
  })

  describe('getSectionWithPages', () => {
    it('should return section with nested pages', async () => {
      const mockData = {
        id: '123',
        user_id: 'user-1',
        name: 'Section with Pages',
        color: '#3B82F6',
        order_index: 0,
        created_at: '2024-01-01T00:00:00Z',
        note_pages: [
          { id: 'page-1', title: 'Page 1' },
          { id: 'page-2', title: 'Page 2' },
        ],
      }

      const mockClient = createMockSupabaseClient(mockData)
      const service = new SectionsService(mockClient)

      const result = await service.getSectionWithPages('123')

      expect(result).toEqual(mockData)
      expect(result?.note_pages).toHaveLength(2)
    })

    it('should return null when section not found', async () => {
      const mockError = { code: 'PGRST116' } as any
      const mockClient = createMockSupabaseClient(null, mockError)
      const service = new SectionsService(mockClient)

      const result = await service.getSectionWithPages('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('getPageCount', () => {
    it('should return count of pages in section', async () => {
      const mockClient = createMockSupabaseClient([
        { id: '1' }, { id: '2' }, { id: '3' }
      ])
      const service = new SectionsService(mockClient)

      const count = await service.getPageCount('section-1')

      expect(count).toBe(3)
    })

    it('should return 0 when section has no pages', async () => {
      const mockClient = createMockSupabaseClient([])
      const service = new SectionsService(mockClient)

      const count = await service.getPageCount('empty-section')

      expect(count).toBe(0)
    })

    it('should throw error when count query fails', async () => {
      const mockError = new Error('Count failed')
      const mockClient = createMockSupabaseClient(null, mockError)
      const service = new SectionsService(mockClient)

      await expect(service.getPageCount('section-1')).rejects.toThrow()
    })
  })

  describe('edge cases', () => {
    it('should handle section with max order_index', async () => {
      const mockSection: NoteSection = {
        id: '123',
        user_id: 'user-1',
        name: 'Last Section',
        color: null,
        order_index: 999,
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockClient = createMockSupabaseClient(mockSection)
      const service = new SectionsService(mockClient)

      const result = await service.createSection({
        user_id: 'user-1',
        name: 'Last Section',
        order_index: 999,
      })

      expect(result.order_index).toBe(999)
    })

    it('should handle section with long name', async () => {
      const longName = 'A'.repeat(100)
      const mockSection: NoteSection = {
        id: '123',
        user_id: 'user-1',
        name: longName,
        color: null,
        order_index: 0,
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockClient = createMockSupabaseClient(mockSection)
      const service = new SectionsService(mockClient)

      const result = await service.createSection({
        user_id: 'user-1',
        name: longName,
      })

      expect(result.name).toBe(longName)
    })
  })
})