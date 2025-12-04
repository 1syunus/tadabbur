import { NextRequest, NextResponse } from 'next/server'
import { NotesService } from '@/lib/api/notes/service'
import { NoteIdSchema } from '@/lib/validation/note'
import { BadRequestError, handleApiError, NotFoundError } from '@/lib/api/errors'
import { requireAuth } from '@/lib/api/auth'
import { normalizeNotePage } from '@/lib/api/notes/normalized'

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * POST /api/notes/[id]/restore
 * Restores a soft-deleted note (sets deleted_at to null)
 */
export async function POST(_: NextRequest, context: RouteContext) {
  try {
    const { supabase } = await requireAuth()
    const { id } = await context.params
    
    const validationResult = NoteIdSchema.safeParse({ id })
    if (!validationResult.success) {
      throw new BadRequestError('Invalid note ID')
    }
    
    const notesService = new NotesService(supabase)
    const rawNote = await notesService.restoreNote(id)
    
    const note = normalizeNotePage(rawNote)
    
    return NextResponse.json({ note }, { status: 200 })
  } catch (error) {
    return handleApiError(error, '[POST /api/notes/[id]/restore]')
  }
}