/**
 * Time-Based Conversation Grouping Utility
 * 
 * Pure function for grouping conversations by time periods.
 * Time is an explicit dependency - no ambient Date.now() calls.
 * 
 * CRITICAL INVARIANTS (enforced by tests):
 * - Group labels must be exact strings: "Today", "Yesterday", "Previous 7 Days", "Previous 30 Days"
 * - Empty groups are omitted from output
 * - Uses UTC calendar-day boundaries (NOT client local time)
 * - Conversations sorted newest first within each group
 * - Function is PURE: same inputs always produce same outputs
 * 
 * @module features/chat/utils/grouping
 */

import type { ConversationWithPreview, TimeGroup } from '../types'

/**
 * Groups conversations by time periods relative to a reference date.
 * 
 * Time periods (UTC day boundaries for timezone-independent grouping):
 * NOTE: Uses calendar-day boundaries, not rolling 7×24h windows
 * 
 * - "Today": timestamp >= start of reference UTC date (00:00:00 UTC)
 * - "Yesterday": timestamp >= start of yesterday UTC && < start of today UTC
 * - "Previous 7 Days": timestamp >= 8 days ago UTC && < start of yesterday UTC
 * - "Previous 30 Days": timestamp >= 30 days ago UTC && < 8 days ago UTC
 * 
 * Conversations older than 30 days are excluded.
 * Conversations with null timestamps are excluded.
 * 
 * PURE FUNCTION: Time is explicit dependency, not ambient global.
 * - In tests: Pass explicit Date for determinism
 * - In production: Omit parameter to use current time
 * 
 * INVARIANTS:
 * - Returns only non-empty groups (empty groups omitted)
 * - Conversations within groups sorted by lastMessageTimestamp desc (newest first)
 * - Uses UTC day boundaries (matches ISO 8601 timestamp semantics)
 * - Same inputs always produce same outputs (pure function)
 * 
 * @param conversations - Array of conversations enriched with preview and timestamp
 * @param now - Reference date for grouping (defaults to current date for production use)
 * @returns Partial object with time group keys and conversation arrays (empty groups omitted)
 * 
 * @example
 * ```typescript
 * // In tests (explicit time for determinism)
 * const grouped = groupConversationsByTime(conversations, new Date('2024-01-15T14:30:00Z'))
 * 
 * // In production (implicit current time)
 * const grouped = groupConversationsByTime(conversations)
 * 
 * // Result (empty groups omitted):
 * // {
 * //   "Today": [{ id: '1', lastMessageTimestamp: '2024-01-15T14:30:00Z', ... }],
 * //   "Yesterday": [{ id: '2', lastMessageTimestamp: '2024-01-14T12:00:00Z', ... }]
 * // }
 * ```
 */
export function groupConversationsByTime(
  conversations: ConversationWithPreview[],
  now: Date = new Date()
): Partial<Record<TimeGroup, ConversationWithPreview[]>> {
  // Calculate day boundaries in UTC (matches ISO string timestamps)
  // Each boundary represents midnight (00:00:00) UTC on that day
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const yesterday = new Date(today.getTime() - 86400000)
  const eightDaysAgo = new Date(today.getTime() - 8 * 86400000) // Midnight UTC 8 calendar days ago (inclusive lower bound for "Previous 7 Days")
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000) // Midnight UTC 30 calendar days ago (inclusive lower bound for "Previous 30 Days")
  
  // Initialize groups
  const groups: Record<TimeGroup, ConversationWithPreview[]> = {
    'Today': [],
    'Yesterday': [],
    'Previous 7 Days': [],
    'Previous 30 Days': [],
  }
  
  // Group conversations by timestamp
  for (const conversation of conversations) {
    const timestampStr = conversation.lastMessageTimestamp
    
    // Skip conversations with no timestamp
    if (!timestampStr) continue
    
    // Convert ISO string to Date for comparison
    const timestamp = new Date(timestampStr)
    
    // Skip conversations older than 30 days
    if (timestamp < thirtyDaysAgo) continue
    
    // Assign to appropriate group
    // Boundaries (calendar):
    // - Today: >= today midnight (day 0)
    // - Yesterday: >= yesterday midnight && < today midnight (day 1)
    // - Previous 7 Days: >= 8 days ago midnight && < yesterday midnight (days 2-8)
    // - Previous 30 Days: >= 30 days ago midnight && < 8 days ago midnight (days 8-30)
    
    if (timestamp >= today) {
      groups['Today'].push(conversation)
    } else if (timestamp >= yesterday) {
      groups['Yesterday'].push(conversation)
    } else if (timestamp >= eightDaysAgo) {
      groups['Previous 7 Days'].push(conversation)
    } else if (timestamp >= thirtyDaysAgo) {
      groups['Previous 30 Days'].push(conversation)
    }
  }
  
  // Sort within each group (newest first)
  const sortByTimestampDesc = (a: ConversationWithPreview, b: ConversationWithPreview) => {
    const timeA = a.lastMessageTimestamp ? new Date(a.lastMessageTimestamp).getTime() : 0
    const timeB = b.lastMessageTimestamp ? new Date(b.lastMessageTimestamp).getTime() : 0
    return timeB - timeA // Descending
  }
  
  for (const key of Object.keys(groups) as TimeGroup[]) {
    groups[key].sort(sortByTimestampDesc)
  }
  
  // Return only non-empty groups (Partial<Record> semantics)
  const result: Partial<Record<TimeGroup, ConversationWithPreview[]>> = {}
  for (const [key, value] of Object.entries(groups) as [TimeGroup, ConversationWithPreview[]][]) {
    if (value.length > 0) {
      result[key] = value
    }
  }
  
  return result
}