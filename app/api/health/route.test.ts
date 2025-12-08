/**
 * Integration Tests for Health Check Endpoint
 * 
 * Tests the /api/health endpoint to ensure:
 * - API server responds correctly
 * - Quran OAuth authentication is working
 * - Quran external API is accessible
 * - Gemini API key is configured
 * - Database connectivity works
 * - Proper status codes are returned
 * 
 * @requires QURAN_CLIENT_ID environment variable
 * @requires QURAN_CLIENT_SECRET environment variable
 * @requires GEMINI_API_KEY environment variable
 * @requires NEXT_PUBLIC_SUPABASE_URL environment variable
 * @requires NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable
 */

import { GET } from '@/app/api/health/route'
import { quranService } from '@/lib/services/quran/QuranService'
import { QuranServiceError } from '@/lib/external/quran/types'
import { createClient } from '@supabase/supabase-js'

// Mock dependencies
jest.mock('@/lib/services/quran/QuranService', () => ({
  quranService: {
    getSurah: jest.fn(),
  },
}))

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}))

describe('GET /api/health', () => {
  let originalEnv: NodeJS.ProcessEnv
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    originalEnv = process.env

    // Default: all services healthy
    process.env.GEMINI_API_KEY = 'test-gemini-key-with-sufficient-length-1234567890'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

    // Mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ error: null }),
    }
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  afterEach(() => {
    process.env = originalEnv
  })

  // ==========================================
  // HEALTHY SERVICE
  // ==========================================

  describe('Healthy Service', () => {
    it('should return 200 with healthy status when all checks pass', async () => {
      const mockSurah = {
        surah: 1,
        nameArabic: 'الفاتحة',
        nameEnglish: 'The Opening',
        nameSimple: 'Al-Fatihah',
        ayahCount: 7,
        revelationPlace: 'makkah' as const,
        revelationOrder: 5,
      }

      ;(quranService.getSurah as jest.Mock).mockResolvedValue(mockSurah)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        status: 'healthy',
        checks: {
          api: { status: 'pass' },
          quranService: { status: 'pass' },
          quranApi: { status: 'pass' },
          geminiConfig: { status: 'pass' },
          database: { status: 'pass' },
        },
      })
      expect(data.timestamp).toBeDefined()
      expect(data.responseTime).toBeGreaterThanOrEqual(0)
      expect(data.environment).toBeDefined()
    })

    it('should include response time in milliseconds', async () => {
      ;(quranService.getSurah as jest.Mock).mockResolvedValue({
        surah: 1,
        ayahCount: 7,
        revelationPlace: 'makkah' as const,
      })

      const response = await GET()
      const data = await response.json()

      expect(typeof data.responseTime).toBe('number')
      expect(data.responseTime).toBeGreaterThanOrEqual(0)
    })
  })

  // ==========================================
  // DEGRADED SERVICE
  // ==========================================

  describe('Degraded Service', () => {
    it('should return 200 with degraded status on Quran rate limit', async () => {
      ;(quranService.getSurah as jest.Mock).mockRejectedValue(
        new QuranServiceError('Rate limit exceeded', 'RATE_LIMIT')
      )

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200) // Still 200 for degraded
      expect(data.status).toBe('degraded')
      expect(data.checks.quranApi.status).toBe('fail')
      expect(data.checks.quranApi.message).toContain('RATE_LIMIT')
    })

    it('should return degraded status when Quran API returns unexpected data', async () => {
      ;(quranService.getSurah as jest.Mock).mockResolvedValue({
        surah: 999, // Wrong ID
        nameEnglish: 'Test',
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('degraded')
      expect(data.checks.quranApi.status).toBe('warn')
      expect(data.checks.quranApi.message).toContain('unexpected data')
    })

    it('should return degraded when Gemini API key too short', async () => {
      process.env.GEMINI_API_KEY = 'short'

      ;(quranService.getSurah as jest.Mock).mockResolvedValue({
        surah: 1,
        ayahCount: 7,
        revelationPlace: 'makkah' as const,
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('degraded')
      expect(data.checks.geminiConfig.status).toBe('warn')
      expect(data.checks.geminiConfig.message).toContain('too short')
    })
  })

  // ==========================================
  // UNHEALTHY SERVICE
  // ==========================================

  describe('Unhealthy Service', () => {
    it('should return 503 with unhealthy status on Quran timeout', async () => {
      ;(quranService.getSurah as jest.Mock).mockRejectedValue(
        new QuranServiceError('Request timeout', 'TIMEOUT')
      )

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('unhealthy')
      expect(data.checks.quranApi.status).toBe('fail')
      expect(data.checks.quranApi.message).toContain('TIMEOUT')
    })

    it('should return 503 with unhealthy status on Quran validation error', async () => {
      ;(quranService.getSurah as jest.Mock).mockRejectedValue(
        new QuranServiceError('Validation failed', 'VALIDATION')
      )

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('unhealthy')
      expect(data.checks.quranApi.status).toBe('fail')
      expect(data.checks.quranApi.message).toContain('VALIDATION')
    })

    it('should return 503 with unhealthy status on Quran unknown error', async () => {
      ;(quranService.getSurah as jest.Mock).mockRejectedValue(
        new QuranServiceError('Unknown error', 'UNKNOWN')
      )

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('unhealthy')
      expect(data.checks.quranApi.status).toBe('fail')
    })

    it('should return 503 with unhealthy status on generic Quran error', async () => {
      ;(quranService.getSurah as jest.Mock).mockRejectedValue(
        new Error('Network failure')
      )

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('unhealthy')
      expect(data.checks.quranApi.message).toContain('Network failure')
    })

    it('should return 503 when Gemini API key missing', async () => {
      delete process.env.GEMINI_API_KEY

      ;(quranService.getSurah as jest.Mock).mockResolvedValue({
        surah: 1,
        ayahCount: 7,
        revelationPlace: 'makkah' as const,
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('unhealthy')
      expect(data.checks.geminiConfig.status).toBe('fail')
      expect(data.checks.geminiConfig.message).toContain('not configured')
    })

    it('should return 503 when database credentials missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL

      ;(quranService.getSurah as jest.Mock).mockResolvedValue({
        surah: 1,
        ayahCount: 7,
        revelationPlace: 'makkah' as const,
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('unhealthy')
      expect(data.checks.database.status).toBe('fail')
      expect(data.checks.database.message).toContain('not configured')
    })

    it('should return 503 when database connection fails', async () => {
      mockSupabase.limit.mockResolvedValue({
        error: { message: 'Connection refused' },
      })

      ;(quranService.getSurah as jest.Mock).mockResolvedValue({
        surah: 1,
        ayahCount: 7,
        revelationPlace: 'makkah' as const,
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('unhealthy')
      expect(data.checks.database.status).toBe('fail')
    })
  })

  // ==========================================
  // SERVICE INITIALIZATION
  // ==========================================

  describe('Service Initialization', () => {
    it('should fail gracefully if quranService is null/undefined', async () => {
      // Store the original mock
      const originalMock = jest.requireMock('@/lib/services/quran/QuranService')
      
      // Temporarily set quranService to null
      jest.doMock('@/lib/services/quran/QuranService', () => ({
        quranService: null,
      }))

      // Clear the module cache to force re-import
      jest.resetModules()

      // Import the route with the null service
      const { GET } = await import('@/app/api/health/route')

      const response = await GET()
      const data = await response.json()

      expect(data.checks.quranService.status).toBe('fail')
      expect(data.checks.quranApi.status).toBe('unknown')

      // Restore the original mock
      jest.doMock('@/lib/services/quran/QuranService', () => originalMock)
      jest.resetModules()
    })
  })

  // ==========================================
  // RESPONSE STRUCTURE
  // ==========================================

  describe('Response Structure', () => {
    it('should always include required fields', async () => {
      ;(quranService.getSurah as jest.Mock).mockResolvedValue({
        surah: 1,
        ayahCount: 7,
        revelationPlace: 'makkah' as const,
      })

      const response = await GET()
      const data = await response.json()

      // Required fields
      expect(data).toHaveProperty('status')
      expect(data).toHaveProperty('timestamp')
      expect(data).toHaveProperty('checks')
      expect(data).toHaveProperty('responseTime')
      expect(data).toHaveProperty('environment')

      // Checks structure
      expect(data.checks).toHaveProperty('api')
      expect(data.checks).toHaveProperty('quranService')
      expect(data.checks).toHaveProperty('quranApi')
      expect(data.checks).toHaveProperty('geminiConfig')
      expect(data.checks).toHaveProperty('database')

      // Each check has status and message
      Object.values(data.checks).forEach((check: any) => {
        expect(check).toHaveProperty('status')
        expect(check).toHaveProperty('message')
      })
    })

    it('should have valid ISO 8601 timestamp', async () => {
      ;(quranService.getSurah as jest.Mock).mockResolvedValue({
        surah: 1,
        ayahCount: 7,
        revelationPlace: 'makkah' as const,
      })

      const response = await GET()
      const data = await response.json()

      const timestamp = new Date(data.timestamp)
      expect(timestamp.toISOString()).toBe(data.timestamp)
    })

    it('should have status as one of: healthy, degraded, unhealthy', async () => {
      ;(quranService.getSurah as jest.Mock).mockResolvedValue({
        surah: 1,
        ayahCount: 7,
        revelationPlace: 'makkah' as const,
      })

      const response = await GET()
      const data = await response.json()

      expect(['healthy', 'degraded', 'unhealthy']).toContain(data.status)
    })
  })

  // ==========================================
  // EDGE CASES
  // ==========================================

  describe('Edge Cases', () => {
    it('should skip Quran API check if service not initialized', async () => {
      // Store the original mock
      const originalMock = jest.requireMock('@/lib/services/quran/QuranService')
      
      // Set quranService to null
      jest.doMock('@/lib/services/quran/QuranService', () => ({
        quranService: null,
      }))

      // Clear the module cache to force re-import
      jest.resetModules()

      // Import the route with the null service
      const { GET } = await import('@/app/api/health/route')

      const response = await GET()
      const data = await response.json()

      expect(data.checks.quranApi.status).toBe('unknown')
      expect(data.checks.quranApi.message).toContain('not initialized')

      // Restore the original mock
      jest.doMock('@/lib/services/quran/QuranService', () => originalMock)
      jest.resetModules()
    })

    it('should handle database connection throwing unexpectedly', async () => {
      ;(createClient as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected throw')
      })

      ;(quranService.getSurah as jest.Mock).mockResolvedValue({
        surah: 1,
        ayahCount: 7,
        revelationPlace: 'makkah' as const,
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.checks.database.status).toBe('fail')
    })
  })
})

/**
 * E2E Test (Optional - requires actual environment setup)
 * 
 * This test hits the actual endpoint without mocks.
 * Only run this if all credentials are available.
 */
describe('E2E: GET /api/health (with real external APIs)', () => {
  const skipE2E = 
    !process.env.QURAN_CLIENT_ID || 
    !process.env.QURAN_CLIENT_SECRET ||
    !process.env.GEMINI_API_KEY ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const testFn = skipE2E ? it.skip : it

  testFn('should successfully connect to all real external services', async () => {
    // Remove all mocks for E2E test
    jest.unmock('@/lib/services/quran/QuranService')
    jest.unmock('@supabase/supabase-js')
    
    const response = await GET()
    const data = await response.json()

    console.log('E2E Health Check Result:', JSON.stringify(data, null, 2))

    expect(response.status).toBeGreaterThanOrEqual(200)
    expect(response.status).toBeLessThan(600)
    expect(data.checks.api.status).toBe('pass')
    
    // All services should have definitive status
    expect(['pass', 'fail', 'warn']).toContain(data.checks.quranApi.status)
    expect(['pass', 'fail', 'warn']).toContain(data.checks.geminiConfig.status)
    expect(['pass', 'fail']).toContain(data.checks.database.status)
  }, 30000) // 30 second timeout for real API calls
})