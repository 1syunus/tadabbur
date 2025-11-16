import {
  type NormalizedAyah,
  type NormalizedSearchResponse,
  type NormalizedTafsir,
  type NormalizedSurah,
}
  from "./normalized"

import { normalizeAyah } from "./normalizers/ayah"
import { normalizeRevelationPlace } from "./normalizers/revelationPlace"
import { normalizeSearchResponse } from "./normalizers/search"
import { normalizeSurah } from "./normalizers/surah"
import { normalizeTafsir } from "./normalizers/tafsir"

import {
  ExternalVerseSchema,
  ExternalSearchResponseSchema,
  ExternalTafsirResponseSchema,
  ExternalChapterSchema,
  QuranAPIError,
  QuranAPINetworkError,
  QuranAPIValidationError,
  QuranAPIRateLimitError,
  QuranAPIResponseError,
  QuranAPITimeoutError,
}
  from './types'

const API_BASE = 'https://api.quran.foundation/v1'
const DEFAULT_TRANSLATION_ID = 131
const DEFAULT_TAFSIR_ID = 169

export interface QuranClientConfig {
  baseUrl?: string
  translationId?: number
  tafsirId?: number
  timeout?: number
  retryAttempts?: number
  retryDelay?: number
}

export class QuranClient {
  private baseUrl: string
  private translationId: number
  private tafsirId: number
  private timeout: number
  private retryAttempts: number
  private retryDelay: number

  constructor(config: QuranClientConfig = {}) {
    this.baseUrl = config.baseUrl ?? API_BASE
    this.translationId = config.translationId ?? DEFAULT_TRANSLATION_ID
    this.tafsirId = config.tafsirId ?? DEFAULT_TAFSIR_ID
    this.timeout = config.timeout ?? 10000
    this.retryAttempts = config.retryAttempts ?? 3
    this.retryDelay = config.retryDelay ?? 1000
  }

  private async fetchWithRetry<T>(
    endpoint: string,
    options: RequestInit = {},
    validator: (data: unknown) => T
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    let lastError: Error | null = null

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), this.timeout)

  try {
    // ---- 1. NETWORK REQUEST ----
    let response: Response
    try {
      response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: { Accept: 'application/json', ...options.headers },
      })
    } catch (err: unknown) {
      // Network failure — retry unless last attempt
      const cause = err instanceof Error ? err : new Error(String(err))

      if (cause.name === 'AbortError') {
        throw new QuranAPITimeoutError(endpoint, cause)
      }

      throw new QuranAPINetworkError(endpoint, cause)
    } finally {
      clearTimeout(timeoutId)
    }

    // ---- 2. NON-RETRYABLE ERRORS ----
    if (response.status === 429) {
      // Rate limit: NEVER retry
      throw new QuranAPIRateLimitError(endpoint)
    }

    if (!response.ok) {
      // Server/client error: NEVER retry unless you decide otherwise
      throw new QuranAPIResponseError(response.status, response.statusText,endpoint)
    }

    // ---- 3. PARSE + VALIDATE ----
    const data = await response.json()

    try {
      return validator(data)
    } catch (err: unknown) {
      // Invalid API payload — do NOT retry
      const cause = err instanceof Error ? err : new Error(String(err))
      throw new QuranAPIValidationError(endpoint, cause)
    }
  } catch (err: unknown) {
    const error = err as Error
    lastError = error

    // NON-RETRYABLE ERRORS
    if (
      error instanceof QuranAPIRateLimitError ||
      error instanceof QuranAPIValidationError ||
      (error instanceof QuranAPIError && error.status !== undefined)
    )
      // Bubble up immediately
      {
        throw error
      }

    // RETRYABLE ERRORS (network problems, timeouts, etc.)
    if (attempt < this.retryAttempts - 1) {
      const delay = this.retryDelay * Math.pow(2, attempt)
      await new Promise(res => setTimeout(res, delay))
      continue
    }

    // Last attempt failed → throw final error
    throw error
  }
}

throw lastError ?? new QuranAPIError('Unknown error', undefined, endpoint)

  }

  // --- Generic helper for fetching multiple items ---
  private async fetchMultiple<T>(
    ids: number[],
    endpointFn: (id: number) => string,
    schema: { parse: (data: unknown) => T },
    dataKey: string
  ): Promise<T[]> {
    return Promise.all(ids.map((id) => this.fetchByKey(endpointFn(id), dataKey, schema)))
  }

  private async fetchByKey<T>(
    endpoint: string,
    dataKey: string,
    schema: { parse: (data: unknown) => T }
  ): Promise<T> {
    return this.fetchWithRetry(endpoint, {}, (data) => schema.parse((data as Record<string, unknown>)[dataKey]))
  }

  // --- Public API Methods ---

  async searchAyat(query: string, page = 1, size = 20): Promise<NormalizedSearchResponse> {
    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      size: Math.min(size, 50).toString(),
      translation: this.translationId.toString(),
    })
    const external = await this.fetchWithRetry(
      `/search?${params}`,
      {},
      (data) => ExternalSearchResponseSchema.parse(data)
    )
    return normalizeSearchResponse(external)
  }

  async getAyah(verseKey: string, translationIds?: number[]): Promise<NormalizedAyah> {
    const translations = translationIds ?? [this.translationId]
    const params = new URLSearchParams({ translations: translations.join(',') })

    const external = await this.fetchWithRetry(
      `/verses/by_key/${verseKey}?${params}`,
      {},
      (data) => ExternalVerseSchema.parse((data as any).verse)
    )

    return normalizeAyah(external)
  }

  async getTafsir(verseKey: string, tafsirIds?: number[]): Promise<NormalizedTafsir[]> {
    const ids = tafsirIds ?? [this.tafsirId]
    const external = await this.fetchMultiple(
      ids, (id) => 
        `/tafsirs/${id}/by_ayah/${verseKey}`,
      ExternalTafsirResponseSchema,
      'tafsir'
    )
    return external.map(normalizeTafsir)
  }

  async getSurah(chapterId: number): Promise<NormalizedSurah> {
    if (chapterId < 1 || chapterId > 114)
      throw new QuranAPIValidationError()
    const external = await this.fetchByKey(
      `/chapters/${chapterId}`,
      'chapter',
      ExternalChapterSchema
    )
    return normalizeSurah(external)
  }

  async getAyahRange(startKey: string, endKey: string): Promise<NormalizedAyah[]> {
    const [startSurah, startAyah] = startKey.split(':').map(Number)
    const [endSurah, endAyah] = endKey.split(':').map(Number)
    if (startSurah !== endSurah) throw new QuranAPIValidationError()
    const promises: Promise<NormalizedAyah>[] = []
    for (let ayah = startAyah; ayah <= endAyah; ayah++) {
      promises.push(this.getAyah(`${startSurah}:${ayah}`))
    }
    return Promise.all(promises)
  }
}

// Singleton export
export const quranClient = new QuranClient()