import { Suspense } from "react";
import { Nav } from "@/components/nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense
        fallback={<div className="h-16 border-b border-line" aria-hidden />}
      >
        <Nav />
      </Suspense>
      <main className="mx-auto max-w-5xl px-4 py-8 pb-28 md:pb-10">
        {children}
      </main>
    </>
  );
}