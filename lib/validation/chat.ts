import { z } from 'zod'
import { uuidField, nonBlankString } from '@/utils/zodHelpers'

// ==========================================
// Conversation Schemas
// ==========================================

/**
 * Base schema for conversation fields
 */
const BaseConversationSchema = z.object({
  title: nonBlankString(255).optional().nullable(),
  
  archived: z
    .boolean()
    .optional(),
})

/**
 * Schema for creating a conversation (POST /api/chat)
 */
export const CreateConversationSchema = BaseConversationSchema

/**
 * Schema for updating a conversation (PATCH /api/chat/[id])
 */
export const UpdateConversationSchema = BaseConversationSchema.partial()

/**
 * Schema for conversation ID parameter
 */
export const ConversationIdSchema = z.object({
  id: uuidField,
})

// ==========================================
// Message Schemas
// ==========================================

/**
 * Message role enum
 */
const MessageRoleSchema = z.enum(['user', 'assistant', 'system'])

/**
 * Base schema for message fields
 */
const BaseMessageSchema = z.object({
  conversation_id: uuidField,
  
  role: MessageRoleSchema,
  
  content: nonBlankString(10000),
  
  ayah_references: z
    .array(z.string().regex(/^\d+:\d+$/, { message: 'Ayah reference must be in format "surah:ayah" (e.g., "2:255")' }))
    .default([]),
  
  tafsir_used: z
    .array(z.object({
      source: z.string(),
      excerpt: z.string(),
    }))
    .default([]),
})

/**
 * Schema for creating a message (POST /api/chat/[id]/messages)
 */
export const CreateMessageSchema = BaseMessageSchema

/**
 * Schema for message ID parameter
 */
export const MessageIdSchema = z.object({
  id: uuidField,
})