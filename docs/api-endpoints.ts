/**
 * Complete API Endpoints Documentation
 * 
 * Unified export containing all API endpoints:
 * - Internal CRUD endpoints (Notes, Sections, Chat)
 * - External AI endpoints (Gemini chat)
 * - External Quran endpoints
 * - Health check
 * 
 * @module docs/api-endpoints
 */

import type {
  NormalizedAyah,
  NormalizedSearchResponse,
  NormalizedTafsir,
  NormalizedSurah,
} from '@/lib/external/quran/normalized'

// =======================================================
// TYPE DEFINITIONS
// =======================================================

export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  auth: 'Required' | 'Not required'
  description: string
  params?: Record<string, ParamDefinition>
  body?: Record<string, BodyFieldDefinition>
  response: ResponseDefinition
  errors?: ErrorDefinition[]
  notes?: string[]
}

export interface ParamDefinition {
  type: string
  required: boolean
  default?: any
  description?: string
  validation?: string
  example: any
}

export interface BodyFieldDefinition {
  type: string
  required: boolean
  validation?: string
  description?: string
  example?: any
}

export interface ResponseDefinition {
  type: string
  example: any
}

export interface ErrorDefinition {
  status: number
  message: string
}

// =======================================================
// UNIFIED API ENDPOINTS
// =======================================================

export const API_ENDPOINTS = {
  // ==========================================
  // NOTES
  // ==========================================
  
  notes: {
    list: {
      method: 'GET' as const,
      path: '/api/notes',
      auth: 'Required' as const,
      description: 'List all active notes for authenticated user',
      response: {
        type: 'NormalizedNotePage[]',
        example: {
          notes: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              title: 'Reflections on Patience',
              content: 'Sabr is mentioned frequently...',
              sectionId: null,
              orderIndex: 0,
              deletedAt: null,
              createdAt: '2025-01-22T10:00:00Z',
              updatedAt: '2025-01-22T10:00:00Z',
            },
          ],
        },
      },
      errors: [
        { status: 401, message: 'Unauthorized' },
        { status: 500, message: 'Internal server error' },
      ],
    },

    create: {
      method: 'POST' as const,
      path: '/api/notes',
      auth: 'Required' as const,
      description: 'Create a new note',
      body: {
        title: {
          type: 'string',
          required: true,
          validation: 'Max 200 characters',
          example: 'New Reflection',
        },
        content: {
          type: 'string',
          required: false,
          validation: 'Markdown format',
          example: '# Key Points\n- Patience is crucial...',
        },
        sectionId: {
          type: 'string | null',
          required: false,
          validation: 'Must be valid UUID if provided',
          example: '550e8400-e29b-41d4-a716-446655440001',
        },
      },
      response: {
        type: 'NormalizedNotePage',
        example: {
          note: {
            id: '550e8400-e29b-41d4-a716-446655440002',
            title: 'New Reflection',
            content: '# Key Points\n- Patience is crucial...',
            sectionId: null,
            orderIndex: 0,
            deletedAt: null,
            createdAt: '2025-01-22T11:00:00Z',
            updatedAt: '2025-01-22T11:00:00Z',
          },
        },
      },
      errors: [
        { status: 400, message: 'Validation error' },
        { status: 401, message: 'Unauthorized' },
        { status: 500, message: 'Internal server error' },
      ],
    },

    get: {
      method: 'GET' as const,
      path: '/api/notes/[id]',
      auth: 'Required' as const,
      description: 'Get a single note by ID',
      params: {
        id: {
          type: 'string',
          required: true,
          validation: 'Must be valid UUID',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
      },
      response: {
        type: 'NormalizedNotePage',
        example: {
          note: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            title: 'Reflections on Patience',
            content: 'Sabr is mentioned...',
            sectionId: null,
            orderIndex: 0,
            deletedAt: null,
            createdAt: '2025-01-22T10:00:00Z',
            updatedAt: '2025-01-22T10:00:00Z',
          },
        },
      },
      errors: [
        { status: 400, message: 'Invalid ID format' },
        { status: 401, message: 'Unauthorized' },
        { status: 404, message: 'Note not found' },
      ],
    },

    update: {
      method: 'PATCH' as const,
      path: '/api/notes/[id]',
      auth: 'Required' as const,
      description: 'Update a note (partial update supported)',
      params: {
        id: {
          type: 'string',
          required: true,
          validation: 'Must be valid UUID',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
      },
      body: {
        title: {
          type: 'string',
          required: false,
          validation: 'Max 200 characters',
        },
        content: {
          type: 'string',
          required: false,
        },
        sectionId: {
          type: 'string | null',
          required: false,
        },
      },
      response: {
        type: 'NormalizedNotePage',
        example: { note: {} },
      },
      errors: [
        { status: 400, message: 'Validation error' },
        { status: 401, message: 'Unauthorized' },
        { status: 404, message: 'Note not found' },
      ],
    },

    delete: {
      method: 'DELETE' as const,
      path: '/api/notes/[id]',
      auth: 'Required' as const,
      description: 'Permanently delete a note (hard delete)',
      params: {
        id: {
          type: 'string',
          required: true,
          validation: 'Must be valid UUID',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
      },
      response: {
        type: '{ success: true }',
        example: { success: true },
      },
      errors: [
        { status: 400, message: 'Invalid ID format' },
        { status: 401, message: 'Unauthorized' },
        { status: 404, message: 'Note not found' },
      ],
    },

    archive: {
      method: 'POST' as const,
      path: '/api/notes/[id]/archive',
      auth: 'Required' as const,
      description: 'Archive a note (soft delete, sets deletedAt timestamp)',
      params: {
        id: {
          type: 'string',
          required: true,
          validation: 'Must be valid UUID',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
      },
      response: {
        type: 'NormalizedNotePage',
        example: {
          note: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            title: 'Reflections on Patience',
            content: 'Sabr is mentioned...',
            sectionId: null,
            orderIndex: 0,
            deletedAt: '2025-01-22T12:00:00Z',
            createdAt: '2025-01-22T10:00:00Z',
            updatedAt: '2025-01-22T12:00:00Z',
          },
        },
      },
      errors: [
        { status: 400, message: 'Invalid ID format' },
        { status: 401, message: 'Unauthorized' },
        { status: 404, message: 'Note not found' },
      ],
    },

    restore: {
      method: 'POST' as const,
      path: '/api/notes/[id]/restore',
      auth: 'Required' as const,
      description: 'Restore an archived note (clears deletedAt timestamp)',
      params: {
        id: {
          type: 'string',
          required: true,
          validation: 'Must be valid UUID',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
      },
      response: {
        type: 'NormalizedNotePage',
        example: {
          note: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            title: 'Reflections on Patience',
            content: 'Sabr is mentioned...',
            sectionId: null,
            orderIndex: 0,
            deletedAt: null,
            createdAt: '2025-01-22T10:00:00Z',
            updatedAt: '2025-01-22T12:30:00Z',
          },
        },
      },
      errors: [
        { status: 400, message: 'Invalid ID format' },
        { status: 401, message: 'Unauthorized' },
        { status: 404, message: 'Note not found' },
      ],
    },
  },

  // ==========================================
  // SECTIONS
  // ==========================================

  sections: {
    list: {
      method: 'GET' as const,
      path: '/api/sections',
      auth: 'Required' as const,
      description: 'List all sections for authenticated user (ordered by orderIndex)',
      response: {
        type: 'NormalizedNoteSection[]',
        example: {
          sections: [
            {
              id: '550e8400-e29b-41d4-a716-446655440003',
              name: 'Patience Studies',
              color: '#3B82F6',
              orderIndex: 0,
              createdAt: '2025-01-22T09:00:00Z',
            },
          ],
        },
      },
    },

    create: {
      method: 'POST' as const,
      path: '/api/sections',
      auth: 'Required' as const,
      description: 'Create a new section',
      body: {
        name: {
          type: 'string',
          required: true,
          validation: 'Max 100 characters',
          example: 'Tafsir Notes',
        },
        color: {
          type: 'string',
          required: false,
          validation: 'Hex color code (#RRGGBB)',
          example: '#10B981',
        },
      },
      response: {
        type: 'NormalizedNoteSection',
        example: { section: {} },
      },
    },

    get: {
      method: 'GET' as const,
      path: '/api/sections/[id]',
      auth: 'Required' as const,
      description: 'Get a single section by ID',
      params: {
        id: {
          type: 'string',
          required: true,
          validation: 'Must be valid UUID',
          example: '550e8400-e29b-41d4-a716-446655440003',
        },
      },
      response: {
        type: 'NormalizedNoteSection',
        example: { section: {} },
      },
    },

    update: {
      method: 'PATCH' as const,
      path: '/api/sections/[id]',
      auth: 'Required' as const,
      description: 'Update section name and/or color',
      body: {
        name: {
          type: 'string',
          required: false,
        },
        color: {
          type: 'string',
          required: false,
          validation: 'Hex color code',
        },
      },
      response: {
        type: 'NormalizedNoteSection',
        example: { section: {} },
      },
    },

    delete: {
      method: 'DELETE' as const,
      path: '/api/sections/[id]',
      auth: 'Required' as const,
      description: 'Hard delete section (permanent removal, notes become orphaned)',
      response: {
        type: '{ success: true }',
        example: { success: true },
      },
    },
  },

  // ==========================================
  // CONVERSATIONS
  // ==========================================

  conversations: {
    list: {
      method: 'GET' as const,
      path: '/api/chat',
      auth: 'Required' as const,
      description: 'List all active conversations (not archived)',
      response: {
        type: 'NormalizedConversation[]',
        example: {
          conversations: [
            {
              id: '550e8400-e29b-41d4-a716-446655440004',
              title: 'Discussion about Patience',
              isArchived: false,
              createdAt: '2025-01-22T08:00:00Z',
              updatedAt: '2025-01-22T10:30:00Z',
            },
          ],
        },
      },
    },

    create: {
      method: 'POST' as const,
      path: '/api/chat',
      auth: 'Required' as const,
      description: 'Create a new conversation',
      body: {
        title: {
          type: 'string',
          required: true,
          validation: 'Max 200 characters',
          example: 'Questions about Ramadan',
        },
      },
      response: {
        type: 'NormalizedConversation',
        example: { conversation: {} },
      },
    },

    get: {
      method: 'GET' as const,
      path: '/api/chat/[id]',
      auth: 'Required' as const,
      description: 'Get a single conversation by ID',
      params: {
        id: {
          type: 'string',
          required: true,
          validation: 'Must be valid UUID',
          example: '550e8400-e29b-41d4-a716-446655440004',
        },
      },
      response: {
        type: 'NormalizedConversation',
        example: { conversation: {} },
      },
    },

    update: {
      method: 'PATCH' as const,
      path: '/api/chat/[id]',
      auth: 'Required' as const,
      description: 'Update conversation title',
      body: {
        title: {
          type: 'string',
          required: true,
        },
      },
      response: {
        type: 'NormalizedConversation',
        example: { conversation: {} },
      },
    },

    delete: {
      method: 'DELETE' as const,
      path: '/api/chat/[id]',
      auth: 'Required' as const,
      description: 'Archive conversation (soft delete, sets isArchived=true)',
      response: {
        type: '{ success: true, conversation: NormalizedConversation }',
        example: { success: true, conversation: {} },
      },
    },
  },

  // ==========================================
  // MESSAGES
  // ==========================================

  messages: {
    list: {
      method: 'GET' as const,
      path: '/api/chat/[id]/messages',
      auth: 'Required' as const,
      description: 'Get all messages in a conversation (chronological order)',
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Conversation ID',
          example: '550e8400-e29b-41d4-a716-446655440004',
        },
      },
      response: {
        type: 'NormalizedMessage[]',
        example: {
          messages: [
            {
              id: '550e8400-e29b-41d4-a716-446655440005',
              conversationId: '550e8400-e29b-41d4-a716-446655440004',
              role: 'user',
              content: 'What does the Quran say about patience?',
              ayahReferences: [],
              tafsirUsed: [],
              createdAt: '2025-01-22T10:00:00Z',
            },
            {
              id: '550e8400-e29b-41d4-a716-446655440006',
              conversationId: '550e8400-e29b-41d4-a716-446655440004',
              role: 'assistant',
              content: 'Patience (sabr) is mentioned frequently...',
              ayahReferences: ['2:153', '3:200'],
              tafsirUsed: [
                {
                  ayahKey: '2:153',
                  sourceName: 'Tafsir Ibn Kathir',
                  sourceId: 169,
                  excerpt: 'This verse emphasizes...',
                },
              ],
              createdAt: '2025-01-22T10:00:15Z',
            },
          ],
        },
      },
    },

    create: {
      method: 'POST' as const,
      path: '/api/chat/[id]/messages',
      auth: 'Required' as const,
      description: 'Create a message in a conversation (user messages only, AI responses via /api/gemini/chat)',
      body: {
        content: {
          type: 'string',
          required: true,
          validation: 'Max 5000 characters',
          example: 'Tell me more about this verse',
        },
        role: {
          type: "'user' | 'assistant' | 'system'",
          required: true,
          example: 'user',
        },
      },
      response: {
        type: 'NormalizedMessage',
        example: { message: {} },
      },
    },
  },

  // ==========================================
  // GEMINI AI
  // ==========================================

  gemini: {
    chat: {
      method: 'POST' as const,
      path: '/api/gemini/chat',
      auth: 'Required' as const,
      description: 'Generate AI response with Quranic context and automatic metadata extraction',
      body: {
        conversationId: {
          type: 'string',
          required: true,
          validation: 'Must be valid UUID',
          description: 'Conversation ID to add message to',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
        message: {
          type: 'string',
          required: true,
          validation: 'Min 1 character, max 5000 characters, trimmed',
          description: 'User message to send to AI',
          example: 'What does the Quran say about patience?',
        },
      },
      response: {
        type: 'AIResponse',
        example: {
          message: 'Patience (sabr) is mentioned frequently in the Quran...',
          ayahReferences: ['2:153', '3:200', '2:45'],
          tafsirUsed: [
            {
              ayahKey: '2:153',
              sourceName: 'Tafsir Ibn Kathir',
              sourceId: 169,
              excerpt: 'This verse emphasizes seeking help through patience and prayer...',
            },
          ],
        },
      },
      errors: [
        { status: 400, message: 'Validation error (missing/invalid conversationId or message)' },
        { status: 400, message: 'Conversation not found or unauthorized' },
        { status: 401, message: 'Unauthorized - requires authentication' },
        { status: 429, message: 'Rate limit exceeded. Please try again later.' },
        { status: 500, message: 'Internal server error' },
      ],
      notes: [
        'Conversation ownership is verified via RLS',
        'User message is automatically saved to database',
        'AI response is enriched with ayah references and tafsir citations',
        'AI response is automatically saved to database',
        'Memory window uses last 10 messages for context',
      ],
    },
  },

  // ==========================================
  // QURAN API
  // ==========================================

  quran: {
    search: {
      method: 'GET' as const,
      path: '/api/quran/search',
      auth: 'Required' as const,
      description: 'Search Ayat by query string',
      params: {
        q: {
          type: 'string',
          required: true,
          description: 'Search query',
          validation: 'Min 1 char, max 200 chars',
          example: 'patience',
        },
        page: {
          type: 'number',
          required: false,
          default: 1,
          description: 'Page number (1-indexed)',
          example: 1,
        },
        size: {
          type: 'number',
          required: false,
          default: 20,
          description: 'Results per page',
          validation: 'Min 1, max 50',
          example: 10,
        },
      },
      response: {
        type: 'NormalizedSearchResponse',
        example: {
          query: 'patience',
          totalResults: 45,
          currentPage: 1,
          totalPages: 5,
          perPage: 10,
          results: [
            {
              ayah: 347,
              ayahNumber: 153,
              ayahKey: '2:153',
              surah: 2,
              text: 'O believers! Seek comfort in patience and prayer...',
              highlightedText: 'O believers! Seek comfort in <em>patience</em> and prayer...',
              translationSource: 'Dr. Mustafa Khattab, The Clear Quran',
            },
          ],
        },
      },
      errors: [
        { status: 400, message: 'Query cannot be empty' },
        { status: 400, message: 'Invalid page size' },
        { status: 401, message: 'Unauthorized - requires authentication' },
        { status: 429, message: 'Rate limit exceeded' },
        { status: 502, message: 'External API error' },
      ],
    },

    ayah: {
      method: 'GET' as const,
      path: '/api/quran/ayah',
      auth: 'Required' as const,
      description: 'Get single ayah with optional translations',
      params: {
        verse_key: {
          type: 'string',
          required: true,
          description: 'Verse key in format "surah:ayah"',
          validation: 'Must match /^\\d{1,3}:\\d{1,3}$/',
          example: '2:255',
        },
        translations: {
          type: 'string',
          required: false,
          description: 'Comma-separated translation IDs',
          example: '131,85',
        },
      },
      response: {
        type: 'NormalizedAyah',
        example: {
          ayah: 347,
          ayahNumber: 255,
          ayahKey: '2:255',
          surah: 2,
          arabic: 'ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ...',
          translation: 131,
          translationName: 'Dr. Mustafa Khattab, The Clear Quran',
          translationText: 'Allah! There is no god...',
          translations: [],
          additionalTranslations: [],
          hizb: 5,
          rubElHizb: 9,
          juz: 3,
          page: 42,
        },
      },
    },

    tafsir: {
      method: 'GET' as const,
      path: '/api/quran/tafsir',
      auth: 'Required' as const,
      description: 'Get tafsir (commentary) for an ayah',
      params: {
        verse_key: {
          type: 'string',
          required: true,
          description: 'Verse key in format "surah:ayah"',
          example: '2:255',
        },
        tafsir_ids: {
          type: 'string',
          required: false,
          description: 'Comma-separated tafsir IDs',
          example: '169',
        },
      },
      response: {
        type: 'NormalizedTafsir[]',
        example: [
          {
            tafsirEntryId: 12345,
            ayahKey: '2:255',
            text: 'This is the greatest ayah in the Quran...',
            sourceName: 'Tafsir Ibn Kathir',
            source: 169,
            language: 'english',
          },
        ],
      },
    },

    surah: {
      method: 'GET' as const,
      path: '/api/quran/surah',
      auth: 'Required' as const,
      description: 'Get surah (chapter) metadata',
      params: {
        chapter_id: {
          type: 'number',
          required: true,
          description: 'Surah number',
          validation: 'Must be between 1 and 114',
          example: 2,
        },
      },
      response: {
        type: 'NormalizedSurah',
        example: {
          surah: 2,
          nameArabic: 'البقرة',
          nameEnglish: 'The Cow',
          nameSimple: 'Al-Baqarah',
          ayahCount: 286,
          revelationPlace: 'madinah',
          revelationOrder: 87,
        },
      },
    },

    range: {
      method: 'GET' as const,
      path: '/api/quran/range',
      auth: 'Required' as const,
      description: 'Get range of ayat (must be from same surah)',
      params: {
        start: {
          type: 'string',
          required: true,
          description: 'Start verse key',
          validation: 'Must match /^\\d{1,3}:\\d{1,3}$/',
          example: '2:1',
        },
        end: {
          type: 'string',
          required: true,
          description: 'End verse key (same surah as start)',
          validation: 'Must match /^\\d{1,3}:\\d{1,3}$/',
          example: '2:5',
        },
      },
      response: {
        type: 'NormalizedAyah[]',
        example: [],
      },
      errors: [
        { status: 400, message: 'Start and end must be from the same surah' },
      ],
    },
  },

  // ==========================================
  // HEALTH CHECK
  // ==========================================

  health: {
    method: 'GET' as const,
    path: '/api/health',
    auth: 'Not required' as const,
    description: 'Check API health status and external service connectivity',
    response: {
      type: 'HealthCheckResponse',
      example: {
        status: 'healthy',
        timestamp: '2025-01-22T10:30:00.000Z',
        checks: {
          api: { status: 'pass', message: 'API server is running' },
          quranService: { status: 'pass', message: 'Service initialized' },
          quranApi: { status: 'pass', message: 'External API accessible' },
          geminiConfig: { status: 'pass', message: 'API key configured' },
          database: { status: 'pass', message: 'Database accessible' },
        },
        responseTime: 234,
        environment: 'production',
      },
    },
    errors: [
      { status: 503, message: 'Service unhealthy' },
    ],
  },
} as const

// =======================================================
// CONSTANTS
// =======================================================

export const COMMON_ERRORS = {
  UNAUTHORIZED: {
    status: 401,
    body: { error: 'Unauthorized', message: 'Authentication required' },
  },
  RATE_LIMIT: {
    status: 429,
    body: { error: 'Rate limit exceeded', message: 'Rate limit exceeded. Please try again later.' },
  },
  EXTERNAL_API_ERROR: {
    status: 502,
    body: { error: 'External API error', message: 'External API error occurred' },
  },
  TIMEOUT: {
    status: 504,
    body: { error: 'Request timeout', message: 'Request timed out. Please try again.' },
  },
  VALIDATION_ERROR: {
    status: 400,
    body: { error: 'Validation error', message: 'Invalid request parameters' },
  },
} as const

export const FRONTEND_CONSTANTS = {
  DEFAULT_TRANSLATION: 131,
  DEFAULT_TAFSIR: 169,
  MAX_PAGE_SIZE: 50,
  TOTAL_SURAHS: 114,
  NOTABLE_SURAHS: {
    AL_FATIHA: 1,
    AL_BAQARAH: 2,
    AL_KAHF: 18,
    YA_SIN: 36,
    AR_RAHMAN: 55,
    AL_MULK: 67,
    AL_IKHLAS: 112,
  },
} as const