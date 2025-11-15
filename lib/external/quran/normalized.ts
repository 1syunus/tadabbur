import { z } from "zod"

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