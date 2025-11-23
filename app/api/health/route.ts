import { NextResponse } from 'next/server'
import { quranService } from '@/lib/services/quran/QuranService'
import { QuranServiceError } from '@/lib/external/quran/types'

/**
 * Health Check Endpoint
 * 
 * Verifies that the API and its dependencies are operational:
 * - API server is running
 * - OAuth authentication is working
 * - External Quran Foundation API is accessible
 * - Service layer is functional
 * 
 * @route GET /api/health
 * @returns Health status with detailed checks
 * 
 * @example
 * fetch('/api/health')
 *   .then(r => r.json())
 *   .then(data => console.log(data.status)) // "healthy"
 */
export async function GET() {
  const startTime = Date.now()
  
  const health = {
    status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
    timestamp: new Date().toISOString(),
    checks: {
      api: { status: 'pass', message: 'API server is running' },
      quranService: { status: 'unknown', message: 'Not checked' },
      externalApi: { status: 'unknown', message: 'Not checked' },
    },
    responseTime: 0,
    environment: process.env.NODE_ENV,
  }

  // Check 1: Quran Service Initialization
  try {
    if (!quranService) {
      health.checks.quranService = {
        status: 'fail',
        message: 'Quran service not initialized',
      }
      health.status = 'unhealthy'
    } else {
      health.checks.quranService = {
        status: 'pass',
        message: 'Service initialized',
      }
    }
  } catch (error) {
    health.checks.quranService = {
      status: 'fail',
      message: error instanceof Error ? error.message : 'Service initialization error',
    }
    health.status = 'unhealthy'
  }

  // Check 2: External API Connectivity (lightweight test)
  // Fetch a simple, cacheable surah to test OAuth + API
  if (health.checks.quranService.status === 'pass') {
    try {
      const testSurah = await quranService.getSurah(1) // Al-Fatiha (always exists)
      
      if (testSurah && testSurah.surah === 1) {
        health.checks.externalApi = {
          status: 'pass',
          message: 'External API accessible and OAuth working',
        }
      } else {
        health.checks.externalApi = {
          status: 'warn',
          message: 'API returned unexpected data',
        }
        health.status = 'degraded'
      }
    } catch (error) {
      if (error instanceof QuranServiceError) {
        health.checks.externalApi = {
          status: 'fail',
          message: `External API error: ${error.code}`,
        }
        
        // Rate limit = degraded (not our fault), others = unhealthy
        health.status = error.code === 'RATE_LIMIT' ? 'degraded' : 'unhealthy'
      } else {
        health.checks.externalApi = {
          status: 'fail',
          message: error instanceof Error ? error.message : 'Unknown error',
        }
        health.status = 'unhealthy'
      }
    }
  }

  // Calculate response time
  health.responseTime = Date.now() - startTime

  // Return appropriate HTTP status
  const httpStatus = 
    health.status === 'healthy' ? 200 : 
    health.status === 'degraded' ? 200 : // Still return 200 for degraded
    503 // Service unavailable for unhealthy

  return NextResponse.json(health, { status: httpStatus })
}

/**
 * Response Schema:
 * 
 * {
 *   "status": "healthy" | "degraded" | "unhealthy",
 *   "timestamp": "2025-01-22T10:30:00.000Z",
 *   "checks": {
 *     "api": {
 *       "status": "pass",
 *       "message": "API server is running"
 *     },
 *     "quranService": {
 *       "status": "pass" | "fail" | "unknown",
 *       "message": "Service initialized"
 *     },
 *     "externalApi": {
 *       "status": "pass" | "fail" | "warn" | "unknown",
 *       "message": "External API accessible and OAuth working"
 *     }
 *   },
 *   "responseTime": 234,
 *   "environment": "production" | "development" | "test"
 * }
 */