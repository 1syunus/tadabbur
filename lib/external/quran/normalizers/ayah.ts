import {z} from "zod"
import { NormalizedAyah } from "../normalized"
import { ExternalVerseSchema, QuranAPIError  } from "../types"

export function normalizeAyah(raw: z.infer<typeof ExternalVerseSchema>): NormalizedAyah {
    // Safety checks
    if (!raw.verse_key) throw new QuranAPIError('Missing verse_key in API response')
    
    const [surah, ayahNumber] = raw.verse_key.split(':').map(Number)
    
    const translations = (raw.translations ?? []).map(t => ({
      translation: t.id ?? 0,
      translationName: t.resource_name ?? 'Unknown',
      translationText: t.text ?? "",
    }))

    const primaryTranslation = translations[0] ?? {
      translation: 0,
      translationName: "Unknown",
      translationText: "",
    }

    return {
      ayah: raw.id,
      ayahKey: raw.verse_key,
      ayahNumber,
      surah,

      arabic: raw.text_uthmani ?? '',

      translation: primaryTranslation.translation,
      translationName: primaryTranslation.translationName,
      translationText: primaryTranslation?.translationText,

      translations,
      additionalTranslations: translations.slice(1),
            
      hizb: raw.hizb_number ?? 0,
      rubElHizb: raw.rub_el_hizb_number ?? 0,
      juz: raw.juz_number ?? 0,
      page: raw.page_number ?? 0,
    }
  }
