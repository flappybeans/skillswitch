import { Suspense } from "react";
import { AdminTabs } from "./admin-tabs";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-4xl font-semibold">Admin</h1>
        <p className="text-muted-foreground">Manage users, review flags, and correct points.</p>
      </div>
      {/* The tabs read the URL, so they live inside Suspense (the Nav lesson) */}
      <Suspense fallback={<div className="h-10 border-b border-line" aria-hidden />}>
        <AdminTabs />
      </Suspense>
      {children}
    </div>
  );
}