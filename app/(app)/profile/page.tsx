import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/buttons";
import { Card } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { MAX_SKILLS_PER_KIND } from "@/lib/skills";
import { createClient } from "@/lib/supabase/server";
import { AvatarUploader } from "./avatar-uploader";
import { ProfileForm } from "./profile-form";
import { SkillPicker } from "./skill-picker";

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl font-semibold">Your profile</h1>
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileEditor />
      </Suspense>
    </div>
  );
}

async function ProfileEditor() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const [skillsRes, mineRes] = await Promise.all([
    supabase.from("skills").select("id, name").order("name"),
    supabase.from("user_skills").select("skill_id, kind").eq("user_id", profile.id),
  ]);

  const skills = skillsRes.data ?? [];
  const mine = mineRes.data ?? [];
  const idsOfKind = (kind: string) =>
    mine.filter((row) => row.kind === kind).map((row) => row.skill_id);

  const displayName = profile.full_name ?? profile.username;

  return (
    <div className="grid gap-6 md:grid-cols-[18rem_1fr] md:items-start">
      <Card className="flex flex-col items-center gap-4 text-center">
        <AvatarUploader
          userId={profile.id}
          name={displayName}
          avatarUrl={profile.avatar_url}
        />
        <div>
          <p className="font-display text-xl font-semibold">{displayName}</p>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
        </div>
        <Badge tone="points">{profile.points} pts</Badge>
        <Link
          href={`/u/${profile.username}`}
          className={buttonClasses({ variant: "outline", size: "sm" })}
        >
          View public profile
        </Link>
      </Card>

      <div className="space-y-6">
        <Card className="space-y-5">
          <h2 className="text-2xl font-semibold">Details</h2>
          <ProfileForm
            initial={{
              full_name: profile.full_name ?? "",
              username: profile.username,
              bio: profile.bio,
            }}
          />
        </Card>

        <Card className="space-y-5">
          <div>
            <h2 className="text-2xl font-semibold">Skills</h2>
            <p className="text-sm text-muted-foreground">
              Tap to select, up to {MAX_SKILLS_PER_KIND} in each list. This is what
              your matches are based on.
            </p>
          </div>
          <SkillPicker
            skills={skills}
            initialTeach={idsOfKind("teach")}
            initialLearn={idsOfKind("learn")}
          />
        </Card>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-[18rem_1fr]" aria-hidden>
      <div className="h-72 animate-pulse rounded-lg bg-muted" />
      <div className="h-96 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
