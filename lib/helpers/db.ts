// src/lib/tests/supabase-test-client.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_KEY!;
const TEST_USER_ID = process.env.TEST_USER_ID!;
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@test.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'test_password';

if (!SUPABASE_URL || !SERVICE_KEY || !TEST_USER_ID) {
  throw new Error(
    'Missing required .env.test values: SUPABASE_URL, SUPABASE_KEY, TEST_USER_ID'
  );
}

/**
 * Returns a Supabase client using the Service Role Key (admin privileges)
 */
export function createAdminClient(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

/**
 * Ensures the test user exists, then returns a client authenticated as that user.
 */
export async function getTestUserClient(): Promise<SupabaseClient<Database>> {
  const admin = createAdminClient();

  // Ensure user exists
  const { data: existingUser, error: getUserError } = await admin.auth.admin
    .getUserById(TEST_USER_ID)
    .catch(() => ({ data: null, error: null }));

  if (!existingUser) {
    const { data, error } = await admin.auth.admin.createUser({
      id: TEST_USER_ID,
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
  }

  // Sign in as test user to get JWT
  const client = createClient<Database>(SUPABASE_URL, '', {
    auth: { persistSession: false },
  });
  const { data: signInData, error: signInError } =
    await client.auth.signInWithPassword({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });

  if (signInError || !signInData.session?.access_token) {
    throw signInError || new Error('Failed to sign in test user');
  }

  // Return a client that uses the JWT (enforces RLS)
  return createClient<Database>(SUPABASE_URL, signInData.session.access_token);
}

/**
 * Type-safe table names
 */
export type TableName = keyof Database['public']['Tables'];

/**
 * Truncates a table using the admin client
 */
export async function truncateTable(table: TableName) {
  const admin = createAdminClient();
  const { error } = await admin.from(table).delete().neq('id', '');
  if (error) {
    console.error(`Failed to truncate ${table}:`, error);
    throw error;
  }
}

/**
 * Reset all test tables (order matters for foreign keys)
 */
export async function resetDatabase() {
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

/**
 * Seed default data for the test user
 */
export async function seedTestUserData() {
  const client = await getTestUserClient();
  await client.from('note_sections').insert({
    user_id: TEST_USER_ID,
    name: 'Default Test Section',
  });
}