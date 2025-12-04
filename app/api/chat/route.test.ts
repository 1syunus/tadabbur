import { GET, POST } from '@/app/api/chat/route'
import { resetDatabase, getTestUserClient, seedTestUserData } from '@/lib/helpers/db'
import { NextRequest } from 'next/server'

let client: Awaited<ReturnType<typeof getTestUserClient>>

beforeAll(async () => {
  await resetDatabase()
  client = await getTestUserClient()
  await seedTestUserData()

  // seed some conversations
  await client.from('conversations').insert([
    { user_id: process.env.TEST_USER_ID!, title: 'A' },
    { user_id: process.env.TEST_USER_ID!, title: 'B' }
  ])

  // foreign user
  await client.from('conversations').insert({
    user_id: '11111111-1111-1111-1111-111111111111',
    title: 'Foreign'
  })
}, 20000)

afterAll(async () => {
  await resetDatabase()
})

const expectNormalizedConversation = (c: any) => {
  expect(c).toHaveProperty('id')
  expect(c).toHaveProperty('title')
  expect(c).toHaveProperty('isArchived')
  expect(c).toHaveProperty('createdAt')
  expect(c).toHaveProperty('updatedAt')

  expect(c).not.toHaveProperty('user_id')
  expect(c).not.toHaveProperty('archived')
  expect(c).not.toHaveProperty('created_at')
  expect(c).not.toHaveProperty('updated_at')
}

describe('/api/chat route', () => {
  it('POST creates a normalized conversation', async () => {
    const request = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ title: 'New Conversation' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expectNormalizedConversation(data.conversation)
    expect(data.conversation.title).toBe('New Conversation')
  })

  it('POST returns 400 when validation fails', async () => {
    const request = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ title: 123 }), // invalid
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Validation failed')
  })

  it('GET returns only normalized conversations for this user', async () => {
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(Array.isArray(data.conversations)).toBe(true)

    for (const c of data.conversations) {
      expectNormalizedConversation(c)
    }

    const titles = data.conversations.map((c: any) => c.title)
    expect(titles).not.toContain('Foreign')
  })
})