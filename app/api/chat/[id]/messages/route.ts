import { NextRequest, NextResponse } from 'next/server'
import { MessagesService } from '@/lib/api/chat/messages.service'
import { CreateMessageSchema, ConversationIdSchema } from '@/lib/validation/chat'
import { handleApiError } from '@/lib/api/errors'
import { requireAuth } from '@/lib/api/auth'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const {supabase} = await requireAuth()
    const { id: conversationId } = await context.params

    const validationResult = ConversationIdSchema.safeParse({ id: conversationId })
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid conversation ID', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const messagesService = new MessagesService(supabase)
    const messages = await messagesService.getConversationMessages(conversationId)

    return NextResponse.json({ messages })
  } catch (error) {
    return handleApiError(error, '[GET /api/chat/[id]/messages]:')
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const {supabase} = await requireAuth()

    const { id: conversationId } = await context.params
    const body = await request.json()

    const idValidation = ConversationIdSchema.safeParse({ id: conversationId })
    if (!idValidation.success) {
      return NextResponse.json(
        { error: 'Invalid conversation ID', details: idValidation.error.issues },
        { status: 400 }
      )
    }

    const bodyValidation = CreateMessageSchema.safeParse({
      ...body,
      conversation_id: conversationId,
    })
    if (!bodyValidation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: bodyValidation.error.issues,
        },
        { status: 400 }
      )
    }

    const messagesService = new MessagesService(supabase)
    const message = await messagesService.createMessage(bodyValidation.data)

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    return handleApiError(error, '[POST /api/chat/[id]/messages]:')
  }
}