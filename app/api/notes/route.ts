import { NextRequest, NextResponse } from 'next/server'
import { NotesService } from '@/lib/api/notes/service'
import { createServerClient } from '@/lib/api/supabase/server'
import { CreateNoteSchema } from '@/lib/validation/note'
import { z } from 'zod'

/**
 * GET /api/notes
 * Returns all active notes for authenticated user
 */
export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const notesService = new NotesService(supabase)
    const notes = await notesService.getAllNotes()

    return NextResponse.json({ notes })
  } catch (error) {
    console.error('[GET /api/notes] Error:', error)
    const message = process.env.NODE_ENV === 'development' && error instanceof Error
      ? error.message
      : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/notes
 * Creates a new note
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    console.error('[POST /api/notes] Error:', error)
    const message = process.env.NODE_ENV === 'development' && error instanceof Error
      ? error.message
      : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}