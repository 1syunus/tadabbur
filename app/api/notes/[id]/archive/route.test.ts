import { POST } from '@/app/api/notes/[id]/archive/route'
import { resetDatabase, seedTestUserData, getTestUserClient } from '@/lib/helpers/db'
import { NextRequest } from 'next/server'

let client: Awaited<ReturnType<typeof getTestUserClient>>
let testNoteId: string

beforeAll(async () => {
  await resetDatabase()
  client = await getTestUserClient()
  await seedTestUserData()
  
  const { data, error } = await client
    .from('note_pages')
    .insert({
      user_id: process.env.TEST_USER_ID!,
      title: 'Test Note',
      content: 'Content',
    })
    .select('id')
    .single()
  
  if (error) throw error
  testNoteId = data.id
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

describe('POST /api/notes/[id]/archive', () => {
  it('soft deletes the note and returns normalized data', async () => {
    const request = new NextRequest(`http://localhost/api/notes/${testNoteId}/archive`, {
      method: 'POST',
    })
    
    const response = await POST(request, { params: Promise.resolve({ id: testNoteId }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expectNormalizedNote(data.note)
    expect(data.note.id).toBe(testNoteId)
    expect(data.note.deletedAt).not.toBeNull()
    expect(typeof data.note.deletedAt).toBe('string') // ISO timestamp
    
    // KEPT: Verify database state (full integration check)
    const { data: dbNote } = await client
      .from('note_pages')
      .select('*')
      .eq('id', testNoteId)
      .single()
    
    expect(dbNote).not.toBeNull()
    expect(dbNote!.deleted_at).not.toBeNull()
  })

  it('archived note is excluded from active notes query', async () => {
    // ADDED: This is what you had in the restore test
    // It's a good integration check
    const { data: activeNotes } = await client
      .from('note_pages')
      .select('*')
      .is('deleted_at', null)
    
    const isVisible = activeNotes?.some(n => n.id === testNoteId)
    expect(isVisible).toBe(false)
  })

  it('is idempotent when archiving already archived note', async () => {
    const request = new NextRequest(`http://localhost/api/notes/${testNoteId}/archive`, {
      method: 'POST',
    })
    
    // Archive again (it's already archived from previous test)
    const response = await POST(request, { params: Promise.resolve({ id: testNoteId }) })
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expectNormalizedNote(data.note)
    expect(data.note.deletedAt).not.toBeNull()
  })

  it('returns 404 for non-existent note', async () => {
    const fakeId = crypto.randomUUID()
    const request = new NextRequest(`http://localhost/api/notes/${fakeId}/archive`, {
      method: 'POST',
    })
    
    const response = await POST(request, { params: Promise.resolve({ id: fakeId }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Note not found')
  })

  it('returns 400 for invalid UUID', async () => {
    const request = new NextRequest('http://localhost/api/notes/invalid-id/archive', {
      method: 'POST',
    })
    
    const response = await POST(request, { params: Promise.resolve({ id: 'invalid-id' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid note ID')
  })
})