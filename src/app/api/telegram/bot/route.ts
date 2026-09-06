import { NextResponse } from "next/server";
import { botLink, readSettings } from "@/lib/telegram";

export const dynamic = "force-dynamic";

/**
 * Public bot handle used by the "Open in Telegram" buttons in the interface.
 * No secrets are exposed — only the public @username and its t.me link.
 */
export async function GET() {
  try {
    const settings = await readSettings();
    const configured = Boolean(settings.token && settings.username);
    return NextResponse.json({
      ok: true,
      data: {
        configured,
        username: settings.username || "",
        url: botLink(settings.username),
      },
    });
  } catch (err: any) {
    console.error("[api/telegram/bot] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
