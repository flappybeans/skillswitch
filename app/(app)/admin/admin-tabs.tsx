"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const tabs = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/flags", label: "Flags" },
];

export function AdminTabs() {
  const pathname = usePathname();

  // "/admin" would match every admin page, so it only counts on an exact match
  const isActive = (href: string): boolean =>
    href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <nav aria-label="Admin sections" className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={isActive(tab.href) ? "page" : undefined}
          className={cn(
            "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            isActive(tab.href)
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}