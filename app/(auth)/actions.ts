"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext, field, USERNAME_RE } from "@/lib/form";

export type AuthState = {
  error: string | null;
  notice: string | null;
};

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
    if (error.code === "email_not_confirmed") {
    return { error: "Confirm your email first. Check your inbox.", notice: null };
    }
    
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

export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = field(formData, "email").trim();
  if (!email) return { error: "Enter your email.", notice: null };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) {
    return { error: "Couldn't send the email. Try again in a few minutes.", notice: null };
  }

  // Same message whether or not the account exists, so nobody can probe for emails
  return {
    error: null,
    notice: "If an account exists for that email, a reset link is on its way.",
  };
}

export async function updatePassword(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const password = field(formData, "password");
  const confirm = field(formData, "confirm");

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters.", notice: null };
  }
  if (password !== confirm) {
    return { error: "The two passwords don't match.", notice: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "This reset link has expired. Request a new one.", notice: null };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      error:
        error.code === "same_password"
          ? "Choose a different password from your current one."
          : "Couldn't update your password. Try again.",
      notice: null,
    };
  }

  // If someone else had the old password, kick their sessions out
  await supabase.auth.signOut({ scope: "others" });
  redirect("/find-pair");
}