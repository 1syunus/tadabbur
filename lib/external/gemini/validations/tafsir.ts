import { z } from 'zod'

// Zod schema for normalized tafsir objects
export const TafsirUsedSchema = z.object({
  ayahKey: z.string(),
  tafsirId: z.number(),
  sourceName: z.string(),
})

// Schema for the array coming from DB (JSONB can be null)
export const TafsirUsedArraySchema = z.array(TafsirUsedSchema).default([])
