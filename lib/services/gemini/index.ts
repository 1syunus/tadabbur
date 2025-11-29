import { createGeminiClient } from '@/lib/external/gemini/client'
import { ConversationRepo } from '@/lib/db/ConversationRepo'
import { GeminiService } from './GeminiService'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Create Gemini service with injected dependencies
 * 
 * @param supabase - Supabase client for database access
 * @returns Configured GeminiService instance
 */
export function createGeminiService(
  supabase: SupabaseClient,
): GeminiService {
  // Initialize client
  const client = createGeminiClient({
    apiKey: process.env.GEMINI_API_KEY!,
    model: 'gemini-1.5-flash',
    temperature: 0.7,
  })

  // Initialize repository
  const repo = new ConversationRepo(supabase)

  // Inject dependencies into service
  return new GeminiService(client, repo, 10)
}

// Export everything
export { GeminiService } from './GeminiService'
export type { NormalizedMessage } from '@/lib/external/gemini/normalized'