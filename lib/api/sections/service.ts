import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

type NoteSection = Database['public']['Tables']['note_sections']['Row']
type NoteSectionInsert = Database['public']['Tables']['note_sections']['Insert']
type NoteSectionUpdate = Database['public']['Tables']['note_sections']['Update']

/**
 * Service layer for note_sections operations
 * Sections organize notebook pages into tabs/groups
 */
export class SectionsService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * get all auth'd user's sections
   * Ordered by order_index for tab display
   */
  async getAllSections(): Promise<NoteSection[]> {
    const { data, error } = await this.supabase
      .from('note_sections')
      .select('*')
      .order('order_index', { ascending: true })

    if (error) {
      console.error('[SectionsService] Error fetching sections:', error)
      throw error
    }

    return data
  }

  /**
   * get section by id
   * Returns null if not found
   */
  async getSectionById(id: string): Promise<NoteSection | null> {
    const { data, error } = await this.supabase
      .from('note_sections')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('[SectionsService] Error fetching section:', error)
      throw error
    }

    return data
  }

  /**
   * on creating a new section
   * user_id will be set by RLS INSERT policy
   */
  async createSection(
    section: Omit<NoteSectionInsert, 'id' | 'created_at'>
  ): Promise<NoteSection> {
    const { data, error } = await this.supabase
      .from('note_sections')
      .insert(section)
      .select()
      .single()

    if (error) {
      console.error('[SectionsService] Error creating section:', error)
      throw error
    }

    return data
  }

  /**
   * update a section
   */
  async updateSection(
    id: string,
    updates: NoteSectionUpdate
  ): Promise<NoteSection> {
    const { data, error } = await this.supabase
      .from('note_sections')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[SectionsService] Error updating section:', error)
      throw error
    }

    return data
  }

  /**
   * hard delete
   * associated note_pages will have section_id set to NULL (ON DELETE SET NULL)
   */
  async deleteSection(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('note_sections')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[SectionsService] Error deleting section:', error)
      throw error
    }
  }

  /**
 * Reorder sections
 * Updates order_index for multiple sections
 */
  async reorderSections(
    sectionOrders: Array<{ id: string; order_index: number }>
  ): Promise<void> {
    // Update each section's order_index
    const updates = sectionOrders.map(({ id, order_index }) =>
      this.supabase
        .from('note_sections')
        .update({ order_index })
        .eq('id', id)
    )

    const results = await Promise.all(updates)

    const errors = results.filter((r) => r.error)
    if (errors.length > 0) {
      console.error('[SectionsService] Error reordering sections:', errors)
      throw new Error('Failed to reorder sections')
    }
  }

  /**
   * Get section with all its pages
   * Useful for displaying a section's contents
   */
  async getSectionWithPages(id: string): Promise<(NoteSection & { note_pages: any[] }) | null> {
    const { data, error } = await this.supabase
      .from('note_sections')
      .select(`
        *,
        note_pages (*)
      `)
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('[SectionsService] Error fetching section with pages:', error)
      throw error
    }

    return data
  }

  /**
   * Count pages in a section
   */
  async getPageCount(sectionId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('note_pages')
      .select('id', { count: 'exact', head: true })
      .eq('section_id', sectionId)
      .is('deleted_at', null)

    if (error) {
      console.error('[SectionsService] Error counting pages:', error)
      throw error
    }

    return count ?? 0
  }
}