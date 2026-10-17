import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { LoginForm } from "./login-form";

type SearchParams = Record<string, string | string[] | undefined>;

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Card className="space-y-5">
      <h1 className="text-3xl font-extrabold">Welcome back</h1>

      <Suspense fallback={<LoginSkeleton />}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </Card>
  );
}

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const next = typeof params.next === "string" ? params.next : "/find-pair";
  const deactivated = params.error === "deactivated";

  return (
    <>
      {deactivated && (
        <p
          role="alert"
          className="rounded-md border-[1.5px] border-line bg-danger/10 px-3 py-2 text-sm font-semibold text-danger"
        >
          This account has been deactivated.
        </p>
      )}
      <LoginForm next={next} />
    </>
  );
}

function LoginSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="h-16 animate-pulse rounded-md bg-muted" />
      <div className="h-16 animate-pulse rounded-md bg-muted" />
      <div className="h-12 animate-pulse rounded-md bg-muted" />
    </div>
  );
}