import "server-only"; // the build FAILS if a client component ever imports this file
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { SUPABASE_URL } from "./env";

// Same narrowing trick as `required()` in env.ts: after the throw, TS knows `key` is a string.
function serviceKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Missing environment variable: SUPABASE_SERVICE_ROLE_KEY");
  return key;
}

// This client BYPASSES every security rule. Use it only after you've verified the caller is an admin,
// and only for things the normal client can't do (like banning a login).
export function createAdminClient() {
  return createClient<Database>(SUPABASE_URL, serviceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}