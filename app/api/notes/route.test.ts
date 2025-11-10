import { getTestUserClient, resetDatabase, seedTestUserData } from '@/lib/helpers/db'
import { NotesService } from '@/lib/api/notes/service'

let client: Awaited<ReturnType<typeof getTestUserClient>>

beforeAll(async () => {
  // Reset DB and seed test user
  await resetDatabase()
  client = await getTestUserClient()
  await seedTestUserData()
})

afterAll(async () => {
  // Optional: clear everything after tests
  await resetDatabase()
})

describe('Notes API', () => {
  it('should create a note', async () => {
    const notesService = new NotesService(client)
    const noteData = { title: 'Test Note', content: 'This is a test note.' }

    const note = await notesService.createNote({
      user_id: process.env.TEST_USER_ID!,
      ...noteData,
    })

    expect(note).toHaveProperty('id')
    expect(note.title).toBe(noteData.title)
    expect(note.content).toBe(noteData.content)
  })

  it('should get all notes for the user', async () => {
    const notesService = new NotesService(client)
    const notes = await notesService.getAllNotes()

    expect(notes.length).toBeGreaterThan(0)
    expect(notes[0]).toHaveProperty('id')
    expect(notes[0].user_id).toBe(process.env.TEST_USER_ID)
  })

  it('should fail validation when creating a note with bad data', async () => {
    const notesService = new NotesService(client)
    await expect(
      // @ts-ignore
      notesService.createNote({ user_id: process.env.TEST_USER_ID! }) // missing required fields
    ).rejects.toThrow()
  })
})