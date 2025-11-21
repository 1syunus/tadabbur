import { QuranClient } from './client'
import { QuranAPIError, QuranAPIValidationError, QuranAPIRateLimitError, } from './types'
import {makeAuthMock, makeQuranClientForTests} from '@/__tests__/helpers.ts'

//TODO: make testing strats consistent: e.g., regex, string vs class, etc.

// Mock fetch globally
global.fetch = jest.fn()

// Search Response Helper
const validSearchResponse = {
  search: {
    query: 'test',
    total_results: 0,
    current_page: 1,
    total_pages: 0,
    per_page: 20,
    results: [],
  },
};

describe('QuranClient', () => {
  let client: QuranClient

  beforeEach(() => {
    jest.resetAllMocks()
    jest.useFakeTimers()

    makeAuthMock('unit-test-token')

    client = makeQuranClientForTests({
      timeout: 5000,
      retryAttempts: 3,
      retryDelay: 100,
    })

  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('searchAyat', () => {
    describe('happy path', () => {
      it('should return search results with valid query', async () => {
        const mockResponse = {
          search: {
            query: 'patience',
            total_results: 10,
            current_page: 1,
            total_pages: 1,
            per_page: 20,
            results: [
              {
                verse_id: 255,
                verse_key: '2:255',
                text: 'Allah! There is no deity...',
                translation_id: 131,
                translation_name: 'Dr. Mustafa Khattab',
              },
            ],
          },
        }
          
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockResponse,
        })

        const result = await client.searchAyat('patience')

        expect(result.query).toBe('patience')
        expect(result.results).toHaveLength(1)
        expect(result.results[0].ayahKey).toBe('2:255')
        expect(global.fetch).toHaveBeenCalledTimes(2)
      })

      it('should handle pagination parameters correctly', async () => {
        const mockResponse = {
          search: {
            query: 'test',
            total_results: 100,
            current_page: 2,
            total_pages: 5,
            per_page: 20,
            results: [],
          }
        }

        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockResponse,
        })

        await client.searchAyat('test', 2, 20)

        const callUrl = (global.fetch as jest.Mock).mock.calls[1][0]
        expect(callUrl).toContain('page=2')
        expect(callUrl).toContain('size=20')
      })

      it('should cap size parameter at 50 (API max)', async () => {
        const mockResponse = {
          search: {
            query: 'test',
            total_results: 0,
            current_page: 1,
            total_pages: 0,
            per_page: 50,
            results: [],
          }
        }

        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockResponse,
        })

        await client.searchAyat('test', 1, 100)

        const callUrl = (global.fetch as jest.Mock).mock.calls[1][0]
        expect(callUrl).toContain('size=50') // Capped at 50
      })
    })

    describe('edge cases', () => {
      it('should handle empty results gracefully', async () => {
        const mockResponse = {
          search: {
            query: 'nonexistent',
            total_results: 0,
            current_page: 1,
            total_pages: 0,
            per_page: 20,
            results: [],
          }
        }

        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockResponse,
        })

        const result = await client.searchAyat('nonexistent')

        expect(result.totalResults).toBe(0)
        expect(result.results).toEqual([])
      })
    })

    describe('validation errors', () => {
      it('should throw QuranAPIValidationError on missing required fields', async () => {
        const invalidResponse = {
          search: {
            // Missing 'query' field
            total_results: 10,
            results: [],
          }
        }

        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => invalidResponse,
        })

        await expect(client.searchAyat('test')).rejects.toThrow(QuranAPIValidationError)
      })

      it('should throw QuranAPIValidationError on malformed results array', async () => {
        const invalidResponse = {
          search: {
            query: 'test',
            total_results: 1,
            current_page: 1,
            total_pages: 1,
            per_page: 20,
            results: [
              {
                // Missing 'verse_key'
                id: 123,
                text: 'Some text',
              },
            ],
          }
        }

        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => invalidResponse,
        })

        await expect(client.searchAyat('test')).rejects.toThrow(QuranAPIValidationError)
      })
    })

    describe('network errors', () => {
      it('should throw QuranAPIRateLimitError on 429', async () => {
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
        })

        const promise = client.searchAyat('test')

        await expect(promise).rejects.toThrow(QuranAPIRateLimitError)
        await expect(promise).rejects.toThrow(/rate limit/i)
        expect(global.fetch).toHaveBeenCalledTimes(2)
      })

      it('should throw QuranAPIError on 404', async () => {
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        })

        const promise = client.searchAyat('test')

        await expect(promise).rejects.toThrow(QuranAPIError)
        await expect(promise).rejects.toThrow(/404/)
        expect(global.fetch).toHaveBeenCalledTimes(2)
      })

      it('should throw QuranAPIError on 500', async () => {
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })

        await expect(client.searchAyat('test')).rejects.toThrow(QuranAPIError)
        expect(global.fetch).toHaveBeenCalledTimes(2)
      })
    })

    describe('retry logic', () => {
      it('should retry on network error and succeed on second attempt', async () => {
        

        ;(global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error')) // first call fails
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => validSearchResponse,
        })

        // Start the async operation
        const promise = client.searchAyat('test')

        // Fast-forward timers for first retry (100ms)
        await jest.advanceTimersByTimeAsync(100)

        const result = await promise

        expect(result.query).toBe('test')
        expect(global.fetch).toHaveBeenCalledTimes(3) // auth + fail + retry
      })

      it('should apply exponential backoff on retries', async () => {
        

        ;(global.fetch as jest.Mock)
          .mockRejectedValueOnce(new Error('Error 1'))
          .mockRejectedValueOnce(new Error('Error 2'))
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => validSearchResponse,
          })

        const promise = client.searchAyat('test')
          
        // First retry: 100ms
        await jest.advanceTimersByTimeAsync(100)

        // Second retry: 200ms (exponential backoff)
        await jest.advanceTimersByTimeAsync(200)

        const result = await promise

        expect(result.query).toBe('test')
        expect(global.fetch).toHaveBeenCalledTimes(4)
      })
      
      it('should throw after all retry attempts exhausted', async () => {
        jest.resetAllMocks()

        ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({access_token: 't', expires_in: 3600})
        })
        .mockRejectedValue(new Error('Persistent error'))

        const promise = client.searchAyat('test')
        const errorPromise = promise.catch(e => e)

        // advance time to trigger all retries
        await jest.advanceTimersByTimeAsync(1000)
        const error = await errorPromise
        const msg = (error.message || '').toLowerCase()
        const causeMsg = (error.cause?.message || '').toLowerCase()

        if (!msg.includes('network') && !causeMsg.includes('persistent')) {
           throw new Error(`Unexpected error: ${error.message}`)
        }
        expect(global.fetch).toHaveBeenCalledTimes(4)
      })

      it('should NOT retry on rate limit error', async () => {
        

        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          json: async () => ({}),
        })

        const promise = client.searchAyat('test')

        await expect(promise).rejects.toThrow(QuranAPIRateLimitError)
        expect(global.fetch).toHaveBeenCalledTimes(2)
      })

      it('should NOT retry on validation error', async () => {
        
        
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ invalid: 'response' }),
        })

        const promise = client.searchAyat('test')
        
        await expect(promise).rejects.toThrow(QuranAPIError)
        expect(global.fetch).toHaveBeenCalledTimes(2)
      })
    })

    describe('timeout handling', () => {
      it('should abort request after timeout', async () => {
        const noRetryClient = makeQuranClientForTests({retryAttempts: 1})

        jest.resetAllMocks()
        makeAuthMock() //#1

        // this is queue 2
        ;(global.fetch as jest.Mock).mockImplementationOnce((_url, {signal}) => {
          return new Promise((_resolve, reject) => {
            const err = new DOMException('The user aborted a request', 'AbortError')
            if (signal.aborted) reject(err)
            else signal.addEventListener('abort', () => reject(err))
          })
        })

        const promise = noRetryClient.searchAyat('test')
        const errorPromise = promise.catch(e => e)

        // Fast-forward past timeout
        await jest.advanceTimersByTimeAsync(6000)
        const error = await errorPromise
        const msg = (error.message || '').toLowerCase()
        if (!msg.includes('timeout') && !msg.includes('abort')) {
             throw new Error(`Expected Timeout error, got: ${error.message}`)
        }
      })
    })
  })

  describe('getAyah', () => {
    describe('happy path', () => {
      it('should return verse with Arabic text and translation', async () => {
        const mockVerse = {
          verse: {
            id: 25995,
            verse_number: 255,
            verse_key: '2:255',
            chapter_id: 2,
            page_number: 42,
            juz_number: 3,
            hizb_number: 5, // fix schema
            rub_el_hizb_number: 19, //fix schema
            text_uthmani: 'ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ...',
            translations: [
              {
                id: 131,
                resource_id: 131,
                text: 'Allah! There is no deity except Him...',
                language_name: 'english',
                resource_name: 'Dr. Mustafa Khattab',
              },
            ],
          },
        }

        jest.resetAllMocks()
        
        makeAuthMock()

        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockVerse,
        })

        const ayah = await client.getAyah('2:255')

        expect(ayah.ayahKey).toBe('2:255')
        expect(ayah.arabic).toContain('ٱللَّهُ')
        expect(ayah.translations).toHaveLength(1)
        expect(ayah.translations![0].translation).toBe(131)
        expect(ayah.translations![0].translationName).toBe('Dr. Mustafa Khattab')
        expect(ayah.translations![0].translationText).toContain('Allah!')
      })

      it('should support multiple translations', async () => {
        const mockVerse = {
          verse: {
            id: 2588805,
            verse_number: 255,
            verse_key: '2:255',
            chapter_id: 2,
            page_number: 42,
            juz_number: 3,
            hizb_number: 5,
            rub_el_hizb_number: 19,
            text_uthmani: 'ٱللَّهُ...',
            translations: [
              {
                id: 131,
                resource_id: 131,
                text: 'Translation 1',
                language_name: 'english',
              },
              {
                id: 85,
                resource_id: 85,
                text: 'Translation 2',
                language_name: 'english',
              },
            ],
          },
        }

        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockVerse,
        })

        const ayah = await client.getAyah('2:255', [131, 85])

        expect(ayah.translations).toHaveLength(2)
        expect(ayah.translations![0].translation).toBe(131)
        expect(ayah.translations![1].translation).toBe(85)

        // Verify URL contains both translation IDs
        const callUrl = (global.fetch as jest.Mock).mock.calls[1][0]
        expect(callUrl).toContain('translations=131%2C85')
      })
    })

    describe('validation errors', () => {
      it('should throw on missing verse_key in response', async () => {
        const invalidVerse = {
          verse: {
            id: 900861,
            // Missing verse_key
            text_uthmani: 'Some text',
          },
        }

        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => invalidVerse,
        })

        await expect(client.getAyah('2:255')).rejects.toThrow(QuranAPIError)
      })

      it('should throw on malformed translations array', async () => {
        const invalidVerse = {
          verse: {
            id: 2909055,
            verse_number: 255,
            verse_key: '2:255',
            chapter_id: 2,
            page_number: 42,
            juz_number: 3,
            hizb_number: 5,
            rub_el_hizb_number: 19,
            text_uthmani: 'Text',
            translations: [
              {
                // Missing 'id' and 'text'
                resource_id: 131,
              },
            ],
          },
        }

        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => invalidVerse,
        })

        await expect(client.getAyah('2:255')).rejects.toThrow(QuranAPIError)
      })
    })

    describe('edge cases', () => {
      it('should handle verse with no translations', async () => {
        const mockVerse = {
          verse: {
            id: 200055,
            verse_number: 255,
            verse_key: '2:255',
            chapter_id: 2,
            page_number: 42,
            juz_number: 3,
            hizb_number: 5,
            rub_el_hizb_number: 19,
            text_uthmani: 'ٱللَّهُ...',
            // No translations field
          },
        }

        jest.resetAllMocks()
        makeAuthMock()
        
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockVerse,
        })
        
        const ayah = await client.getAyah('2:255')

        expect(ayah.ayahKey).toBe('2:255')
        expect(ayah.translations).toEqual([])
      })
    })
  })

  describe('getTafsir', () => {
    describe('happy path', () => {
      it('should return tafsir for single tafsir ID', async () => {
        const mockTafsir = {
            id: 1,
            tafsir_id: 169,
            tafsir_name: 'Tafsir al-Jalalayn',
            verse_key: '2:255',
            text: '<p>This is the greatest verse...</p>',
            language_name: 'english',
        }

        jest.resetAllMocks()
        makeAuthMock()

        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({tafsir: mockTafsir}),
        })

        const tafsirs = await client.getTafsir('2:255')

        expect(tafsirs).toHaveLength(1)
      })

      it('should fetch multiple tafsirs in parallel', async () => {
        // 1. manually force tokens
        (client as any).accessToken = 'forced_test_token';
        (client as any).tokenExpiryTime = Date.now() + 10000;
        
        // 2. setup data mocks & DOUBLE WRAP

        const mockTafsir1 = {
            tafsir: {
              id: 1,
              tafsir_id: 169,
              tafsir_name: 'Tafsir al-Jalalayn',
              verse_key: '2:255',
              text: 'Tafsir 1 text',
            },
        }

        const mockTafsir2 = {
            tafsir: {
              id: 2,
              tafsir_id: 168,
              tafsir_name: 'Ibn Kathir',
              verse_key: '2:255',
              text: 'Tafsir 2 text',
            },

        }

        jest.resetAllMocks()
        ;(global.fetch as jest.Mock).mockImplementation(async (url) => {
            if (url.includes('/tafsirs/169')) {
                return new Response(JSON.stringify(mockTafsir1), {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' }
                })
            }
            if (url.includes('/tafsirs/168')) {
                return new Response(JSON.stringify(mockTafsir2), {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' }
                })
            }
            return new Response('', {status: 404})
        })

        const tafsirs = await client.getTafsir('2:255', [169, 168])
        expect(tafsirs).toHaveLength(2)
        expect(tafsirs[0].source).toBe(169)
      })
    })

    describe('validation errors', () => {
      it('should throw on missing required tafsir fields', async () => {
        const invalidTafsir = {
          tafsir: {
            id: 1,
            // Missing tafsir_id, verse_key, text
          },
        }

        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => invalidTafsir,
        })

        await expect(client.getTafsir('2:255')).rejects.toThrow(QuranAPIError)
      })
    })

    describe('error handling', () => {
      it('should handle partial failures in multiple tafsirs', async () => {
        ;(global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
              tafsir: {
                id: 1,
                tafsir_id: 169,
                tafsir_name: 'Tafsir 1',
                verse_key: '2:255',
                text: 'Text',
              },
            }),
          })
          .mockRejectedValueOnce(new Error('Network error'))

        // Should throw because one failed
        await expect(client.getTafsir('2:255', [169, 168])).rejects.toThrow()
      })
    })
  })

  describe('getSurah', () => {
    describe('happy path', () => {
      it('should return chapter metadata', async () => {    
        const mockChapter = {
          chapter: {
            id: 1,
            revelation_place: 'makkah',
            revelation_order: 5,
            // bismillah_pre: true,
            name_simple: 'Al-Fatihah',
            name_complex: 'Al-Fātiĥah',
            name_arabic: 'الفاتحة',
            verses_count: 7,
            // pages: [1, 2],
            translated_name: {
              language_name: 'english',
              name: 'The Opening',
            },
          },
        }

                
        jest.resetAllMocks()
        makeAuthMock()

        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockChapter,
        })

        const surah = await client.getSurah(1)

        
        expect(surah.surah).toBe(1)
        expect(surah.nameSimple).toBe('Al-Fatihah')
        expect((surah as any).id).toBeUndefined()

      })
    })

    describe('invalid input', () => {
      it('should throw on chapter ID < 1', async () => {
        await expect(client.getSurah(0)).rejects.toThrow(QuranAPIValidationError)
        await expect(client.getSurah(0)).rejects.toThrow(/invalid/i)
      })

      it('should throw on chapter ID > 114', async () => {
        await expect(client.getSurah(115)).rejects.toThrow(QuranAPIValidationError)
      })

      it('should throw on negative chapter ID', async () => {
        await expect(client.getSurah(-1)).rejects.toThrow(QuranAPIError)
      })
    })

    describe('validation errors', () => {
      it('should throw on missing required chapter fields', async () => {
        const invalidChapter = {
          chapter: {
            id: 1,
            // Missing name_simple, verses_count, etc.
          },
        }

        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => invalidChapter,
        })

        await expect(client.getSurah(1)).rejects.toThrow(QuranAPIError)
      })
    })
  })

  describe('getAyahRange', () => {
    describe('happy path', () => {
      it('should fetch multiple verses in range', async () => {
        jest.resetAllMocks()
        makeAuthMock()
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) })
        try { await client.getSurah(1) } catch {}
        
        const mockVerse1 = {
          verse: {
            id: 109864,
            verse_number: 1,
            verse_key: '1:1',
            chapter_id: 1,
            page_number: 1,
            juz_number: 1,
            hizb_number: 1,
            rub_el_hizb_number: 1,
            text_uthmani: 'بِسْمِ...',
          },
        }

        const mockVerse2 = {
          verse: {
            id: 2982743,
            verse_number: 2,
            verse_key: '1:2',
            chapter_id: 1,
            page_number: 1,
            juz_number: 1,
            hizb_number: 1,
            rub_el_hizb_number: 1,
            text_uthmani: 'ٱلْحَمْدُ...',
          },
        }

        ;(global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => mockVerse1,
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => mockVerse2,
          })

        const ayah = await client.getAyahRange('1:1', '1:2')

        expect(ayah).toHaveLength(2)
        // expect(ayah[0].ayahKey).toBe('1:1')
        // expect(ayah[1].ayahKey).toBe('1:2')
        // expect(global.fetch).toHaveBeenCalledTimes(2)
      })
    })

    describe('invalid input', () => {
      it('should throw on cross-surah range', async () => {
        await expect(client.getAyahRange('1:1', '2:1')).rejects.toThrow(
          QuranAPIValidationError
        )
      })

      it('should throw on malformed verse keys', async () => {
        jest.resetAllMocks()
        makeAuthMock()
        // This will be caught when individual getAyah calls are made
        ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Invalid verse'))

        await expect(client.getAyahRange('invalid', '1:2')).rejects.toThrow()
      })
    })
  })

describe('configuration', () => {
  it('should use custom timeout', async () => {
    // 1. Client with short timeout
    const customClient = makeQuranClientForTests({
      timeout: 1000,
      retryAttempts: 1
    })

    jest.resetAllMocks()
    makeAuthMock()

    // 2. Mock Auth (handled by beforeEach) + Mock Search Timeout
    ;(global.fetch as jest.Mock).mockImplementationOnce((_url, { signal }) => {
      return new Promise((_, reject) => {
        const err = new Error('Aborted')
        err.name = 'AbortError'
        if (signal.aborted) reject(err)
          else signal.addEventListener('abort', () => reject(err))
      })
    })

    // 3. Execute
    const promise = customClient.searchAyat('test')
    const errorPromise = promise.catch(e => e)
    await jest.advanceTimersByTimeAsync(1005)
    const error = await errorPromise
    const msg = (error.message || '').toLowerCase()
        if (!msg.includes('timeout') && !msg.includes('abort')) {
             throw new Error(`Expected Timeout error, got: ${error.message}`)
        }
  })

  it('should use custom translation ID', async () => {
    const customClient = makeQuranClientForTests({ translationId: 85 })

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => validSearchResponse,
    })

    await customClient.searchAyat('test')

    const callUrl = (global.fetch as jest.Mock).mock.calls[1][0]
    expect(callUrl).toContain('translation=85')
  })

  it('should use custom retry attempts', async () => {
    // If logic is (i < retryAttempts), 1 implies "0 retries".
    const customClient = makeQuranClientForTests({
      retryAttempts: 3, 
      retryDelay: 50,
    })

    ;(global.fetch as jest.Mock)
      // Call #2: Search Attempt 1 -> Fails
      .mockRejectedValueOnce(new Error('Network error'))
      // Call #3: Search Attempt 2 -> Succeeds
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => validSearchResponse,
      })

    const promise = customClient.searchAyat('test')
    
    // Advance time to get past the retryDelay
    await jest.advanceTimersByTimeAsync(50)
    
    const result = await promise

    expect(result).toBeDefined()
    // 1 Auth + 1 Failure + 1 Success = 3 Total Calls
    expect(global.fetch).toHaveBeenCalledTimes(3) 
  })
})
})