import Image from "next/image";

export default function Home() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return (
    <main className="p-4">
      <div>
        <h1>Welcome to SkillSwitch</h1>
        <h2>SUPABASE URL Loaded: {url ? "yes" : "no"}</h2>
      </div>
    </main>
  );
}
