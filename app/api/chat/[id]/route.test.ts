import { GET, PATCH, DELETE } from '@/app/api/chat/[id]/route'
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
    .insert({ user_id: process.env.TEST_USER_ID!, title: 'Initial' })
    .select('id')
    .single()

  if (error) throw error
  conversationId = data.id
}, 20000)

const req = (body: any) =>
  new NextRequest('http://localhost/api/chat/' + conversationId, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })

const expectNorm = (c: any) => {
  expect(c).toHaveProperty('id')
  expect(c).toHaveProperty('title')
  expect(c).toHaveProperty('isArchived')
  expect(c).toHaveProperty('createdAt')
  expect(c).toHaveProperty('updatedAt')

  expect(c).not.toHaveProperty('user_id')
  expect(c).not.toHaveProperty('archived')
}

describe('/api/chat/[id] route', () => {
  it('GET returns normalized conversation', async () => {
    const response = await GET(null as any, { params: Promise.resolve({ id: conversationId }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expectNorm(data.conversation)
    expect(data.conversation.id).toBe(conversationId)
  })

  it('PATCH updates and returns normalized conversation', async () => {
    const response = await PATCH(req({ title: 'Updated' }), {
      params: Promise.resolve({ id: conversationId }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expectNorm(data.conversation)
    expect(data.conversation.title).toBe('Updated')
  })

  it('PATCH returns 400 for invalid data', async () => {
    const response = await PATCH(req({ title: 999 }), {
      params: Promise.resolve({ id: conversationId }),
    })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Validation failed')
  })

  it('DELETE archives the conversation', async () => {
    const response = await DELETE(null as any, { params: Promise.resolve({ id: conversationId }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    const { data: row } = await client
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle()

    expect(row).not.toBeNull()
    expect(row!.archived).toBe(true)
  })

  it('GET returns 404 for missing conversation', async () => {
    const fakeId = crypto.randomUUID()

    const response = await GET(null as any, { params: Promise.resolve({ id: fakeId }) })
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe('Conversation not found')
  })

  it('GET returns 400 for invalid UUID', async () => {
    const response = await GET(null as any, { params: Promise.resolve({ id: 'bad-id' }) })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Invalid conversation ID')
  })
})