import Link from "next/link";
import { buttonClasses } from "@/components/ui/buttons";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-8 px-4">
      <h1 className="text-6xl font-extrabold leading-[1.05]">
        Skill <span className="text-primary">Switch</span>
      </h1>
      <p className="text-lg text-muted-foreground">
        Trade skills with other students. You teach what you know, and they
        teach what you want to learn.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/signup" className={buttonClasses({ size: "lg" })}>
          Get started
        </Link>
        <Link href="/login" className={buttonClasses({ variant: "outline", size: "lg" })}>
          Log in
        </Link>
      </div>
    </main>
  );
}