import {
  type NormalizedAyah,
  type NormalizedSearchResponse,
  type NormalizedTafsir,
  type NormalizedSurah,
} from '@/lib/external/quran/normalized'

import {
  QuranClient,
  type QuranClientConfig,
  createQuranClient,
} from '@/lib/external/quran/client'

import {
  QuranAPIError,
  QuranAPIRateLimitError,
  QuranAPITimeoutError,
  QuranAPIValidationError,
  QuranServiceError,
} from '@/lib/external/quran/types'

/**
 * Configuration for QuranService
 */
export interface QuranServiceConfig extends QuranClientConfig {
  enableCache?: boolean
  cacheTTL?: number // milliseconds
}

/**
 * Simple in-memory cache entry
 */
interface CacheEntry<T> {
  data: T
  expiresAt: number
}

/**
 * Service layer for Quran Foundation API
 * 
 * Provides:
 * - Business logic layer over QuranClient
 * - In-memory caching for frequently accessed data
 * - Simplified error handling for application layer
 * - Logging and monitoring hooks
 * 
 * @example
 * const service = new QuranService({
 *   clientId: process.env.QURAN_CLIENT_ID!,
 *   clientSecret: process.env.QURAN_CLIENT_SECRET!,
 *   authEndpoint: 'https://api.quran.foundation/oauth/token',
 *   enableCache: true,
 *   cacheTTL: 3600000, // 1 hour
 * })
 * 
 * const results = await service.searchAyat('patience')
 */
export class QuranService {
  private client: QuranClient
  private cache: Map<string, CacheEntry<unknown>>
  private enableCache: boolean
  private cacheTTL: number

  constructor(config: QuranServiceConfig) {
    this.client = createQuranClient(config)
    this.cache = new Map()
    this.enableCache = config.enableCache ?? true
    this.cacheTTL = config.cacheTTL ?? 3600000 // 1 hour default
  }

  /**
   * Generic cache wrapper
   */
  private async withCache<T>(
    cacheKey: string,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    if (!this.enableCache) {
      return fetcher()
    }

    // Check cache
    const cached = this.cache.get(cacheKey) as CacheEntry<T> | undefined
    if (cached && Date.now() < cached.expiresAt) {
      console.log(`[QuranService] Cache hit: ${cacheKey}`)
      return cached.data
    }

    // Fetch and cache
    try {
      const data = await fetcher()
      this.cache.set(cacheKey, {
        data,
        expiresAt: Date.now() + this.cacheTTL,
      })
      console.log(`[QuranService] Cache set: ${cacheKey}`)
      return data
    } catch (error) {
      // On error, remove stale cache entry
      this.cache.delete(cacheKey)
      throw error
    }
  }

  /**
   * Search for ayat by query string
   * 
   * @param query - Search term (e.g., "patience")
   * @param page - Page number (1-indexed)
   * @param size - Results per page (max 50)
   * @returns Normalized search results
   * 
   * @throws {QuranAPIRateLimitError} Rate limit exceeded
   * @throws {QuranAPIError} API error
   * 
   * @example
   * const results = await service.searchAyat('forgiveness', 1, 10)
   * console.log(`Found ${results.totalResults} results`)
   */
  async searchAyat(
    query: string,
    page: number = 1,
    size: number = 20,
  ): Promise<NormalizedSearchResponse> {
    // Don't cache search results (query-dependent, user-specific)
    try {
      return await this.client.searchAyat(query, page, size)
    } catch (error) {
      this.handleError(error, 'searchAyat')
      throw error // TypeScript satisfaction (handleError always throws)
    }
  }

  /**
   * Get a single ayah by verse key
   * 
   * @param verseKey - Format: "surah:ayah" (e.g., "2:255")
   * @param translationIds - Translation IDs (optional)
   * @returns Normalized ayah with translations
   * 
   * @example
   * const ayah = await service.getAyah('2:255')
   * console.log(ayah.arabic) // "ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ..."
   */
  async getAyah(
    verseKey: string,
    translationIds?: number[],
  ): Promise<NormalizedAyah> {
    const cacheKey = `ayah:${verseKey}:${translationIds?.join(',') ?? 'default'}`

    return this.withCache(cacheKey, async () => {
      try {
        return await this.client.getAyah(verseKey, translationIds)
      } catch (error) {
        this.handleError(error, 'getAyah', { verseKey })
        throw error
      }
    })
  }

  /**
   * Get tafsir (commentary) for an ayah
   * 
   * @param verseKey - Format: "surah:ayah"
   * @param tafsirIds - Tafsir source IDs (optional)
   * @returns Array of tafsir entries
   * 
   * @example
   * const tafsirs = await service.getTafsir('2:255')
   * tafsirs.forEach(t => console.log(t.sourceName, t.text))
   */
  async getTafsir(
    verseKey: string,
    tafsirIds?: number[],
  ): Promise<NormalizedTafsir[]> {
    const cacheKey = `tafsir:${verseKey}:${tafsirIds?.join(',') ?? 'default'}`

    return this.withCache(cacheKey, async () => {
      try {
        return await this.client.getTafsir(verseKey, tafsirIds)
      } catch (error) {
        this.handleError(error, 'getTafsir', { verseKey })
        throw error
      }
    })
  }

  /**
   * Get surah (chapter) metadata
   * 
   * @param chapterId - Surah number (1-114)
   * @returns Normalized surah metadata
   * 
   * @example
   * const surah = await service.getSurah(2)
   * console.log(surah.nameEnglish) // "The Cow"
   */
  async getSurah(chapterId: number): Promise<NormalizedSurah> {
    const cacheKey = `surah:${chapterId}`

    return this.withCache(cacheKey, async () => {
      try {
        return await this.client.getSurah(chapterId)
      } catch (error) {
        this.handleError(error, 'getSurah', { chapterId })
        throw error
      }
    })
  }

  /**
   * Get range of ayat within same surah
   * 
   * @param startKey - Start verse (e.g., "2:1")
   * @param endKey - End verse (e.g., "2:10")
   * @returns Array of ayat
   * 
   * @example
   * const ayat = await service.getAyahRange('2:1', '2:5')
   * console.log(`Fetched ${ayat.length} ayat`)
   */
  async getAyahRange(
    startKey: string,
    endKey: string,
  ): Promise<NormalizedAyah[]> {
    const cacheKey = `range:${startKey}-${endKey}`

    return this.withCache(cacheKey, async () => {
      try {
        return await this.client.getAyahRange(startKey, endKey)
      } catch (error) {
        this.handleError(error, 'getAyahRange', { startKey, endKey })
        throw error
      }
    })
  }

  /**
   * Get multiple ayat by verse keys
   * 
   * Fetches in parallel with caching
   * 
   * @param verseKeys - Array of verse keys (e.g., ["2:255", "3:159"])
   * @returns Array of ayat in same order as input
   * 
   * @example
   * const ayat = await service.getMultipleAyat(['2:255', '3:159', '112:1'])
   */
  async getMultipleAyat(verseKeys: string[]): Promise<NormalizedAyah[]> {
    try {
      return await Promise.all(
        verseKeys.map((key) => this.getAyah(key)),
      )
    } catch (error) {
      this.handleError(error, 'getMultipleAyat', { verseKeys })
      throw error
    }
  }

  /**
   * Clear all cached data
   * 
   * Useful for testing or forcing fresh data
   */
  clearCache(): void {
    this.cache.clear()
    console.log('[QuranService] Cache cleared')
  }

  /**
   * Get cache statistics
   * 
   * @returns Cache size and hit rate (if tracking)
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }

  /**
   * Centralized error handling with logging
   * 
   * @param error - Error from client layer
   * @param method - Method name for logging
   * @param context - Additional context for debugging
   */
  private handleError(
    error: unknown,
    method: string,
    context?: Record<string, unknown>,
  ): never {
    if (error instanceof QuranAPIRateLimitError) {
      console.error(`[QuranService:${method}] Rate limit exceeded`, context)
      throw new QuranServiceError('Rate limit exceeded by API provider', 'RATE_LIMIT') // Abstract
    }

    if (error instanceof QuranAPITimeoutError) {
      console.error(`[QuranService:${method}] Request timeout`, context)
      throw new QuranServiceError('Service timed out', 'TIMEOUT')
    }

    if (error instanceof QuranAPIValidationError) {
      // validation here for client input OR malformed response
      console.error(
        `[QuranService:${method}] Invalid API response/input`,
        context,
        error.cause,
      )
      throw new QuranServiceError('Request/Response validation failed', 'VALIDATION')
    }

    if (error instanceof QuranAPIError) {
      console.error(
        `[QuranService:${method}] Uncategorized API error:`,
        error.message,
        context,
      )
      throw new QuranServiceError('External API failure', 'UNKNOWN')
    }

    // all other non-API related errors (e.g., network issues, system errors, code bugs)
    console.error(
      `[QuranService:${method}] Unexpected application or system error:`,
      error,
      context,
    )
    throw new QuranServiceError('Unknown error occurred', 'UNKNOWN')
  }
}

/**
 * Singleton instance factory
 * 
 * Create service from environment variables
 */
export function createQuranService(
  config?: Partial<QuranServiceConfig>,
): QuranService {
  const defaultConfig: QuranServiceConfig = {
    clientId: process.env.QURAN_CLIENT_ID!,
    clientSecret: process.env.QURAN_CLIENT_SECRET!,
    authEndpoint:
      process.env.QURAN_AUTH_ENDPOINT ??
      'https://api.quran.foundation/oauth/token',
    enableCache: process.env.NODE_ENV !== 'test', // Disable in tests
    cacheTTL: 3600000, // 1 hour
    ...config,
  }

  return new QuranService(defaultConfig)
}

/**
 * Default export for convenience
 */
export const quranService = createQuranService()