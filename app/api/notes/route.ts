import { NextRequest, NextResponse } from 'next/server'
import { NotesService } from '@/lib/api/notes/service'
import { CreateNoteSchema } from '@/lib/validation/note'
import { BadRequestError, handleApiError } from '@/lib/api/errors'
import { requireAuth } from '@/lib/api/auth'
import { normalizeNotePages, normalizeNotePage } from '@/lib/api/notes/normalized'

/**
 * GET /api/notes
 * Returns all active notes for authenticated user
 */
export async function GET() {
  try {
    const { supabase } = await requireAuth()
    const notesService = new NotesService(supabase)
    const rawNotes = await notesService.getAllNotes()
    
    const notes = normalizeNotePages(rawNotes)
    
    return NextResponse.json({ notes })
  } catch (error) {
    return handleApiError(error, '[GET /api/notes]')
  }
}

/**
 * POST /api/notes
 * Creates a new note
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth()
    const body = await request.json()
    
    const validation = CreateNoteSchema.safeParse(body)
    if (!validation.success) {
      throw new BadRequestError('Validation failed')
    }
    
    const notesService = new NotesService(supabase)
    const rawNote = await notesService.createNote({
      user_id: user.id,
      ...validation.data,
    })
    
    const note = normalizeNotePage(rawNote)
    
    return NextResponse.json({ note }, { status: 201 })
  } catch (error) {
    return handleApiError(error, '[POST /api/notes]')
  }
}