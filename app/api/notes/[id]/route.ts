import { NextRequest, NextResponse } from 'next/server'
import { NotesService } from '@/lib/api/notes/service'
import { UpdateNoteSchema, NoteIdSchema } from '@/lib/validation/note'
import { handleApiError } from '@/lib/api/errors'
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

    const params = await context.params

    // Validate ID param
    const paramValidation = NoteIdSchema.safeParse(context.params)
    if (!paramValidation.success) {
      return NextResponse.json(
        { error: 'Invalid note ID' },
        { status: 400 }
      )
    }

    const notesService = new NotesService(supabase)
    const note = await notesService.getNoteById(paramValidation.data.id)

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
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

    const params = await context.params

    const paramValidation = NoteIdSchema.safeParse(context.params)
    if (!paramValidation.success) {
      return NextResponse.json({ error: 'Invalid note ID' }, { status: 400 })
    }

    const body = await request.json()
    const validation = UpdateNoteSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      )
    }

    const notesService = new NotesService(supabase)
    const note = await notesService.updateNote(paramValidation.data.id, validation.data)

    return NextResponse.json({ note })
  } catch (error) {
    return handleApiError(error, '[PATCH /api/notes/[id]] Error:')
  }
}

/**
 * DELETE /api/notes/[id]
 */
export async function DELETE(_: NextRequest, context: RouteContext) {
  try {
    const {supabase} = await requireAuth()

    const params = await context.params

    const paramValidation = NoteIdSchema.safeParse(context.params)
    if (!paramValidation.success) {
      return NextResponse.json({ error: 'Invalid note ID' }, { status: 400 })
    }

    const notesService = new NotesService(supabase)
    const note = await notesService.softDeleteNote(paramValidation.data.id)

    return NextResponse.json({ note })
  } catch (error) {
    return handleApiError(error, '[DELETE /api/notes/[id]] Error:')
  }
}