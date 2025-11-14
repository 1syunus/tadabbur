import { NextRequest, NextResponse } from 'next/server'
import { NotesService } from '@/lib/api/notes/service'
import { UpdateNoteSchema, NoteIdSchema } from '@/lib/validation/note'
import { BadRequestError, handleApiError, NotFoundError } from '@/lib/api/errors'
import { requireAuth } from '@/lib/api/auth'

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * GET /api/notes/[id]
 */
export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const {supabase} = await requireAuth()

    const {id} = await context.params

    // Validate ID param
  const validationResult = NoteIdSchema.safeParse({ id })
     if (!validationResult.success) { 
       throw new BadRequestError('Invalid note ID')
     }

    const notesService = new NotesService(supabase)
    const note = await notesService.getNoteById(id)

    if (!note) {
      throw new NotFoundError('Note not found')
    }

    return NextResponse.json({ note })
  } catch (error) {
    return handleApiError(error, '[GET /api/notes/[id]] Error:')
  }
}

/**
 * PATCH /api/notes/[id]
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const {supabase} = await requireAuth()

    const {id} = await context.params
    const body = await request.json()
    
    const idValidation = NoteIdSchema.safeParse({id})
    if (!idValidation.success) {
      throw new BadRequestError('Invalid note ID')
    }

    
    const bodyValidation = UpdateNoteSchema.safeParse(body)
    if (!bodyValidation.success) {
      throw new BadRequestError('Validation failed')
    }

    const notesService = new NotesService(supabase)
    const note = await notesService.updateNote(
      id,
      bodyValidation.data
    )

    return NextResponse.json({ note })
  } catch (error) {
    return handleApiError(error, '[PATCH /api/notes/[id]] Error:')
  }
}

/**
 * DELETE /api/notes/[id]
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const {supabase} = await requireAuth()

    const {id} = await context.params

    const validationResult = NoteIdSchema.safeParse({id})
    if (!validationResult.success) {
      throw new BadRequestError('Invalid note ID')
    }

    const notesService = new NotesService(supabase)
    const note = await notesService.permanentlyDeleteNote(id)

    return NextResponse.json({ note })
  } catch (error) {
    return handleApiError(error, '[DELETE /api/notes/[id]] Error:')
  }
}