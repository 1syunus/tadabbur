import { z } from "zod"

// =======================================================
// INTERNAL NORMALIZED TYPES
// =======================================================

export const NormalizedTranslationSchema = z.object({
  translation: z.number(), // numeric id
  translationName: z.string(), // human id
  translationText: z.string(), // actual text
})

export const NormalizedAyahSchema = z.object({
    ayah: z.number(),
    ayahNumber: z.number(),
    ayahKey: z.string(),
    surah: z.number(),

    
    arabic: z.string(), //maps to text_uthmani
    hizb: z.number(),
    rubElHizb: z.number(),

    // primary translation
    translation: z.number(),
    translationName: z.string(),
    translationText: z.string(),

    // lists
    translations: NormalizedTranslationSchema.array(),
    additionalTranslations: NormalizedTranslationSchema.array(),

    juz: z.number(),
    page: z.number(),
})

export type NormalizedAyah = z.infer<typeof NormalizedAyahSchema>

export const NormalizedSearchResultSchema = z.object({
  ayah: z.number(),
  ayahNumber: z.number(),
  ayahKey: z.string(),
  surah: z.number(),
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
  tafsirEntryId: z.number(),
  ayahKey: z.string(),
  text: z.string(),
  sourceName: z.string(),
  source: z.number(),
  language: z.string(),
})

export type NormalizedTafsir = z.infer<typeof NormalizedTafsirSchema>

export const RevelationPlaceEnum = z.enum(['makkah', 'madinah', 'unknown'])
export type RevelationPlace = z.infer<typeof RevelationPlaceEnum>

export const NormalizedSurahSchema = z.object({
  surah: z.number(),
  nameArabic: z.string(),
  nameEnglish: z.string(),
  nameSimple: z.string(),
  ayahCount: z.number(),
  revelationPlace: RevelationPlaceEnum,
  revelationOrder: z.number(),
})

export type NormalizedSurah = z.infer<typeof NormalizedSurahSchema>