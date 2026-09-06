import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import {
  botLink,
  generateReferralCode,
  getActiveFolders,
  folderThreshold,
  isFolderUnlocked,
  readSettings,
} from "@/lib/telegram";
import type { TelegramUserRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * The signed-in visitor's personal referral link plus their progress.
 *
 * The code is minted lazily on first visit, so every account gets one without
 * a migration.
 */
export async function GET() {
  try {
    const user = await getCurrentDbUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    let code = (user as any).referral_code as string | undefined;
    if (!code) {
      code = generateReferralCode();
      const updated = await totalumSdk.crud.editRecordById("user", user._id, { referral_code: code });
      if (updated.errors) {
        console.error("[api/referral] could not mint referral code:", updated.errors);
        return NextResponse.json({ ok: false, error: updated.errors }, { status: 400 });
      }
      console.log("[api/referral] minted referral code for", user._id);
    }

    const settings = await readSettings();

    // The linked Telegram subscriber, when the visitor connected their account.
    const linked = await totalumSdk.crud.query("telegram_users", {
      _filter: { user: user._id },
      _limit: 1,
    });
    const subscriber = ((linked.data || []) as unknown as TelegramUserRecord[])[0] || null;

    const siteReferrals = Number((user as any).referrals_count || 0);
    const botReferrals = Number(subscriber?.referrals_count || 0);
    const referrals = Math.max(siteReferrals, botReferrals);

    const folders = await getActiveFolders();
    const materials = folders.map((folder) => ({
      _id: folder._id,
      title: folder.title,
      icon: folder.icon || "📁",
      description: folder.description || "",
      contentType: folder.content_type || "prompts",
      required: folderThreshold(folder),
      unlocked: isFolderUnlocked(folder, referrals),
    }));

    return NextResponse.json({
      ok: true,
      data: {
        code,
        botUsername: settings.username,
        botConfigured: Boolean(settings.token && settings.username),
        referralLink: botLink(settings.username, code),
        connectLink: botLink(settings.username, `link${code}`),
        telegramConnected: Boolean(subscriber),
        referrals,
        unlocked: materials.filter((material) => material.unlocked).length,
        materials,
      },
    });
  } catch (err: any) {
    console.error("[api/referral] GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
