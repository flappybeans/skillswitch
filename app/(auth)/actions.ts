"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { field, USERNAME_RE } from "@/lib/form";

export type AuthState = {
  error: string | null;
  notice: string | null;
};

// Only allow redirects to paths inside our own site (blocks open-redirect attacks)
function safeNext(value: string): string {
  const isInternal =
    value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\");
  return isInternal ? value : "/find-pair";
}

export async function login(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = field(formData, "email").trim();
  const password = field(formData, "password");

  if (!email || !password) {
    return { error: "Enter your email and password.", notice: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.code === "user_banned") {
      return { error: "This account has been deactivated.", notice: null };
    }
    return { error: "Wrong email or password.", notice: null };
  }

  redirect(safeNext(field(formData, "next")));
}

export async function signup(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const fullName = field(formData, "full_name").trim();
  const username = field(formData, "username").trim().toLowerCase();
  const email = field(formData, "email").trim();
  const password = field(formData, "password");

  if (!fullName || fullName.length > 80) {
    return { error: "Enter your name (max 80 characters).", notice: null };
  }
  if (!USERNAME_RE.test(username)) {
    return {
      error: "Username must be 3–20 characters: a–z, 0–9, or underscore.",
      notice: null,
    };
  }
  if (!email) {
    return { error: "Enter your email.", notice: null };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters.", notice: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // This metadata is what your handle_new_user() trigger reads
    options: { data: { username, full_name: fullName } },
  });

  if (error) {
    return { error: error.message, notice: null };
  }

  // Email confirmation ON → no session yet
  if (!data.session) {
    return { error: null, notice: "Check your email to confirm your account." };
  }

  redirect("/find-pair");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}