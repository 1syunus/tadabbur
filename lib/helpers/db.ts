import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_KEY!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const TEST_USER_ID = process.env.TEST_USER_ID!;
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@test.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'test_password';

if (!SUPABASE_URL || !SERVICE_KEY || !TEST_USER_ID) {
  throw new Error(
    'Missing required .env.test values: SUPABASE_URL, SUPABASE_KEY, TEST_USER_ID'
  );
}

/** Create admin client (bypasses RLS) */
export function createAdminClient(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

/** Get a client authenticated as the test user */
export async function getTestUserClient(): Promise<SupabaseClient<Database>> {
  const admin = createAdminClient();

  let user = null;
  try {
    const {data} = await admin.auth.admin.getUserById(TEST_USER_ID)
    user = data.user
  } catch {}

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      id: TEST_USER_ID,
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    user = data.user

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  const client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY!, {
    auth: {persistSession: false},
  })

    const { data: sessionData, error: signInError } = await client.auth.signInWithPassword({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
  });

  if (signInError || !sessionData.session) {
    throw new Error('Failed to sign in test user: ' + signInError?.message);
  }  
      
  await client.auth.setSession({
    access_token: sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
  });
  
  return client
}

export type TableName = keyof Database['public']['Tables'];

const joinTablesWithoutId: TableName[] = [
  'conversation_tags',
  'note_page_tags',
];

/**
 * Safely deletes all rows in a table.
 * Uses `.neq('id', '')` instead of TRUNCATE to avoid SQL permissions issues.
 */
export async function truncateTable(table: TableName) {
  const admin = createAdminClient();

  // Some tables might not have an `id` column → fallback to always-true filter
  if (joinTablesWithoutId.includes(table)) {
    const {error} = await admin.from(table).delete().not('created_at', 'is', null)
    if (error) throw error
    return
  }

  // tables w/ id
  const { error } = await admin.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) {
    console.warn(`[truncateTable] Fallback for ${table} due to: ${error.message}`);
    // Fallback: delete with a generic condition (e.g. timestamp > 0)
    const fallback = await admin.from(table).delete().not('created_at', 'is', null);
    if (fallback.error) {
      console.error(`[truncateTable] Failed to clean ${table}:`, fallback.error);
      throw fallback.error;
    }
  }
}

/** Reset all tables in dependency order (avoid FK violations) */
export async function resetDatabase() {
  const admin = createAdminClient();
  
  // Clear auth users first (except the test user)
  const { data: { users } } = await admin.auth.admin.listUsers();
  for (const user of users) {
    if (user.id !== TEST_USER_ID) {
      await admin.auth.admin.deleteUser(user.id);
    }
  }
  
  // Then clear tables in dependency order
  const tables: TableName[] = [
    'conversation_tags',
    'note_page_tags',
    'messages',
    'conversations',
    'note_pages',
    'note_sections',
    'tags',
    'ai_insights',
  ];
  
  for (const table of tables) {
    await truncateTable(table);
  }
}

export async function seedTestUserData() {
  const client = await getTestUserClient();
  await client.from('note_sections').insert({
    user_id: TEST_USER_ID,
    name: 'Default Test Section',
  });
}