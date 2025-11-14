import { GET, PATCH, DELETE } from '@/app/api/sections/[id]/route'
import { resetDatabase, seedTestUserData, getTestUserClient, createAdminClient } from '@/lib/helpers/db'
import { NextRequest } from 'next/server'

let testSectionId: string

let userClient: Awaited<ReturnType<typeof getTestUserClient>>
let adminClient: ReturnType<typeof createAdminClient>

beforeAll(async () => {
    await resetDatabase()
    userClient = await getTestUserClient()
    await seedTestUserData()

    adminClient = createAdminClient()
    
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

const makeRequest = (body?: any, method: 'PATCH' | 'POST' = 'PATCH') =>
    new NextRequest('http://localhost/api/sections/' + testSectionId, {
        method,
        body: JSON.stringify(body ?? {}),
    })

describe('/api/sections/[id] route', () => {
    it('GET returns the section', async () => {
        const response = await GET(null as any, { params: Promise.resolve({ id: testSectionId }) })
        const data = await response.json()
        
        expect(response.status).toBe(200)
        expect(data.section.id).toBe(testSectionId)
    })

    it('PATCH updates the section name and color', async () => {
        const request = makeRequest({ name: 'Updated Section Name', color: '#0000FF' })
        const response = await PATCH(request, { params: Promise.resolve({ id: testSectionId }) })
        const data = await response.json()
        
        expect(response.status).toBe(200)
        expect(data.section.name).toBe('Updated Section Name')
        expect(data.section.color).toBe('#0000FF')
    })

    it('DELETE permanently removes the section', async () => {
        const response = await DELETE(null as any, { params: Promise.resolve({ id: testSectionId }) })
        const data = await response.json()
        
        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        
        const userClient = await getTestUserClient()
        const { data: section } = await userClient
          .from('note_sections') 
          .select('*')
          .eq('id', testSectionId)
          .single()
        
        expect(section).toBeNull()
    })

    it('GET returns 404 for non-existent ID', async () => {
        const fakeId = crypto.randomUUID()
        const response = await GET(null as any, {params: Promise.resolve({id: fakeId})})

        expect(response.status).toBe(404)
        const data = await response.json()
        expect(data.error).toBe('Section not found')
    })

    it('GET returns 400 for invalid ID format', async () => {
        const invalidId = 'not-a-uuid'
        const response = await GET(null as any, { params: Promise.resolve({ id: invalidId }) })
        
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toBe('Invalid section ID')
    })
})