import { GET, POST } from '@/app/api/chat/[id]/messages/route'
import { resetDatabase, seedTestUserData, getTestUserClient } from '@/lib/helpers/db'
import { NextRequest } from 'next/server'

let userConversationId: string
let foreignConversationId: string
const messagesApiUrl = (id: string) => `http://localhost/api/chat/${id}/messages`

beforeAll(async () => {
    await resetDatabase()
    const client = await getTestUserClient()
    await seedTestUserData()
    
    const TEST_USER_ID = process.env.TEST_USER_ID!
    const FOREIGN_USER_ID = '11111111-1111-1111-1111-111111111111'
    
    // 1. Create User's Conversation
    const { data: convData, error: convError } = await client
      .from('conversations')
      .insert({ user_id: TEST_USER_ID, title: 'User Messages Test' })
      .select('id').single()
    if (convError) throw convError
    userConversationId = convData.id
    
    // 2. Create Foreign Conversation
    const { data: foreignConvData, error: foreignConvError } = await client
      .from('conversations')
      .insert({ user_id: FOREIGN_USER_ID, title: 'Foreign Messages Test' })
      .select('id').single()
    if (foreignConvError) throw foreignConvError
    foreignConversationId = foreignConvData.id
    
    // 3. Seed messages for the User's Conversation
    await client.from('messages').insert([
        { conversation_id: userConversationId, role: 'user', content: 'User Message 1' },
        { conversation_id: userConversationId, role: 'assistant', content: 'Assistant Reply 1' },
    ])
    // 4. Seed a message for the Foreign Conversation (Should be hidden by RLS)
    await client.from('messages').insert({ 
        conversation_id: foreignConversationId, role: 'user', content: 'SECRET MESSAGE' 
    })
})

describe('/api/chat/[id]/messages route', () => {

    // --- CREATE (POST) ---
    it('POST should create a new message and return 201', async () => {
        const newMessageData = { role: 'user', content: 'New message via API' }
        
        const request = new NextRequest(messagesApiUrl(userConversationId), {
            method: 'POST',
            body: JSON.stringify(newMessageData),
        })

        const response = await POST(request, { params: Promise.resolve({ id: userConversationId }) }) 
        const data = await response.json()

        expect(response.status).toBe(201) // Verify 201 Created
        expect(data.message.content).toBe(newMessageData.content)
        // Verify the conversation_id was correctly merged from the URL
        expect(data.message.conversation_id).toBe(userConversationId) 
    })

    // --- READ (GET) ---
    it('GET should retrieve messages for the authenticated user\'s conversation', async () => {
        // We seeded 2 messages + 1 created above = 3
        
        const response = await GET(null as any, { params: Promise.resolve({ id: userConversationId }) }) 
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.messages.length).toBeGreaterThanOrEqual(3)
        expect(data.messages[0]).toHaveProperty('role') 
    })
    
    // --- RLS CHECK (GET) ---
    it('GET should return 404 for a conversation owned by another user', async () => {
        // The service layer should return null if the conversation isn't owned by the user, leading to 404
        const response = await GET(null as any, { params: Promise.resolve({ id: foreignConversationId }) })
        
        expect(response.status).toBe(404) // RLS failure prevents retrieval
        const data = await response.json()
        expect(data.error).toBe('Conversation not found')
    })
    
    // --- VALIDATION (POST) ---
    it('POST should return 400 for invalid body data (e.g., missing content)', async () => {
        // 'content' is non-nullable for messages
        const invalidData = { role: 'user' } 

        const request = new NextRequest(messagesApiUrl(userConversationId), {
            method: 'POST',
            body: JSON.stringify(invalidData),
        })
        
        const response = await POST(request, { params: Promise.resolve({ id: userConversationId }) })
        
        expect(response.status).toBe(400) // Verify Zod validation failure
        const data = await response.json()
        expect(data.error).toBe('Validation failed')
    })
    
    it('GET returns 400 for invalid conversation ID format', async () => {
        const invalidId = 'not-a-uuid'
        const response = await GET(null as any, { params: Promise.resolve({ id: invalidId }) })
        
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toBe('Invalid conversation ID')
    })
})