import { NextRequest, NextResponse } from 'next/server'
import { ConversationsService } from '@/lib/api/chat/conversations.service'
import { CreateConversationSchema } from '@/lib/validation/chat'
import { BadRequestError, handleApiError } from '@/lib/api/errors'
import { requireAuth } from '@/lib/api/auth'

export async function GET() {
  try {
    const {supabase} = await requireAuth()

    const conversationsService = new ConversationsService(supabase)
    const conversations = await conversationsService.getAllConversations()

    return NextResponse.json({ conversations })
  } catch (error) {
    return handleApiError(error, '[GET /api/chat]:')
  }
}

export async function POST(request: NextRequest) {
  try {
    const {supabase, user} = await requireAuth()

    const body = await request.json()

    const validationResult = CreateConversationSchema.safeParse(body)
    if (!validationResult.success) {
      throw new BadRequestError('Validation failed')
    }

    const conversationsService = new ConversationsService(supabase)
    const conversation = await conversationsService.createConversation({
      user_id: user.id,
      ...validationResult.data,
    })

    return NextResponse.json({ conversation }, { status: 201 })
  } catch (error) {
    return handleApiError(error, '[POST /api/chat]:')
  }
}