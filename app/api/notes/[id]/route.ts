import { NextRequest, NextResponse } from 'next/server'
import { NotesService } from '@/lib/api/notes/service'
import { UpdateNoteSchema, NoteIdSchema } from '@/lib/validation/note'
import { BadRequestError, handleApiError, NotFoundError } from '@/lib/api/errors'
import { requireAuth } from '@/lib/api/auth'
import { normalizeNotePage } from '@/lib/api/notes/normalized'

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * GET /api/notes/[id]
 */
export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { supabase } = await requireAuth()
    const { id } = await context.params
    
    const validationResult = NoteIdSchema.safeParse({ id })
    if (!validationResult.success) {
      throw new BadRequestError('Invalid note ID')
    }
    
    const notesService = new NotesService(supabase)
    const rawNote = await notesService.getNoteById(id)
    
    if (!rawNote) {
      throw new NotFoundError('Note not found')
    }
    
    const note = normalizeNotePage(rawNote)
    
    return NextResponse.json({ note })
  } catch (error) {
    return handleApiError(error, '[GET /api/notes/[id]]')
  }
}

/**
 * PATCH /api/notes/[id]
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { supabase } = await requireAuth()
    const { id } = await context.params
    const body = await request.json()
    
    const idValidation = NoteIdSchema.safeParse({ id })
    if (!idValidation.success) {
      throw new BadRequestError('Invalid note ID')
    }
    
    const bodyValidation = UpdateNoteSchema.safeParse(body)
    if (!bodyValidation.success) {
      throw new BadRequestError('Validation failed')
    }
    
    const notesService = new NotesService(supabase)
    const rawNote = await notesService.updateNote(id, bodyValidation.data)
    
    const note = normalizeNotePage(rawNote)
    
    return NextResponse.json({ note })
  } catch (error) {
    return handleApiError(error, '[PATCH /api/notes/[id]]')
  }
}

/**
 * DELETE /api/notes/[id]
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { supabase } = await requireAuth()
    const { id } = await context.params
    
    const validationResult = NoteIdSchema.safeParse({ id })
    if (!validationResult.success) {
      throw new BadRequestError('Invalid note ID')
    }
    
    const notesService = new NotesService(supabase)
    await notesService.permanentlyDeleteNote(id)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, '[DELETE /api/notes/[id]]')
  }
}