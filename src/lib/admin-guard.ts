import { auth } from "@/lib/auth";

export type AdminGuard =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; error: string };

/** Verify the caller is a signed-in ADMIN. Use in admin API routes. */
export async function requireAdmin(): Promise<AdminGuard> {
  const session = await auth();
  if (!session?.user) return { ok: false, status: 401, error: "Unauthorized" };
  if (session.user.role !== "ADMIN") return { ok: false, status: 403, error: "Forbidden" };
  return { ok: true, userId: session.user.id };
}
