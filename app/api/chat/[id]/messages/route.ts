import { NextRequest, NextResponse } from 'next/server'
import { MessagesService } from '@/lib/api/chat/messages.service'
import { CreateMessageSchema, ConversationIdSchema } from '@/lib/validation/chat'
import { BadRequestError, handleApiError, NotFoundError } from '@/lib/api/errors'
import { requireAuth } from '@/lib/api/auth'
import { normalizeMessages, normalizeMessage } from '@/lib/api/chat/normalized'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { supabase, user } = await requireAuth()
    const { id: conversationId } = await context.params
    
    const validationResult = ConversationIdSchema.safeParse({ id: conversationId })
    if (!validationResult.success) {
      throw new BadRequestError('Invalid conversation ID')
    }
    
    // Check conversation ownership
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single()
    
    if (convError || !conversation) {
      throw new NotFoundError('Conversation not found')
    }
    
    // Fetch messages
    const messagesService = new MessagesService(supabase)
    const rawMessages = await messagesService.getConversationMessages(conversationId)
    
    const messages = normalizeMessages(rawMessages)
    
    return NextResponse.json({ messages })
  } catch (error) {
    return handleApiError(error, '[GET /api/chat/[id]/messages]')
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { supabase, user } = await requireAuth()
    const { id: conversationId } = await context.params
    const body = await request.json()
    
    const idValidation = ConversationIdSchema.safeParse({ id: conversationId })
    if (!idValidation.success) {
      throw new BadRequestError('Invalid conversation ID')
    }
    
    // Check conversation ownership
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single()
    
    if (convError || !conversation) {
      throw new NotFoundError('Conversation not found')
    }
    
    // Validate message body
    const bodyWithConvoId = { ...body, conversation_id: conversationId }
    const bodyValidation = CreateMessageSchema.safeParse(bodyWithConvoId)
    if (!bodyValidation.success) {
      throw new BadRequestError('Validation failed')
    }
    
    const messagesService = new MessagesService(supabase)
    const rawMessage = await messagesService.createMessage(bodyValidation.data)
    
    const message = normalizeMessage(rawMessage)
    
    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    return handleApiError(error, '[POST /api/chat/[id]/messages]')
  }
}