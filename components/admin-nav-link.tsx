import Link from "next/link";
import { Shield } from "lucide-react";
import { buttonClasses } from "@/components/ui/buttons";
import { getCurrentProfile } from "@/lib/auth";

export async function AdminNavLink() {
  const me = await getCurrentProfile();
  if (me?.role !== "admin") return null; // handles both "not logged in" and "not an admin"

  return (
    <Link href="/admin" className={buttonClasses({ variant: "ghost", size: "sm" })}>
      <Shield className="size-4" />
      <span className="hidden sm:inline">Admin</span>
    </Link>
  );
}