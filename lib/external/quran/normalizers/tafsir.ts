import {z} from "zod"
import { NormalizedTafsir } from "../normalized"
import { ExternalTafsirSchema } from "../types"

export function  normalizeTafsir(raw: z.infer<typeof ExternalTafsirSchema>): NormalizedTafsir {
  return {
    tafsirEntryId: raw.id,
    ayahKey: raw.verse_key || '0:0',
    text: raw.text || '',
    sourceName: raw.tafsir_name || 'Unknown',
    source: raw.tafsir_id || 0,
    language: raw.language_name || 'english',
  }
}