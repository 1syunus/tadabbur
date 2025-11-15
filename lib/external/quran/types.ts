import { z } from "zod";

// =======================================================
// INTERNAL NORMALIZED TYPES
// =======================================================

export const NormalizedAyahSchema = z.object({
    ayahKey: z.string(),
    surah: z.number(),
    ayah: z.number(),
    arabic: z.string(),

    translation: z.string(),
    translationSource: z.string(),
    translationId: z.number(),

    additionalTranslations: z
      .array(
        z.object({
          id: z.number(),
          text: z.string(),
          source: z.string(),
        })
      )
      .optional(),

    juz: z.number(),
    page: z.number(),
})

export type NormalizedAyah = z.infer<typeof NormalizedAyahSchema>

export const NormalizedSearchResultSchema = z.object({
  ayahKey: z.string(),
  surah: z.number(),
  ayah: z.number(),
  text: z.string(),
  highlightedText: z.string().optional(),
  translationSource: z.string(),
})

export type NormalizedSearchResult = z.infer<
  typeof NormalizedSearchResultSchema
>

export const NormalizedSearchResponseSchema = z.object({
  query: z.string(),
  totalResults: z.number(),
  currentPage: z.number(),
  totalPages: z.number(),
  perPage: z.number(),
  results: z.array(NormalizedSearchResultSchema),
})

export type NormalizedSearchResponse = z.infer<
  typeof NormalizedSearchResponseSchema
>

export const NormalizedTafsirSchema = z.object({
  ayahKey: z.string(),
  text: z.string(),
  source: z.string(),
  sourceId: z.number(),
  language: z.string(),
})

export type NormalizedTafsir = z.infer<typeof NormalizedTafsirSchema>

export const NormalizedSurahSchema = z.object({
  id: z.number(),
  nameArabic: z.string(),
  nameEnglish: z.string(),
  nameSimple: z.string(),
  ayahCount: z.number(),
  revelationPlace: z.enum(['makkah', 'madinah']),
  revelationOrder: z.number(),
})

export const RevelationPlaceEnum = z.enum(['makkah', 'madinah'])
export type RevelationPlace = z.infer<typeof RevelationPlaceEnum>

export type NormalizedSurah = z.infer<typeof NormalizedSurahSchema>

// =======================================================
// EXTERNAL API RAW TYPES (Direct from Quran.Foundation)
// =======================================================

export const ExternalTranslationSchema = z.object({
  id: z.number(),
  resource_id: z.number(),
  text: z.string(),
  language_name: z.string().optional(),
  resource_name: z.string().optional(),
})

export const ExternalVerseSchema = z.object({
  id: z.number(),
  verse_number: z.number(),
  verse_key: z.string(),
  chapter_id: z.number(),
  page_number: z.number(),
  juz_number: z.number(),
  hizb_number: z.number(),
  rub_el_hizb_number: z.number(),
  text_uthmani: z.string(),
  translations: z.array(ExternalTranslationSchema).optional(),
})

export type ExternalVerse = z.infer<typeof ExternalVerseSchema>

export const ExternalSearchResultSchema = z.object({
  verse_id: z.number(),
  verse_key: z.string(),
  text: z.string(),
  highlighted: z.string().optional(),
  translation_id: z.number(),
  translation_name: z.string(),
})

export const ExternalSearchResponseSchema = z.object({
  search: z.object({
    query: z.string(),
    total_results: z.number(),
    current_page: z.number(),
    total_pages: z.number(),
    per_page: z.number(),
    results: z.array(ExternalSearchResultSchema),
  }),
})

export const ExternalTafsirSchema = z.object({
  id: z.number(),
  tafsir_id: z.number(),
  tafsir_name: z.string(),
  verse_key: z.string(),
  text: z.string(),
  language_name: z.string().optional(),
})

export const ExternalTafsirResponseSchema = z.object({
  tafsir: ExternalTafsirSchema,
})

export const ExternalChapterSchema = z.object({
  id: z.number(),
  revelation_place: z.string(), // Normalize later
  revelation_order: z.number(),
  name_simple: z.string(),
  name_complex: z.string(),
  name_arabic: z.string(),
  verses_count: z.number(),
  translated_name: z.object({
    language_name: z.string(),
    name: z.string(),
  }),
})

// =======================================================
// UTILITY SCHEMAS
// =======================================================

// =====================================
// 1. Pagination metadata
// =====================================
export const PaginatorMetaSchema = z.object({
  total_results: z.number(),
  current_page: z.number(),
  total_pages: z.number(),
  per_page: z.number(),
});

// =====================================
// 2. Generic paginated result schema
// =====================================
export const PaginatedListSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    ...PaginatorMetaSchema.shape,
    results: z.array(item),
  });

// =====================================
// 3. Response wrapper for: { key: {...} }
// =====================================
export const BaseWrappedResponseSchema = <
  K extends string,
  T extends z.ZodTypeAny
>(
  key: K,
  schema: T
) =>
  z.object({
    [key]: schema,
  }) as unknown as z.ZodObject<{ [P in K]: T }>;

// =====================================
// 4. Translated Name
// =====================================
export const TranslatedNameSchema = z.object({
  language_name: z.string(),
  name: z.string(),
});

// =====================================
// ERROR TYPES
// =====================================
export class QuranAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public endpoint?: string,
    options?: {cause?: Error}
  ) {
    super(message, {cause: options?.cause})
    this.name = 'QuranAPIError'
  }
}

/** Validation Errors */
export class QuranAPIValidationError extends QuranAPIError {
  constructor(endpoint?: string, cause?: Error) {
    super('Invalid API response format', 400, endpoint, { cause })
  }
}

/** Network Errors */
export class QuranAPINetworkError extends QuranAPIError {
  constructor(endpoint?: string, cause?: Error) {
    super('Network error', 503, endpoint, {cause})
  }
}

/** Request Timeouts/Aborts */
export class QuranAPITimeoutError extends QuranAPIError {
  constructor(endpoint?: string, cause?: Error) {
    super('Request timeout', 504, endpoint, {cause})
  }
}

/** Rate Limiting Errors */
export class QuranAPIRateLimitError extends QuranAPIError {
  constructor(endpoint?: string) {
    super('Rate limit exceeded', 429, endpoint)
  }
}

/** Response Errors */
export class QuranAPIResponseError extends QuranAPIError {
  constructor(status: number, statusText: string, endpoint?: string) {
    super(`API returned ${status}: ${statusText}`, status, endpoint)
  }
}