import { GET, POST } from '@/app/api/chat/[id]/messages/route'
import { resetDatabase, seedTestUserData, getTestUserClient, createAdminClient } from '@/lib/helpers/db'
import { NextRequest } from 'next/server'

let userClient: Awaited<ReturnType<typeof getTestUserClient>>
let adminClient: ReturnType<typeof createAdminClient>
let userConversationId: string
let foreignConversationId: string

beforeAll(async () => {
  await resetDatabase()
  userClient = await getTestUserClient()
  adminClient = createAdminClient()
  await seedTestUserData()
  
  const TEST_USER_ID = process.env.TEST_USER_ID!
  const FOREIGN_USER_ID = '11111111-1111-1111-1111-111111111111'
  
  // CREATE THE FOREIGN USER FIRST (with proper error handling)
  try {
    await adminClient.auth.admin.createUser({
      id: FOREIGN_USER_ID,
      email: 'foreign@test.com',
      password: 'foreign_password',
      email_confirm: true,
    })
  } catch (error: any) {
    // User already exists from previous test run - that's fine
    if (!error.message?.includes('already been registered')) {
      throw error
    }
  }
  
  // Create conversations for both users
  const { data: userConv, error: userConvError } = await userClient
    .from('conversations')
    .insert({ user_id: TEST_USER_ID, title: 'User Messages Test' })
    .select('id')
    .single()
  if (userConvError) throw userConvError
  userConversationId = userConv.id
  
  const { data: foreignConv, error: foreignConvError } = await adminClient
    .from('conversations')
    .insert({ user_id: FOREIGN_USER_ID, title: 'Foreign Messages Test' })
    .select('id')
    .single()
  if (foreignConvError) throw foreignConvError
  foreignConversationId = foreignConv.id
  
  // Seed messages
  await userClient.from('messages').insert([
    { conversation_id: userConversationId, role: 'user', content: 'User Message 1' },
    { conversation_id: userConversationId, role: 'assistant', content: 'Assistant Reply 1' },
  ])
  
  await adminClient.from('messages').insert([
    { conversation_id: foreignConversationId, role: 'user', content: 'SECRET MESSAGE' }
  ])
}, 20000)

describe('/api/chat/[id]/messages route', () => {
  it('POST should create a new message', async () => {
    const request = new NextRequest(`http://localhost/api/chat/${userConversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ role: 'user', content: 'New message via API' }),
    })
    const response = await POST(request, { params: Promise.resolve({ id: userConversationId }) })
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.message.content).toBe('New message via API')
    expect(data.message.conversation_id).toBe(userConversationId)
  })

  it('GET should retrieve messages for the authenticated user', async () => {
    const response = await GET(null as any, { params: Promise.resolve({ id: userConversationId }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.messages.length).toBeGreaterThanOrEqual(2)
    expect(data.messages[0]).toHaveProperty('role')
  })

  it('GET should return 404 for a conversation owned by another user', async () => {
    const response = await GET(null as any, { params: Promise.resolve({ id: foreignConversationId }) })
    const data = await response.json()
    expect(response.status).toBe(404)
    expect(data.error).toBe('Conversation not found')
  })
})