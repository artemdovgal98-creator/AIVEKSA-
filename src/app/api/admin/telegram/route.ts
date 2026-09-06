import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { readCount } from "@/lib/aggregate";
import {
  BOT_COMMANDS,
  callTelegram,
  configureBot,
  DEFAULT_WELCOME,
  generateWebhookSecret,
  miniAppUrl,
  normalizeBase,
  readSettings,
  resolveWebhookBase,
  TELEGRAM_KEYS,
  webhookEndpoint,
  writeSetting,
} from "@/lib/telegram";

export const dynamic = "force-dynamic";

/**
 * The webhook always lives on the PUBLIC site, never on the temporary preview
 * link — so the address configured in the panel wins over the env fallback.
 */
const defaultWebhookUrl = (publicUrl = "") =>
  webhookEndpoint(publicUrl || process.env.NEXT_PUBLIC_APP_URL || "");

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
          miniAppUrl: miniAppUrl(settings),
          commands: BOT_COMMANDS,
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

    /*
     * Candidate deployments, best first: an explicit address, the published
     * domain, the env fallback, and finally the origin this request arrived on
     * (the Totalum preview while the published build is still catching up).
     * Only an address that actually answers the webhook probe gets registered —
     * registering a 404 is exactly what made the bot look dead.
     */
    const explicit = normalizeBase(String(body.url || "").replace(/\/api\/telegram\/webhook\/?$/, ""));
    const requestOrigin = (() => {
      try {
        return new URL(request.url).origin;
      } catch {
        return "";
      }
    })();
    const candidates = [
      explicit,
      settings.publicUrl,
      process.env.NEXT_PUBLIC_APP_URL || "",
      requestOrigin,
    ].filter((value) => /^https:\/\//i.test(normalizeBase(value)));

    if (candidates.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Укажи публичный HTTPS-адрес сайта — Telegram принимает только HTTPS" },
        { status: 400 }
      );
    }

    const { base, reachable } = await resolveWebhookBase(candidates);
    if (!reachable) {
      console.error("[api/admin/telegram] no candidate answered the webhook probe:", candidates);
      return NextResponse.json(
        {
          ok: false,
          error:
            "Ни один адрес не отвечает на /api/telegram/webhook. " +
            "Опубликуй сайт кнопкой Publish и повтори подключение.",
        },
        { status: 400 }
      );
    }

    const configured = await configureBot(settings, base);
    if (!configured.webhook.ok) {
      console.error("[api/admin/telegram] setWebhook failed:", configured.webhook.description);
      return NextResponse.json({ ok: false, error: configured.webhook.description }, { status: 400 });
    }
    const url = configured.url;

    console.log("[api/admin/telegram] webhook connected to", url, "by", admin._id);
    return NextResponse.json({
      ok: true,
      data: {
        connected: true,
        url,
        commands: configured.commands.ok,
        menuButton: configured.menu.ok,
        miniAppUrl: miniAppUrl(settings),
      },
    });
  } catch (err: any) {
    console.error("[api/admin/telegram] POST error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
