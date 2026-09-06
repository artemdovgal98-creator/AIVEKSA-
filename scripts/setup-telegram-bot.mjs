/**
 * Registers the Telegram webhook, the command list and the Mini App menu button.
 *
 * Telegram accepts a `setWebhook` on any HTTPS address and then retries against
 * a 404 forever, which is exactly how a "dead" bot looks. So every candidate is
 * probed first and only a deployment that really answers is registered.
 *
 * Usage:
 *   node scripts/setup-telegram-bot.mjs [--base https://host] [--base https://other]
 *
 * Candidates are tried in the order given, then `site_public_url` from
 * `admin_settings`. The Mini App always points at the public address.
 */
import { sdk } from "./_sdk.mjs";

const WEBHOOK_PATH = "/api/telegram/webhook";
const clean = (value) => String(value || "").trim().replace(/\/+$/, "");

const COMMANDS = [
  { command: "start", description: "Открыть меню AIVEXA" },
  { command: "materials", description: "Мои материалы" },
  { command: "link", description: "Моя реферальная ссылка" },
  { command: "stats", description: "Мои приглашения" },
  { command: "help", description: "Помощь по боту" },
];

async function readSettings() {
  const result = await sdk.crud.query("admin_settings", { _limit: 100 });
  if (result.errors) throw new Error(JSON.stringify(result.errors));
  const map = new Map(result.data.map((row) => [row.setting_key, String(row.setting_value ?? "")]));
  return map;
}

async function writeSetting(key, value) {
  const existing = await sdk.crud.query("admin_settings", { _filter: { setting_key: key }, _limit: 1 });
  if (existing.errors) throw new Error(JSON.stringify(existing.errors));
  const row = existing.data[0];
  const result = row
    ? await sdk.crud.editRecordById("admin_settings", row._id, { setting_value: value })
    : await sdk.crud.createRecord("admin_settings", { setting_key: key, setting_value: value });
  if (result.errors) throw new Error(JSON.stringify(result.errors));
}

async function api(token, method, payload = {}) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await response.json();
  if (!json.ok) console.error(`  ✗ ${method}: ${json.description}`);
  return json;
}

async function probe(base) {
  const url = `${clean(base)}${WEBHOOK_PATH}`;
  try {
    const response = await fetch(url, { headers: { "user-agent": "aivexa-setup" }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      console.log(`  · ${url} → HTTP ${response.status}`);
      return false;
    }
    const json = await response.json().catch(() => null);
    console.log(`  · ${url} → OK ${JSON.stringify(json)}`);
    return json?.ok === true;
  } catch (err) {
    console.log(`  · ${url} → ${err.message}`);
    return false;
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const extra = argv.map((value, index) => (value === "--base" ? argv[index + 1] : null)).filter(Boolean);

  const settings = await readSettings();
  const token = settings.get("telegram_bot_token");
  if (!token) throw new Error("telegram_bot_token is not set in admin_settings");

  const publicUrl = clean(settings.get("site_public_url"));
  let secret = settings.get("telegram_webhook_secret");
  if (!secret) {
    secret = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
    await writeSetting("telegram_webhook_secret", secret);
  }

  const me = await api(token, "getMe");
  if (!me.ok) throw new Error(`Bot token rejected: ${me.description}`);
  console.log(`Bot: @${me.result.username}`);
  await writeSetting("telegram_bot_username", me.result.username);

  const candidates = [...new Set([publicUrl, ...extra].map(clean).filter((v) => /^https:\/\//i.test(v)))];
  console.log("Probing webhook targets:");
  let target = "";
  for (const base of candidates) {
    if (await probe(base)) {
      target = base;
      break;
    }
  }
  if (!target) throw new Error(`No candidate answers ${WEBHOOK_PATH}: ${candidates.join(", ")}`);

  const url = `${target}${WEBHOOK_PATH}`;
  const hook = await api(token, "setWebhook", {
    url,
    secret_token: secret,
    allowed_updates: ["message", "edited_message", "callback_query"],
    drop_pending_updates: true,
    max_connections: 40,
  });
  if (!hook.ok) throw new Error(`setWebhook failed: ${hook.description}`);
  await writeSetting("telegram_webhook_url", url);
  console.log(`✔ webhook → ${url}`);

  const commands = await api(token, "setMyCommands", { commands: COMMANDS });
  if (commands.ok) console.log("✔ commands registered:", COMMANDS.map((c) => `/${c.command}`).join(" "));

  const miniApp = publicUrl ? `${publicUrl}/?tgmini=1` : "";
  if (miniApp) {
    const menu = await api(token, "setChatMenuButton", {
      menu_button: { type: "web_app", text: "AIVEXA", web_app: { url: miniApp } },
    });
    if (menu.ok) console.log(`✔ Mini App menu button → ${miniApp}`);
  }

  const info = await api(token, "getWebhookInfo");
  console.log("Webhook info:", JSON.stringify(info.result));
}

main().catch((err) => {
  console.error("setup-telegram-bot failed:", err);
  process.exit(1);
});
