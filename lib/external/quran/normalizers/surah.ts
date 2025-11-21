import {z} from "zod"
import { NormalizedSurah } from "../normalized"
import { ExternalChapterSchema } from "../types"
import { normalizeRevelationPlace } from "./revelationPlace"

export function normalizeSurah(raw: z.infer<typeof ExternalChapterSchema>): NormalizedSurah {
    return {
      surah: raw.id ?? 0,
      nameArabic: raw.name_arabic || '',
      nameEnglish: raw.translated_name?.name || '',
      nameSimple: raw.name_simple || '',
      ayahCount: raw.verses_count ?? 0,
      revelationPlace: normalizeRevelationPlace(raw.revelation_place),
      revelationOrder: raw.revelation_order ?? 0,
    }
  }