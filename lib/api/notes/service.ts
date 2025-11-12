import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { NotFoundError } from '../errors'
import { notFound } from 'next/navigation'

type NotePage = Database['public']['Tables']['note_pages']['Row']
type NotePageInsert = Database['public']['Tables']['note_pages']['Insert']
type NotePageUpdate = Database['public']['Tables']['note_pages']['Update']

export class NotesService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getAllNotes(): Promise<NotePage[]> {
    const { data, error } = await this.supabase
      .from('note_pages')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      if (error.code === 'PGRST116') {
        console.error('[NotesService] Note not found for soft delete:', error)
        throw new NotFoundError('Note not found')
      }
      console.error('[NotesService] Error fetching notes:', error)
      throw error
    }

    return data
  }

  async getNoteById(id: string): Promise<NotePage | null> {
    const { data, error } = await this.supabase
      .from('note_pages')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) {
      // not found code
     if (error.code === 'PGRST116') {
        throw new NotFoundError('Note not found')
      }
      console.error('[NotesService] Error fetching note:', error)
      throw error
    }

    return data
  }

  async createNote(
    note: Omit<NotePageInsert, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>
  ): Promise<NotePage> {
    const { data, error } = await this.supabase
      .from('note_pages')
      .insert(note)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Note not found')
      }
      console.error('[NotesService] Error creating note:', error)
      throw error
    }

    return data
  }

  async updateNote(id: string, updates: NotePageUpdate): Promise<NotePage> {
    const { data, error } = await this.supabase
      .from('note_pages')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Note not found')
      }
      console.error('[NotesService] Error updating note:', error)
      throw error
    }

    return data
  }

  async softDeleteNote(id: string): Promise<NotePage> {
    const { data, error } = await this.supabase
      .from('note_pages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Note not found')
      }
      console.error('[NotesService] Error soft deleting note:', error)
      throw error
    }

    return data
  }

  async permanentlyDeleteNote(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('note_pages')
      .delete()
      .eq('id', id)

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Note not found')
      }
      console.error('[NotesService] Error permanently deleting note:', error)
      throw error
    }
  }

  async getNotesBySection(sectionId: string): Promise<NotePage[]> {
    const { data, error } = await this.supabase
      .from('note_pages')
      .select('*')
      .eq('section_id', sectionId)
      .is('deleted_at', null)
      .order('order_index', { ascending: true })

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Note not found')
      }
      console.error('[NotesService] Error fetching section notes:', error)
      throw error
    }

    return data
  }

// GET deleted notes
  async getDeletedNotes(): Promise<NotePage[]> {
    const { data, error } = await this.supabase
      .from('note_pages')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Note not found')
      }
      console.error('[NotesService] Error fetching deleted notes:', error)
      throw error
    }

    return data
  }

// restore note
  async restoreNote(id: string): Promise<NotePage> {
    const { data, error } = await this.supabase
      .from('note_pages')
      .update({ deleted_at: null })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Note not found')
      }
      console.error('[NotesService] Error restoring note:', error)
      throw error
    }

    return data
  }
}