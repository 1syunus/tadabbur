import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { NormalizedMessage } from '@/lib/external/gemini/normalized'
import { TafsirUsedArraySchema } from '../external/gemini/validations/tafsir'

type Message = Database['public']['Tables']['messages']['Row']

/**
 * Repository for conversation message persistence
 * 
 * Handles:
 * - Fetching conversation history (with RLS)
 * - Saving new messages
 * - Retrieving last N messages for AI context
 */
export class ConversationRepo {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Get last N messages from conversation
   * 
   * @param conversationId - Conversation UUID
   * @param limit - Number of messages to fetch (default: 10)
   * @returns Array of normalized messages (chronological order)
   */
  async getRecentMessages(
    conversationId: string,
    limit: number = 10,
  ): Promise<NormalizedMessage[]> {
    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false }) // DESC for LIMIT
      .limit(limit)

    if (error) {
      console.error('[ConversationRepo] Error fetching messages:', error)
      throw error
    }

    // Reverse to chronological order (oldest first)
    const messages = data.reverse()

    return messages.map((msg) => this.toNormalizedMessage(msg))
  }

  /**
   * Save new message to database
   * 
   * @param conversationId - Conversation UUID
   * @param message - Normalized message to save
   */
  async saveMessage(
    conversationId: string,
    message: NormalizedMessage,
  ): Promise<void> {
    const { error } = await this.supabase.from('messages').insert({
      conversation_id: conversationId,
      role: message.role,
      content: message.content,
      ayah_references: message.ayahReferences ?? [],
      tafsir_used: message.tafsirUsed ?? [],
    })

    if (error) {
      console.error('[ConversationRepo] Error saving message:', error)
      throw error
    }
  }

  /**
   * Convert database message to normalized format
   */
  private toNormalizedMessage(msg: Message): NormalizedMessage {
    const tafsirUsed = TafsirUsedArraySchema.parse(msg.tafsir_used ?? [])
    return {
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
      ayahReferences: msg.ayah_references ?? undefined,
      tafsirUsed,
      timestamp: msg.created_at ? new Date(msg.created_at) : undefined,
    }
  }
}