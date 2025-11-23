/**
 * Quran Foundation API Constants
 * 
 * Centralized configuration for Quran API integration including:
 * - API endpoints and versioning
 * - Default translation and tafsir sources
 * - Pagination limits
 * - Supported languages and resources
 * 
 * @module config/constants
 */

// =======================================================
// API CONFIGURATION
// =======================================================

export const QURAN_API = {
  /** Base URL for Quran Foundation API */
  BASE_URL: 'https://api.quran.foundation/v1',
  
  /** OAuth token endpoint */
  AUTH_ENDPOINT: 'https://api.quran.foundation/oauth/token',
  
  /** API version */
  VERSION: 'v1',
  
  /** Request timeout in milliseconds */
  TIMEOUT: 10000,
  
  /** Number of retry attempts for failed requests */
  RETRY_ATTEMPTS: 3,
  
  /** Initial retry delay in milliseconds (exponential backoff) */
  RETRY_DELAY: 1000,
} as const

// =======================================================
// DEFAULT RESOURCES
// =======================================================

/**
 * Default translation IDs
 * 
 * Common English translations of the Quran
 */
export const TRANSLATIONS = {
  /** Dr. Mustafa Khattab, The Clear Quran (default) */
  DEFAULT: 131,
  
  /** Sahih International */
  SAHIH_INTERNATIONAL: 20,
  
  /** Dr. Mustafa Khattab, The Clear Quran */
  CLEAR_QURAN: 131,
  
  /** Pickthall */
  PICKTHALL: 19,
  
  /** Yusuf Ali */
  YUSUF_ALI: 22,
  
  /** Abdul Haleem */
  ABDUL_HALEEM: 85,
  
  /** Mufti Taqi Usmani */
  TAQI_USMANI: 84,
} as const

/**
 * Default tafsir (commentary) IDs
 * 
 * Common English tafsir sources
 */
export const TAFSIRS = {
  /** Tafsir Ibn Kathir (default) */
  DEFAULT: 169,
  
  /** Tafsir Ibn Kathir */
  IBN_KATHIR: 169,
  
  /** Tafsir al-Jalalayn */
  AL_JALALAYN: 168,
  
  /** Tafsir Maarif-ul-Quran */
  MAARIF_UL_QURAN: 167,
} as const

// =======================================================
// PAGINATION & LIMITS
// =======================================================

export const PAGINATION = {
  /** Default page size for search results */
  DEFAULT_PAGE_SIZE: 20,
  
  /** Maximum page size allowed by API */
  MAX_PAGE_SIZE: 50,
  
  /** Minimum page size */
  MIN_PAGE_SIZE: 1,
  
  /** Default starting page (1-indexed) */
  DEFAULT_PAGE: 1,
} as const

// =======================================================
// QURAN STRUCTURE
// =======================================================

export const QURAN_STRUCTURE = {
  /** Total number of surahs (chapters) */
  TOTAL_SURAHS: 114,
  
  /** Total number of ayat (verses) */
  TOTAL_AYAT: 6236,
  
  /** Total number of juz (parts) */
  TOTAL_JUZ: 30,
  
  /** Total number of pages (Mushaf) */
  TOTAL_PAGES: 604,
} as const

/**
 * Surah metadata for common references
 */
export const NOTABLE_SURAHS = {
  AL_FATIHA: { id: 1, nameEnglish: 'The Opening', ayahCount: 7 },
  AL_BAQARAH: { id: 2, nameEnglish: 'The Cow', ayahCount: 286 },
  AL_KAHF: { id: 18, nameEnglish: 'The Cave', ayahCount: 110 },
  YA_SIN: { id: 36, nameEnglish: 'Ya-Sin', ayahCount: 83 },
  AR_RAHMAN: { id: 55, nameEnglish: 'The Most Merciful', ayahCount: 78 },
  AL_MULK: { id: 67, nameEnglish: 'The Sovereignty', ayahCount: 30 },
  AL_IKHLAS: { id: 112, nameEnglish: 'The Sincerity', ayahCount: 4 },
  AL_FALAQ: { id: 113, nameEnglish: 'The Daybreak', ayahCount: 5 },
  AN_NAS: { id: 114, nameEnglish: 'Mankind', ayahCount: 6 },
} as const

// =======================================================
// REVELATION PLACES
// =======================================================

export const REVELATION_PLACES = {
  MAKKAH: 'makkah',
  MADINAH: 'madinah',
  UNKNOWN: 'unknown',
} as const

export type RevelationPlace = typeof REVELATION_PLACES[keyof typeof REVELATION_PLACES]

// =======================================================
// CACHE CONFIGURATION
// =======================================================

export const CACHE = {
  /** Default cache TTL in milliseconds (1 hour) */
  DEFAULT_TTL: 3600000,
  
  /** Cache TTL for surah metadata (24 hours - rarely changes) */
  SURAH_TTL: 86400000,
  
  /** Cache TTL for ayat (24 hours) */
  AYAH_TTL: 86400000,
  
  /** Cache TTL for tafsir (24 hours) */
  TAFSIR_TTL: 86400000,
  
  /** Search results are not cached (user-specific, dynamic) */
  SEARCH_TTL: 0,
} as const

// =======================================================
// VALIDATION PATTERNS
// =======================================================

export const VALIDATION = {
  /** Regex for verse key format (e.g., "2:255") */
  VERSE_KEY_PATTERN: /^\d{1,3}:\d{1,3}$/,
  
  /** Maximum search query length */
  MAX_SEARCH_QUERY_LENGTH: 200,
  
  /** Minimum search query length */
  MIN_SEARCH_QUERY_LENGTH: 1,
} as const

// =======================================================
// ERROR MESSAGES
// =======================================================

export const ERROR_MESSAGES = {
  INVALID_VERSE_KEY: 'Invalid verse key format (expected "surah:ayah")',
  INVALID_CHAPTER_ID: 'Chapter ID must be between 1 and 114',
  INVALID_PAGE_SIZE: `Page size must be between ${PAGINATION.MIN_PAGE_SIZE} and ${PAGINATION.MAX_PAGE_SIZE}`,
  QUERY_TOO_SHORT: `Query must be at least ${VALIDATION.MIN_SEARCH_QUERY_LENGTH} character`,
  QUERY_TOO_LONG: `Query cannot exceed ${VALIDATION.MAX_SEARCH_QUERY_LENGTH} characters`,
  MISSING_VERSE_KEY: 'Missing required parameter: verse_key',
  MISSING_CHAPTER_ID: 'Missing required parameter: chapter_id',
  MISSING_QUERY: 'Missing required parameter: q (query)',
  RATE_LIMIT: 'Rate limit exceeded. Please try again later.',
  TIMEOUT: 'Request timed out. Please try again.',
  NETWORK_ERROR: 'Network error occurred. Please check your connection.',
  VALIDATION_ERROR: 'Invalid data received from API',
  UNKNOWN_ERROR: 'An unexpected error occurred',
} as const

// =======================================================
// SUPPORTED LANGUAGES
// =======================================================

/**
 * Languages supported by the Quran Foundation API
 * (Subset of most commonly used)
 */
export const SUPPORTED_LANGUAGES = {
  ENGLISH: 'en',
  ARABIC: 'ar',
  URDU: 'ur',
  INDONESIAN: 'id',
  TURKISH: 'tr',
  FRENCH: 'fr',
  GERMAN: 'de',
  SPANISH: 'es',
  RUSSIAN: 'ru',
  CHINESE: 'zh',
} as const

// =======================================================
// TYPE EXPORTS
// =======================================================

export type TranslationId = typeof TRANSLATIONS[keyof typeof TRANSLATIONS]
export type TafsirId = typeof TAFSIRS[keyof typeof TAFSIRS]
export type LanguageCode = typeof SUPPORTED_LANGUAGES[keyof typeof SUPPORTED_LANGUAGES]