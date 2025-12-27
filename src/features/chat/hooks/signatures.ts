/**
 * Hook Type Signatures for Chat Feature
 * 
 * These are TypeScript-only definitions with no implementation.
 * Each hook includes JSDoc comments describing its purpose and behavior.
 * 
 * CRITICAL: Preview text and timestamps are DERIVED from messages,
 * not fetched from API. The  API does NOT provide these fields.
 * 
 * Implementation will happen in subsequent PRs.
 * 
 * @module features/chat/hooks/signatures
 */

import type {
  NormalizedConversation,
  NormalizedMessage,
  AIResponse,
} from '@ui/lib/frontend/api'

import type { ConversationWithPreview } from '../types'

// =======================================================
// CONVERSATIONS HOOK
// =======================================================

/**
 * Manages conversation list and CRUD operations.
 * 
 * Features:
 * - Fetches all active conversations on mount
 * - Creates new conversations
 * - Updates conversation titles
 * - Archives conversations (soft delete, sets isArchived=true)
 * - Provides loading/error states
 * - Auto-refetches on mutations
 * 
 * Caching (React Query):
 * - Key: ['conversations']
 * - Stale time: 30s
 * - Invalidates on create/update/archive
 * 
 * @returns Conversation management interface
 */
export declare function useConversations(): {
  /** List of all active conversations (NOT archived) */
  conversations: NormalizedConversation[]
  
  /** Loading state for initial fetch */
  isLoading: boolean
  
  /** Error from fetch or mutations */
  error: Error | null
  
  /** 
   * Create a new conversation
   * @param title - Optional initial title (defaults to "New Conversation")
   * @returns Promise resolving to new conversation
   */
  createConversation: (title?: string) => Promise<NormalizedConversation>
  
  /**
   * Update conversation title
   * @param id - Conversation ID
   * @param title - New title
   * @returns Promise resolving to updated conversation
   */
  updateConversationTitle: (id: string, title: string) => Promise<NormalizedConversation>
  
  /**
   * Archive conversation (soft delete, sets isArchived=true)
   * Calls api.conversations.delete(id); frontend invalidates ['conversations']
   * @param id - Conversation ID
   * @returns Promise resolving when complete
   */
  archiveConversation: (id: string) => Promise<void>
  
  /**
   * Manually refetch conversation list
   * Useful for pull-to-refresh or retry after error
   */
  refetch: () => Promise<void>
}

// =======================================================
// MESSAGES HOOK
// =======================================================

/**
 * Fetches message history for a specific conversation.
 * 
 * Features:
 * - Loads all messages for a conversation on mount
 * - Automatically refetches when conversationId changes
 * - Sorts messages chronologically (oldest first)
 * - Provides loading/error states
 * - Returns empty array if conversation doesn't exist
 * 
 * Caching (React Query):
 * - Key: ['conversations', conversationId, 'messages']
 * - Stale time: 10s
 * - Invalidates on new messages
 * 
 * @param conversationId - ID of conversation to fetch messages for
 * @returns Message list interface
 */
export declare function useMessages(conversationId: string): {
  /** List of messages in chronological order (oldest first) */
  messages: NormalizedMessage[]
  
  /** Loading state for initial fetch */
  isLoading: boolean
  
  /** Error from fetch */
  error: Error | null
  
  /**
   * Manually refetch messages
   * Useful after connection issues or suspected staleness
   */
  refetch: () => Promise<void>
}

// =======================================================
// CONVERSATIONS WITH PREVIEW HOOK
// =======================================================

/**
 * Enriches conversations with preview text and timestamp from their messages.
 * 
 * CRITICAL: Preview and timestamp are DERIVED client-side, NOT from API.
 * The  API does NOT provide these fields.
 * 
 * Features:
 * - Fetches all conversations
 * - Fetches messages for each conversation using cached message queries
 * - Derives preview text (last message content when messages exist; empty otherwise)
 * - Derives timestamp (last message date)
 * - Handles conversations with no messages gracefully
 * 
 * Performance:
 * - Messages are cached per conversation (10s stale time)
 * 
 * @returns Enriched conversations with previews
 */
export declare function useConversationsWithPreview(): {
  /** Conversations enriched with preview and timestamp */
  conversations: ConversationWithPreview[]
  
  /** Loading state for conversations and messages */
  isLoading: boolean
  
  /** Error from conversations or messages fetch */
  error: Error | null
  
  /** Refetch both conversations and their messages */
  refetch: () => Promise<void>
}

// =======================================================
// CHAT SENDER HOOK
// =======================================================

/**
 * Sends user messages and receives AI responses.
 * 
 * Features:
 * - Optimistic UI: User message appears immediately
 * - Sends message to Gemini API via backend
 * - Receives AI response with Quranic context
 * - Progressive reveal of AI response
 * - Extracts ayah references from AI response
 * - Automatic rollback on error
 * - Controls typing indicator via isTyping state
 * 
 * Behavior:
 * - User message appears instantly (optimistic update)
 * - isTyping state controls typing indicator visibility
 * - AI response reveals progressively
 * - Message list auto-scrolls during reveal
 * - isTyping clears when complete
 * 
 * Error Handling:
 * - Network errors: Rollback + show retry in toast
 * - API errors: Rollback + show error toast
 * 
 * React Query:
 * - Mutation with optimistic updates
 * - Invalidates messages query on success
 * 
 * @param conversationId - ID of conversation to send message in
 * @returns Chat sender interface
 */
export declare function useChatSender(conversationId: string): {
  /**
   * Send a user message and get AI response
   * @param message - User's message text
   * @returns Promise resolving to AI response with metadata
   */
  sendMessage: (message: string) => Promise<AIResponse>
  
  /** True while waiting for AI response */
  isSending: boolean
  
  /** Error from send operation */
  error: Error | null
  
  /** 
   * Current AI response being progressively revealed
   * Accumulates as reveal progresses
   * Empty string when not revealing
   */
  streamingMessage: string
  
  /**
   * True while AI response is being revealed or waiting for response
   * Used to control typing indicator visibility
   * Single semantic state for typing behavior
   */
  isTyping: boolean
  
  /**
   * Extracted ayah references from latest AI response
   * Format: ["1:1", "2:255", "112:1-4"]
   * Empty array if no references
   */
  ayahReferences: string[]
}