import { NextRequest, NextResponse } from 'next/server'
import { ConversationsService } from '@/lib/api/chat/conversations.service'
import { UpdateConversationSchema, ConversationIdSchema } from '@/lib/validation/chat'
import { BadRequestError, handleApiError, NotFoundError } from '@/lib/api/errors'
import { requireAuth } from '@/lib/api/auth'
import { normalizeConversation } from '@/lib/api/chat/normalized'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { supabase } = await requireAuth()
    const { id } = await context.params
    
    const validationResult = ConversationIdSchema.safeParse({ id })
    if (!validationResult.success) {
      throw new BadRequestError('Invalid conversation ID')
    }
    
    const conversationsService = new ConversationsService(supabase)
    const rawConversation = await conversationsService.getConversationById(id)
    
    if (!rawConversation) {
      throw new NotFoundError('Conversation not found')
    }
    
    const conversation = normalizeConversation(rawConversation)
    
    return NextResponse.json({ conversation })
  } catch (error) {
    return handleApiError(error, '[GET /api/chat/[id]]')
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { supabase } = await requireAuth()
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
    const rawConversation = await conversationsService.updateConversation(
      id,
      bodyValidation.data
    )
    
    const conversation = normalizeConversation(rawConversation)
    
    return NextResponse.json({ conversation })
  } catch (error) {
    return handleApiError(error, '[PATCH /api/chat/[id]]')
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { supabase } = await requireAuth()
    const { id } = await context.params
    
    const validationResult = ConversationIdSchema.safeParse({ id })
    if (!validationResult.success) {
      throw new BadRequestError('Invalid conversation ID')
    }
    
    const conversationsService = new ConversationsService(supabase)
    const rawConversation = await conversationsService.archiveConversation(id)
    
    const conversation = normalizeConversation(rawConversation)
    
    return NextResponse.json({ success: true, conversation })
  } catch (error) {
    return handleApiError(error, '[DELETE /api/chat/[id]]')
  }
}