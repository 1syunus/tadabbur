/**
 * Normalized Types for Sections Domain
 * 
 * Converts snake_case database types to camelCase API responses
 * 
 * @module lib/api/sections/normalized
 */

import type { Database } from '@/types/supabase'

// ==========================================
// NORMALIZED TYPES
// ==========================================

/**
 * Note Section (normalized for API responses)
 */
export interface NormalizedNoteSection {
  id: string
  name: string
  color: string | null
  orderIndex: number | null
  createdAt: string | null
}

// ==========================================
// MAPPER FUNCTIONS
// ==========================================

/**
 * Map NoteSection from database to normalized format
 */
export function normalizeNoteSection(
  raw: Database['public']['Tables']['note_sections']['Row']
): NormalizedNoteSection {
  return {
    id: raw.id,
    name: raw.name,
    color: raw.color,
    orderIndex: raw.order_index,
    createdAt: raw.created_at,
  }
}

/**
 * Map array of NoteSections
 */
export function normalizeNoteSections(
  raw: Database['public']['Tables']['note_sections']['Row'][]
): NormalizedNoteSection[] {
  return raw.map(normalizeNoteSection)
}