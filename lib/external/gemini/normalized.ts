/**
 * Internal message format (database representation)
 */
export interface NormalizedMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  ayahReferences?: string[] // ["2:255", "3:159"]
  tafsirUsed?: string[]
  timestamp?: Date
}

/**
 * Conversation context for AI
 */
export interface ConversationContext {
  conversationId: string
  messages: NormalizedMessage[]
  userNotes?: Array<{
    ayahKey: string
    noteText: string
    tags: string[]
  }>
}