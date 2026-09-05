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
} as const;

const SETTING_DESCRIPTIONS: Record<string, string> = {
  [TELEGRAM_KEYS.token]: "Токен Telegram-бота (BotFather)",
  [TELEGRAM_KEYS.username]: "@username бота — заполняется автоматически",
  [TELEGRAM_KEYS.secret]: "Секрет заголовка webhook (генерируется автоматически)",
  [TELEGRAM_KEYS.welcome]: "Приветственное сообщение бота",
  [TELEGRAM_KEYS.webhookUrl]: "URL, на который Telegram шлёт обновления",
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

export const sendMessage = (token: string, chatId: string | number, text: string, extra: Record<string, any> = {}) =>
  callTelegram(token, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...extra,
  });

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
