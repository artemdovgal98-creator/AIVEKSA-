import "server-only";
import { totalumSdk } from "@/lib/totalum";

/**
 * Every manual change made by an administrator is written to admin_audit_log.
 * The audit write happens AFTER the change succeeded; if it fails the error is
 * logged loudly (the change itself is not rolled back).
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  details?: Record<string, any> | string
) {
  try {
    const created = await totalumSdk.crud.createRecord("admin_audit_log", {
      admin: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      details: typeof details === "string" ? details : JSON.stringify(details ?? {}),
    });
    if (created.errors) console.error("[audit] failed to write audit log:", created.errors);
    else console.log(`[audit] ${action} ${targetType}:${targetId} by ${adminId}`);
  } catch (err) {
    console.error("[audit] failed to write audit log:", err);
  }
}
