import { NextResponse } from 'next/server'
import { quranService } from '@/lib/services/quran/QuranService'
import { QuranServiceError } from '@/lib/external/quran/types'
import { createClient } from '@supabase/supabase-js'

/**
 * Health Check Endpoint
 * 
 * Verifies that the API and its dependencies are operational:
 * - API server is running
 * - Quran OAuth authentication is working
 * - Quran external API is accessible
 * - Gemini API key is configured
 * - Database connectivity (Supabase)
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
      api: { status: 'pass' as const, message: 'API server is running' },
      quranService: { status: 'unknown' as 'pass' | 'fail' | 'warn' | 'unknown', message: 'Not checked' },
      quranApi: { status: 'unknown' as 'pass' | 'fail' | 'warn' | 'unknown', message: 'Not checked' },
      geminiConfig: { status: 'unknown' as 'pass' | 'fail' | 'warn' | 'unknown', message: 'Not checked' },
      database: { status: 'unknown' as 'pass' | 'fail' | 'warn' | 'unknown', message: 'Not checked' },
    },
    responseTime: 0,
    environment: process.env.NODE_ENV || 'unknown',
  }

  // ==========================================
  // CHECK 1: QURAN SERVICE INITIALIZATION
  // ==========================================
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

  // ==========================================
  // CHECK 2: QURAN EXTERNAL API CONNECTIVITY
  // ==========================================
  if (health.checks.quranService.status === 'pass') {
    try {
      const testSurah = await quranService.getSurah(1) // Al-Fatiha (cacheable)
      
      if (testSurah && testSurah.surah === 1 && testSurah.ayahCount === 7) {
        health.checks.quranApi = {
          status: 'pass',
          message: 'External API accessible and OAuth working',
        }
      } else {
        health.checks.quranApi = {
          status: 'warn',
          message: 'API returned unexpected data',
        }
        health.status = 'degraded'
      }
    } catch (error) {
      if (error instanceof QuranServiceError) {
        health.checks.quranApi = {
          status: 'fail',
          message: `External API error: ${error.code}`,
        }
        
        // Rate limit = degraded (external issue), others = unhealthy
        health.status = error.code === 'RATE_LIMIT' ? 'degraded' : 'unhealthy'
      } else {
        health.checks.quranApi = {
          status: 'fail',
          message: error instanceof Error ? error.message : 'Unknown error',
        }
        health.status = 'unhealthy'
      }
    }
  } else {
    health.checks.quranApi = {
      status: 'unknown',
      message: 'Skipped (service not initialized)',
    }
  }

  // ==========================================
  // CHECK 3: GEMINI API KEY CONFIGURATION
  // ==========================================
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY
    
    if (!geminiApiKey || geminiApiKey.length === 0) {
      health.checks.geminiConfig = {
        status: 'fail',
        message: 'Gemini API key not configured',
      }
      health.status = 'unhealthy'
    } else if (geminiApiKey.length < 20) {
      health.checks.geminiConfig = {
        status: 'warn',
        message: 'Gemini API key appears invalid (too short)',
      }
      if (health.status === 'healthy') {
        health.status = 'degraded'
      }
    } else {
      health.checks.geminiConfig = {
        status: 'pass',
        message: 'API key configured',
      }
    }
  } catch (error) {
    health.checks.geminiConfig = {
      status: 'fail',
      message: error instanceof Error ? error.message : 'Configuration error',
    }
    health.status = 'unhealthy'
  }

  // ==========================================
  // CHECK 4: DATABASE CONNECTIVITY (SUPABASE)
  // ==========================================
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      health.checks.database = {
        status: 'fail',
        message: 'Supabase credentials not configured',
      }
      health.status = 'unhealthy'
    } else {
      // Quick connectivity test - just create client and do minimal query
      const supabase = createClient(supabaseUrl, supabaseAnonKey)
      
      // Simple health check query (doesn't require auth)
      const { error } = await supabase.from('conversations').select('count', { count: 'exact', head: true }).limit(0)
      
      if (error) {
        health.checks.database = {
          status: 'fail',
          message: `Database error: ${error.message}`,
        }
        health.status = 'unhealthy'
      } else {
        health.checks.database = {
          status: 'pass',
          message: 'Database accessible',
        }
      }
    }
  } catch (error) {
    health.checks.database = {
      status: 'fail',
      message: error instanceof Error ? error.message : 'Database connection error',
    }
    health.status = 'unhealthy'
  }

  // ==========================================
  // FINALIZE RESPONSE
  // ==========================================
  
  health.responseTime = Date.now() - startTime

  // Return appropriate HTTP status
  const httpStatus = 
    health.status === 'healthy' ? 200 : 
    health.status === 'degraded' ? 200 : // Still operational
    503 // Service unavailable

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
 *     "quranApi": {
 *       "status": "pass" | "fail" | "warn" | "unknown",
 *       "message": "External API accessible and OAuth working"
 *     },
 *     "geminiConfig": {
 *       "status": "pass" | "fail" | "warn" | "unknown",
 *       "message": "API key configured"
 *     },
 *     "database": {
 *       "status": "pass" | "fail" | "unknown",
 *       "message": "Database accessible"
 *     }
 *   },
 *   "responseTime": 234,
 *   "environment": "production" | "development" | "test"
 * }
 */