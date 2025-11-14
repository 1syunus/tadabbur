import { GET, POST } from '@/app/api/notes/route' // Importing Route Handlers
import { resetDatabase, getTestUserClient, seedTestUserData } from '@/lib/helpers/db'
import { NextRequest } from 'next/server'

// Use the correct unwrapped type for the client
let client: Awaited<ReturnType<typeof getTestUserClient>> 
const notesApiUrl = 'http://localhost/api/notes'

beforeAll(async () => {
    await resetDatabase()
    client = await getTestUserClient()
    await seedTestUserData()
    
    // 1. Seed two notes for the test user
    await client.from('note_pages').insert([
        { user_id: process.env.TEST_USER_ID!, title: 'User Note 1', content: 'Content 1' },
        { user_id: process.env.TEST_USER_ID!, title: 'User Note 2', content: 'Content 2' },
    ])
    // 2. Seed a note for a different user (RLS verification)
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

    it('POST should create a new note and return 201', async () => {
        const newNoteData = { title: 'New Note via API', content: 'New content' }
        
        const request = new NextRequest(notesApiUrl, {
            method: 'POST',
            body: JSON.stringify(newNoteData),
        })

        // Call POST handler
        const response = await POST(request) 
        const data = await response.json()

        expect(response.status).toBe(201) // Verify 201 Created
        expect(data.note).toHaveProperty('id')
        expect(data.note.title).toBe(newNoteData.title)
        // RLS Check: The created note belongs to the test user
        expect(data.note.user_id).toBe(process.env.TEST_USER_ID) 
    })

    it('GET should retrieve all notes for the authenticated user (RLS check)', async () => {
        // We seeded 2 notes for the user + 1 created in the previous test = 3
        
        // Call GET handler (using the 0-argument signature that works in your environment)
        const response = await GET() 
        const data = await response.json()

        expect(response.status).toBe(200)
        // Check for 3 sections (2 seeded + 1 created above)
        expect(data.notes.length).toBeGreaterThanOrEqual(3) 
        
        // RLS Check: Verify we didn't accidentally get the "Foreign Note"
        const noteTitles = data.notes.map((s: any) => s.title)
        expect(noteTitles).not.toContain('Foreign Note') 
    })
})