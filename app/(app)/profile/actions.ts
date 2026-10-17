"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { field, USERNAME_RE } from "@/lib/form";
import { isUuid } from "@/lib/form";
import { isSkillKind, MAX_SKILLS_PER_KIND, type SkillKind } from "@/lib/skills";

export type ProfileValues = {
  full_name: string;
  username: string;
  bio: string;
};

export type ProfileState = {
  error: string | null;
  saved: boolean;
  values: ProfileValues; // echoed back so the form keeps what you typed
};

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const values: ProfileValues = {
    full_name: field(formData, "full_name").trim(),
    username: field(formData, "username").trim().toLowerCase(),
    bio: field(formData, "bio").trim(),
  };
  const fail = (error: string): ProfileState => ({ error, saved: false, values });

  if (!values.full_name || values.full_name.length > 80) {
    return fail("Name must be 1–80 characters.");
  }
  if (!USERNAME_RE.test(values.username)) {
    return fail("Username must be 3–20 characters: a–z, 0–9, or underscore.");
  }
  if (values.bio.length > 300) {
    return fail("Bio can be at most 300 characters.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // .select("id") makes Postgres return the rows it changed, so we can count them.
  const { data, error } = await supabase
    .from("profiles")
    .update(values)
    .eq("id", user.id)
    .select("id");

  if (error) {
    // 23505 = unique_violation: someone already has this username
    if (error.code === "23505") return fail("That username is taken.");
    return fail("Couldn't save. Try again.");
  }

  // The silent-RLS case from Phase 2: no error, but zero rows changed.
  if (!data || data.length === 0) {
    return fail("Couldn't save your profile.");
  }

  revalidatePath("/", "layout");
  return { error: null, saved: true, values };
}

// "<uid>/<digits>.jpg" out of a full public URL. Returns null if it isn't ours.
function pathFromUrl(url: string | null | undefined, userId: string): string | null {
  if (!url) return null;
  const marker = "/avatars/";
  const i = url.indexOf(marker);
  if (i === -1) return null;
  const path = url.slice(i + marker.length);
  return path.startsWith(`${userId}/`) ? path : null;
}

export async function saveAvatar(path: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're not logged in." };

  // Never trust a path from the client: it must be inside YOUR folder.
  // (user.id is a uuid, so it's safe to put in a regex.)
  if (!new RegExp(`^${user.id}/\\d+\\.jpg$`).test(path)) {
    return { error: "Invalid file." };
  }

  const { data: before } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  // We build the URL on the server from the path. The client never supplies a URL.
  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);

  const { data, error } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id)
    .select("id");

  if (error || !data || data.length === 0) {
    await supabase.storage.from("avatars").remove([path]); // don't leave an orphan
    return { error: "Couldn't save your photo." };
  }

  // Best effort: delete the previous picture
  const oldPath = pathFromUrl(before?.avatar_url, user.id);
  if (oldPath && oldPath !== path) {
    await supabase.storage.from("avatars").remove([oldPath]);
  }

  revalidatePath("/", "layout");
  return { error: null };
}

export async function removeAvatar(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're not logged in." };

  const { data: before } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const { data, error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id)
    .select("id");

  if (error || !data || data.length === 0) {
    return { error: "Couldn't remove your photo." };
  }

  const oldPath = pathFromUrl(before?.avatar_url, user.id);
  if (oldPath) {
    await supabase.storage.from("avatars").remove([oldPath]);
  }

  revalidatePath("/", "layout");
  return { error: null };
}

// Arguments from the client are untrusted, whatever their TS types claim,
// so `kind` is typed as a plain string and validated here.
export async function setSkill(
  skillId: string,
  kind: string,
  selected: boolean
): Promise<{ error: string | null }> {
  if (!isUuid(skillId) || !isSkillKind(kind)) return { error: "Invalid skill." };
  // From here on, TS knows `kind` is "teach" | "learn"

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're not logged in." };

  if (!selected) {
    const { error } = await supabase
      .from("user_skills")
      .delete()
      .eq("user_id", user.id)
      .eq("skill_id", skillId)
      .eq("kind", kind);
    if (error) return { error: "Couldn't update your skills." };

    revalidatePath("/", "layout");
    return { error: null };
  }

  const { error } = await supabase
    .from("user_skills")
    .insert({ user_id: user.id, skill_id: skillId, kind });

  // 23505 = already selected, which is fine
  if (error && error.code !== "23505") {
    if (error.code === "23514") {
      return { error: `You can pick at most ${MAX_SKILLS_PER_KIND} skills to ${kind}.` };
    }
    if (error.code === "23503") return { error: "That skill doesn't exist." };
    return { error: "Couldn't update your skills." };
  }

  // A skill can't be both taught and learned. Insert first, then clear the other side,
  // so a failed insert never costs the user their existing choice.
  const other: SkillKind = kind === "teach" ? "learn" : "teach";
  await supabase
    .from("user_skills")
    .delete()
    .eq("user_id", user.id)
    .eq("skill_id", skillId)
    .eq("kind", other);

  revalidatePath("/", "layout");
  return { error: null };
}