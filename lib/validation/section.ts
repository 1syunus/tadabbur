import { z } from 'zod'
import { uuidField, nonBlankString, } from '@/utils/zodHelpers'

/**
 * Base schema for note section fields
 */
const BaseSectionSchema = z.object({
  name: nonBlankString(100),
  
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, { message: 'Color must be a valid hex code (e.g., #3B82F6)' })
    .optional()
    .nullable(),
  
  order_index: z
    .number()
    .int({ message: 'Order index must be an integer' })
    .min(0, { message: 'Order index must be zero or positive' })
    .optional(),
})

/**
 * Schema for creating a new section (POST /api/sections)
 */
export const CreateSectionSchema = BaseSectionSchema

/**
 * Schema for updating a section (PATCH /api/sections/[id])
 */
export const UpdateSectionSchema = BaseSectionSchema.partial()

/**
 * Schema for section ID parameter
 */
export const SectionIdSchema = z.object({
  id: uuidField,
})