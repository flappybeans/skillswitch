import { Suspense } from "react";
import { Nav, NavFallback } from "@/components/nav";
import { UnreadBadge } from "@/components/unread-badge";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={<NavFallback />}>
        <Nav
          messagesBadge={
            <Suspense fallback={null}>
              <UnreadBadge />
            </Suspense>
          }
        />
      </Suspense>
      <main className="mx-auto max-w-5xl px-4 py-8 pb-28 md:pb-10">
        {children}
      </main>
    </>
  );
}