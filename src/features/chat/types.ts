/**
 * Chat Feature Types
 * 
 * Core type definitions for the chat feature.
 * All normalized data types are imported from DAL (single source of truth).
 * 
 * @module features/chat/types
 */

import type {
  NormalizedConversation,
  NormalizedMessage,
  AIResponse,
} from '@/lib/frontend/api'

// Re-export DAL types for convenience
export type { NormalizedConversation, NormalizedMessage, AIResponse }

/**
 * Time-based grouping labels matching UI monolith contract.
 * These are the ONLY valid group labels - no variations allowed.
 */
export type TimeGroup = 
  | 'Today' 
  | 'Yesterday' 
  | 'Previous 7 Days' 
  | 'Previous 30 Days'

/**
 * Conversation enriched with derived preview and timestamp.
 * 
 * CRITICAL: Preview and timestamp are DERIVED client-side, NOT from API.
 * The API does NOT provide these fields.
 * 
 * This type EXTENDS (not wraps) NormalizedConversation.
 */
export interface ConversationWithPreview extends NormalizedConversation {
  /** 
   * Last message content when messages exist; empty string otherwise.
   * Never null, undefined, or placeholder text.
   */
  previewText: string
  
  /** 
   * Last message timestamp when messages exist; null otherwise.
   * Never undefined, Date(0), or empty string.
   */
  lastMessageTimestamp: Date | null
}