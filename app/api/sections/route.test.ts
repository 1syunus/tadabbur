import { GET, POST } from '@/app/api/sections/route'
import { resetDatabase, getTestUserClient, seedTestUserData } from '@/lib/helpers/db'
import { NextRequest } from 'next/server'

let client: Awaited<ReturnType<typeof getTestUserClient>> 

beforeAll(async () => {
    await resetDatabase()
    client = await getTestUserClient()
    await seedTestUserData()
    
    await client.from('note_sections').insert([
        { user_id: process.env.TEST_USER_ID!, name: 'Section A', order_index: 0 },
        { user_id: process.env.TEST_USER_ID!, name: 'Section B', order_index: 1 },
    ])

    await client.from('note_sections').insert({ 
        user_id: '11111111-1111-1111-1111-111111111111', 
        name: 'Foreign Section' 
    })
}, 20000)

afterAll(async () => {
    await resetDatabase()
})

describe('/api/sections route', () => {

    it('POST should create a new section', async () => {
        const newSectionData = { name: 'New Section via API', color: '#00FF00' }
        
        const request = new NextRequest('http://localhost/api/sections', {
            method: 'POST',
            body: JSON.stringify(newSectionData),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.section).toHaveProperty('id')
        expect(data.section.name).toBe(newSectionData.name)
        // RLS Check: The created section belongs to the test user
        expect(data.section.user_id).toBe(process.env.TEST_USER_ID) 
    })

    it('GET should retrieve all sections for the authenticated user', async () => {
        // We seeded 2 sections for the user + 1 created in the previous test = 3
        const response = await GET() 
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.sections.length).toBeGreaterThanOrEqual(3)
        
        // RLS Check: Verify we didn't accidentally get the "Foreign Section"
        const sectionNames = data.sections.map((s: any) => s.name)
        expect(sectionNames).not.toContain('Foreign Section') 
    })
    
    it('POST should return 400 for invalid data (e.g., missing name)', async () => {
        const invalidData = { color: 'red' } // 'name' is non-nullable

        const request = new NextRequest('http://localhost/api/sections', {
            method: 'POST',
            body: JSON.stringify(invalidData),
        })
        
        const response = await POST(request)
        
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toBe('Validation failed')
    })
})