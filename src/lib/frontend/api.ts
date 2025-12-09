/**
 * Frontend Data Access Layer (DAL)
 * 
 * Single source of truth for all API communication.
 * Provides type-safe functions for every backend endpoint.
 * 
 * Architecture:
 * - Core fetcher with error handling
 * - Grouped by domain (notes, sections, conversations, messages, gemini, quran, health)
 * - Strictly typed inputs/outputs
 * - Maps directly to API_ENDPOINTS specification
 * 
 * @module lib/frontend/api
 */

import type {
  NormalizedNotePage,
} from '@/lib/api/notes/normalized'

import type {
  NormalizedNoteSection,
} from '@/lib/api/sections/normalized'

import type {
  NormalizedConversation,
  NormalizedMessage,
} from '@/lib/api/chat/normalized'

import type {
  NormalizedAyah,
  NormalizedSearchResponse,
  NormalizedTafsir,
  NormalizedSurah,
} from '@/lib/external/quran/normalized'

// =======================================================
// ERROR TYPES
// =======================================================

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// =======================================================
// HEALTH CHECK TYPES
// =======================================================

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  checks: {
    api: { status: 'pass'; message: string }
    quranService: { status: 'pass' | 'fail' | 'warn' | 'unknown'; message: string }
    quranApi: { status: 'pass' | 'fail' | 'warn' | 'unknown'; message: string }
    geminiConfig: { status: 'pass' | 'fail' | 'warn' | 'unknown'; message: string }
    database: { status: 'pass' | 'fail' | 'unknown'; message: string }
  }
  responseTime: number
  environment: string
}

// =======================================================
// GEMINI AI TYPES
// =======================================================

export interface AIResponse {
  message: string
  ayahReferences: string[]
  tafsirUsed: Array<{
    ayahKey: string
    sourceName: string
    sourceId: number
    excerpt: string
  }>
}

// =======================================================
// CORE FETCHER
// =======================================================

interface FetcherOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: any
  params?: Record<string, any>
  headers?: Record<string, string>
}

/**
 * Core fetcher function with error handling
 * 
 * Features:
 * - URL construction with query params
 * - Automatic JSON serialization
 * - Error handling with ApiError
 * - Response deserialization
 */
async function fetcher<T>(
  path: string,
  options: FetcherOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    params,
    headers = {},
  } = options

  // Build URL with query params
  let url = path
  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value))
      }
    })
    const queryString = searchParams.toString()
    if (queryString) {
      url = `${path}?${queryString}`
    }
  }

  // Build fetch options
  const fetchOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }

  if (body && (method === 'POST' || method === 'PATCH')) {
    fetchOptions.body = JSON.stringify(body)
  }

  // Execute request
  const response = await fetch(url, fetchOptions)

  // Parse response
  let data: any
  try {
    data = await response.json()
  } catch (e) {
    // Non-JSON response
    if (!response.ok) {
      throw new ApiError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status
      )
    }
    throw new ApiError('Invalid JSON response', response.status)
  }

  // Handle errors
  if (!response.ok) {
    const errorMessage = data.error || data.message || `HTTP ${response.status}`
    throw new ApiError(errorMessage, response.status, data)
  }

  // Check for explicit error field (some APIs return 200 with error field)
  if (data.error) {
    throw new ApiError(
      data.error,
      response.status,
      data
    )
  }

  return data as T
}

// =======================================================
// API CLIENT
// =======================================================

export const api = {
  // ==========================================
  // NOTES
  // ==========================================
  notes: {
    /**
     * List all active notes for authenticated user
     * GET /api/notes
     */
    list: async (): Promise<{ notes: NormalizedNotePage[] }> => {
      return fetcher('/api/notes')
    },

    /**
     * Create a new note
     * POST /api/notes
     */
    create: async (data: {
      title: string
      content?: string
      sectionId?: string | null
    }): Promise<{ note: NormalizedNotePage }> => {
      return fetcher('/api/notes', {
        method: 'POST',
        body: data,
      })
    },

    /**
     * Get a single note by ID
     * GET /api/notes/[id]
     */
    get: async (id: string): Promise<{ note: NormalizedNotePage }> => {
      return fetcher(`/api/notes/${id}`)
    },

    /**
     * Update a note (partial update supported)
     * PATCH /api/notes/[id]
     */
    update: async (
      id: string,
      data: {
        title?: string
        content?: string
        sectionId?: string | null
      }
    ): Promise<{ note: NormalizedNotePage }> => {
      return fetcher(`/api/notes/${id}`, {
        method: 'PATCH',
        body: data,
      })
    },

    /**
     * Permanently delete a note (hard delete)
     * DELETE /api/notes/[id]
     */
    delete: async (id: string): Promise<{ success: true }> => {
      return fetcher(`/api/notes/${id}`, {
        method: 'DELETE',
      })
    },

    /**
     * Archive a note (soft delete, sets deletedAt timestamp)
     * POST /api/notes/[id]/archive
     */
    archive: async (id: string): Promise<{ note: NormalizedNotePage }> => {
      return fetcher(`/api/notes/${id}/archive`, {
        method: 'POST',
      })
    },

    /**
     * Restore an archived note (clears deletedAt timestamp)
     * POST /api/notes/[id]/restore
     */
    restore: async (id: string): Promise<{ note: NormalizedNotePage }> => {
      return fetcher(`/api/notes/${id}/restore`, {
        method: 'POST',
      })
    },
  },

  // ==========================================
  // SECTIONS
  // ==========================================
  sections: {
    /**
     * List all sections for authenticated user (ordered by orderIndex)
     * GET /api/sections
     */
    list: async (): Promise<{ sections: NormalizedNoteSection[] }> => {
      return fetcher('/api/sections')
    },

    /**
     * Create a new section
     * POST /api/sections
     */
    create: async (data: {
      name: string
      color?: string
    }): Promise<{ section: NormalizedNoteSection }> => {
      return fetcher('/api/sections', {
        method: 'POST',
        body: data,
      })
    },

    /**
     * Get a single section by ID
     * GET /api/sections/[id]
     */
    get: async (id: string): Promise<{ section: NormalizedNoteSection }> => {
      return fetcher(`/api/sections/${id}`)
    },

    /**
     * Update section name and/or color
     * PATCH /api/sections/[id]
     */
    update: async (
      id: string,
      data: {
        name?: string
        color?: string
      }
    ): Promise<{ section: NormalizedNoteSection }> => {
      return fetcher(`/api/sections/${id}`, {
        method: 'PATCH',
        body: data,
      })
    },

    /**
     * Hard delete section (permanent removal, notes become orphaned)
     * DELETE /api/sections/[id]
     */
    delete: async (id: string): Promise<{ success: true }> => {
      return fetcher(`/api/sections/${id}`, {
        method: 'DELETE',
      })
    },
  },

  // ==========================================
  // CONVERSATIONS
  // ==========================================
  conversations: {
    /**
     * List all active conversations (not archived)
     * GET /api/chat
     */
    list: async (): Promise<{ conversations: NormalizedConversation[] }> => {
      return fetcher('/api/chat')
    },

    /**
     * Create a new conversation
     * POST /api/chat
     */
    create: async (data: {
      title: string
    }): Promise<{ conversation: NormalizedConversation }> => {
      return fetcher('/api/chat', {
        method: 'POST',
        body: data,
      })
    },

    /**
     * Get a single conversation by ID
     * GET /api/chat/[id]
     */
    get: async (id: string): Promise<{ conversation: NormalizedConversation }> => {
      return fetcher(`/api/chat/${id}`)
    },

    /**
     * Update conversation title
     * PATCH /api/chat/[id]
     */
    update: async (
      id: string,
      data: {
        title: string
      }
    ): Promise<{ conversation: NormalizedConversation }> => {
      return fetcher(`/api/chat/${id}`, {
        method: 'PATCH',
        body: data,
      })
    },

    /**
     * Archive conversation (soft delete, sets isArchived=true)
     * DELETE /api/chat/[id]
     */
    delete: async (id: string): Promise<{
      success: true
      conversation: NormalizedConversation
    }> => {
      return fetcher(`/api/chat/${id}`, {
        method: 'DELETE',
      })
    },
  },

  // ==========================================
  // MESSAGES
  // ==========================================
  messages: {
    /**
     * Get all messages in a conversation (chronological order)
     * GET /api/chat/[id]/messages
     */
    list: async (conversationId: string): Promise<{
      messages: NormalizedMessage[]
    }> => {
      return fetcher(`/api/chat/${conversationId}/messages`)
    },

    /**
     * Create a message in a conversation (user messages only)
     * POST /api/chat/[id]/messages
     * 
     * Note: AI responses should use api.gemini.chat() instead
     */
    create: async (
      conversationId: string,
      data: {
        content: string
        role: 'user' | 'assistant' | 'system'
      }
    ): Promise<{ message: NormalizedMessage }> => {
      return fetcher(`/api/chat/${conversationId}/messages`, {
        method: 'POST',
        body: data,
      })
    },
  },

  // ==========================================
  // GEMINI AI
  // ==========================================
  gemini: {
    /**
     * Generate AI response with Quranic context and automatic metadata extraction
     * POST /api/gemini/chat
     * 
     * This endpoint:
     * - Saves user message to database
     * - Generates AI response with Quranic context
     * - Extracts ayah references and tafsir citations
     * - Saves AI response to database
     * - Returns enriched response
     */
    chat: async (data: {
      conversationId: string
      message: string
    }): Promise<AIResponse> => {
      return fetcher('/api/gemini/chat', {
        method: 'POST',
        body: data,
      })
    },
  },

  // ==========================================
  // QURAN API
  // ==========================================
  quran: {
    /**
     * Search Ayat by query string
     * GET /api/quran/search
     */
    search: async (params: {
      q: string
      page?: number
      size?: number
    }): Promise<NormalizedSearchResponse> => {
      return fetcher('/api/quran/search', {
        params,
      })
    },

    /**
     * Get single ayah with optional translations
     * GET /api/quran/ayah
     */
    ayah: async (params: {
      verse_key: string
      translations?: string
    }): Promise<NormalizedAyah> => {
      return fetcher('/api/quran/ayah', {
        params,
      })
    },

    /**
     * Get tafsir (commentary) for an ayah
     * GET /api/quran/tafsir
     */
    tafsir: async (params: {
      verse_key: string
      tafsir_ids?: string
    }): Promise<NormalizedTafsir[]> => {
      return fetcher('/api/quran/tafsir', {
        params,
      })
    },

    /**
     * Get surah (chapter) metadata
     * GET /api/quran/surah
     */
    surah: async (params: {
      chapter_id: number
    }): Promise<NormalizedSurah> => {
      return fetcher('/api/quran/surah', {
        params,
      })
    },

    /**
     * Get range of ayat (must be from same surah)
     * GET /api/quran/range
     */
    range: async (params: {
      start: string
      end: string
    }): Promise<NormalizedAyah[]> => {
      return fetcher('/api/quran/range', {
        params,
      })
    },
  },

  // ==========================================
  // HEALTH CHECK
  // ==========================================
  /**
   * Check API health status and external service connectivity
   * GET /api/health
   */
  health: async (): Promise<HealthCheckResponse> => {
    return fetcher('/api/health')
  },
} as const

// =======================================================
// TYPE EXPORTS FOR EXTERNAL USE
// =======================================================

export type {
  NormalizedNotePage,
  NormalizedNoteSection,
  NormalizedConversation,
  NormalizedMessage,
  NormalizedAyah,
  NormalizedSearchResponse,
  NormalizedTafsir,
  NormalizedSurah,
}