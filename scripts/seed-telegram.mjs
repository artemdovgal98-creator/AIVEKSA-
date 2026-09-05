/**
 * AIVEXA — Telegram bot bootstrap.
 *
 * 1. Verifies the bot token against the Telegram Bot API.
 * 2. Stores the token, the resolved @username and a fresh webhook secret in
 *    `admin_settings` so the owner can rebind everything from the admin panel.
 * 3. Seeds the starter set of prompt folders / guides the bot hands out.
 *
 * Idempotent — existing settings and materials are never duplicated.
 *
 * Run: node scripts/seed-telegram.mjs [<bot-token>]
 */
import { createRequire } from "module";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const require = createRequire(import.meta.url);
const { TotalumApiSdk } = require("totalum-api-sdk");

const envPath = path.resolve(process.cwd(), ".env");
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (match) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
}

const sdk = new TotalumApiSdk({ apiKey: { "api-key": process.env.TOTALUM_API_KEY } });
sdk.changeBaseUrl(process.env.TOTALUM_API_URL || "https://api.totalum.app/");

const TOKEN = (process.argv[2] || process.env.TELEGRAM_BOT_TOKEN || "").trim();

const WELCOME =
  "👋 Привет! Это бот AIVEXA.\n\n" +
  "Здесь ты бесплатно получаешь папки промптов, гайды и инструкции по нейросетям.\n\n" +
  "Часть материалов открывается сразу, часть — за приглашённых друзей. " +
  "Жми «Мои материалы», чтобы забрать всё, что уже доступно.";

const FOLDERS = [
  {
    title: "Стартовая папка промптов",
    slug: "starter-prompts",
    icon: "🚀",
    content_type: "prompts",
    description: "50 универсальных промптов для ChatGPT и Claude: тексты, идеи, анализ, обучение.",
    content:
      "Забирай стартовый набор промптов 👇\n\n" +
      "1. «Действуй как опытный копирайтер. Напиши 5 вариантов заголовка для…»\n" +
      "2. «Разбери мой текст по структуре, логике и стилю. Дай 3 конкретных правки.»\n" +
      "3. «Объясни тему {тема} так, как будто мне 12 лет, и приведи 2 аналогии.»\n" +
      "4. «Составь пошаговый план на 7 дней, чтобы освоить {навык}. По 30 минут в день.»\n" +
      "5. «Сгенерируй 10 идей контента для {ниша} с зацепкой в первой строке.»\n\n" +
      "Полный список из 50 промптов — по кнопке ниже.",
    access_type: "free",
    required_referrals: 0,
    order_position: 1,
  },
  {
    title: "Гайд: как писать промпты",
    slug: "prompt-guide",
    icon: "📘",
    content_type: "guide",
    description: "Структура сильного промпта: роль, контекст, задача, формат, ограничения.",
    content:
      "📘 <b>Формула сильного промпта</b>\n\n" +
      "• <b>Роль</b> — кем должна быть нейросеть.\n" +
      "• <b>Контекст</b> — что она должна знать о задаче.\n" +
      "• <b>Задача</b> — что именно сделать, одним предложением.\n" +
      "• <b>Формат</b> — таблица, список, текст, длина.\n" +
      "• <b>Ограничения</b> — чего делать нельзя.\n\n" +
      "Пример: «Ты редактор делового медиа. Вот черновик статьи. Сократи его до 1200 знаков, " +
      "сохрани все цифры, верни готовый текст без пояснений.»",
    access_type: "free",
    required_referrals: 0,
    order_position: 2,
  },
  {
    title: "Инструкция: AI за 7 дней",
    slug: "ai-7-days",
    icon: "🧭",
    content_type: "instruction",
    description: "План на неделю: от первого запроса до рабочих сценариев с нейросетями.",
    content:
      "🧭 <b>Твоя неделя с AI</b>\n\n" +
      "День 1 — базовые запросы и формула промпта.\n" +
      "День 2 — тексты: посты, письма, описания.\n" +
      "День 3 — изображения: Midjourney и Leonardo.\n" +
      "День 4 — видео и озвучка.\n" +
      "День 5 — работа с документами и PDF.\n" +
      "День 6 — автоматизация рутины.\n" +
      "День 7 — собираешь свой личный AI-стек.\n\n" +
      "Все сервисы из плана есть в каталоге AIVEXA.",
    access_type: "free",
    required_referrals: 0,
    order_position: 3,
  },
  {
    title: "Папка промптов для соцсетей",
    slug: "social-prompts",
    icon: "📱",
    content_type: "prompts",
    description: "120 промптов под Reels, Shorts, Telegram и контент-план на месяц.",
    content:
      "📱 <b>Промпты для соцсетей</b>\n\n" +
      "Внутри: сценарии Reels и Shorts, крючки для первых 3 секунд, " +
      "рубрики на месяц, прогревы и заголовки под каждую площадку.\n\n" +
      "Открылось за твои приглашения — спасибо! 🙌",
    access_type: "referral",
    required_referrals: 1,
    order_position: 4,
  },
  {
    title: "Промпты для работы и денег",
    slug: "work-prompts",
    icon: "💼",
    content_type: "prompts",
    description: "Резюме, отклики, переговоры, коммерческие предложения и аналитика.",
    content:
      "💼 <b>Рабочая папка промптов</b>\n\n" +
      "Резюме под конкретную вакансию, сопроводительные письма, " +
      "скрипты переговоров, КП, разбор конкурентов и финансовые расчёты.\n\n" +
      "Открылось за 3 приглашённых друзей. 🔥",
    access_type: "referral",
    required_referrals: 3,
    order_position: 5,
  },
  {
    title: "PRO-набор: AI-стек фрилансера",
    slug: "pro-freelancer-stack",
    icon: "💎",
    content_type: "guide",
    description: "Связки нейросетей под реальные заказы: от брифа до сдачи проекта.",
    content:
      "💎 <b>AI-стек фрилансера</b>\n\n" +
      "Готовые связки инструментов под типовые заказы: тексты, дизайн, видео, монтаж, " +
      "презентации. Для каждой связки — промпты и порядок шагов.\n\n" +
      "Это максимальный уровень доступа. Ты его открыл! 🏆",
    access_type: "referral",
    required_referrals: 5,
    order_position: 6,
  },
];

async function upsertSetting(key, value, description) {
  const existing = await sdk.crud.query("admin_settings", { _filter: { setting_key: key }, _limit: 1 });
  const row = (existing.data || [])[0];
  if (row) {
    await sdk.crud.editRecordById("admin_settings", row._id, { setting_value: value });
    console.log(`  ~ setting ${key}`);
    return;
  }
  await sdk.crud.createRecord("admin_settings", {
    setting_key: key,
    setting_value: value,
    description,
  });
  console.log(`  + setting ${key}`);
}

async function main() {
  if (!TOKEN) throw new Error("No bot token provided");

  // 1. verify the token against the real Bot API before storing it
  const response = await fetch(`https://api.telegram.org/bot${TOKEN}/getMe`);
  const me = await response.json();
  if (!me.ok) throw new Error(`Telegram rejected the token: ${me.description}`);
  console.log(`Bot verified: @${me.result.username} (${me.result.first_name})`);

  // 2. settings
  await upsertSetting("telegram_bot_token", TOKEN, "Токен Telegram-бота (BotFather)");
  await upsertSetting("telegram_bot_username", me.result.username, "@username бота — заполняется автоматически");
  await upsertSetting("telegram_welcome_message", WELCOME, "Приветственное сообщение бота");

  const secretRow = await sdk.crud.query("admin_settings", {
    _filter: { setting_key: "telegram_webhook_secret" },
    _limit: 1,
  });
  if (!(secretRow.data || [])[0]?.setting_value) {
    await upsertSetting(
      "telegram_webhook_secret",
      crypto.randomBytes(24).toString("hex"),
      "Секрет заголовка webhook (генерируется автоматически)"
    );
  }

  const base = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
  if (base) {
    await upsertSetting(
      "telegram_webhook_url",
      `${base}/api/telegram/webhook`,
      "URL, на который Telegram шлёт обновления"
    );
  }

  // 3. starter materials
  const existing = await sdk.crud.query("prompt_folders", { _limit: 500 });
  const slugs = new Set((existing.data || []).map((folder) => folder.slug));
  let created = 0;
  for (const folder of FOLDERS) {
    if (slugs.has(folder.slug)) {
      console.log(`  = folder ${folder.slug} already exists`);
      continue;
    }
    const record = await sdk.crud.createRecord("prompt_folders", { ...folder, external_url: "", active: "yes" });
    if (record.errors) throw new Error(`folder ${folder.slug}: ${JSON.stringify(record.errors)}`);
    console.log(`  + folder ${folder.slug}`);
    created += 1;
  }

  const total = await sdk.crud.query("prompt_folders", { _aggregate: { _count: true } });
  console.log(`Done — ${created} new materials, total in database:`, JSON.stringify(total.data));
}

main().catch((err) => {
  console.error("[seed-telegram] FATAL:", err.message || err);
  process.exit(1);
});
