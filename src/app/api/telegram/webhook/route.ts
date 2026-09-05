import { NextResponse } from "next/server";
import { readSettings } from "@/lib/telegram";
import { handleUpdate } from "@/lib/telegram-bot";

export const dynamic = "force-dynamic";

/**
 * Telegram webhook.
 *
 * Telegram retries any non-200 answer, so this always replies 200 — a failed
 * update is logged loudly instead of being redelivered forever.
 */
export async function POST(request: Request) {
  try {
    const settings = await readSettings();
    if (!settings.token) {
      console.error("[telegram/webhook] no bot token configured");
      return NextResponse.json({ ok: true });
    }

    // Telegram echoes the secret we registered with setWebhook — anything else
    // is not Telegram and is dropped.
    if (settings.secret) {
      const header = request.headers.get("x-telegram-bot-api-secret-token");
      if (header !== settings.secret) {
        console.warn("[telegram/webhook] rejected update with a wrong secret token");
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
    }

    const update = (await request.json().catch(() => null)) as any;
    if (!update) {
      console.warn("[telegram/webhook] empty update body");
      return NextResponse.json({ ok: true });
    }

    console.log("[telegram/webhook] update", update.update_id, Object.keys(update).join(","));
    await handleUpdate(settings, update);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[telegram/webhook] handler error:", err);
    return NextResponse.json({ ok: true });
  }
}

/** Health probe so the owner can confirm the endpoint is reachable. */
export async function GET() {
  const settings = await readSettings();
  return NextResponse.json({
    ok: true,
    data: { configured: Boolean(settings.token), username: settings.username },
  });
}
