import { NextRequest, NextResponse } from 'next/server'
import { NotesService } from '@/lib/api/notes/service'
import { createServerClient } from '@/lib/api/supabase/server'
import { CreateNoteSchema } from '@/lib/validation/note'
import { handleApiError } from '@/lib/api/errors'
import { requireAuth } from '@/lib/api/auth'


/**
 * GET /api/notes
 * Returns all active notes for authenticated user
 */
export async function GET() {
  try {
    const {supabase} = await requireAuth()

    const notesService = new NotesService(supabase)
    const notes = await notesService.getAllNotes()

    return NextResponse.json({ notes })
  } catch (error) {
    return handleApiError(error, '[GET /api/notes] Error:')
  }
}

/**
 * POST /api/notes
 * Creates a new note
 */
export async function POST(request: NextRequest) {
  try {
    const {supabase, user} = await requireAuth()
    const body = await request.json()
    
    // Validate with Zod
    const validation = CreateNoteSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      )
    }

    const notesService = new NotesService(supabase)
    const note = await notesService.createNote({
      user_id: user.id, // Set from auth, not from body
      ...validation.data,
    })

    return NextResponse.json({ note }, { status: 201 })
  } catch (error) {
    return handleApiError(error, '[POST /api/notes] Error:')
  }
}