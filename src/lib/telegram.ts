import "server-only";
import { totalumSdk } from "@/lib/totalum";
import type {
  PromptFolderRecord,
  TelegramBotSettings,
  TelegramUserRecord,
} from "@/lib/types";

/**
 * Telegram bot core: settings storage, Bot API client, subscriber management,
 * referral attribution and material delivery.
 *
 * The bot token lives in the `admin_settings` key/value table so the owner can
 * rebind it from the admin panel at any time. `TELEGRAM_BOT_TOKEN` is used only
 * as a fallback when nothing is stored yet.
 */

export const TELEGRAM_KEYS = {
  token: "telegram_bot_token",
  username: "telegram_bot_username",
  secret: "telegram_webhook_secret",
  welcome: "telegram_welcome_message",
  webhookUrl: "telegram_webhook_url",
  publicUrl: "site_public_url",
} as const;

const SETTING_DESCRIPTIONS: Record<string, string> = {
  [TELEGRAM_KEYS.token]: "Токен Telegram-бота (BotFather)",
  [TELEGRAM_KEYS.username]: "@username бота — заполняется автоматически",
  [TELEGRAM_KEYS.secret]: "Секрет заголовка webhook (генерируется автоматически)",
  [TELEGRAM_KEYS.welcome]: "Приветственное сообщение бота",
  [TELEGRAM_KEYS.webhookUrl]: "URL, на который Telegram шлёт обновления",
  [TELEGRAM_KEYS.publicUrl]: "Публичный адрес сайта (используется ботом и webhook)",
};

export const DEFAULT_WELCOME =
  "👋 Привет! Это бот AIVEXA.\n\n" +
  "Здесь ты бесплатно получаешь папки промптов, гайды и инструкции по нейросетям.\n\n" +
  "Часть материалов открывается сразу, часть — за приглашённых друзей. " +
  "Жми «Мои материалы», чтобы забрать всё, что уже доступно.";

/* -------------------------------------------------------------------------- */
/*                                  settings                                  */
/* -------------------------------------------------------------------------- */

export async function readSettings(): Promise<TelegramBotSettings> {
  try {
    const result = await totalumSdk.crud.query("admin_settings", {
      _filter: { setting_key: { in: Object.values(TELEGRAM_KEYS) } },
      _limit: 20,
    });
    if (result.errors) console.error("[telegram] readSettings errors:", result.errors);

    const map = new Map<string, string>();
    for (const row of (result.data || []) as any[]) {
      map.set(row.setting_key, String(row.setting_value ?? ""));
    }

    return {
      token: map.get(TELEGRAM_KEYS.token) || process.env.TELEGRAM_BOT_TOKEN || "",
      username: map.get(TELEGRAM_KEYS.username) || "",
      secret: map.get(TELEGRAM_KEYS.secret) || "",
      welcome: map.get(TELEGRAM_KEYS.welcome) || DEFAULT_WELCOME,
      webhookUrl: map.get(TELEGRAM_KEYS.webhookUrl) || "",
      publicUrl: map.get(TELEGRAM_KEYS.publicUrl) || "",
    };
  } catch (err) {
    console.error("[telegram] readSettings failed:", err);
    throw err;
  }
}

/** Upserts one setting row — creates the key the first time it is used. */
export async function writeSetting(key: string, value: string): Promise<void> {
  try {
    const existing = await totalumSdk.crud.query("admin_settings", {
      _filter: { setting_key: key },
      _limit: 1,
    });
    const row = (existing.data || [])[0] as any;
    if (row) {
      const updated = await totalumSdk.crud.editRecordById("admin_settings", row._id, {
        setting_value: value,
      });
      if (updated.errors) throw new Error(JSON.stringify(updated.errors));
      return;
    }
    const created = await totalumSdk.crud.createRecord("admin_settings", {
      setting_key: key,
      setting_value: value,
      description: SETTING_DESCRIPTIONS[key] || "",
    });
    if (created.errors) throw new Error(JSON.stringify(created.errors));
  } catch (err) {
    console.error("[telegram] writeSetting failed for", key, err);
    throw err;
  }
}

/* -------------------------------------------------------------------------- */
/*                                 Bot API                                    */
/* -------------------------------------------------------------------------- */

export interface TelegramApiResult<T = any> {
  ok: boolean;
  result?: T;
  description?: string;
}

/** Thin Bot API wrapper. Never throws on an API-level error — it reports it. */
export async function callTelegram<T = any>(
  token: string,
  method: string,
  payload: Record<string, any> = {}
): Promise<TelegramApiResult<T>> {
  if (!token) return { ok: false, description: "Bot token is not configured" };
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await response.json()) as TelegramApiResult<T>;
    if (!json.ok) console.error(`[telegram] ${method} failed:`, json.description);
    return json;
  } catch (err: any) {
    console.error(`[telegram] ${method} request error:`, err);
    return { ok: false, description: err?.message || "Network error" };
  }
}

/** Telegram rejects any message over 4096 characters — long texts are split. */
const MAX_MESSAGE = 3900;

function splitMessage(text: string): string[] {
  if (text.length <= MAX_MESSAGE) return [text];
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > MAX_MESSAGE) {
    const cut = rest.lastIndexOf("\n", MAX_MESSAGE);
    const at = cut > MAX_MESSAGE * 0.5 ? cut : MAX_MESSAGE;
    chunks.push(rest.slice(0, at));
    rest = rest.slice(at);
  }
  if (rest.trim()) chunks.push(rest);
  return chunks;
}

/**
 * Sends a message, splitting anything too long and retrying once as plain text.
 *
 * A stray `<` in admin-authored content makes Telegram answer
 * "can't parse entities" and the visitor sees nothing — the retry guarantees the
 * message always arrives, even if the markup was broken.
 */
export async function sendMessage(
  token: string,
  chatId: string | number,
  text: string,
  extra: Record<string, any> = {}
): Promise<TelegramApiResult> {
  const chunks = splitMessage(text);
  let last: TelegramApiResult = { ok: false, description: "empty message" };

  for (let index = 0; index < chunks.length; index += 1) {
    const payload: Record<string, any> = {
      chat_id: chatId,
      text: chunks[index],
      parse_mode: "HTML",
      disable_web_page_preview: true,
      // The keyboard belongs on the last bubble only.
      ...(index === chunks.length - 1 ? extra : {}),
    };
    last = await callTelegram(token, "sendMessage", payload);

    if (!last.ok && /parse|entit/i.test(last.description || "")) {
      console.error("[telegram] retrying message as plain text:", last.description);
      last = await callTelegram(token, "sendMessage", { ...payload, parse_mode: undefined });
    }
    if (!last.ok) console.error(`[telegram] message not delivered to ${chatId}:`, last.description);
  }
  return last;
}

export const answerCallback = (token: string, callbackId: string, text = "") =>
  callTelegram(token, "answerCallbackQuery", { callback_query_id: callbackId, text });

/* -------------------------------------------------------------------------- */
/*                              referral codes                                */
/* -------------------------------------------------------------------------- */

const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

export function generateReferralCode(): string {
  let code = "";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  for (const byte of bytes) code += ALPHABET[byte % ALPHABET.length];
  return code;
}

/** Random URL-safe secret for the Telegram webhook header. */
export function generateWebhookSecret(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/* -------------------------------------------------------------------------- */
/*                          webhook / Mini App plumbing                        */
/* -------------------------------------------------------------------------- */

export const WEBHOOK_PATH = "/api/telegram/webhook";

export const normalizeBase = (value: string) => (value || "").trim().replace(/\/+$/, "");

export const webhookEndpoint = (base: string) => {
  const clean = normalizeBase(base);
  return clean ? `${clean}${WEBHOOK_PATH}` : "";
};

/**
 * Checks that a deployment really answers on the webhook path.
 *
 * This is the whole reason the bot used to look "broken": Telegram happily
 * accepts a `setWebhook` on any HTTPS address, then silently retries against a
 * 404 forever. We only register an address that answered our health probe.
 */
export async function probeWebhookEndpoint(base: string): Promise<boolean> {
  const url = webhookEndpoint(base);
  if (!/^https:\/\//i.test(url)) return false;
  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: { "user-agent": "aivexa-webhook-probe" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.warn(`[telegram] probe ${url} → HTTP ${response.status}`);
      return false;
    }
    const json = (await response.json().catch(() => null)) as { ok?: boolean } | null;
    const alive = json?.ok === true;
    if (!alive) console.warn(`[telegram] probe ${url} → unexpected body`);
    return alive;
  } catch (err: any) {
    console.warn(`[telegram] probe ${url} failed:`, err?.message || err);
    return false;
  }
}

/**
 * Picks the first candidate that is actually serving the webhook route.
 * Candidates are given in priority order (public domain first, current origin
 * last) and the preferred one is returned even if nothing answered, so the
 * caller can still report a meaningful error.
 */
export async function resolveWebhookBase(candidates: string[]): Promise<{ base: string; reachable: boolean }> {
  const unique = Array.from(new Set(candidates.map(normalizeBase).filter(Boolean)));
  for (const base of unique) {
    if (await probeWebhookEndpoint(base)) {
      console.log("[telegram] webhook target resolved to", base);
      return { base, reachable: true };
    }
  }
  return { base: unique[0] || "", reachable: false };
}

/** Address the bot links to — the public site, never the temporary preview. */
export function siteBase(settings: TelegramBotSettings): string {
  return normalizeBase(settings.publicUrl || process.env.NEXT_PUBLIC_APP_URL || "");
}

/**
 * Mini App URL. `?tgmini=1` lets the frontend know it is running inside the
 * Telegram client so it can expand the viewport and hide the site chrome.
 */
export function miniAppUrl(settings: TelegramBotSettings, path = "/"): string {
  const base = siteBase(settings);
  if (!/^https:\/\//i.test(base)) return "";
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}${suffix.includes("?") ? "&" : "?"}tgmini=1`;
}

/** Bot commands shown in the Telegram "/" menu. */
export const BOT_COMMANDS = [
  { command: "start", description: "Открыть меню AIVEXA" },
  { command: "materials", description: "Мои материалы" },
  { command: "link", description: "Моя реферальная ссылка" },
  { command: "stats", description: "Мои приглашения" },
  { command: "help", description: "Помощь по боту" },
];

/**
 * Registers webhook + commands + Mini App menu button in one go.
 * Returns everything that happened so the admin panel can show it.
 */
export async function configureBot(
  settings: TelegramBotSettings,
  base: string
): Promise<{ webhook: TelegramApiResult; commands: TelegramApiResult; menu: TelegramApiResult; url: string }> {
  let secret = settings.secret;
  if (!secret) {
    secret = generateWebhookSecret();
    await writeSetting(TELEGRAM_KEYS.secret, secret);
  }

  const url = webhookEndpoint(base);
  const webhook = await callTelegram(settings.token, "setWebhook", {
    url,
    secret_token: secret,
    allowed_updates: ["message", "edited_message", "callback_query"],
    drop_pending_updates: true,
    max_connections: 40,
  });
  if (webhook.ok) await writeSetting(TELEGRAM_KEYS.webhookUrl, url);

  const commands = await callTelegram(settings.token, "setMyCommands", { commands: BOT_COMMANDS });

  // The blue "menu" button next to the input opens the Mini App. Falls back to
  // the plain command list when no public address is configured yet.
  const mini = miniAppUrl(settings);
  const menu = mini
    ? await callTelegram(settings.token, "setChatMenuButton", {
        menu_button: { type: "web_app", text: "AIVEXA", web_app: { url: mini } },
      })
    : await callTelegram(settings.token, "setChatMenuButton", { menu_button: { type: "commands" } });

  console.log("[telegram] configureBot", {
    url,
    webhook: webhook.ok,
    commands: commands.ok,
    menu: menu.ok,
    miniApp: mini || "(not set)",
  });
  return { webhook, commands, menu, url };
}

/**
 * Self-healing: while the public site still serves an older build the webhook
 * runs on whatever address answered last (typically the Totalum preview). As
 * soon as the published domain starts answering, the bot moves itself back.
 */
let lastMigrationCheck = 0;

export async function maybeMigrateWebhook(settings: TelegramBotSettings): Promise<void> {
  const preferred = webhookEndpoint(settings.publicUrl);
  if (!preferred || preferred === settings.webhookUrl) return;
  if (Date.now() - lastMigrationCheck < 10 * 60 * 1000) return;
  lastMigrationCheck = Date.now();

  if (!(await probeWebhookEndpoint(settings.publicUrl))) return;
  console.log("[telegram] public domain is live — moving the webhook to", preferred);
  await configureBot(settings, settings.publicUrl);
}

export function botLink(username: string, code?: string): string {
  const handle = (username || "").replace(/^@/, "");
  if (!handle) return "";
  return code ? `https://t.me/${handle}?start=${code}` : `https://t.me/${handle}`;
}

/* -------------------------------------------------------------------------- */
/*                             subscriber records                             */
/* -------------------------------------------------------------------------- */

export async function findTelegramUser(telegramId: string): Promise<TelegramUserRecord | null> {
  const result = await totalumSdk.crud.query("telegram_users", {
    _filter: { telegram_id: String(telegramId) },
    _limit: 1,
  });
  if (result.errors) console.error("[telegram] findTelegramUser errors:", result.errors);
  return ((result.data || []) as unknown as TelegramUserRecord[])[0] || null;
}

export async function findByReferralCode(
  table: "telegram_users" | "user",
  code: string
): Promise<any | null> {
  if (!code) return null;
  const result = await totalumSdk.crud.query(table, {
    _filter: { referral_code: code },
    _limit: 1,
  });
  if (result.errors) console.error(`[telegram] findByReferralCode(${table}) errors:`, result.errors);
  return (result.data || [])[0] || null;
}

interface TelegramFrom {
  id: number | string;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
}

/** Creates the subscriber on first contact, refreshes the profile afterwards. */
export async function upsertTelegramUser(from: TelegramFrom): Promise<TelegramUserRecord> {
  const telegramId = String(from.id);
  const existing = await findTelegramUser(telegramId);
  const now = new Date().toISOString();

  if (existing) {
    const patch: Record<string, any> = { last_active_at: now, blocked: "no" };
    if (from.username && from.username !== existing.username) patch.username = from.username;
    if (!existing.referral_code) patch.referral_code = generateReferralCode();
    const updated = await totalumSdk.crud.editRecordById("telegram_users", existing._id, patch);
    if (updated.errors) console.error("[telegram] upsert update errors:", updated.errors);
    return { ...existing, ...patch } as TelegramUserRecord;
  }

  const payload: Record<string, any> = {
    telegram_id: telegramId,
    username: from.username || "",
    first_name: from.first_name || "",
    last_name: from.last_name || "",
    language_code: from.language_code || "",
    referral_code: generateReferralCode(),
    referrals_count: 0,
    started_at: now,
    last_active_at: now,
    blocked: "no",
  };
  const created = await totalumSdk.crud.createRecord("telegram_users", payload);
  if (created.errors) {
    console.error("[telegram] upsert create errors:", created.errors);
    throw new Error("Could not create telegram subscriber");
  }
  console.log("[telegram] new subscriber", telegramId, payload.referral_code);
  const fresh = await findTelegramUser(telegramId);
  return (fresh || ({ _id: (created.data as any)?.insertedId, ...payload } as TelegramUserRecord));
}

/* -------------------------------------------------------------------------- */
/*                                  content                                   */
/* -------------------------------------------------------------------------- */

export async function getActiveFolders(): Promise<PromptFolderRecord[]> {
  const result = await totalumSdk.crud.query("prompt_folders", {
    _filter: { active: "yes" },
    _sort: { order_position: "asc" },
    _limit: 200,
  });
  if (result.errors) console.error("[telegram] getActiveFolders errors:", result.errors);
  return (result.data || []) as unknown as PromptFolderRecord[];
}

/** How many invited friends a material needs (referral materials only). */
export function folderThreshold(folder: PromptFolderRecord): number {
  if (folder.access_type !== "referral") return 0;
  const required = Number(folder.required_referrals || 0);
  return required > 0 ? required : 1;
}

export function isFolderUnlocked(folder: PromptFolderRecord, referrals: number): boolean {
  return referrals >= folderThreshold(folder);
}

export function folderFileUrl(folder: PromptFolderRecord): string {
  const file = folder.file as any;
  if (!file) return "";
  if (Array.isArray(file)) return file[0]?.url || "";
  return file.url || "";
}

export async function logDelivery(
  telegramUserId: string,
  folderId: string,
  reason: "request" | "referral_reward" | "welcome"
): Promise<void> {
  const created = await totalumSdk.crud.createRecord("telegram_deliveries", {
    telegram_user: telegramUserId,
    folder: folderId,
    delivered_at: new Date().toISOString(),
    delivery_reason: reason,
  });
  if (created.errors) console.error("[telegram] logDelivery errors:", created.errors);
}
