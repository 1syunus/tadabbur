/**
 * Preview and Timestamp Derivation Utilities
 * 
 * Pure functions for deriving preview text and timestamps from messages.
 * 
 * CRITICAL INVARIANTS (enforced by tests):
 * - derivePreview returns empty string ('') when messages.length === 0
 * - derivePreview never returns null, undefined, or placeholder text
 * - deriveTimestamp returns null when messages.length === 0
 * - deriveTimestamp never returns undefined, Date(0), or empty string
 * - Messages must be sorted chronologically before calling these functions
 * 
 * @module features/chat/utils/preview
 */

import type { NormalizedMessage } from '@ui/lib/frontend/api'

/**
 * Derives preview text from messages.
 * 
 * Returns the content of the last message chronologically,
 * or an empty string if no messages exist.
 * 
 * NOTE: Caller guarantees chronological order (oldest → newest).
 * This function does NOT sort for performance reasons.
 * 
 * INVARIANTS:
 * - Returns empty string ('') when messages array is empty
 * - Never returns null, undefined, or placeholder text
 * - Uses message.content field specifically
 * 
 * @param messages - Array of messages sorted chronologically (oldest → newest)
 * @returns Last message content or empty string
 * 
 * @example
 * ```typescript
 * derivePreview([]) // ''
 * derivePreview([{ content: 'Hello', ... }]) // 'Hello'
 * derivePreview([
 *   { content: 'First', ... },
 *   { content: 'Last', ... }
 * ]) // 'Last'
 * ```
 */
export function derivePreview(messages: NormalizedMessage[]): string {
  if (messages.length === 0) {
    return ''
  }
  
  return messages[messages.length - 1].content
}

/**
 * Derives timestamp from messages.
 * 
 * Returns the ISO 8601 timestamp string of the last message chronologically,
 * or null if no messages exist.
 * 
 * NOTE: Caller guarantees chronological order (oldest → newest).
 * This function does NOT sort for performance reasons.
 * 
 * INVARIANTS:
 * - Returns null when messages array is empty
 * - Returns ISO 8601 string (e.g., "2024-01-01T12:00:00Z")
 * - Never returns undefined or empty string
 * - Uses the last message chronologically
 * 
 * @param messages - Array of messages sorted chronologically (oldest → newest)
 * @returns Last message ISO 8601 timestamp string or null
 * 
 * @example
 * ```typescript
 * deriveTimestamp([]) // null
 * deriveTimestamp([{ createdAt: '2024-01-01T12:00:00Z', ... }]) // '2024-01-01T12:00:00Z'
 * deriveTimestamp([
 *   { createdAt: '2024-01-01T12:00:00Z', ... },
 *   { createdAt: '2024-01-02T12:00:00Z', ... }
 * ]) // '2024-01-02T12:00:00Z'
 * ```
 */
export function deriveTimestamp(messages: NormalizedMessage[]): string | null {
  if (messages.length === 0) {
    return null
  }
  
  return messages[messages.length - 1].createdAt
}