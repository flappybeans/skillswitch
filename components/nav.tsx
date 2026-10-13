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

export function Nav() {
  const pathname = usePathname();

  const isActive = (href: string): boolean =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Top bar: logo always, links on desktop only */}
      <header className="sticky top-0 z-40 border-b-[1.5px] border-line bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link
            href="/design"
            className="flex items-center gap-2 font-display text-xl font-extrabold"
          >
            <span className="grid size-9 place-items-center rounded-md border-[1.5px] border-line bg-primary text-primary-foreground shadow-brutal-sm">
              <Repeat className="size-5" />
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
                    "flex items-center gap-2 rounded-md border-[1.5px] border-transparent px-3 py-2 text-sm font-semibold hover:bg-muted",
                    isActive(item.href) && "border-line bg-accent text-accent-foreground"
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
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
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t-[1.5px] border-line bg-card md:hidden">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold",
                isActive(item.href)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}