import {z} from "zod"
import { NormalizedSearchResponse } from "../normalized"
import { ExternalSearchResponseSchema } from "../types"

 export function normalizeSearchResponse(raw: z.infer<typeof ExternalSearchResponseSchema>): NormalizedSearchResponse {
    return {
      query: raw.search.query || '',
      totalResults: raw.search.total_results ?? 0,
      currentPage: raw.search.current_page ?? 1,
      totalPages: raw.search.total_pages ?? 1,
      perPage: raw.search.per_page ?? 20,
      results: raw.search.results.map((r) => {
        const [surah, ayah] = (r.verse_key || '0:0').split(':').map(Number)
        return {
          ayahKey: r.verse_key || '0:0',
          surah,
          ayah,
          text: r.text || '',
          highlightedText: r.highlighted || undefined, // Optional
          translationSource: r.translation_name || 'Unknown',
        }
      }),
    }
  }