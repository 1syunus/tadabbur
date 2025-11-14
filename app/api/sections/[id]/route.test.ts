import { GET, PATCH, DELETE } from '@/app/api/sections/[id]/route'
import { resetDatabase, seedTestUserData, getTestUserClient } from '@/lib/helpers/db'
import { NextRequest } from 'next/server'

let testSectionId: string

const emptyRequest = new NextRequest('http://localhost', { method: 'GET' })

beforeAll(async () => {
    await resetDatabase()
    const client = await getTestUserClient()

    await seedTestUserData()
    
    const { data, error } = await client
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

describe('/api/sections/[id] route (Hard Delete)', () => {
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
        expect(data.section.id).toBe(testSectionId)
        
        const client = await getTestUserClient()
        const { data: section } = await client
          .from('note_sections') 
          .select('*')
          .eq('id', testSectionId)
          .single()
        
        expect(section).toBeNull()
    })

    it('GET returns 404 for non-existent ID', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000'
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