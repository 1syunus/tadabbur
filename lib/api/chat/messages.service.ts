import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

type Message = Database['public']['Tables']['messages']['Row']
type MessageInsert = Database['public']['Tables']['messages']['Insert']

/**
 * Service layer for messages
 * Messages are immutable - no update or delete methods
 */
export class MessagesService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Get all messages in a conversation
   * Ordered chronologically (oldest first)
   */
  async getConversationMessages(conversationId: string): Promise<Message[]> {
    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Message not found')
      }
      console.error('[MessagesService] Error fetching messages:', error)
      throw error
    }

    return data
  }

  /**
   * Get a single message by ID
   */
  async getMessageById(id: string): Promise<Message | null> {
    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('[MessagesService] Error fetching message:', error)
      throw error
    }

    return data
  }

  /**
   * Create a new message in a conversation
   */
  async createMessage(
    message: Omit<MessageInsert, 'id' | 'created_at'>
  ): Promise<Message> {
    const { data, error } = await this.supabase
      .from('messages')
      .insert(message)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Message not found')
      }
      console.error('[MessagesService] Error creating message:', error)
      throw error
    }

    return data
  }

  /**
   * Get the last N messages from a conversation
   * Useful for AI context window (e.g., last 10 messages)
   */
  async getRecentMessages(
    conversationId: string,
    limit: number = 10
  ): Promise<Message[]> {
    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Message not found')
      }
      console.error('[MessagesService] Error fetching recent messages:', error)
      throw error
    }

    // Reverse to get chronological order
    if (!data) {
      return []
    }
    return data.reverse()
  }

  /**
   * Get message count for a conversation
   */
  async getMessageCount(conversationId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Message not found')
      }
      console.error('[MessagesService] Error counting messages:', error)
      throw error
    }

    return count ?? 0
  }
}