import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import type { Profile } from "@/lib/types";

// For pages: send people away if they aren't an active admin
export async function requireAdmin(): Promise<Profile> {
  const me = await getCurrentProfile();
  if (!me) redirect("/login");
  if (me.role !== "admin" || !me.is_active) redirect("/find-pair");
  return me; // redirect() returns `never`, so TS knows `me` is a Profile here
}

// For server actions: return null instead of redirecting, so the action can answer with an error
export async function getAdmin(): Promise<Profile | null> {
  const me = await getCurrentProfile();
  return me && me.role === "admin" && me.is_active ? me : null;
}