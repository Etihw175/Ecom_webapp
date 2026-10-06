"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

/** Signs out and returns to the home page. */
export function LogoutButton({ className, label = "ออกจากระบบ" }: { className?: string; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className={cn("inline-flex items-center gap-2", className)}
    >
      <LogOut className="size-4" />
      {label}
    </button>
  );
}
