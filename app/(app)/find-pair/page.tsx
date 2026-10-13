import { getCurrentProfile } from "@/lib/auth";

export default async function FindPairPage() {
  const profile = await getCurrentProfile();

  return (
    <div className="space-y-2">
      <h1 className="font-display text-4xl font-extrabold">Find Pair</h1>
      <p className="text-muted-foreground">
        Logged in as <strong>@{profile?.username}</strong> · role:{" "}
        {profile?.role} · points: {profile?.points}
      </p>
    </div>
  );
}