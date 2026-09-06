import "server-only";
import { totalumSdk } from "@/lib/totalum";
import {
  answerCallback,
  botLink,
  callTelegram,
  findByReferralCode,
  findTelegramUser,
  folderFileUrl,
  folderThreshold,
  getActiveFolders,
  isFolderUnlocked,
  logDelivery,
  sendMessage,
  upsertTelegramUser,
} from "@/lib/telegram";
import type { PromptFolderRecord, TelegramBotSettings, TelegramUserRecord } from "@/lib/types";

/**
 * Conversation logic of the AIVEXA bot.
 *
 * Flow: /start [payload] → subscriber is created, the referral is attributed,
 * the main menu appears. From the menu the visitor opens the material list and
 * receives every folder that is free or already unlocked by their invites.
 */

/**
 * Public address of the site used by the bot buttons. The owner sets it in
 * Admin → Telegram; the env fallback only helps during local development.
 */
function siteUrl(settings: TelegramBotSettings): string {
  return (settings.publicUrl || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
}

const TYPE_LABEL: Record<string, string> = {
  prompts: "📂 Промпты",
  guide: "📘 Гайд",
  instruction: "🧭 Инструкция",
};

function escapeHtml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function pluralFriends(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "друга";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "друзей";
  return "друзей";
}

/* -------------------------------------------------------------------------- */
/*                                  keyboards                                 */
/* -------------------------------------------------------------------------- */

function mainMenuKeyboard(settings: TelegramBotSettings) {
  const rows: any[][] = [
    [{ text: "📂 Мои материалы", callback_data: "menu:folders" }],
    [
      { text: "🔗 Моя ссылка", callback_data: "menu:link" },
      { text: "📊 Мои приглашения", callback_data: "menu:stats" },
    ],
  ];
  const site = siteUrl(settings);
  if (site) rows.push([{ text: "🌐 Открыть AIVEXA", url: site }]);
  return { inline_keyboard: rows };
}

function foldersKeyboard(folders: PromptFolderRecord[], referrals: number) {
  const rows = folders.map((folder) => {
    const unlocked = isFolderUnlocked(folder, referrals);
    const threshold = folderThreshold(folder);
    const icon = unlocked ? folder.icon || "📁" : "🔒";
    const suffix = unlocked ? "" : ` · ${threshold} ${pluralFriends(threshold)}`;
    return [{ text: `${icon} ${folder.title}${suffix}`, callback_data: `folder:${folder._id}` }];
  });
  rows.push([{ text: "⬅️ Назад", callback_data: "menu:main" }]);
  return { inline_keyboard: rows };
}

/* -------------------------------------------------------------------------- */
/*                                  referrals                                 */
/* -------------------------------------------------------------------------- */

/**
 * Attributes a new subscriber to whoever owns `code`.
 *
 * Self-invites and repeat starts are ignored: the counter only moves the first
 * time a genuinely new subscriber arrives through someone else's link.
 */
async function attributeReferral(
  subscriber: TelegramUserRecord,
  code: string,
  isNewSubscriber: boolean
): Promise<void> {
  if (!code || !isNewSubscriber || subscriber.invited_by) return;
  if (code === subscriber.referral_code) return;

  try {
    const referrer = (await findByReferralCode("telegram_users", code)) as TelegramUserRecord | null;
    if (referrer && referrer._id !== subscriber._id) {
      await totalumSdk.crud.editRecordById("telegram_users", subscriber._id, { invited_by: referrer._id });
      await totalumSdk.crud.editRecordById("telegram_users", referrer._id, {
        referrals_count: Number(referrer.referrals_count || 0) + 1,
      });
      console.log(`[bot] referral: ${subscriber.telegram_id} invited by ${referrer.telegram_id}`);

      // Tell the inviter straight away — that is the whole point of the system.
      const settings = await import("@/lib/telegram").then((mod) => mod.readSettings());
      const total = Number(referrer.referrals_count || 0) + 1;
      await sendMessage(
        settings.token,
        referrer.telegram_id,
        `🎉 По твоей ссылке пришёл новый друг!\n\nВсего приглашено: <b>${total}</b>\n` +
          `Открой «Мои материалы» — возможно, уже разблокировались новые папки.`,
        { reply_markup: { inline_keyboard: [[{ text: "📂 Мои материалы", callback_data: "menu:folders" }]] } }
      );
      return;
    }

    // The code can also belong to a site account (personal link from /referrals).
    const siteUser = await findByReferralCode("user", code);
    if (siteUser) {
      await totalumSdk.crud.editRecordById("user", siteUser._id, {
        referrals_count: Number(siteUser.referrals_count || 0) + 1,
      });
      console.log(`[bot] referral credited to site user ${siteUser._id}`);

      // If that site account already connected its Telegram, credit it too so
      // the unlock rules inside the bot stay in sync with the website counter.
      const linked = await totalumSdk.crud.query("telegram_users", {
        _filter: { user: siteUser._id },
        _limit: 1,
      });
      const linkedSubscriber = ((linked.data || []) as unknown as TelegramUserRecord[])[0];
      if (linkedSubscriber && linkedSubscriber._id !== subscriber._id) {
        await totalumSdk.crud.editRecordById("telegram_users", subscriber._id, {
          invited_by: linkedSubscriber._id,
        });
        await totalumSdk.crud.editRecordById("telegram_users", linkedSubscriber._id, {
          referrals_count: Number(linkedSubscriber.referrals_count || 0) + 1,
        });
      }
    }
  } catch (err) {
    console.error("[bot] attributeReferral failed:", err);
    // Attribution must never break the /start flow for the new subscriber.
  }
}

/** `link<code>` payload — connects this chat to the site account owning the code. */
async function linkSiteAccount(subscriber: TelegramUserRecord, code: string): Promise<boolean> {
  try {
    const siteUser = await findByReferralCode("user", code);
    if (!siteUser) return false;
    await totalumSdk.crud.editRecordById("telegram_users", subscriber._id, { user: siteUser._id });
    console.log(`[bot] linked telegram ${subscriber.telegram_id} to site user ${siteUser._id}`);
    return true;
  } catch (err) {
    console.error("[bot] linkSiteAccount failed:", err);
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/*                                  delivery                                  */
/* -------------------------------------------------------------------------- */

async function deliverFolder(
  settings: TelegramBotSettings,
  chatId: string,
  subscriber: TelegramUserRecord,
  folder: PromptFolderRecord,
  reason: "request" | "referral_reward" | "welcome"
): Promise<void> {
  const header = `${folder.icon || "📁"} <b>${escapeHtml(folder.title)}</b>`;
  const typeLabel = TYPE_LABEL[folder.content_type || "prompts"] || "";
  const parts = [header];
  if (typeLabel) parts.push(`<i>${typeLabel}</i>`);
  if (folder.description) parts.push(escapeHtml(folder.description));
  if (folder.content) parts.push(escapeHtml(folder.content));

  const buttons: any[][] = [];
  if (folder.external_url) buttons.push([{ text: "📥 Открыть материал", url: folder.external_url }]);
  buttons.push([{ text: "⬅️ К списку", callback_data: "menu:folders" }]);

  await sendMessage(settings.token, chatId, parts.join("\n\n"), {
    reply_markup: { inline_keyboard: buttons },
  });

  const fileUrl = folderFileUrl(folder);
  if (fileUrl) {
    const sent = await callTelegram(settings.token, "sendDocument", {
      chat_id: chatId,
      document: fileUrl,
      caption: folder.title,
    });
    if (!sent.ok) {
      console.error("[bot] sendDocument failed:", sent.description);
      await sendMessage(
        settings.token,
        chatId,
        `📎 Файл доступен по ссылке:\n${fileUrl}`
      );
    }
  }

  await logDelivery(subscriber._id, folder._id, reason);
  console.log(`[bot] delivered "${folder.title}" to ${subscriber.telegram_id} (${reason})`);
}

/* -------------------------------------------------------------------------- */
/*                                   screens                                  */
/* -------------------------------------------------------------------------- */

async function showMainMenu(settings: TelegramBotSettings, chatId: string, greeting: string) {
  await sendMessage(settings.token, chatId, greeting, { reply_markup: mainMenuKeyboard(settings) });
}

async function showFolders(settings: TelegramBotSettings, chatId: string, subscriber: TelegramUserRecord) {
  const folders = await getActiveFolders();
  if (folders.length === 0) {
    await sendMessage(
      settings.token,
      chatId,
      "📭 Материалы пока не добавлены. Загляни позже — они появятся совсем скоро.",
      { reply_markup: mainMenuKeyboard(settings) }
    );
    return;
  }

  const referrals = Number(subscriber.referrals_count || 0);
  const unlocked = folders.filter((folder) => isFolderUnlocked(folder, referrals)).length;
  const text =
    `📂 <b>Материалы AIVEXA</b>\n\n` +
    `Открыто: <b>${unlocked}</b> из <b>${folders.length}</b>\n` +
    `Приглашено друзей: <b>${referrals}</b>\n\n` +
    `Выбери материал. 🔒 — откроется, когда пригласишь нужное число друзей.`;

  await sendMessage(settings.token, chatId, text, {
    reply_markup: foldersKeyboard(folders, referrals),
  });
}

async function showReferralLink(settings: TelegramBotSettings, chatId: string, subscriber: TelegramUserRecord) {
  const link = botLink(settings.username, subscriber.referral_code);
  const referrals = Number(subscriber.referrals_count || 0);
  const text =
    `🔗 <b>Твоя реферальная ссылка</b>\n\n` +
    `<code>${escapeHtml(link)}</code>\n\n` +
    `Приглашено друзей: <b>${referrals}</b>\n\n` +
    `Отправь ссылку друзьям — каждый, кто запустит бота по ней, откроет тебе новые материалы.`;

  const buttons: any[][] = [];
  if (link) {
    buttons.push([
      {
        text: "📨 Поделиться ссылкой",
        url: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(
          "Забирай бесплатные папки промптов и гайды по нейросетям 👇"
        )}`,
      },
    ]);
  }
  buttons.push([{ text: "⬅️ Назад", callback_data: "menu:main" }]);

  await sendMessage(settings.token, chatId, text, { reply_markup: { inline_keyboard: buttons } });
}

async function showStats(settings: TelegramBotSettings, chatId: string, subscriber: TelegramUserRecord) {
  const folders = await getActiveFolders();
  const referrals = Number(subscriber.referrals_count || 0);
  const locked = folders.filter((folder) => !isFolderUnlocked(folder, referrals));

  const nextThreshold = locked
    .map(folderThreshold)
    .sort((a, b) => a - b)
    .find((threshold) => threshold > referrals);

  const lines = [
    `📊 <b>Твоя статистика</b>`,
    ``,
    `Приглашено друзей: <b>${referrals}</b>`,
    `Открыто материалов: <b>${folders.length - locked.length}</b> из <b>${folders.length}</b>`,
  ];
  if (nextThreshold) {
    const left = nextThreshold - referrals;
    lines.push(``, `До следующего материала: ещё <b>${left}</b> ${pluralFriends(left)}.`);
  } else if (folders.length > 0) {
    lines.push(``, `🎉 Тебе доступны все материалы!`);
  }

  await sendMessage(settings.token, chatId, lines.join("\n"), {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔗 Моя ссылка", callback_data: "menu:link" }],
        [{ text: "⬅️ Назад", callback_data: "menu:main" }],
      ],
    },
  });
}

/* -------------------------------------------------------------------------- */
/*                                   router                                   */
/* -------------------------------------------------------------------------- */

async function handleStart(settings: TelegramBotSettings, chatId: string, from: any, payload: string) {
  const existed = await findTelegramUser(String(from.id));
  const subscriber = await upsertTelegramUser(from);
  const isNew = !existed;

  if (payload.startsWith("link")) {
    const linked = await linkSiteAccount(subscriber, payload.slice(4));
    if (linked) {
      await sendMessage(
        settings.token,
        chatId,
        "✅ Telegram привязан к твоему аккаунту AIVEXA. Приглашения с сайта и в боте теперь считаются вместе."
      );
    }
  } else {
    await attributeReferral(subscriber, payload, isNew);
  }

  const name = from.first_name ? `, ${escapeHtml(from.first_name)}` : "";
  const greeting = `${settings.welcome.replace("👋 Привет!", `👋 Привет${name}!`)}`;
  await showMainMenu(settings, chatId, greeting);

  // Free materials are handed out immediately on the very first /start.
  if (isNew) {
    const folders = await getActiveFolders();
    const freebies = folders.filter((folder) => folderThreshold(folder) === 0).slice(0, 3);
    for (const folder of freebies) {
      await deliverFolder(settings, chatId, subscriber, folder, "welcome");
    }
  }
}

async function handleCallback(settings: TelegramBotSettings, callback: any) {
  const chatId = String(callback.message?.chat?.id || callback.from?.id);
  const data = String(callback.data || "");
  const subscriber = await upsertTelegramUser(callback.from);

  await answerCallback(settings.token, callback.id);

  if (data === "menu:main") {
    await showMainMenu(settings, chatId, "Главное меню 👇");
    return;
  }
  if (data === "menu:folders") {
    await showFolders(settings, chatId, subscriber);
    return;
  }
  if (data === "menu:link") {
    await showReferralLink(settings, chatId, subscriber);
    return;
  }
  if (data === "menu:stats") {
    await showStats(settings, chatId, subscriber);
    return;
  }

  if (data.startsWith("folder:")) {
    const folderId = data.slice("folder:".length);
    const folders = await getActiveFolders();
    const folder = folders.find((item) => item._id === folderId);
    if (!folder) {
      await sendMessage(settings.token, chatId, "Материал больше недоступен.");
      return;
    }

    const referrals = Number(subscriber.referrals_count || 0);
    if (!isFolderUnlocked(folder, referrals)) {
      const threshold = folderThreshold(folder);
      const left = threshold - referrals;
      const link = botLink(settings.username, subscriber.referral_code);
      await sendMessage(
        settings.token,
        chatId,
        `🔒 <b>${escapeHtml(folder.title)}</b>\n\n` +
          `Материал откроется, когда ты пригласишь <b>${threshold}</b> ${pluralFriends(threshold)}.\n` +
          `Осталось: <b>${left}</b>.\n\n` +
          (link ? `Твоя ссылка:\n<code>${escapeHtml(link)}</code>` : ""),
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔗 Моя ссылка", callback_data: "menu:link" }],
              [{ text: "⬅️ К списку", callback_data: "menu:folders" }],
            ],
          },
        }
      );
      return;
    }

    await deliverFolder(settings, chatId, subscriber, folder, folder.access_type === "referral" ? "referral_reward" : "request");
  }
}

/** Entry point used by the webhook route. */
export async function handleUpdate(settings: TelegramBotSettings, update: any): Promise<void> {
  if (update.callback_query) {
    await handleCallback(settings, update.callback_query);
    return;
  }

  const message = update.message || update.edited_message;
  if (!message?.from) return;

  const chatId = String(message.chat?.id || message.from.id);
  const text = String(message.text || "").trim();

  if (text.startsWith("/start")) {
    const payload = text.slice("/start".length).trim();
    await handleStart(settings, chatId, message.from, payload);
    return;
  }

  const subscriber = await upsertTelegramUser(message.from);

  if (text.startsWith("/link") || text.startsWith("/ref")) {
    await showReferralLink(settings, chatId, subscriber);
    return;
  }
  if (text.startsWith("/stats")) {
    await showStats(settings, chatId, subscriber);
    return;
  }
  if (text.startsWith("/folders") || text.startsWith("/materials")) {
    await showFolders(settings, chatId, subscriber);
    return;
  }
  if (text.startsWith("/help")) {
    await sendMessage(
      settings.token,
      chatId,
      "Команды бота:\n\n" +
        "/start — главное меню\n" +
        "/folders — мои материалы\n" +
        "/link — реферальная ссылка\n" +
        "/stats — статистика приглашений",
      { reply_markup: mainMenuKeyboard(settings) }
    );
    return;
  }

  await showMainMenu(settings, chatId, "Выбери, что нужно 👇");
}
