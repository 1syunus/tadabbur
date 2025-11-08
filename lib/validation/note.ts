import { z } from 'zod'
import { uuidField, optionalNullableUuidField, nonBlankString } from '@/utils/zodhelpers'

/**
 * Base schema for note page fields
 * Defines constraints for note creation and updates
 */
const BaseNoteSchema = z.object({
  section_id: optionalNullableUuidField,
  
  title: nonBlankString(255).optional(),
  
  content: nonBlankString(100_000).optional(),
  
  order_index: z
    .number()
    .int({ message: 'Order index must be an integer' })
    .min(0, { message: 'Order index must be zero or positive' })
    .optional(),
})

/**
 * Schema for creating a new note (POST /api/notes)
 * At least title OR content must be provided
 */
export const CreateNoteSchema = BaseNoteSchema.refine(
  (data) => data.title?.trim() || data.content?.trim(),
  {
    message: 'Either title or content must be provided',
  }
)

/**
 * Schema for updating a note (PATCH /api/notes/[id])
 * All fields are optional
 */
export const UpdateNoteSchema = BaseNoteSchema.partial()

/**
 * Schema for note ID parameter
 * Used in route params validation
 */
export const NoteIdSchema = z.object({
  id: uuidField,
})