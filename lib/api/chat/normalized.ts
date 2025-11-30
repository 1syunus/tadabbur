/**
 * Normalized Types for Chat Domain
 * 
 * Converts snake_case database types to camelCase API responses
 * 
 * @module lib/api/chat/normalized
 */

import type { Database } from '@/types/supabase'

// ==========================================
// NORMALIZED TYPES
// ==========================================

/**
 * Conversation (normalized for API responses)
 */
export interface NormalizedConversation {
  id: string
  title: string | null
  isArchived: boolean | null
  createdAt: string | null
  updatedAt: string | null
}

/**
 * Message (normalized for API responses)
 */
export interface NormalizedMessage {
  id: string
  conversationId: string
  role: string
  content: string
  ayahReferences: string[] | null
  tafsirUsed: Array<{
    ayahKey: string
    sourceName: string
    sourceId: number
    excerpt: string
  }> | null
  createdAt: string | null
}

// ==========================================
// MAPPER FUNCTIONS
// ==========================================

/**
 * Map Conversation from database to normalized format
 */
export function normalizeConversation(
  raw: Database['public']['Tables']['conversations']['Row']
): NormalizedConversation {
  return {
    id: raw.id,
    title: raw.title,
    isArchived: raw.archived,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

/**
 * Map array of Conversations
 */
export function normalizeConversations(
  raw: Database['public']['Tables']['conversations']['Row'][]
): NormalizedConversation[] {
  return raw.map(normalizeConversation)
}

/**
 * Map Message from database to normalized format
 */
export function normalizeMessage(
  raw: Database['public']['Tables']['messages']['Row']
): NormalizedMessage {
  return {
    id: raw.id,
    conversationId: raw.conversation_id,
    role: raw.role,
    content: raw.content,
    ayahReferences: raw.ayah_references,
    tafsirUsed: raw.tafsir_used as any, // JSON field
    createdAt: raw.created_at,
  }
}

/**
 * Map array of Messages
 */
export function normalizeMessages(
  raw: Database['public']['Tables']['messages']['Row'][]
): NormalizedMessage[] {
  return raw.map(normalizeMessage)
}