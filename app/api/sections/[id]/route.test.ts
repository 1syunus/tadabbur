import { GET, PATCH, DELETE } from '@/app/api/sections/[id]/route'
import { resetDatabase, seedTestUserData, getTestUserClient, createAdminClient } from '@/lib/helpers/db'
import { NextRequest } from 'next/server'

let testSectionId: string
let userClient: Awaited<ReturnType<typeof getTestUserClient>>

beforeAll(async () => {
  await resetDatabase()
  userClient = await getTestUserClient()
  await seedTestUserData()

  const { data, error } = await userClient
    .from('note_sections')
    .insert({
      user_id: process.env.TEST_USER_ID!,
      name: 'Test Section Name',
    })
    .select('id')
    .single()

  if (error) throw error
  testSectionId = data.id
}, 20000)

const makeRequest = (body: any, method = 'PATCH') =>
  new NextRequest('http://localhost/api/sections/' + testSectionId, {
    method,
    body: JSON.stringify(body),
  })

// Helper: normalized section shape
const expectNormalizedSection = (section: any) => {
  expect(section).toHaveProperty('id')
  expect(section).toHaveProperty('name')
  expect(section).toHaveProperty('color')
  expect(section).toHaveProperty('orderIndex')
  expect(section).toHaveProperty('createdAt')

  // anti-leak (should NOT be present)
  expect(section).not.toHaveProperty('user_id')
  expect(section).not.toHaveProperty('order_index')
  expect(section).not.toHaveProperty('created_at')
}

describe('/api/sections/[id] route', () => {
  it('GET returns the normalized section', async () => {
    const response = await GET(null as any, { params: Promise.resolve({ id: testSectionId }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expectNormalizedSection(data.section)
    expect(data.section.id).toBe(testSectionId)
  })

  it('PATCH updates the section and returns normalized data', async () => {
    const request = makeRequest({ name: 'Updated Section Name', color: '#0000FF' })

    const response = await PATCH(request, { params: Promise.resolve({ id: testSectionId }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expectNormalizedSection(data.section)
    expect(data.section.name).toBe('Updated Section Name')
    expect(data.section.color).toBe('#0000FF')
  })

  it('PATCH returns 400 for invalid data', async () => {
    const request = makeRequest({ name: 123 }) // invalid type

    const response = await PATCH(request, { params: Promise.resolve({ id: testSectionId }) })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Validation failed')
  })

  it('DELETE removes the section', async () => {
    const response = await DELETE(null as any, { params: Promise.resolve({ id: testSectionId }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    // Ensure row actually deleted
    const { data: deleted } = await userClient
      .from('note_sections')
      .select('*')
      .eq('id', testSectionId)
      .maybeSingle()

    expect(deleted).toBeNull()
  })

  it('GET returns 404 for non-existent id', async () => {
    const fakeId = crypto.randomUUID()

    const response = await GET(null as any, { params: Promise.resolve({ id: fakeId }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Section not found')
  })

  it('GET returns 400 for invalid id format', async () => {
    const response = await GET(null as any, { params: Promise.resolve({ id: 'invalid' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid section ID')
  })
})