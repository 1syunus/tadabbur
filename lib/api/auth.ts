import { createServerClient } from "@/lib/api/supabase/server";
import { AuthError } from "./errors";
import { getTestUserClient } from "../helpers/db";

/**
 * Fetches the supabase client AND the authenticated user
 * throws authError if not authenticated
 * @returns {Promise<{ user: User, supabase: SupabaseClient<any> }>}
 */

export async function requireAuth() {
    if (process.env.NODE_ENV === 'test') {
      const supabase = await getTestUserClient()
      const {
        data: { user }, error,
      } = await supabase.auth.getUser()

      if(error || !user) {
          throw new AuthError("Unauthorized")
      }
      return {user, supabase}
    }

    const supabase = await createServerClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new AuthError('Unauthorized')
    }
    return { user, supabase }
  } catch (err) {
    throw err;
  }
}


