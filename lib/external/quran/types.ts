import { z } from "zod";

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
// CORE ENTITIES
// =====================================

// 5. Translation object
export const TranslationSchema = z.object({
  id: z.number(),
  resource_id: z.number(),
  text: z.string(),
  language_name: z.string().optional(),
  resource_name: z.string().optional(),
});
export type Translation = z.infer<typeof TranslationSchema>;

// 6. Verse
export const VerseSchema = z.object({
  id: z.number(),
  verse_number: z.number(),
  verse_key: z.string(),
  chapter_id: z.number(),
  page_number: z.number(),
  juz_number: z.number(),

  text_uthmani: z.string(),
  text_indopak: z.string().optional(),

  sajdah_number: z.number().nullable().optional(),
  ruku_number: z.number().nullable().optional(),

  translations: z.array(TranslationSchema).optional(),

  audio: z.object({ url: z.string().url() }).optional(),
});
export type Verse = z.infer<typeof VerseSchema>;

// 7. Search result item
export const SearchResultSchema = z.object({
  verse_id: z.number(),             // ← FIX 1
  verse_key: z.string(),
  text: z.string(),
  highlighted: z.string().optional(),
  translation_id: z.number(),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

// 8. Tafsir
export const TafsirSchema = z.object({
  id: z.number(),
  tafsir_id: z.number(),
  tafsir_name: z.string(),
  verse_key: z.string(),
  text: z.string(),
});
export type Tafsir = z.infer<typeof TafsirSchema>;

// 9. Chapter
export const ChapterSchema = z.object({
  id: z.number(),
  revelation_place: z.enum(['makkah', 'madinah']), // ← FIX 2
  revelation_order: z.number(),
  bismillah_pre: z.boolean(),
  name_simple: z.string(),
  name_arabic: z.string(),
  verses_count: z.number(),
  pages: z.array(z.number()),
  translated_name: TranslatedNameSchema,
});
export type Chapter = z.infer<typeof ChapterSchema>;

// =====================================
// RESPONSE SCHEMAS
// =====================================

// 10. Search Response
export const SearchPayloadSchema = PaginatedListSchema(SearchResultSchema).extend({
  query: z.string(),
});
export const SearchResponseSchema = BaseWrappedResponseSchema("search", SearchPayloadSchema);
export type SearchResponse = z.infer<typeof SearchResponseSchema>;

// 11. Verse Response
export const VerseResponseSchema = BaseWrappedResponseSchema("verse", VerseSchema);
export type VerseResponse = z.infer<typeof VerseResponseSchema>;

// 12. Tafsir Response
export const TafsirResponseSchema = BaseWrappedResponseSchema("tafsir", TafsirSchema);
export type TafsirResponse = z.infer<typeof TafsirResponseSchema>;

// 13. Chapter Response
export const ChapterResponseSchema = BaseWrappedResponseSchema("chapter", ChapterSchema);
export type ChapterResponse = z.infer<typeof ChapterResponseSchema>;

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