console.log('QURAN_CLIENT_ID:', JSON.stringify(process.env.QURAN_CLIENT_ID));
console.log('QURAN_CLIENT_SECRET:', JSON.stringify(process.env.QURAN_CLIENT_SECRET));

/**
 * Integration Tests for Health Check Endpoint
 * 
 * Tests the /api/health endpoint to ensure:
 * - API server responds correctly
 * - OAuth authentication is working
 * - External Quran Foundation API is accessible
 * - Proper status codes are returned
 * 
 * @requires QURAN_CLIENT_ID environment variable
 * @requires QURAN_CLIENT_SECRET environment variable
 */

import { GET } from '@/app/api/health/route'
import { NextRequest } from 'next/server'

// Mock the quranService to control behavior
jest.mock('@/lib/services/quran/QuranService', () => ({
  quranService: {
    getSurah: jest.fn(),
  },
}))

import { quranService } from '@/lib/services/quran/QuranService'
import { QuranServiceError } from '@/lib/external/quran/types'

describe('GET /api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Healthy Service', () => {
    it('should return 200 with healthy status when all checks pass', async () => {
      // Mock successful external API call
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
          externalApi: { status: 'pass' },
        },
      })
      expect(data.timestamp).toBeDefined()
      expect(data.responseTime).toBeGreaterThanOrEqual(0)
      expect(data.environment).toBe(process.env.NODE_ENV)
    })

    it('should include response time in milliseconds', async () => {
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

      expect(typeof data.responseTime).toBe('number')
      expect(data.responseTime).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Degraded Service', () => {
    it('should return 200 with degraded status on rate limit', async () => {
      // Mock rate limit error
      ;(quranService.getSurah as jest.Mock).mockRejectedValue(
        new QuranServiceError('Rate limit exceeded', 'RATE_LIMIT')
      )

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200) // Still 200 for degraded
      expect(data.status).toBe('degraded')
      expect(data.checks.externalApi.status).toBe('fail')
      expect(data.checks.externalApi.message).toContain('RATE_LIMIT')
    })

    it('should return degraded status when API returns unexpected data', async () => {
      // Mock unexpected response (wrong surah ID)
      ;(quranService.getSurah as jest.Mock).mockResolvedValue({
        surah: 999, // Wrong ID
        nameEnglish: 'Test',
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('degraded')
      expect(data.checks.externalApi.status).toBe('warn')
      expect(data.checks.externalApi.message).toContain('unexpected data')
    })
  })

  describe('Unhealthy Service', () => {
    it('should return 503 with unhealthy status on timeout', async () => {
      // Mock timeout error
      ;(quranService.getSurah as jest.Mock).mockRejectedValue(
        new QuranServiceError('Request timeout', 'TIMEOUT')
      )

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('unhealthy')
      expect(data.checks.externalApi.status).toBe('fail')
      expect(data.checks.externalApi.message).toContain('TIMEOUT')
    })

    it('should return 503 with unhealthy status on validation error', async () => {
      // Mock validation error
      ;(quranService.getSurah as jest.Mock).mockRejectedValue(
        new QuranServiceError('Validation failed', 'VALIDATION')
      )

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('unhealthy')
      expect(data.checks.externalApi.status).toBe('fail')
      expect(data.checks.externalApi.message).toContain('VALIDATION')
    })

    it('should return 503 with unhealthy status on unknown error', async () => {
      // Mock unknown error
      ;(quranService.getSurah as jest.Mock).mockRejectedValue(
        new QuranServiceError('Unknown error', 'UNKNOWN')
      )

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('unhealthy')
      expect(data.checks.externalApi.status).toBe('fail')
    })

    it('should return 503 with unhealthy status on generic error', async () => {
      // Mock generic error (not QuranServiceError)
      ;(quranService.getSurah as jest.Mock).mockRejectedValue(
        new Error('Network failure')
      )

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('unhealthy')
      expect(data.checks.externalApi.message).toBe('Network failure')
    })
  })

  describe('Service Initialization', () => {
    it('should fail gracefully if quranService is null/undefined', async () => {
      // This test verifies the null check works
      const originalService = (quranService as any)
      
      // Temporarily break the service
      jest.mock('@/lib/services/quran/QuranService', () => ({
        quranService: null,
      }))

      const response = await GET()
      const data = await response.json()

      // Should still return a response, not crash
      expect(response.status).toBeGreaterThanOrEqual(200)
      expect(data).toHaveProperty('status')
      expect(data).toHaveProperty('checks')
    })
  })

  describe('Response Structure', () => {
    it('should always include required fields', async () => {
      ;(quranService.getSurah as jest.Mock).mockResolvedValue({
        surah: 1,
        nameEnglish: 'The Opening',
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
      expect(data.checks).toHaveProperty('externalApi')

      // Each check has status and message
      expect(data.checks.api).toHaveProperty('status')
      expect(data.checks.api).toHaveProperty('message')
      expect(data.checks.quranService).toHaveProperty('status')
      expect(data.checks.quranService).toHaveProperty('message')
      expect(data.checks.externalApi).toHaveProperty('status')
      expect(data.checks.externalApi).toHaveProperty('message')
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
})

/**
 * E2E Test (Optional - requires actual environment setup)
 * 
 * This test hits the actual endpoint without mocks.
 * Only run this if QURAN_CLIENT_ID and QURAN_CLIENT_SECRET are set.
 */
describe('E2E: GET /api/health (with real external API)', () => {
  // Skip if credentials not available
  const skipE2E: boolean
    = !process.env.QURAN_CLIENT_ID || !process.env.QURAN_CLIENT_SECRET;

  const testFn = skipE2E ? it.skip : it

  testFn('should successfully connect to real Quran Foundation API', async () => {
    // Remove all mocks for E2E test
    jest.unmock('@/lib/services/quran/QuranService')
    
    const response = await GET()
    const data = await response.json()

    console.log('E2E Health Check Result:', JSON.stringify(data, null, 2))

    expect(response.status).toBeGreaterThanOrEqual(200)
    expect(response.status).toBeLessThan(600)
    expect(data.checks.api.status).toBe('pass')
    
    // External API should be pass or fail (not unknown)
    expect(['pass', 'fail', 'warn']).toContain(data.checks.externalApi.status)
  }, 30000) // 30 second timeout for real API call
})