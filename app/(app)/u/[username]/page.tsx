import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/buttons";
import { Card } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { connection } from "next/server";

type Params = Promise<{ username: string }>;

export default function PublicProfilePage({ params }: { params: Params }) {
  return (
    <div className="space-y-6">
      <Link
        href="/find-pair"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back
      </Link>

      <Suspense fallback={<div className="h-56 animate-pulse rounded-lg bg-muted" aria-hidden />}>
        <PublicProfile params={params} />
      </Suspense>
    </div>
  );
}

async function PublicProfile({ params }: { params: Params }) {
  await connection();

  const { username } = await params;
  const supabase = await createClient();

  // Two independent lookups: run them at the same time
  const [{ data: profile }, me] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, full_name, bio, avatar_url, points, created_at")
      .eq("username", username.toLowerCase())
      .eq("is_active", true) // deactivated users vanish from public view
      .maybeSingle(),
    getCurrentProfile(),
  ]);

  if (!profile) notFound();

  const displayName = profile.full_name ?? profile.username;
  const isMe = me?.id === profile.id;
  const joined = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <Card className="flex flex-col gap-6 sm:flex-row sm:items-start">
      <Avatar name={displayName} src={profile.avatar_url} size={112} />

      <div className="flex-1 space-y-3">
        <div>
          <h1 className="text-3xl font-semibold">{displayName}</h1>
          <p className="text-muted-foreground">@{profile.username}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="points">{profile.points} pts</Badge>
          <span className="text-sm text-muted-foreground">Joined {joined}</span>
        </div>

        <p className={profile.bio ? "" : "text-muted-foreground"}>
          {profile.bio || "No bio yet."}
        </p>

        {isMe && (
          <Link href="/profile" className={buttonClasses({ variant: "outline", size: "sm" })}>
            Edit profile
          </Link>
        )}
      </div>
    </Card>
  );
}
