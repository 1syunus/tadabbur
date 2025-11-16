import {z} from "zod"
import { NormalizedAyah } from "../normalized"
import { ExternalVerseSchema, QuranAPIError  } from "../types"

export function normalizeAyah(raw: z.infer<typeof ExternalVerseSchema>): NormalizedAyah {
    // Safety checks
    if (!raw.verse_key) throw new QuranAPIError('Missing verse_key in API response')
    
    const [surah, ayah] = raw.verse_key.split(':').map(Number)
    const translations = raw.translations ?? []
    const primaryTranslation = translations[0]

    return {
      ayahKey: raw.verse_key,
      surah,
      ayah,
      arabic: raw.text_uthmani || '',
      translation: primaryTranslation?.text || '',
      translationSource: primaryTranslation?.resource_name ?? 'Unknown',
      translationId: primaryTranslation?.id ?? 0,
      additionalTranslations: raw.translations?.slice(1).map((t) => ({
        text: t.text ?? '',
        source: t.resource_name ?? 'Unknown',
        id: t.id ?? 0,
      })),
      juz: raw.juz_number ?? 0,
      page: raw.page_number ?? 0,
    }
  }
