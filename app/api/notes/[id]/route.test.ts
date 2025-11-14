import { GET, PATCH, DELETE } from '@/app/api/notes/[id]/route'
import { resetDatabase, seedTestUserData, getTestUserClient } from '@/lib/helpers/db'
import { NextRequest } from 'next/server'

let testNoteId: string

const emptyRequest = new NextRequest('http://localhost', { method: 'GET' })

beforeAll(async () => {
  await resetDatabase()
  const client = await getTestUserClient()
  await seedTestUserData()
  
  // Create a note to test with
  const { data, error } = await client
    .from('note_pages')
    .insert({
      user_id: process.env.TEST_USER_ID!,
      title: 'Test Note',
      content: 'Test content',
    })
    .select('id')
    .single()
  
  if (error) throw error
  testNoteId = data.id
}, 20000)

const makeRequest = (body?: any, method: 'PATCH' | 'POST' = 'PATCH') =>
  new NextRequest('http://localhost/api/notes/' + testNoteId, {
    method,
    body: JSON.stringify(body ?? {}),
  })

describe('/api/notes/[id] route', () => {
  it('GET returns the note', async () => {
    const response = await GET(null as any, { params: Promise.resolve({ id: testNoteId }) })
    
    expect(response.status).toBe(200)
    const data = await response.json()
    
    expect(data.note.id).toBe(testNoteId)
  })

  it('PATCH updates the note', async () => {
    const request = makeRequest({ title: 'Updated Title' })
    const response = await PATCH(request, { params: Promise.resolve({ id: testNoteId }) })
    const data = await response.json()
    
    expect(data.note.title).toBe('Updated Title')
  })

  it('DELETE hard deletes the note', async () => {
    const response = await DELETE(null as any, { params: Promise.resolve({ id: testNoteId }) })
    
    expect(data.note.id).toBe(testNoteId)
    
    // Verify it is soft-deleted
    const client = await getTestUserClient()
    const { data: note } = await client
      .from('note_pages')
      .select('*')
      .eq('id', testNoteId)
      .single()
    
    expect(note?.deleted_at).not.toBeNull()
  })

  it('GET returns 404 for non-existent ID', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000'
    const response = await GET(null as any, {params: Promise.resolve({id: fakeId})})

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toBe('Note not found')
  })

  it('GET returns 400 for invalid ID format', async () => {
        const invalidId = 'not-a-uuid'
        const response = await GET(null as any, { params: Promise.resolve({ id: invalidId }) })
        
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toBe('Invalid note ID')
    })
})