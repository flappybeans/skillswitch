"use client";

import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
import { usePathname } from "next/navigation";
import {
  Users,
  MessageCircle,
  CalendarDays,
  Trophy,
  User,
  Repeat,
  type LucideIcon,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/buttons";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const items: NavItem[] = [
  { href: "/find-pair", label: "Find Pair", icon: Users },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/sessions", label: "Sessions", icon: CalendarDays },
  { href: "/leaderboard", label: "Ranks", icon: Trophy },
  { href: "/profile", label: "Profile", icon: User },
];

interface NavShellProps {
  pathname: string | null; // null = "don't know yet", so nothing is highlighted
  messagesBadge?: React.ReactNode;
}

function NavShell({ pathname, messagesBadge }: NavShellProps) {
  const isActive = (href: string): boolean =>
    pathname !== null && (pathname === href || pathname.startsWith(href + "/"));

  return (
    <>
      {/* Top bar: logo always, links on desktop only */}
      <header className="sticky top-0 z-40 border-b border-line bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link
            href="/design"
            className="flex items-center gap-2.5 font-display text-lg font-medium tracking-tight"
          >
            <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <Repeat className="size-4" />
            </span>
            SkillSwitch
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                  {item.href === "/messages" && messagesBadge}
                </Link>
              );
            })}
          </nav>

          <form action={logout}>
            <Button variant="ghost" size="sm" type="submit">
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </form>
        </div>
      </header>

      {/* Bottom tab bar: mobile only */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                isActive(item.href) ? "text-primary-ink" : "text-muted-foreground"
              )}
            >
              <span className="relative">
                <Icon className="size-5" />
                {item.href === "/messages" && (
                  <span className="absolute -right-3 -top-2">{messagesBadge}</span>
                )}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

// The real nav. Reads the URL, so it must live inside a <Suspense>.
export function Nav({ messagesBadge }: { messagesBadge?: React.ReactNode }) {
  const pathname = usePathname();
  return <NavShell pathname={pathname} messagesBadge={messagesBadge} />;
}

// What shows while the real nav streams in: same layout, no highlight, no badge
export function NavFallback() {
  return <NavShell pathname={null} />;
}