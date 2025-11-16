import {z} from "zod"
import { NormalizedTafsir } from "../normalized"
import { ExternalTafsirResponseSchema } from "../types"

export function  normalizeTafsir(raw: z.infer<typeof ExternalTafsirResponseSchema>): NormalizedTafsir {
    const tafsir = raw.tafsir
    return {
      tafsirEntryId: tafsir.id,
      ayahKey: tafsir.verse_key || '0:0',
      text: tafsir.text || '',
      sourceName: tafsir.tafsir_name || 'Unknown',
      source: tafsir.tafsir_id || 0,
      language: tafsir.language_name || 'english',
    }
  }