import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { readCount } from "@/lib/aggregate";
import {
  callTelegram,
  DEFAULT_WELCOME,
  generateWebhookSecret,
  readSettings,
  TELEGRAM_KEYS,
  writeSetting,
} from "@/lib/telegram";

export const dynamic = "force-dynamic";

/**
 * The webhook always lives on the PUBLIC site, never on the temporary preview
 * link — so the address configured in the panel wins over the env fallback.
 */
const defaultWebhookUrl = (publicUrl = "") => {
  const base = publicUrl || process.env.NEXT_PUBLIC_APP_URL || "";
  return base ? `${base.replace(/\/+$/, "")}/api/telegram/webhook` : "";
};

/** GET — bot settings, live Bot API status and subscriber counters. */
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const settings = await readSettings();

    let bot: any = null;
    let webhook: any = null;
    if (settings.token) {
      const me = await callTelegram(settings.token, "getMe");
      bot = me.ok ? me.result : { error: me.description };
      const info = await callTelegram(settings.token, "getWebhookInfo");
      webhook = info.ok ? info.result : { error: info.description };
    }

    const [subscribers, deliveries, folders, referred] = await Promise.all([
      totalumSdk.crud.query("telegram_users", { _aggregate: { _count: true } }),
      totalumSdk.crud.query("telegram_deliveries", { _aggregate: { _count: true } }),
      totalumSdk.crud.query("prompt_folders", { _aggregate: { _count: true } }),
      totalumSdk.crud.query("telegram_users", {
        _filter: { referrals_count: { gte: 1 } },
        _aggregate: { _count: true },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        settings: {
          token: settings.token,
          username: settings.username,
          welcome: settings.welcome || DEFAULT_WELCOME,
          webhookUrl: settings.webhookUrl || defaultWebhookUrl(settings.publicUrl),
          publicUrl: settings.publicUrl,
          hasSecret: Boolean(settings.secret),
        },
        bot,
        webhook,
        stats: {
          subscribers: readCount(subscribers),
          deliveries: readCount(deliveries),
          folders: readCount(folders),
          inviters: readCount(referred),
        },
      },
    });
  } catch (err: any) {
    console.error("[api/admin/telegram] GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** PUT — save the bot token / welcome text / webhook URL. */
export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const token = typeof body.token === "string" ? body.token.trim() : undefined;

    if (typeof token === "string") {
      if (token && !/^\d{5,}:[\w-]{20,}$/.test(token)) {
        return NextResponse.json({ ok: false, error: "Формат токена неверный" }, { status: 400 });
      }
      // Validate against the Bot API before storing — a dead token is useless.
      if (token) {
        const me = await callTelegram(token, "getMe");
        if (!me.ok) {
          console.error("[api/admin/telegram] token rejected by Telegram:", me.description);
          return NextResponse.json(
            { ok: false, error: `Telegram отклонил токен: ${me.description || "unknown"}` },
            { status: 400 }
          );
        }
        await writeSetting(TELEGRAM_KEYS.username, (me.result as any)?.username || "");
      }
      await writeSetting(TELEGRAM_KEYS.token, token);
    }

    if (typeof body.welcome === "string") await writeSetting(TELEGRAM_KEYS.welcome, body.welcome.trim());
    if (typeof body.webhookUrl === "string") await writeSetting(TELEGRAM_KEYS.webhookUrl, body.webhookUrl.trim());
    if (typeof body.publicUrl === "string") {
      await writeSetting(TELEGRAM_KEYS.publicUrl, body.publicUrl.trim().replace(/\/+$/, ""));
    }

    const settings = await readSettings();
    if (!settings.secret) await writeSetting(TELEGRAM_KEYS.secret, generateWebhookSecret());

    console.log("[api/admin/telegram] settings saved by", admin._id);
    const fresh = await readSettings();
    return NextResponse.json({
      ok: true,
      data: { username: fresh.username, hasSecret: Boolean(fresh.secret), publicUrl: fresh.publicUrl },
    });
  } catch (err: any) {
    console.error("[api/admin/telegram] PUT error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** POST — connect or disconnect the Telegram webhook. */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const body = (await request.json().catch(() => ({}))) as { action?: string; url?: string };
    const settings = await readSettings();
    if (!settings.token) {
      return NextResponse.json({ ok: false, error: "Сначала сохрани токен бота" }, { status: 400 });
    }

    if (body.action === "disconnect") {
      const removed = await callTelegram(settings.token, "deleteWebhook", { drop_pending_updates: false });
      if (!removed.ok) {
        return NextResponse.json({ ok: false, error: removed.description }, { status: 400 });
      }
      console.log("[api/admin/telegram] webhook disconnected by", admin._id);
      return NextResponse.json({ ok: true, data: { connected: false } });
    }

    const url = (body.url || settings.webhookUrl || defaultWebhookUrl(settings.publicUrl)).trim();
    if (!/^https:\/\//i.test(url)) {
      return NextResponse.json(
        { ok: false, error: "Telegram принимает только HTTPS-адрес webhook" },
        { status: 400 }
      );
    }

    let secret = settings.secret;
    if (!secret) {
      secret = generateWebhookSecret();
      await writeSetting(TELEGRAM_KEYS.secret, secret);
    }

    const result = await callTelegram(settings.token, "setWebhook", {
      url,
      secret_token: secret,
      allowed_updates: ["message", "edited_message", "callback_query"],
      drop_pending_updates: true,
    });
    if (!result.ok) {
      console.error("[api/admin/telegram] setWebhook failed:", result.description);
      return NextResponse.json({ ok: false, error: result.description }, { status: 400 });
    }

    await writeSetting(TELEGRAM_KEYS.webhookUrl, url);
    console.log("[api/admin/telegram] webhook connected to", url, "by", admin._id);
    return NextResponse.json({ ok: true, data: { connected: true, url } });
  } catch (err: any) {
    console.error("[api/admin/telegram] POST error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
