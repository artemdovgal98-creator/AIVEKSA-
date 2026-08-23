import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { totalumSdk } from "@/lib/totalum";
import { readCount } from "@/lib/aggregate";

export interface DbUser {
  _id: string;
  email?: string;
  name?: string;
  role?: string;
  language?: string;
  createdAt?: string;
}

/** Better Auth session user (uses `id`, never `_id`). */
export async function getSessionUser() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user || null;
  } catch (err) {
    console.error("[auth] getSession failed:", err);
    return null;
  }
}

async function countAdmins(): Promise<number> {
  const result = await totalumSdk.crud.query("user", {
    _filter: { role: "admin" },
    _aggregate: { _count: true },
  });
  return readCount(result);
}

/**
 * Bootstrap rule: while the database has no administrator at all, the very first
 * registered account (the site owner) is promoted to admin automatically.
 * Once an admin exists this never promotes anyone again.
 */
async function ensureAdminBootstrap(userId: string): Promise<boolean> {
  try {
    if ((await countAdmins()) > 0) return false;
    const firstUsers = await totalumSdk.crud.query("user", {
      _sort: { createdAt: "asc" },
      _limit: 1,
    });
    const first = (firstUsers.data || [])[0];
    if (!first || first._id !== userId) return false;
    await totalumSdk.crud.editRecordById("user", userId, { role: "admin" });
    console.log("[auth] bootstrapped first user as admin:", userId);
    return true;
  } catch (err) {
    console.error("[auth] admin bootstrap failed:", err);
    return false;
  }
}

/** Authoritative user record straight from the database (role is never trusted from the cookie). */
export async function getCurrentDbUser(): Promise<DbUser | null> {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.id) return null;
  try {
    const result = await totalumSdk.crud.getRecordById("user", sessionUser.id);
    const user = result.data as DbUser | null;
    if (!user) return null;
    if (user.role !== "admin") {
      const promoted = await ensureAdminBootstrap(user._id);
      if (promoted) return { ...user, role: "admin" };
    }
    return user;
  } catch (err) {
    console.error("[auth] getCurrentDbUser failed:", err);
    return null;
  }
}

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentDbUser();
  return user?.role === "admin";
}

/** Throws-free guard for API routes: returns the admin user or null. */
export async function requireAdmin(): Promise<DbUser | null> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "admin") {
    console.warn("[auth] admin access denied for user:", user?._id || "anonymous");
    return null;
  }
  return user;
}
