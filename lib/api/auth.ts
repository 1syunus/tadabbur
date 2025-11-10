import { createServerClient } from "@/lib/api/supabase/server";
import { AuthError } from "./errors";
import { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Fetches the supabase client AND the authenticated user
 * throws authError if not authenticated
 * @returns {Promise<{ user: User, supabase: SupabaseClient<any> }>}
 */

export async function requireAuth() {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if(!user) {
        throw new AuthError("Unauthorized")
    }

    return {user, supabase}
}
