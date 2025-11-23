/**
 * Quran API Endpoints Documentation
 * 
 * Complete reference for all available Quran API endpoints including:
 * - Request/response schemas
 * - Authentication requirements
 * - Example requests and responses
 * - Error handling patterns
 * 
 * @module docs/api-endpoints
 * 
 * Base URL: /api/quran/[action]
 * All endpoints require authentication via Supabase session
 */

import type {
  NormalizedAyah,
  NormalizedSearchResponse,
  NormalizedTafsir,
  NormalizedSurah,
} from '@/lib/external/quran/normalized'

// =======================================================
// ENDPOINT DEFINITIONS
// =======================================================

export const API_ENDPOINTS = {
  /**
   * Search Ayat by Query
   * 
   * @endpoint GET /api/quran/search
   * @auth Required
   * 
   * @param q - Search query (1-200 characters)
   * @param page - Page number (default: 1)
   * @param size - Results per page (default: 20, max: 50)
   * 
   * @example
   * fetch('/api/quran/search?q=patience&page=1&size=10')
   */
  SEARCH: {
    method: 'GET' as const,
    path: '/api/quran/search',
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

  /**
   * Get Single Ayah
   * 
   * @endpoint GET /api/quran/ayah
   * @auth Required
   * 
   * @param verse_key - Format "surah:ayah" (e.g., "2:255")
   * @param translations - Comma-separated translation IDs (optional)
   * 
   * @example
   * fetch('/api/quran/ayah?verse_key=2:255&translations=131,85')
   */
  AYAH: {
    method: 'GET' as const,
    path: '/api/quran/ayah',
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
        arabic: 'ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ...',
        translation: 131,
        translationName: 'Dr. Mustafa Khattab, The Clear Quran',
        translationText: 'Allah! There is no god ˹worthy of worship˺ except Him...',
        translations: [
          {
            translation: 131,
            translationName: 'Dr. Mustafa Khattab, The Clear Quran',
            translationText: 'Allah! There is no god ˹worthy of worship˺ except Him...',
          },
        ],
        additionalTranslations: [],
        hizb: 5,
        rubElHizb: 9,
        juz: 3,
        page: 42,
      },
    },
    errors: [
      { status: 400, message: 'Missing required parameter: verse_key' },
      { status: 400, message: 'Invalid verse key format' },
      { status: 401, message: 'Unauthorized' },
      { status: 502, message: 'External API error' },
    ],
  },

  /**
   * Get Tafsir (Commentary)
   * 
   * @endpoint GET /api/quran/tafsir
   * @auth Required
   * 
   * @param verse_key - Format "surah:ayah"
   * @param tafsir_ids - Comma-separated tafsir source IDs (optional)
   * 
   * @example
   * fetch('/api/quran/tafsir?verse_key=2:255&tafsir_ids=169')
   */
  TAFSIR: {
    method: 'GET' as const,
    path: '/api/quran/tafsir',
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
          text: 'This is the greatest ayah in the Quran. It describes Allah\'s sovereignty...',
          sourceName: 'Tafsir Ibn Kathir',
          source: 169,
          language: 'english',
        },
      ],
    },
    errors: [
      { status: 400, message: 'Missing required parameter: verse_key' },
      { status: 400, message: 'Invalid verse key format' },
      { status: 401, message: 'Unauthorized' },
      { status: 502, message: 'External API error' },
    ],
  },

  /**
   * Get Surah (Chapter) Metadata
   * 
   * @endpoint GET /api/quran/surah
   * @auth Required
   * 
   * @param chapter_id - Surah number (1-114)
   * 
   * @example
   * fetch('/api/quran/surah?chapter_id=2')
   */
  SURAH: {
    method: 'GET' as const,
    path: '/api/quran/surah',
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
    errors: [
      { status: 400, message: 'Missing required parameter: chapter_id' },
      { status: 400, message: 'Chapter ID must be between 1 and 114' },
      { status: 401, message: 'Unauthorized' },
      { status: 502, message: 'External API error' },
    ],
  },

  /**
   * Get Range of Ayat
   * 
   * @endpoint GET /api/quran/range
   * @auth Required
   * 
   * @param start - Start verse key (e.g., "2:1")
   * @param end - End verse key (e.g., "2:5")
   * 
   * @note Both verses must be from the same surah
   * 
   * @example
   * fetch('/api/quran/range?start=2:1&end=2:5')
   */
  RANGE: {
    method: 'GET' as const,
    path: '/api/quran/range',
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
      example: [
        {
          ayah: 1,
          ayahNumber: 1,
          ayahKey: '2:1',
          surah: 2,
          arabic: 'الم',
          translation: 131,
          translationName: 'Dr. Mustafa Khattab, The Clear Quran',
          translationText: 'Alif-Lãm-Mĩm.',
          translations: [],
          additionalTranslations: [],
          hizb: 1,
          rubElHizb: 1,
          juz: 1,
          page: 2,
        },
      ],
    },
    errors: [
      { status: 400, message: 'Missing required parameters: start, end' },
      { status: 400, message: 'Invalid verse key format' },
      { status: 400, message: 'Start and end must be from the same surah' },
      { status: 401, message: 'Unauthorized' },
      { status: 502, message: 'External API error' },
    ],
  },

  /**
   * Health Check
   * 
   * @endpoint GET /api/health
   * @auth Not required
   * 
   * Checks API server status, Quran service initialization,
   * and external API connectivity.
   * 
   * @example
   * fetch('/api/health')
   */
  HEALTH: {
    method: 'GET' as const,
    path: '/api/health',
    params: {},
    response: {
      type: 'HealthCheckResponse',
      example: {
        status: 'healthy',
        timestamp: '2025-01-22T10:30:00.000Z',
        checks: {
          api: { status: 'pass', message: 'API server is running' },
          quranService: { status: 'pass', message: 'Service initialized' },
          externalApi: { status: 'pass', message: 'External API accessible and OAuth working' },
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
// TYPE DEFINITIONS FOR FRONTEND
// =======================================================

export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  params: Record<string, ParamDefinition>
  response: ResponseDefinition
  errors: ErrorDefinition[]
}

export interface ParamDefinition {
  type: string
  required: boolean
  default?: any
  description: string
  validation?: string
  example: any
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
// COMMON ERROR RESPONSES
// =======================================================

export const COMMON_ERRORS = {
  UNAUTHORIZED: {
    status: 401,
    body: {
      error: 'Unauthorized',
      message: 'Authentication required',
    },
  },
  RATE_LIMIT: {
    status: 429,
    body: {
      error: 'Rate limit exceeded',
      message: 'Rate limit exceeded. Please try again later.',
    },
  },
  EXTERNAL_API_ERROR: {
    status: 502,
    body: {
      error: 'External API error',
      message: 'External API error occurred',
    },
  },
  TIMEOUT: {
    status: 504,
    body: {
      error: 'Request timeout',
      message: 'Request timed out. Please try again.',
    },
  },
  VALIDATION_ERROR: {
    status: 400,
    body: {
      error: 'Validation error',
      message: 'Invalid request parameters',
    },
  },
} as const

// =======================================================
// USAGE EXAMPLES FOR FRONTEND
// =======================================================

export const USAGE_EXAMPLES = {
  /**
   * Search for verses containing a keyword
   */
  search: `
// Basic search
const response = await fetch('/api/quran/search?q=patience&page=1&size=10')
const data: NormalizedSearchResponse = await response.json()

console.log(\`Found \${data.totalResults} results\`)
data.results.forEach(result => {
  console.log(\`\${result.ayahKey}: \${result.text}\`)
})
  `,

  /**
   * Get a single ayah with multiple translations
   */
  ayah: `
// Fetch Ayat al-Kursi with two translations
const response = await fetch('/api/quran/ayah?verse_key=2:255&translations=131,85')
const ayah: NormalizedAyah = await response.json()

console.log('Arabic:', ayah.arabic)
console.log('Primary Translation:', ayah.translationText)
ayah.additionalTranslations.forEach(t => {
  console.log(\`\${t.translationName}: \${t.translationText}\`)
})
  `,

  /**
   * Get tafsir for a verse
   */
  tafsir: `
// Fetch tafsir for Ayat al-Kursi
const response = await fetch('/api/quran/tafsir?verse_key=2:255&tafsir_ids=169')
const tafsirs: NormalizedTafsir[] = await response.json()

tafsirs.forEach(tafsir => {
  console.log(\`\${tafsir.sourceName}:\`)
  console.log(tafsir.text.substring(0, 200) + '...')
})
  `,

  /**
   * Get surah metadata
   */
  surah: `
// Get information about Surah Al-Baqarah
const response = await fetch('/api/quran/surah?chapter_id=2')
const surah: NormalizedSurah = await response.json()

console.log(\`\${surah.nameEnglish} (\${surah.nameArabic})\`)
console.log(\`Ayat: \${surah.ayahCount}\`)
console.log(\`Revealed in: \${surah.revelationPlace}\`)
  `,

  /**
   * Get a range of ayat
   */
  range: `
// Fetch the first 5 ayat of Surah Al-Baqarah
const response = await fetch('/api/quran/range?start=2:1&end=2:5')
const ayat: NormalizedAyah[] = await response.json()

ayat.forEach(ayah => {
  console.log(\`\${ayah.ayahKey}: \${ayah.translationText}\`)
})
  `,

  /**
   * Error handling pattern
   */
  errorHandling: `
// Robust error handling
async function fetchAyah(verseKey: string) {
  try {
    const response = await fetch(\`/api/quran/ayah?verse_key=\${verseKey}\`)
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'API request failed')
    }
    
    const ayah: NormalizedAyah = await response.json()
    return ayah
  } catch (error) {
    if (error instanceof Error) {
      console.error('Failed to fetch ayah:', error.message)
    }
    throw error
  }
}
  `,
} as const

// =======================================================
// CONSTANTS FOR FRONTEND USE
// =======================================================

export const FRONTEND_CONSTANTS = {
  /** Default translation ID (Dr. Mustafa Khattab) */
  DEFAULT_TRANSLATION: 131,
  
  /** Default tafsir ID (Ibn Kathir) */
  DEFAULT_TAFSIR: 169,
  
  /** Maximum search results per page */
  MAX_PAGE_SIZE: 50,
  
  /** Total number of surahs */
  TOTAL_SURAHS: 114,
  
  /** Notable surah IDs for quick reference */
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