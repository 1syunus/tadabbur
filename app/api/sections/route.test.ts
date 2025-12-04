import { GET, POST } from '@/app/api/sections/route'
import { resetDatabase, seedTestUserData, getTestUserClient } from '@/lib/helpers/db'
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

  // Unrelated user — must not appear
  await client.from('note_sections').insert({
    user_id: '11111111-1111-1111-1111-111111111111',
    name: 'Foreign Section',
  })
}, 20000)

afterAll(async () => {
  await resetDatabase()
})

const expectNormalizedSection = (section: any) => {
  expect(section).toHaveProperty('id')
  expect(section).toHaveProperty('name')
  expect(section).toHaveProperty('color')
  expect(section).toHaveProperty('orderIndex')
  expect(section).toHaveProperty('createdAt')

  // anti-leak
  expect(section).not.toHaveProperty('user_id')
  expect(section).not.toHaveProperty('order_index')
  expect(section).not.toHaveProperty('created_at')
}

describe('/api/sections route', () => {
  it('POST creates a new normalized section', async () => {
    const request = new NextRequest('http://localhost/api/sections', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Section via API', color: '#00FF00' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expectNormalizedSection(data.section)
    expect(data.section.name).toBe('New Section via API')
  })

  it('POST returns 400 for invalid payload', async () => {
    const request = new NextRequest('http://localhost/api/sections', {
      method: 'POST',
      body: JSON.stringify({ color: 'blue' }), // missing required name
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
  })

  it('GET returns only normalized sections for the authenticated user', async () => {
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)

    expect(Array.isArray(data.sections)).toBe(true)
    expect(data.sections.length).toBeGreaterThanOrEqual(2)

    for (const section of data.sections) {
      expectNormalizedSection(section)
    }

    // RLS check
    const names = data.sections.map((s: any) => s.name)
    expect(names).not.toContain('Foreign Section')
  })
})