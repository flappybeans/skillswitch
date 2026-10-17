import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/auth";

export default function FindPairPage() {
  return (
    <div className="space-y-2">
      <h1 className="font-display text-4xl font-extrabold">Find Pair</h1>

      <Suspense
        fallback={<div className="h-6 w-72 animate-pulse rounded bg-muted" />}
      >
        <WhoAmI />
      </Suspense>
    </div>
  );
}

async function WhoAmI() {
  const profile = await getCurrentProfile();

  return (
    <p className="text-muted-foreground">
      Logged in as <strong>@{profile?.username}</strong> · role: {profile?.role}{" "}
      · points: {profile?.points}
    </p>
  );
}