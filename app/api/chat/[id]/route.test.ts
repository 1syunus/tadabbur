import { GET, PATCH, DELETE } from '@/app/api/chat/[id]/route'
import { resetDatabase, seedTestUserData, getTestUserClient } from '@/lib/helpers/db'
import { NextRequest } from 'next/server'

let testConversationId: string

beforeAll(async () => {
    await resetDatabase()
    const client = await getTestUserClient()
    await seedTestUserData()
    
    // Create a conversation to test with
    const { data, error } = await client
      .from('conversations')
      .insert({
        user_id: process.env.TEST_USER_ID!,
        title: 'Initial Test Conversation',
      })
      .select('id')
      .single()
    
    if (error) throw error
    testConversationId = data.id
})

// Helper to create a request object for PATCH
const makeRequest = (body: any) =>
    new NextRequest('http://localhost/api/chat/' + testConversationId, {
        method: 'PATCH',
        body: JSON.stringify(body),
    })

describe('/api/chat/[id] route (Soft Delete)', () => {
    
    // --- READ (GET) ---
    it('GET returns the conversation', async () => {
        // Use null as the unused request argument
        const response = await GET(null as any, { params: Promise.resolve({ id: testConversationId }) })
        const data = await response.json()
        
        expect(response.status).toBe(200)
        expect(data.conversation.id).toBe(testConversationId)
        expect(data.conversation.archived).toBeFalsy() // Should not be archived initially
    })

    // --- UPDATE (PATCH) ---
    it('PATCH updates the conversation title', async () => {
        // Assuming the UpdateConversationSchema allows updating 'title'
        const request = makeRequest({ title: 'Updated Conversation Title' }) 
        const response = await PATCH(request, { params: Promise.resolve({ id: testConversationId }) })
        const data = await response.json()
        
        expect(response.status).toBe(200)
        expect(data.conversation.title).toBe('Updated Conversation Title')
    })
    
    // --- DELETE (Soft Delete) ---
    it('DELETE soft deletes the conversation', async () => {
        // Use null as the unused request argument
        const response = await DELETE(null as any, { params: Promise.resolve({ id: testConversationId }) })
        const data = await response.json()
        
        expect(response.status).toBe(200)
        expect(data.success).toBe(true) 
        
        // 💡 VERIFY SOFT DELETION: Check the database row for the 'archived' flag
        const client = await getTestUserClient()
        const { data: conversation } = await client
          .from('conversations')
          .select('archived')
          .eq('id', testConversationId)
          .single()
        
        // The conversation should still exist, but the archived flag must be true
        expect(conversation?.archived).toBe(true) 
    })

    // --- Validation and Error Handling ---
    it('GET returns 404 for non-existent ID', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000'
        const response = await GET(null as any, {params: Promise.resolve({id: fakeId})})

        expect(response.status).toBe(404)
        const data = await response.json()
        expect(data.error).toBe('Conversation not found')
    })

    it('GET returns 400 for invalid ID format', async () => {
        const invalidId = 'not-a-uuid'
        const response = await GET(null as any, { params: Promise.resolve({ id: invalidId }) })
        
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toBe('Invalid conversation ID')
    })
})