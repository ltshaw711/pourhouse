import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service-role client — bypasses Row-Level Security entirely. Only for
 * operations a user's own session genuinely cannot perform, like deleting
 * their own auth.users row. NEVER import this from a "use client" file or
 * pass its result to one; only call it from Server Actions / Route
 * Handlers. It intentionally throws rather than silently no-op'ing when
 * the key hasn't been configured yet.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local from your Supabase project's Settings → API page to enable this feature."
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
