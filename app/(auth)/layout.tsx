import Link from "next/link";
import { Repeat } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <Link
        href="/"
        className="flex items-center gap-2.5 self-center font-display text-xl font-medium tracking-tight"
      >
        <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
          <Repeat className="size-5" />
        </span>
        SkillSwitch
      </Link>
      {children}
    </main>
  );
}
