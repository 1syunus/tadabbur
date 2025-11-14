import { z } from 'zod';

// Regex to match standard UUID v1–v5 (lower or uppercase)
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Base UUID validator
 */
export const uuidField = z.string().regex(uuidRegex, { message: 'Invalid UUID format' });

/**
 * Optional UUID field
 */
export const optionalUuidField = uuidField.optional();

/**
 * Nullable UUID field
 */
export const nullableUuidField = uuidField.nullable();

/**
 * Optional + nullable UUID field
 */
export const optionalNullableUuidField = uuidField.optional().nullable();

/**
 * X-characters required
 */
export const nonBlankString = (max: number, message?: string) =>
  z
    .string()
    .max(max, { message: message ?? `Must be ${max} characters or less` })
    .refine((v) => v.trim().length > 0, {
      message: 'Cannot be empty or whitespace',
    })
    .transform((v) => v.trim())
