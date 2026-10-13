import { Card } from "@/components/ui/card";
import { LoginForm } from "./login-form";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  // A URL param can be missing, a string, or an array (?next=a&next=b)
  const next = typeof params.next === "string" ? params.next : "/find-pair";
  const deactivated = params.error === "deactivated";

  return (
    <Card className="space-y-5">
      <h1 className="text-3xl font-extrabold">Welcome back</h1>

      {deactivated && (
        <p
          role="alert"
          className="rounded-md border-[1.5px] border-line bg-danger/10 px-3 py-2 text-sm font-semibold text-danger"
        >
          This account has been deactivated.
        </p>
      )}

      <LoginForm next={next} />
    </Card>
  );
}