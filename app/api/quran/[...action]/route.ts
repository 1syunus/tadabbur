import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { quranService } from '@/lib/services/quran/QuranService'
import { QuranServiceError } from '@/lib/external/quran/types'
import { requireAuth } from '@/lib/api/auth'
import { handleApiError, BadRequestError, ApiError } from '@/lib/api/errors'

// ==========================================
// INPUT VALIDATION SCHEMAS
// ==========================================

const VerseKeySchema = z
  .string()
  .regex(/^\d{1,3}:\d{1,3}$/, 'Invalid verse key format (expected "surah:ayah")')

const TranslationIdsSchema = z
  .string()
  .transform((val) => val.split(',').map(Number))
  .pipe(z.array(z.number().int().positive()))
  .optional()

const ChapterIdSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(114, 'Chapter ID must be between 1 and 114')

const SearchParamsSchema = z.object({
  q: z.string().min(1, 'Query cannot be empty').max(200),
  page: z.coerce.number().int().positive().default(1),
  size: z.coerce.number().int().positive().max(50).default(20),
})

const RangeParamsSchema = z.object({
  start: VerseKeySchema,
  end: VerseKeySchema,
})

// ==========================================
// HELPER: MAP SERVICE ERRORS TO HTTP CODES
// ==========================================

function mapServiceErrorToHttp(error: QuranServiceError): ApiError {
  switch (error.code) {
    case 'RATE_LIMIT':
      return new ApiError('Rate limit exceeded. Please try again later.', 429)
    case 'TIMEOUT':
      return new ApiError('Request timed out. Please try again.', 504)
    case 'VALIDATION':
      return new BadRequestError('Invalid data from external API')
    case 'UNKNOWN':
    default:
      return new ApiError('External API error occurred', 502)
  }
}

// ==========================================
// GET HANDLER (Unified Endpoint)
// ==========================================

export async function GET(
  request: NextRequest,
  { params }: { params: { action: string[] } },
) {
  try {
    // Require authentication (optional: comment out if public API)
    await requireAuth()

    const action = params.action?.[0]
    const { searchParams } = new URL(request.url)

    // ==========================================
    // ACTION: search
    // GET /api/quran/search?q=patience&page=1&size=10
    // ==========================================
    if (action === 'search') {
      const validated = SearchParamsSchema.safeParse({
        q: searchParams.get('q'),
        page: searchParams.get('page'),
        size: searchParams.get('size'),
      })

      if (!validated.success) {
        throw new BadRequestError(
          validated.error.issues.map((e) => e.message).join(', '),
        )
      }

      const { q, page, size } = validated.data

      try {
        const results = await quranService.searchAyat(q, page, size)
        return NextResponse.json(results, { status: 200 })
      } catch (error) {
        if (error instanceof QuranServiceError) {
          throw mapServiceErrorToHttp(error)
        }
        throw error
      }
    }

    // ==========================================
    // ACTION: ayah
    // GET /api/quran/ayah?verse_key=2:255&translations=131,85
    // ==========================================
    if (action === 'ayah') {
      const verseKey = searchParams.get('verse_key')
      const translations = searchParams.get('translations')

      if (!verseKey) {
        throw new BadRequestError('Missing required parameter: verse_key')
      }

      const validatedKey = VerseKeySchema.safeParse(verseKey)
      if (!validatedKey.success) {
        throw new BadRequestError(validatedKey.error.issues[0].message)
      }

      const translationIds = translations
        ? TranslationIdsSchema.parse(translations)
        : undefined

      try {
        const ayah = await quranService.getAyah(validatedKey.data, translationIds)
        return NextResponse.json(ayah, { status: 200 })
      } catch (error) {
        if (error instanceof QuranServiceError) {
          throw mapServiceErrorToHttp(error)
        }
        throw error
      }
    }

    // ==========================================
    // ACTION: tafsir
    // GET /api/quran/tafsir?verse_key=2:255&tafsir_ids=169
    // ==========================================
    if (action === 'tafsir') {
      const verseKey = searchParams.get('verse_key')
      const tafsirIds = searchParams.get('tafsir_ids')

      if (!verseKey) {
        throw new BadRequestError('Missing required parameter: verse_key')
      }

      const validatedKey = VerseKeySchema.safeParse(verseKey)
      if (!validatedKey.success) {
        throw new BadRequestError(validatedKey.error.issues[0].message)
      }

      const tafsirIdArray = tafsirIds
        ? tafsirIds.split(',').map(Number)
        : undefined

      try {
        const tafsir = await quranService.getTafsir(
          validatedKey.data,
          tafsirIdArray,
        )
        return NextResponse.json(tafsir, { status: 200 })
      } catch (error) {
        if (error instanceof QuranServiceError) {
          throw mapServiceErrorToHttp(error)
        }
        throw error
      }
    }

    // ==========================================
    // ACTION: surah
    // GET /api/quran/surah?chapter_id=2
    // ==========================================
    if (action === 'surah') {
      const chapterId = searchParams.get('chapter_id')

      if (!chapterId) {
        throw new BadRequestError('Missing required parameter: chapter_id')
      }

      const validated = ChapterIdSchema.safeParse(chapterId)
      if (!validated.success) {
        throw new BadRequestError(validated.error.issues[0].message)
      }

      try {
        const surah = await quranService.getSurah(validated.data)
        return NextResponse.json(surah, { status: 200 })
      } catch (error) {
        if (error instanceof QuranServiceError) {
          throw mapServiceErrorToHttp(error)
        }
        throw error
      }
    }

    // ==========================================
    // ACTION: range
    // GET /api/quran/range?start=2:1&end=2:5
    // ==========================================
    if (action === 'range') {
      const validated = RangeParamsSchema.safeParse({
        start: searchParams.get('start'),
        end: searchParams.get('end'),
      })

      if (!validated.success) {
        throw new BadRequestError(
          validated.error.issues.map((e) => e.message).join(', '),
        )
      }

      const { start, end } = validated.data

      try {
        const ayat = await quranService.getAyahRange(start, end)
        return NextResponse.json(ayat, { status: 200 })
      } catch (error) {
        if (error instanceof QuranServiceError) {
          throw mapServiceErrorToHttp(error)
        }
        throw error
      }
    }

    // ==========================================
    // INVALID ACTION
    // ==========================================
    throw new BadRequestError(
      `Invalid action: ${action}. Supported: search, ayah, tafsir, surah, range`,
    )
  } catch (error) {
    return handleApiError(error, 'quran-route')
  }
}