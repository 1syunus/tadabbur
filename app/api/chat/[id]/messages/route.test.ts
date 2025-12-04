import { GET, POST } from '@/app/api/chat/[id]/messages/route'
import { resetDatabase, seedTestUserData, getTestUserClient } from '@/lib/helpers/db'
import { NextRequest } from 'next/server'

let client: Awaited<ReturnType<typeof getTestUserClient>>
let conversationId: string

beforeAll(async () => {
  await resetDatabase()
  client = await getTestUserClient()
  await seedTestUserData()

  const { data, error } = await client
    .from('conversations')
    .insert({ user_id: process.env.TEST_USER_ID!, title: 'Chat' })
    .select('id')
    .single()
  if (error) throw error

  conversationId = data.id

  await client.from('messages').insert([
    {
      conversation_id: conversationId,
      role: 'user',
      content: 'Hello',
    },
    {
      conversation_id: conversationId,
      role: 'assistant',
      content: 'Hi!',
    }
  ])
}, 20000)

const expectNormalizedMessage = (m: any) => {
  expect(m).toHaveProperty('id')
  expect(m).toHaveProperty('conversationId')
  expect(m).toHaveProperty('role')
  expect(m).toHaveProperty('content')
  expect(m).toHaveProperty('ayahReferences')
  expect(m).toHaveProperty('tafsirUsed')
  expect(m).toHaveProperty('createdAt')

  expect(m).not.toHaveProperty('conversation_id')
  expect(m).not.toHaveProperty('created_at')
}

describe('/api/chat/[id]/messages route', () => {
  it('GET returns normalized messages in order', async () => {
    const response = await GET(null as any, {
      params: Promise.resolve({ id: conversationId }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(Array.isArray(data.messages)).toBe(true)
    expect(data.messages.length).toBe(2)

    for (const m of data.messages) expectNormalizedMessage(m)

    // must be chronological by created_at
    const ids = data.messages.map((m: any) => m.id)
    expect(ids.length).toBe(2)
  })

  it('POST creates a normalized message', async () => {
    const request = new NextRequest(
      'http://localhost/api/chat/' + conversationId + '/messages',
      {
        method: 'POST',
        body: JSON.stringify({
          role: 'user',
          content: 'New message',
          ayahReferences: [],
          tafsirUsed: [],
        }),
      }
    )

    const response = await POST(request, {
      params: Promise.resolve({ id: conversationId }),
    })

    const data = await response.json()

    expect(response.status).toBe(201)
    expectNormalizedMessage(data.message)
    expect(data.message.content).toBe('New message')
  })

  it('POST returns 400 for invalid message payload', async () => {
    const request = new NextRequest(
      'http://localhost/api/chat/' + conversationId + '/messages',
      {
        method: 'POST',
        body: JSON.stringify({ role: 999 }), // invalid
      }
    )

    const response = await POST(request, {
      params: Promise.resolve({ id: conversationId }),
    })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Validation failed')
  })

  it('GET returns 400 for invalid conversation ID', async () => {
    const response = await GET(null as any, {
      params: Promise.resolve({ id: 'bad-id' }),
    })

    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Invalid conversation ID')
  })
})