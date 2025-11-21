import { QuranClient } from "@/lib/external/quran/client";

export function makeAuthMock(token = 'fake-token', expiresIn = 3600) {
  // First call to fetch should be auth endpoint (token) — return token
  ;(global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ access_token: token, expires_in: expiresIn }),
  });
}

export function makeQuranClientForTests(overrides: Partial<Record<string, any>> = {}) {
  const cfg = {
    clientId: 'test-client',
    clientSecret: 'test-secret',
    authEndpoint: 'https://auth.local/token',
    baseUrl: 'https://api.quran.foundation/v1',
    translationId: 131,
    tafsirId: 169,
    timeout: 5000,
    retryAttempts: 3,
    retryDelay: 100,
    ...overrides,
  };
  return new QuranClient(cfg);
}