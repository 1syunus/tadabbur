import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

export type TableName = keyof Database['public']['Tables']

/**
 * Creates a plain Supabase client for Node tests.
 */
function createTestClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_KEY

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_KEY in .env.test')
  }

  // use supabase-js client (not @supabase/ssr)
  return createClient<Database>(url, key)
}

/**
 * Truncates one table.
 */
export async function truncateTable(table: TableName) {
  const supabase = createTestClient()
  await supabase.from(table).delete().neq('id', '')
}

/**
 * Clears all test data (order matters for foreign keys).
 */
export async function resetDatabase() {
  const supabase = createTestClient()

  const tables: TableName[] = [
    'conversation_tags',
    'note_page_tags',
    'messages',
    'conversations',
    'note_pages',
    'note_sections',
    'tags',
    'ai_insights',
  ]

  for (const table of tables) {
    await supabase.from(table).delete().neq('id', '')
  }
}

/**
 * Manually insert your known test user.
 * (You already created it in the Supabase dashboard.)
 */
export async function seedTestUser() {
  const supabase = createTestClient()
  const testUserId = process.env.TEST_USER_ID

  if (!testUserId) throw new Error('Missing TEST_USER_ID in .env.test')

  // Example: Insert a note or section tied to the test user
  await supabase.from('note_sections').insert({
    user_id: testUserId,
    name: 'Default Test Section',
  })
}