import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { safeNext } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";

const TYPES: readonly EmailOtpType[] = ["signup", "email"];

// A URL param is any string. This guard proves it's one of the types we accept.
function isOtpType(value: string | null): value is EmailOtpType {
  return TYPES.some((t) => t === value);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  const next = safeNext(params.get("next") ?? "");

  if (tokenHash && isOtpType(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) redirect(next); // redirect() throws, so it lives outside any try/catch
  }
  redirect("/login?error=confirm");
}