import { QuranService } from '@/lib/services/quran/QuranService'
import { QuranClient } from '@/lib/external/quran/client'
import { NormalizedAyah, NormalizedSearchResponse } from '@/lib/external/quran/normalized'
import {
  QuranServiceError,
  QuranAPIRateLimitError,
  QuranAPITimeoutError,
  QuranAPIValidationError
} from '@/lib/external/quran/types'

// Mock the client
jest.mock('@/lib/external/quran/client')

describe('QuranService - Integration Tests', () => {
  let service: QuranService
  let mockClient: jest.Mocked<QuranClient>

  beforeEach(() => {
    jest.useFakeTimers()

// create mock instance of client
    mockClient = new QuranClient({
      clientId: 'test',
      clientSecret: 'test',
      authEndpoint: 'test',
    }) as jest.Mocked<QuranClient>

// instantiate service
    service = new QuranService({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      authEndpoint: 'https://auth.test',
      cacheTTL: 1000,
      enableCache: true,
    })

// inject mocked client
    ;(service as any).client = mockClient
  })

  afterEach(() => {
    service.clearCache()
    jest.clearAllMocks()
  })

  // ==========================================
  // 1. HAPPY PATH (Vertical Slice)
  // ==========================================

  describe('Happy Path - Data Flow', () => {
    it('should fetch and return ayah data', async () => {
      const mockAyah: NormalizedAyah = {
        ayah: 2558079,
        ayahNumber: 255,
        ayahKey: '2:255',
        surah: 2,
        page: 42,
        juz: 3,
        hizb: 5,
        rubElHizb: 19,
        arabic: 'ٱللَّهُ',
        translation: 131,
        translationName: 'Dr. Mustafa Khattab',
        translationText: 'Allah',
        translations: [
          { translation: 131, translationText: 'Allah', translationName: 'Dr. Mustafa Khattab' }
        ],
        additionalTranslations: [],
      }

      mockClient.getAyah.mockResolvedValueOnce(mockAyah)

      const result = await service.getAyah('2:255')

      expect(result).toEqual(mockAyah)
      expect(mockClient.getAyah).toHaveBeenCalledWith('2:255', undefined)
      expect(mockClient.getAyah).toHaveBeenCalledTimes(1)
    })

    it('should fetch and return search results', async () => {
      const mockSearch: NormalizedSearchResponse = {
        query: 'patience',
        totalResults: 10,
        currentPage: 1,
        totalPages: 1,
        perPage: 20,
        results: [{
          ayah: 255,
          ayahKey: '2:255',
          ayahNumber: 255,
          surah: 2,
          text: 'Test verse',
          highlightedText: undefined,
          translationSource: 'Test',
        }],
      }

      mockClient.searchAyat.mockResolvedValueOnce(mockSearch)

      const result = await service.searchAyat('patience')

      expect(result).toEqual(mockSearch)
      expect(mockClient.searchAyat).toHaveBeenCalledWith('patience', 1, 20)
    })
  })

  // ==========================================
  // 2. CACHING BEHAVIOR (Critical Test)
  // ==========================================

  describe('Caching Logic', () => {
    it('should cache ayah data', async () => {
      const mockAyah: NormalizedAyah = {
        ayah: 2558079,
        ayahNumber: 255,
        ayahKey: '2:255',
        surah: 2,
        page: 42,
        juz: 3,
        hizb: 5,
        rubElHizb: 19,
        arabic: 'ٱللَّهُ',
        translation: 131,
        translationName: 'english',
        translationText: 'Allah',
        translations: [],
        additionalTranslations: [],
      }

      mockClient.getAyah.mockResolvedValueOnce(mockAyah)

      // first call
      await service.getAyah('2:255')
      expect(mockClient.getAyah).toHaveBeenCalledTimes(1)

      // second call (cache hit)
      const result2 = await service.getAyah('2:255')
      expect(mockClient.getAyah).toHaveBeenCalledTimes(1) // stays 1
      expect(result2).toEqual(mockAyah)
    })

    it('should respect TTL and refetch after expiry', async () => {
      const mockAyah = { ayahKey: '2:255', arabic: 'ٱللَّهُ', } as any

      mockClient.getAyah
        .mockResolvedValueOnce(mockAyah)
        .mockResolvedValueOnce({ ...mockAyah, arabic: 'Updated' })

      await service.getAyah('2:255') // cache miss
      expect(mockClient.getAyah).toHaveBeenCalledTimes(1)

      // advance past ttl
      jest.advanceTimersByTime(1100)
      
      const result2 = await service.getAyah('2:255') //mis
      
      expect(mockClient.getAyah).toHaveBeenCalledTimes(2)
      expect(result2.arabic).toBe('Updated')
    })

    it('should isolate cache keys', async () => {
      const ayah1: NormalizedAyah = {
        ayah: 2558079,
        ayahNumber: 255,
        ayahKey: '2:255',
        surah: 2,
        page: 42,
        juz: 3,
        hizb: 5,
        rubElHizb: 19,
        arabic: 'ٱللَّهُ',
        translation: 131,
        translationName: 'english',
        translationText: 'Allah',
        translations: [],
        additionalTranslations: [],
      }

      const ayah2: NormalizedAyah = {
        ...ayah1,
        ayah: 256,
        ayahNumber: 256,
        ayahKey: '2:256',
        arabic: 'ayah 2',
        translationText: 'text2',
      }

      mockClient.getAyah
        .mockResolvedValueOnce(ayah1)
        .mockResolvedValueOnce(ayah2)

      await service.getAyah('2:255')
      await service.getAyah('2:256')

      expect(mockClient.getAyah).toHaveBeenCalledTimes(2)
    })

    it('should not cache when disabled', async () => {
      const serviceNoCache = new QuranService({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        authEndpoint: 'https://auth.test',
        enableCache: false,
      })

      ;(serviceNoCache as any).client = mockClient

      const mockAyah: NormalizedAyah = {
        ayah: 2558079,
        ayahNumber: 255,
        ayahKey: '2:255',
        surah: 2,
        page: 42,
        juz: 3,
        hizb: 5,
        rubElHizb: 19,
        arabic: 'ٱللَّهُ',
        translation: 131,
        translationName: 'english',
        translationText: 'Allah',
        translations: [],
        additionalTranslations: [],
      }

      mockClient.getAyah.mockResolvedValue(mockAyah)

      await serviceNoCache.getAyah('2:255')
      await serviceNoCache.getAyah('2:255')

      expect(mockClient.getAyah).toHaveBeenCalledTimes(2)
    })
  })

  // ==========================================
  // 3. ERROR TRANSLATION (Client → Service)
  // ==========================================

  describe('Error Mapping', () => {
    it('should map QuranAPIRateLimitError → RATE_LIMIT', async () => {
      mockClient.getAyah.mockRejectedValueOnce(new QuranAPIRateLimitError('/verses/2:255'))

      try {
        await service.getAyah('2:255')
      } catch (error: any) {
        expect(error).toBeInstanceOf(QuranServiceError)
        expect(error.code).toBe('RATE_LIMIT')
      }
    })

    it('should map timeout → TIMEOUT', async () => {
      const timeoutErr = new QuranAPITimeoutError('endpoint')
      mockClient.searchAyat.mockRejectedValueOnce(timeoutErr)

      try {
        await service.searchAyat('test')
      } catch (error: any) {
        expect(error).toBeInstanceOf(QuranServiceError)
        expect(error.code).toBe('TIMEOUT')
      }
    })

    it('should map invalid response → VALIDATION', async () => {
      mockClient.getTafsir.mockRejectedValueOnce(new QuranAPIValidationError('Invalid'))

      try {
        await service.getTafsir('2:255')
      } catch (error: any) {
        expect(error).toBeInstanceOf(QuranServiceError)
        expect(error.code).toBe('VALIDATION')
      }
    })

    it('should map unknown → UNKNOWN', async () => {
      mockClient.getSurah.mockRejectedValueOnce(new Error('Random error'))

      await expect(service.getSurah(2)).rejects.toThrow(QuranServiceError)

      try {
        await service.getSurah(2)
      } catch (error: any) {
        expect(error.code).toBe('UNKNOWN')
      }
    })
  })

  // ==========================================
  // 4. CACHE MANAGEMENT
  // ==========================================

  describe('Cache Management', () => {
    it('should clear cache', async () => {
      const mockAyah: NormalizedAyah = {
        ayah: 2558079,
        ayahNumber: 255,
        ayahKey: '2:255',
        surah: 2,
        page: 42,
        juz: 3,
        hizb: 5,
        rubElHizb: 19,
        arabic: 'ٱللَّهُ',
        translation: 131,
        translationName: 'english',
        translationText: 'Allah',
        translations: [],
        additionalTranslations: [],
      }

      mockClient.getAyah.mockResolvedValue(mockAyah)

      await service.getAyah('2:255')
      expect(mockClient.getAyah).toHaveBeenCalledTimes(1)

      service.clearCache()

      await service.getAyah('2:255')
      expect(mockClient.getAyah).toHaveBeenCalledTimes(2)
    })

    it('should report cache stats', async () => {
      const mockAyah: NormalizedAyah = {
        ayah: 2558079,
        ayahNumber: 255,
        ayahKey: '2:255',
        surah: 2,
        page: 42,
        juz: 3,
        hizb: 5,
        rubElHizb: 19,
        arabic: 'ٱللَّهُ',
        translation: 131,
        translationName: 'english',
        translationText: 'Allah',
        translations: [],
        additionalTranslations: [],
      }

      mockClient.getAyah.mockResolvedValue(mockAyah)

      const before = service.getCacheStats()
      expect(before.size).toBe(0)

      await service.getAyah('2:255')
      await service.getAyah('2:256')

      const after = service.getCacheStats()
      expect(after.size).toBe(2)
      expect(Array.isArray(after.keys)).toBe(true)
    })
  })
})
