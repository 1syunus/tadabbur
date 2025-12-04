import { POST } from '@/app/api/notes/[id]/restore/route'
import { resetDatabase, seedTestUserData, getTestUserClient } from '@/lib/helpers/db'
import { NextRequest } from 'next/server'

let client: Awaited<ReturnType<typeof getTestUserClient>>
let archivedNoteId: string

beforeAll(async () => {
  await resetDatabase()
  client = await getTestUserClient()
  await seedTestUserData()
  
  // Create already-archived note
  const { data, error } = await client
    .from('note_pages')
    .insert({
      user_id: process.env.TEST_USER_ID!,
      title: 'Archived Note',
      content: 'Content',
      deleted_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  
  if (error) throw error
  archivedNoteId = data.id
}, 20000)

const expectNormalizedNote = (note: any) => {
  expect(note).toHaveProperty('id')
  expect(note).toHaveProperty('title')
  expect(note).toHaveProperty('content')
  expect(note).toHaveProperty('sectionId')
  expect(note).toHaveProperty('orderIndex')
  expect(note).toHaveProperty('deletedAt')
  expect(note).toHaveProperty('createdAt')
  expect(note).toHaveProperty('updatedAt')

  expect(note).not.toHaveProperty('userId')
  expect(note).not.toHaveProperty('user_id')
  expect(note).not.toHaveProperty('section_id')
  expect(note).not.toHaveProperty('order_index')
  expect(note).not.toHaveProperty('deleted_at')
  expect(note).not.toHaveProperty('created_at')
  expect(note).not.toHaveProperty('updated_at')
}

describe('POST /api/notes/[id]/restore', () => {
  it('restores the note and returns normalized data', async () => {
    const request = new NextRequest(`http://localhost/api/notes/${archivedNoteId}/restore`, {
      method: 'POST',
    })
    
    const response = await POST(request, { params: Promise.resolve({ id: archivedNoteId }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expectNormalizedNote(data.note)
    expect(data.note.id).toBe(archivedNoteId)
    expect(data.note.deletedAt).toBeNull()
    
    // KEPT: Verify database state
    const { data: dbNote } = await client
      .from('note_pages')
      .select('*')
      .eq('id', archivedNoteId)
      .single()
    
    expect(dbNote).not.toBeNull()
    expect(dbNote!.deleted_at).toBeNull()
  })

  it('restored note appears in active notes query', async () => {
    // KEPT: This verifies the restoration actually works end-to-end
    const { data: activeNotes } = await client
      .from('note_pages')
      .select('*')
      .is('deleted_at', null)
    
    const isVisible = activeNotes?.some(n => n.id === archivedNoteId)
    expect(isVisible).toBe(true)
  })

  it('is idempotent when restoring already restored note', async () => {
    const request = new NextRequest(`http://localhost/api/notes/${archivedNoteId}/restore`, {
      method: 'POST',
    })
    
    // Restore again (it's already restored from previous test)
    const response = await POST(request, { params: Promise.resolve({ id: archivedNoteId }) })
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expectNormalizedNote(data.note)
    expect(data.note.deletedAt).toBeNull()
  })

  it('returns 404 for non-existent note', async () => {
    const fakeId = crypto.randomUUID()
    const request = new NextRequest(`http://localhost/api/notes/${fakeId}/restore`, {
      method: 'POST',
    })
    
    const response = await POST(request, { params: Promise.resolve({ id: fakeId }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Note not found')
  })

  it('returns 400 for invalid UUID', async () => {
    const request = new NextRequest('http://localhost/api/notes/invalid-id/restore', {
      method: 'POST',
    })
    
    const response = await POST(request, { params: Promise.resolve({ id: 'invalid-id' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid note ID')
  })
})