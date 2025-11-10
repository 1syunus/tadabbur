import { NextRequest, NextResponse } from 'next/server'
import { ConversationsService } from '@/lib/api/chat/conversations.service'
import { UpdateConversationSchema, ConversationIdSchema } from '@/lib/validation/chat'
import { handleApiError } from '@/lib/api/errors'
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
      return NextResponse.json(
        { error: 'Invalid conversation ID', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const conversationsService = new ConversationsService(supabase)
    const conversation = await conversationsService.getConversationById(id)

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
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
      return NextResponse.json(
        { error: 'Invalid conversation ID', details: idValidation.error.issues },
        { status: 400 }
      )
    }

    const bodyValidation = UpdateConversationSchema.safeParse(body)
    if (!bodyValidation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: bodyValidation.error.issues,
        },
        { status: 400 }
      )
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
      return NextResponse.json(
        { error: 'Invalid conversation ID', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const conversationsService = new ConversationsService(supabase)
    await conversationsService.deleteConversation(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, '[DELETE /api/chat/[id]]:')
  }
}