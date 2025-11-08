import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

type Conversation = Database['public']['Tables']['conversations']['Row']
type ConversationInsert = Database['public']['Tables']['conversations']['Insert']
type ConversationUpdate = Database['public']['Tables']['conversations']['Update']

/**
 * Service layer for conversations
 * Manages chat conversation lifecycle
 */
export class ConversationsService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Get all active (non-archived) conversations
   */
  async getAllConversations(): Promise<Conversation[]> {
    const { data, error } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('archived', false)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[ConversationsService] Error fetching conversations:', error)
      throw error
    }

    return data
  }

  /**
   * Get archived conversations
   */
  async getArchivedConversations(): Promise<Conversation[]> {
    const { data, error } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('archived', true)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[ConversationsService] Error fetching archived conversations:', error)
      throw error
    }

    return data
  }

  /**
   * Get a single conversation by ID
   */
  async getConversationById(id: string): Promise<Conversation | null> {
    const { data, error } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('[ConversationsService] Error fetching conversation:', error)
      throw error
    }

    return data
  }

  /**
   * Create a new conversation
   * Title can be auto-generated from first message later
   */
  async createConversation(
    conversation: Omit<ConversationInsert, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Conversation> {
    const { data, error } = await this.supabase
      .from('conversations')
      .insert(conversation)
      .select()
      .single()

    if (error) {
      console.error('[ConversationsService] Error creating conversation:', error)
      throw error
    }

    return data
  }

  /**
   * Update conversation (e.g., change title)
   */
  async updateConversation(
    id: string,
    updates: ConversationUpdate
  ): Promise<Conversation> {
    const { data, error } = await this.supabase
      .from('conversations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[ConversationsService] Error updating conversation:', error)
      throw error
    }

    return data
  }

  /**
   * Archive a conversation (soft delete)
   */
  async archiveConversation(id: string): Promise<Conversation> {
    const { data, error } = await this.supabase
      .from('conversations')
      .update({ archived: true })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[ConversationsService] Error archiving conversation:', error)
      throw error
    }

    return data
  }

  /**
   * Unarchive a conversation
   */
  async unarchiveConversation(id: string): Promise<Conversation> {
    const { data, error } = await this.supabase
      .from('conversations')
      .update({ archived: false })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[ConversationsService] Error unarchiving conversation:', error)
      throw error
    }

    return data
  }

  /**
   * Permanently delete a conversation
   * CASCADE deletes all messages in the conversation
   */
  async deleteConversation(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('conversations')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[ConversationsService] Error deleting conversation:', error)
      throw error
    }
  }
}