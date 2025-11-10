import { GET, POST } from '@/app/api/chat/route' // Importing Route Handlers
import { resetDatabase, getTestUserClient, seedTestUserData } from '@/lib/helpers/db'
import { NextRequest } from 'next/server'

// Use the correct unwrapped type for the client
let client: Awaited<ReturnType<typeof getTestUserClient>> 
const chatApiUrl = 'http://localhost/api/chat'

beforeAll(async () => {
    await resetDatabase()
    client = await getTestUserClient()
    await seedTestUserData()
    
    // 1. Seed two conversations for the test user
    await client.from('conversations').insert([
        { user_id: process.env.TEST_USER_ID!, title: 'AI Chat 1' },
        { user_id: process.env.TEST_USER_ID!, title: 'AI Chat 2' },
    ])
    // 2. Seed a conversation for a different user (RLS verification)
    await client.from('conversations').insert({ 
        user_id: '11111111-1111-1111-1111-111111111111', 
        title: 'Foreign Conversation', 
    })
})

afterAll(async () => {
    await resetDatabase()
})

describe('/api/chat route (List and Create)', () => {

    it('POST should create a new conversation and return 201', async () => {
        const newConversationData = { title: 'New Conversation via API' }
        
        const request = new NextRequest(chatApiUrl, {
            method: 'POST',
            body: JSON.stringify(newConversationData),
        })

        // Call POST handler
        const response = await POST(request) 
        const data = await response.json()

        expect(response.status).toBe(201) // Verify 201 Created
        expect(data.conversation).toHaveProperty('id')
        expect(data.conversation.title).toBe(newConversationData.title)
        // RLS Check: The created conversation belongs to the test user
        expect(data.conversation.user_id).toBe(process.env.TEST_USER_ID) 
    })

    it('GET should retrieve all conversations for the authenticated user (RLS check)', async () => {
        // We seeded 2 conversations for the user + 1 created above = 3
        
        // Call GET handler (using the 0-argument signature that works in your environment)
        const response = await GET() 
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.conversations.length).toBeGreaterThanOrEqual(3) 
        
        // RLS Check: Verify we didn't accidentally get the "Foreign Conversation"
        const conversationTitles = data.conversations.map((c: any) => c.title)
        expect(conversationTitles).not.toContain('Foreign Conversation') 
    })
    
    it('POST should return 400 for invalid data (missing required title)', async () => {
        // Assuming 'title' is required by CreateConversationSchema
        const invalidData = { initial_message: 'Hello' } 

        const request = new NextRequest(chatApiUrl, {
            method: 'POST',
            body: JSON.stringify(invalidData),
        })
        
        // Call POST handler
        const response = await POST(request)
        
        expect(response.status).toBe(400) // Verify Zod validation failure
        const data = await response.json()
        expect(data.error).toBe('Validation failed')
    })
})