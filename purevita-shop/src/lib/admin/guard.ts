import { getCurrentUser } from "@/lib/auth";

/**
 * Admin check for route handlers (which should answer 401/403 JSON instead of redirecting).
 * Pages / layouts / server actions use `requireAdmin()` from `@/lib/auth`.
 */
export async function getAdminOrNull() {
  const user = await getCurrentUser();
  if (!user?.id || user.role !== "ADMIN") return null;
  return user;
}
