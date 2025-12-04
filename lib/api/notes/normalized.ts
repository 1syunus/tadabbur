/**
 * Normalized Types for Notes Domain
 * 
 * Converts snake_case database types to camelCase API responses
 * 
 * @module lib/api/notes/normalized
 */

import type { Database } from '@/types/supabase'

// ==========================================
// NORMALIZED TYPES
// ==========================================

/**
 * Note Page (normalized for API responses)
 */
export interface NormalizedNotePage {
  id: string
  title: string | null
  content: string | null
  sectionId: string | null
  orderIndex: number | null
  createdAt: string | null
  updatedAt: string | null
  deletedAt: string | null
}

// ==========================================
// MAPPER FUNCTIONS
// ==========================================

/**
 * Map NotePage from database to normalized format
 */
export function normalizeNotePage(
  raw: Database['public']['Tables']['note_pages']['Row']
): NormalizedNotePage {
  return {
    id: raw.id,
    title: raw.title,
    content: raw.content,
    sectionId: raw.section_id,
    orderIndex: raw.order_index,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    deletedAt: raw.deleted_at,
  }
}

/**
 * Map array of NotePages
 */
export function normalizeNotePages(
  raw: Database['public']['Tables']['note_pages']['Row'][]
): NormalizedNotePage[] {
  return raw.map(normalizeNotePage)
}