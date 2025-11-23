jest.mock('@/lib/external/quran', () => {
  return {
    quranService: {
      searchAyat: jest.fn(),
      getAyah: jest.fn(),
      getTafsir: jest.fn(),
      getSurah: jest.fn(),
      getAyahRange: jest.fn(),
    },
  }
})

import { GET } from './route'
import { quranService } from '@/lib/external/quran/'
import { QuranServiceError } from '@/lib/external/quran/types'
import { getTestUserClient } from '@/lib/helpers/db'
import type {
  NormalizedAyah,
  NormalizedSearchResponse,
  NormalizedTafsir,
  NormalizedSurah,
} from '@/lib/external/quran/normalized'



describe('/api/quran/[...action] route', () => {
  const mockService = quranService as unknown as jest.Mocked<typeof quranService>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ==========================================
  // HELPER: Create Mock Request
  // ==========================================

  async function createRequest(action: string, params: Record<string, string> = {}) {
    const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v != null)
    )
    const searchParams = new URLSearchParams(cleanParams)
    const url = `http://localhost:3000/api/quran/${action}?${searchParams}`

    // await test client
    const testClient = await getTestUserClient()
    const request = new Request(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(testClient as any).headers, // Auth headers
      },
    })

    return request as any // Next.js typing workaround
  }

  // ==========================================
  // 1. HAPPY PATH (All Actions)
  // ==========================================

  describe('Happy Path - Data Flow', () => {
    it('should return search results for valid query', async () => {
      const mockResults: NormalizedSearchResponse = {
        query: 'patience',
        totalResults: 1,
        currentPage: 1,
        totalPages: 1,
        perPage: 20,
        results: [
          {
            ayah: 9088,
            ayahKey: '2:255',
            ayahNumber: 255,
            surah: 2,
            text: 'Allah! There is no deity...',
            translationSource: 'source',
            highlightedText: '<em>Allah</em>! There is no deity...',
          },
        ],
      }

      mockService.searchAyat.mockResolvedValueOnce(mockResults)

      const request = await createRequest('search', { q: 'patience', page: '1', size: '10' })
      const response = await GET(request, { params: { action: ['search'] } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockResults)
      expect(mockService.searchAyat).toHaveBeenCalledWith('patience', 1, 10)
    })

    it('should return ayah data for valid verse key', async () => {
      const mockAyah: NormalizedAyah = {
        ayah: 12345,
        ayahNumber: 255,
        ayahKey: '2:255',
        surah: 2,
        arabic: 'ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ',
        hizb: 5,
        rubElHizb: 19,
        // required translation fields
        translation: 131,
        translationName: 'Dr. Mustafa Khattab',
        translationText: 'Allah! There is no deity except Him',
        translations: [
          {
            translation: 131,
            translationName: 'Dr. Mustafa Khattab',
            translationText: 'Allah! There is no deity except Him',
          },
        ],
        additionalTranslations: [],
        juz: 3,
        page: 42,
      }

      mockService.getAyah.mockResolvedValueOnce(mockAyah)

      const request = await createRequest('ayah', { verse_key: '2:255' })
      const response = await GET(request, { params: { action: ['ayah'] } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockAyah)
      expect(mockService.getAyah).toHaveBeenCalledWith('2:255', undefined)
    })

    it('should return tafsir data for valid verse key', async () => {
      const mockTafsir: NormalizedTafsir[] = [
        {
          tafsirEntryId: 1,
          ayahKey: '2:255',
          text: 'This is the greatest verse...',
          sourceName: 'Tafsir al-Jalalayn',
          source: 169,
          language: 'english',
        },
      ]

      mockService.getTafsir.mockResolvedValueOnce(mockTafsir)

      const request = await createRequest('tafsir', { verse_key: '2:255' })
      const response = await GET(request, { params: { action: ['tafsir'] } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockTafsir)
      expect(mockService.getTafsir).toHaveBeenCalledWith('2:255', undefined)
    })

    it('should return surah metadata for valid chapter ID', async () => {
      const mockSurah: NormalizedSurah = {
        surah: 2,
        nameArabic: 'البقرة',
        nameEnglish: 'The Cow',
        nameSimple: 'Al-Baqarah',
        ayahCount: 286,
        revelationPlace: 'madinah',
        revelationOrder: 87,
      }

      mockService.getSurah.mockResolvedValueOnce(mockSurah)

      const request = await createRequest('surah', { chapter_id: '2' })
      const response = await GET(request, { params: { action: ['surah'] } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockSurah)
      expect(mockService.getSurah).toHaveBeenCalledWith(2)
    })

    it('should return range of ayat for valid start and end', async () => {
      const mockRange: NormalizedAyah[] = [
        {
          ayah: 1,
          ayahNumber: 1,
          ayahKey: '2:1',
          surah: 2,
          arabic: 'الم',
          hizb: 1,
          rubElHizb: 1,
          translation: 0,
          translationName: 'unknown',
          translationText: '',
          translations: [],
          additionalTranslations: [],
          juz: 1,
          page: 2,
        },
        {
          ayah: 2,
          ayahNumber: 2,
          ayahKey: '2:2',
          surah: 2,
          arabic: 'ذَٰلِكَ ٱلْكِتَٰبُ',
          hizb: 1,
          rubElHizb: 1,
          translation: 0,
          translationName: 'unknown',
          translationText: '',
          translations: [],
          additionalTranslations: [],
          juz: 1,
          page: 2,
        },
      ]

      mockService.getAyahRange.mockResolvedValueOnce(mockRange)

      const request = await createRequest('range', { start: '2:1', end: '2:2' })
      const response = await GET(request, { params: { action: ['range'] } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockRange)
      expect(mockService.getAyahRange).toHaveBeenCalledWith('2:1', '2:2')
    })
  })

  // ==========================================
  // 2. INPUT VALIDATION (Fail-Fast)
  // ==========================================

  describe('Input Validation', () => {
    it('should return 400 for missing search query', async () => {
      const request = await createRequest('search', {})
      const response = await GET(request, { params: { action: ['search'] } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(JSON.stringify(data.error)).toMatch(/invalid|missing|required/i)
      expect(mockService.searchAyat).not.toHaveBeenCalled()
    })

    it('should return 400 for invalid verse key format', async () => {
      const request = await createRequest('ayah', { verse_key: 'invalid' })
      const response = await GET(request, { params: { action: ['ayah'] } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid verse key format')
      expect(mockService.getAyah).not.toHaveBeenCalled()
    })

    it('should return 400 for missing verse_key parameter', async () => {
      const request = await createRequest('ayah', {})
      const response = await GET(request, { params: { action: ['ayah'] } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing required parameter: verse_key')
      expect(mockService.getAyah).not.toHaveBeenCalled()
    })

    it('should return 400 for invalid chapter ID (out of range)', async () => {
      const request = await createRequest('surah', { chapter_id: '115' })
      const response = await GET(request, { params: { action: ['surah'] } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Chapter ID must be between 1 and 114')
      expect(mockService.getSurah).not.toHaveBeenCalled()
    })

    it('should return 400 for missing range parameters', async () => {
      const request = await createRequest('range', { start: '2:1' }) // Missing 'end'
      const response = await GET(request, { params: { action: ['range'] } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
      expect(mockService.getAyahRange).not.toHaveBeenCalled()
    })

    it('should return 400 for invalid action', async () => {
      const request = await createRequest('invalid_action', {})
      const response = await GET(request, { params: { action: ['invalid_action'] } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid action')
      expect(data.error).toContain('Supported: search, ayah, tafsir, surah, range')
    })
  })

  // ==========================================
  // 3. ERROR TRANSLATION & STATUS MAPPING
  // ==========================================

  describe('Error Translation from Service Layer', () => {
    it('should return 429 for rate limit errors', async () => {
      mockService.searchAyat.mockRejectedValueOnce(
        new QuranServiceError('Rate limit exceeded', 'RATE_LIMIT'),
      )

      const request = await createRequest('search', { q: 'test', page: '1', size: '20' })
      const response = await GET(request, { params: { action: ['search'] } })
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toContain('Rate limit exceeded')
    })

    it('should return 504 for timeout errors', async () => {
      mockService.getAyah.mockRejectedValueOnce(
        new QuranServiceError('Request timed out', 'TIMEOUT'),
      )

      const request = await createRequest('ayah', { verse_key: '2:255' })
      const response = await GET(request, { params: { action: ['ayah'] } })
      const data = await response.json()

      expect(response.status).toBe(504)
      expect(data.error).toContain('timed out')
    })

    it('should return 400 for validation errors from external API', async () => {
      mockService.getTafsir.mockRejectedValueOnce(
        new QuranServiceError('Invalid response', 'VALIDATION'),
      )

      const request = await createRequest('tafsir', { verse_key: '2:255' })
      const response = await GET(request, { params: { action: ['tafsir'] } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid data from external API')
    })

    it('should return 502 for unknown service errors', async () => {
      mockService.getSurah.mockRejectedValueOnce(
        new QuranServiceError('Unknown error', 'UNKNOWN'),
      )

      const request = await createRequest('surah', { chapter_id: '2' })
      const response = await GET(request, { params: { action: ['surah'] } })
      const data = await response.json()

      expect(response.status).toBe(502)
      expect(data.error).toContain('External API error')
    })

    it('should return 500 for unexpected errors', async () => {
      mockService.searchAyat.mockRejectedValueOnce(new Error('Unexpected'))

      const request = await createRequest('search', { q: 'test', page: '1', size: '20' })
      const response = await GET(request, { params: { action: ['search'] } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })
  })

  // ==========================================
  // 4. ARGUMENT PASSING (Service Called Correctly)
  // ==========================================

  describe('Argument Passing to Service', () => {
    it('should pass correct arguments to searchAyat', async () => {
      mockService.searchAyat.mockResolvedValueOnce({
        query: 'test',
        totalResults: 0,
        currentPage: 1,
        totalPages: 0,
        perPage: 20,
        results: [],
      } as NormalizedSearchResponse)

      const request = await createRequest('search', { q: 'test', page: '2', size: '15' })
      await GET(request, { params: { action: ['search'] } })

      expect(mockService.searchAyat).toHaveBeenCalledWith('test', 2, 15)
    })

    it('should pass translation IDs to getAyah', async () => {
      mockService.getAyah.mockResolvedValueOnce({
        ayah: 255,
        ayahNumber: 255,
        ayahKey: '2:255',
        surah: 2,
        arabic: 'test',
        hizb: 1,
        rubElHizb: 1,
        translation: 0,
        translationName: 'unknown',
        translationText: '',
        translations: [],
        additionalTranslations: [],
        juz: 3,
        page: 42,
      } as NormalizedAyah)

      const request = await createRequest('ayah', {
        verse_key: '2:255',
        translations: '131,85',
      })
      await GET(request, { params: { action: ['ayah'] } })

      expect(mockService.getAyah).toHaveBeenCalledWith('2:255', [131, 85])
    })

    it('should pass tafsir IDs to getTafsir', async () => {
      mockService.getTafsir.mockResolvedValueOnce([])

      const request = await createRequest('tafsir', {
        verse_key: '2:255',
        tafsir_ids: '169,171',
      })
      await GET(request, { params: { action: ['tafsir'] } })

      expect(mockService.getTafsir).toHaveBeenCalledWith('2:255', [169, 171])
    })

    it('should use default values when optional params missing', async () => {
      mockService.searchAyat.mockResolvedValueOnce({
        query: 'test',
        totalResults: 0,
        currentPage: 1,
        totalPages: 0,
        perPage: 20,
        results: [],
      } as NormalizedSearchResponse)

      const request = await createRequest('search', { q: 'test' })
      const response = await GET(request, { params: { action: ['search'] } })

      if (response.status === 400) {
          const data = await response.json();
          console.log("Validation failed on defaults test:", data);
      }

      expect(mockService.searchAyat).toHaveBeenCalledWith('test', 1, 20)
    })
  })
})