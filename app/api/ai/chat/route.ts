import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'
import { createGeminiService } from '@/lib/services/gemini'
import { GeminiServiceError } from '@/lib/external/gemini/types'
import { handleApiError, BadRequestError } from '@/lib/api/errors'

// ==========================================
// INPUT VALIDATION
// ==========================================

const ChatRequestSchema = z.object({
  conversationId: z.string().refine(
    (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(val),
    {message: 'Invalid conversation ID'}
  ),
  message: z.string()
    .transform((val) => val.trim())
    .refine((val) => val.length > 0, { message: 'Message cannot be empty' })
    .refine((val) => val.length <= 5000, { message: 'Message is too long' }),
})

// ==========================================
// POST HANDLER
// ==========================================

export async function POST(request: NextRequest) {
  try {
    // 1. Require authentication
    const { user, supabase } = await requireAuth()
    const userId = user.id

    // 2. Validate input
    const body = await request.json()
    const validated = ChatRequestSchema.safeParse(body)

    if (!validated.success) {
      throw new BadRequestError(
        validated.error.issues.map((e) => e.message).join(', '),
      )
    }

    const { conversationId, message } = validated.data

    // 3. Create Supabase client (authenticated)
    // const supabase = await createServerClient()

    // 4. Verify conversation ownership (RLS check)
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single()

    if (convError || !conversation) {
      throw new BadRequestError('Conversation not found or unauthorized')
    }

    // 5. Initialize service with authenticated client
    const geminiService = createGeminiService(supabase)

    // 6. Generate AI response
    const aiResponse = await geminiService.generateResponse(
      conversationId,
      message,
    )

    return NextResponse.json(
      {
        message: aiResponse.content,
        ayahReferences: aiResponse.ayahReferences,
        tafsirUsed: aiResponse.tafsirUsed,
      },
      { status: 200 },
    )
  } catch (error) {
    if (error instanceof GeminiServiceError) {
      if (error.code === 'RATE_LIMIT') {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 },
        )
      }
    }

    return handleApiError(error, 'gemini-chat')
  }
}