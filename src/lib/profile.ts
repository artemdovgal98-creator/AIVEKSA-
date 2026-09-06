import "server-only";
import { totalumSdk } from "@/lib/totalum";
import type { UserProfileRecord } from "@/lib/types";

/**
 * Public contact block shown on the home page.
 *
 * It is the profile of the site owner (an admin) who switched
 * "show contacts" on — nothing is published until they do.
 */
export async function getOwnerProfile(): Promise<UserProfileRecord | null> {
  try {
    const result = await totalumSdk.crud.query("user", {
      _filter: { role: "admin", show_contacts: "yes" },
      _sort: { createdAt: "asc" },
      _limit: 1,
    });
    if (result.errors) console.error("[profile] getOwnerProfile errors:", result.errors);
    return ((result.data || []) as unknown as UserProfileRecord[])[0] || null;
  } catch (err) {
    console.error("[profile] getOwnerProfile failed:", err);
    // The home page must never break because of an optional contact block.
    return null;
  }
}

export async function getUserProfile(userId: string): Promise<UserProfileRecord | null> {
  const result = await totalumSdk.crud.query("user", { _filter: { _id: userId }, _limit: 1 });
  if (result.errors) {
    console.error("[profile] getUserProfile errors:", result.errors);
    throw new Error(JSON.stringify(result.errors));
  }
  return ((result.data || []) as unknown as UserProfileRecord[])[0] || null;
}
