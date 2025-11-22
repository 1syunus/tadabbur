/**
 * Quran Foundation API Integration
 * 
 * Provides type-safe access to Qur'anic content:
 * - Search verses by keyword
 * - Retrieve individual verses with translations
 * - Fetch tafsir (commentary)
 * - Get surah (chapter) metadata
 * 
 * @module lib/external/quran
 * 
 * @example
 * import { quranService } from '@/lib/external/quran'
 * 
 * const results = await quranService.searchAyat('patience')
 * const verse = await quranService.getAyah('2:255')
 */

// Service layer (primary export)
export { QuranService, quranService, createQuranService } from '@/lib/services/quran/QuranService'
export type { QuranServiceConfig } from '@/lib/services/quran/QuranService'

// Client layer (advanced usage)
export { QuranClient, createQuranClient } from './client'
export type { QuranClientConfig } from './client'

// Types and errors
export {
  QuranAPIError,
  QuranAPIRateLimitError,
  QuranAPITimeoutError,
  QuranAPIValidationError,
  QuranServiceError,
} from './types'
export type {
  NormalizedAyah,
  NormalizedSearchResponse,
  NormalizedTafsir,
  NormalizedSurah,
} from './normalized'

/**
 * Usage Examples
 * 
 * @example Basic search
 * ```typescript
 * import { quranService } from '@/lib/external/quran'
 * 
 * const results = await quranService.searchAyat('forgiveness', 1, 10)
 * console.log(`Found ${results.totalResults} verses`)
 * ```
 * 
 * @example Get single verse
 * ```typescript
 * const ayah = await quranService.getAyah('2:255')
 * console.log(ayah.arabic) // Arabic text
 * console.log(ayah.translations[0].text) // English translation
 * ```
 * 
 * @example Get tafsir
 * ```typescript
 * const tafsirs = await quranService.getTafsir('2:255')
 * tafsirs.forEach(t => {
 *   console.log(`${t.sourceName}: ${t.text.substring(0, 100)}...`)
 * })
 * ```
 * 
 * @example Error handling
 * ```typescript
 * try {
 *   const ayah = await quranService.getAyah('invalid')
 * } catch (error) {
 *   if (error instanceof QuranServiceError) {
 *     console.error(`Service error: ${error.code}`)
 *   }
 * }
 * ```
 */