import { GET, POST } from '@/app/api/notes/route'
import { resetDatabase, getTestUserClient, seedTestUserData } from '@/lib/helpers/db'
import { NextRequest } from 'next/server'

let client: Awaited<ReturnType<typeof getTestUserClient>> 
const notesApiUrl = 'http://localhost/api/notes'

// Helper: ensure normalized structure
const expectNormalizedNote = (note: any) => {
  expect(note).toHaveProperty('id')
  expect(note).toHaveProperty('title')
  expect(note).toHaveProperty('content')
  expect(note).toHaveProperty('sectionId')
  expect(note).toHaveProperty('orderIndex')
  expect(note).toHaveProperty('createdAt')
  expect(note).toHaveProperty('updatedAt')
  expect(note).toHaveProperty('deletedAt')

  expect(note).not.toHaveProperty('userId')
  expect(note).not.toHaveProperty('user_id')
  expect(note).not.toHaveProperty('section_id')
  expect(note).not.toHaveProperty('order_index')
  expect(note).not.toHaveProperty('created_at')
  expect(note).not.toHaveProperty('updated_at')
}

beforeAll(async () => {
  await resetDatabase()
  client = await getTestUserClient()
  await seedTestUserData()
  
  // Seed base notes
  await client.from('note_pages').insert([
    { user_id: process.env.TEST_USER_ID!, title: 'User Note 1', content: 'Content 1' },
    { user_id: process.env.TEST_USER_ID!, title: 'User Note 2', content: 'Content 2' },
  ])

  // Foreign note that should NOT appear
  await client.from('note_pages').insert({ 
    user_id: '11111111-1111-1111-1111-111111111111', 
    title: 'Foreign Note',
    content: 'Should not be seen'
  })
}, 20000)

afterAll(async () => {
  await resetDatabase()
})

describe('/api/notes route (List and Create)', () => {

  it('POST should create a new normalized note', async () => {
    const newNoteData = { title: 'New Note via API', content: 'New content' }
    
    const request = new NextRequest(notesApiUrl, {
      method: 'POST',
      body: JSON.stringify(newNoteData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expectNormalizedNote(data.note)
    expect(data.note.title).toBe(newNoteData.title)
  })

  it('POST returns 400 for invalid body', async () => {
    const request = new NextRequest(notesApiUrl, {
      method: 'POST',
      body: JSON.stringify({ title: 123 }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.error).toBe('Validation failed')
  })

  it('GET returns only normalized notes for authenticated user', async () => {
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.notes.length).toBeGreaterThanOrEqual(3)

    // Check normalization of each returned item
    data.notes.forEach((note: any) => {
      expectNormalizedNote(note)
    })

    // Ensure foreign user note is not included
    const titles = data.notes.map((n: any) => n.title)
    expect(titles).not.toContain('Foreign Note')
  })
})