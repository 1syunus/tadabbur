import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'
import dotenv from 'dotenv'

if (process.env.NODE_ENV === 'test') {
  dotenv.config({path: '.env.test'})
} else {
  dotenv.config()
}

export async function createServerClient() {
  // safety check
  if (
    process.env.NODE_ENV !== 'test' &&
    process.env.SUPERBASE_URL?.includes('zbgztqrkffyjdaklbxly')
  ) {
    throw new Error(
      '[Safety Check] Attempting to connect to TEST database in non-test environment!'
    )
  }
  
  // validate env variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Missing required Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)')
  }

  const cookieStore = await cookies()

  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[Supabase Server Client] Cannot set cookies in read-only context:', error)
            }
          }
        },
      },
    }
  )
}