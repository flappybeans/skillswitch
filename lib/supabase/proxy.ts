import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

const AUTH_PAGES = ["/login", "/signup"];
const PUBLIC_PAGES = ["/", ...AUTH_PAGES];

function redirectWithCookies(
  request: NextRequest,
  source: NextResponse,
  pathname: string,
  search = ""
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = search;

  const redirect = NextResponse.redirect(url);
  // Carry over any refreshed/cleared session cookies
  source.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() asks Supabase's auth server to verify the token.
  // Never use getSession() for access decisions on the server: it only reads the cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // ----- Logged in -----
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_active, role")
      .eq("id", user.id)
      .maybeSingle();

    // Deactivated (or missing profile): kill the session
    if (!profile?.is_active) {
      await supabase.auth.signOut();
      return redirectWithCookies(request, response, "/login", "?error=deactivated");
    }

    // Admin area
    if ((path === "/admin" || path.startsWith("/admin/")) && profile.role !== "admin") {
      return redirectWithCookies(request, response, "/find-pair");
    }

    // Already logged in? Skip the landing and auth pages
    if (PUBLIC_PAGES.includes(path)) {
      return redirectWithCookies(request, response, "/find-pair");
    }

    return response;
  }

  // ----- Logged out -----
  if (PUBLIC_PAGES.includes(path)) return response;

  const next = new URLSearchParams({ next: path + request.nextUrl.search });
  return redirectWithCookies(request, response, "/login", `?${next.toString()}`);
}