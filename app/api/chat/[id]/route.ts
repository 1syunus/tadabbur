import { NextRequest, NextResponse } from 'next/server'
import { ConversationsService } from '@/lib/api/chat/conversations.service'
import { UpdateConversationSchema, ConversationIdSchema } from '@/lib/validation/chat'
import { BadRequestError, handleApiError, NotFoundError } from '@/lib/api/errors'
import { requireAuth } from '@/lib/api/auth'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const {supabase} = await requireAuth()
    const { id } = await context.params

    const validationResult = ConversationIdSchema.safeParse({ id })
    if (!validationResult.success) {
      throw new BadRequestError('Invalid conversation ID')
    }

    const conversationsService = new ConversationsService(supabase)
    const conversation = await conversationsService.getConversationById(id)

    if (!conversation) {
      throw new NotFoundError('Conversation not found')
    }

    return NextResponse.json({ conversation })
  } catch (error) {
    return handleApiError(error, '[GET /api/chat/[id]]:')
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const {supabase} = await requireAuth()

    const { id } = await context.params
    const body = await request.json()

    const idValidation = ConversationIdSchema.safeParse({ id })
    if (!idValidation.success) {
      throw new BadRequestError('Invalid conversation ID')
    }

    const bodyValidation = UpdateConversationSchema.safeParse(body)
    if (!bodyValidation.success) {
      throw new BadRequestError('Validation failed')
    }

    const conversationsService = new ConversationsService(supabase)
    const conversation = await conversationsService.updateConversation(
      id,
      bodyValidation.data
    )

    return NextResponse.json({ conversation })
  } catch (error) {
    return handleApiError(error, '[PATCH /api/chat/[id]]:')
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const {supabase} = await requireAuth()

    const { id } = await context.params

    const validationResult = ConversationIdSchema.safeParse({ id })
    if (!validationResult.success) {
      throw new BadRequestError('Invalid conversation ID')
    }

    const conversationsService = new ConversationsService(supabase)
    const conversation = await conversationsService.archiveConversation(id)

    return NextResponse.json({ success: true, conversation })
  } catch (error) {
    return handleApiError(error, '[DELETE /api/chat/[id]]:')
  }
}