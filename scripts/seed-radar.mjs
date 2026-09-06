/**
 * Seeds the AI Radar feed (`ai_radar`) with a starter set of entries so /radar
 * and the home-page strip are never empty. Idempotent: matches on title_ru.
 */
import { sdk } from "./_sdk.mjs";

const SERVICES = {
  chatgpt: "6a8acfcdceb0584a40a5c6f3",
  claude: "6a8acfcd75e4be1c4e327f3d",
  gemini: "6a8acfcd9e2662d23d774c26",
  perplexity: "6a8acfcd01f17924a2dbbd5c",
  midjourney: "6a8acfcd75e4be1c4e327f3f",
  runway: "6a8acfcd9e2662d23d774c2a",
  heygen: "6a8acfcd9e2662d23d774c2c",
  elevenlabs: "6a8acfce9e2662d23d774c30",
  suno: "6a8acfce75e4be1c4e327f49",
  cursor: "6a8acfceceb0584a40a5c701",
};

const CATEGORIES = {
  assistants: "6a8acf84ceb0584a40a5c6e5",
  image: "6a8acf8401f17924a2dbbd53",
  video: "6a8acf8475e4be1c4e327f30",
  voice: "6a8acf84ceb0584a40a5c6e7",
  music: "6a8acf8401f17924a2dbbd55",
  code: "6a8acf8475e4be1c4e327f32",
  business: "6a8acf849e2662d23d774c1e",
  companions: "6a9c26d0a48cc670197eef2e",
};

const IMG = {
  neuro: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80",
  robot: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&q=80",
  brain: "https://images.unsplash.com/photo-1655720828018-edd2daec9349?w=1200&q=80",
  chip: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&q=80",
  team: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&q=80",
  studio: "https://images.unsplash.com/photo-1516110833967-0b5716ca1387?w=1200&q=80",
  space: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=80",
  charts: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&q=80",
  code: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=1200&q=80",
  laptop: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&q=80",
  camera: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80",
  vr: "https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=1200&q=80",
};

/** Day offset -> ISO date, so the feed always looks fresh. */
const daysAgo = (n) => {
  const date = new Date();
  date.setDate(date.getDate() - n);
  date.setHours(9, 0, 0, 0);
  return date.toISOString();
};

const ITEMS = [
  {
    title_ru: "GPT-5.2 получил режим долгих задач",
    title_uk: "GPT-5.2 отримав режим довгих завдань",
    title_en: "GPT-5.2 ships a long-horizon task mode",
    summary_ru:
      "OpenAI открыла режим, в котором модель держит контекст многочасовой работы: планирует шаги, сама запускает инструменты и возвращается с готовым результатом. Для агентских сценариев это главный апдейт года.",
    summary_uk:
      "OpenAI відкрила режим, у якому модель тримає контекст багатогодинної роботи: планує кроки, сама запускає інструменти та повертається з готовим результатом.",
    summary_en:
      "OpenAI opened a mode where the model keeps context across hours of work: it plans steps, runs tools on its own and comes back with a finished result.",
    radar_type: "model",
    importance: "high",
    source_name: "OpenAI Blog",
    source_url: "https://openai.com/blog",
    image_url: IMG.neuro,
    service: SERVICES.chatgpt,
    category: CATEGORIES.assistants,
    pinned: "yes",
    days: 1,
  },
  {
    title_ru: "Claude научился работать с рабочим столом",
    title_uk: "Claude навчився працювати з робочим столом",
    title_en: "Claude learns to drive the desktop",
    summary_ru:
      "Anthropic расширила computer use: модель уверенно кликает по интерфейсам, заполняет формы и переносит данные между приложениями. Полезно для рутины в CRM и таблицах.",
    summary_uk:
      "Anthropic розширила computer use: модель впевнено клікає по інтерфейсах, заповнює форми та переносить дані між застосунками.",
    summary_en:
      "Anthropic expanded computer use: the model clicks through interfaces, fills forms and moves data between apps with far fewer mistakes.",
    radar_type: "update",
    importance: "high",
    source_name: "Anthropic",
    source_url: "https://www.anthropic.com/news",
    image_url: IMG.robot,
    service: SERVICES.claude,
    category: CATEGORIES.assistants,
    days: 2,
  },
  {
    title_ru: "Gemini подключили к рабочим документам",
    title_uk: "Gemini підключили до робочих документів",
    title_en: "Gemini plugs into your working documents",
    summary_ru:
      "Google связала модель с почтой, диском и календарём в одном контексте — ассистент видит переписку и файлы сразу и готовит ответы с ссылками на источники.",
    summary_uk:
      "Google зв'язала модель з поштою, диском і календарем в одному контексті — асистент бачить листування та файли одразу.",
    summary_en:
      "Google wired the model into mail, drive and calendar in a single context, so the assistant answers with links back to the sources.",
    radar_type: "update",
    importance: "normal",
    source_name: "Google AI",
    source_url: "https://blog.google/technology/ai/",
    image_url: IMG.brain,
    service: SERVICES.gemini,
    category: CATEGORIES.assistants,
    days: 3,
  },
  {
    title_ru: "Midjourney: новый движок консистентных персонажей",
    title_uk: "Midjourney: новий рушій консистентних персонажів",
    title_en: "Midjourney rolls out consistent characters",
    summary_ru:
      "Один референс — и герой сохраняет лицо, одежду и стиль во всей серии кадров. Для сторис, комиксов и рекламных раскадровок это экономит часы ретуши.",
    summary_uk:
      "Один референс — і герой зберігає обличчя, одяг та стиль у всій серії кадрів.",
    summary_en:
      "One reference keeps the character's face, outfit and style across a whole series of frames — hours of retouching saved.",
    radar_type: "tool",
    importance: "high",
    source_name: "Midjourney",
    source_url: "https://www.midjourney.com/updates",
    image_url: IMG.studio,
    service: SERVICES.midjourney,
    category: CATEGORIES.image,
    days: 4,
  },
  {
    title_ru: "Видео-генерация дошла до минуты со звуком",
    title_uk: "Відеогенерація дійшла до хвилини зі звуком",
    title_en: "Video generation reaches a minute with sound",
    summary_ru:
      "Топовые видео-модели держат длину около минуты и генерируют синхронный звук вместе с картинкой. Монтаж коротких роликов постепенно уходит в один промпт.",
    summary_uk:
      "Топові відеомоделі тримають довжину близько хвилини та генерують синхронний звук разом із картинкою.",
    summary_en:
      "Top video models now hold roughly a minute and generate synced audio alongside the picture.",
    radar_type: "trend",
    importance: "high",
    source_name: "AIVEXA Research",
    source_url: "",
    image_url: IMG.camera,
    service: SERVICES.runway,
    category: CATEGORIES.video,
    days: 5,
  },
  {
    title_ru: "HeyGen: перевод аватара в 40 языков",
    title_uk: "HeyGen: переклад аватара 40 мовами",
    title_en: "HeyGen dubs avatars into 40 languages",
    summary_ru:
      "Липсинк подстраивается под каждый язык, голос сохраняет тембр спикера. Один ролик — и локализация на весь рынок СНГ и Европы без съёмок.",
    summary_uk:
      "Ліпсинк підлаштовується під кожну мову, голос зберігає тембр спікера.",
    summary_en:
      "Lip sync adapts per language while the voice keeps the speaker's timbre — one shoot, a whole market localized.",
    radar_type: "tool",
    importance: "normal",
    source_name: "HeyGen",
    source_url: "https://www.heygen.com/",
    image_url: IMG.vr,
    service: SERVICES.heygen,
    category: CATEGORIES.video,
    days: 6,
  },
  {
    title_ru: "ElevenLabs открыл диалоговые голоса",
    title_uk: "ElevenLabs відкрив діалогові голоси",
    title_en: "ElevenLabs opens conversational voices",
    summary_ru:
      "Задержка ответа опустилась ниже полусекунды, голос перебивают и он корректно продолжает разговор. Голосовые боты поддержки становятся реально применимыми.",
    summary_uk:
      "Затримка відповіді впала нижче пів секунди, голос перебивають — і він коректно продовжує розмову.",
    summary_en:
      "Response latency dropped below half a second, and the voice recovers correctly when interrupted mid-sentence.",
    radar_type: "update",
    importance: "normal",
    source_name: "ElevenLabs",
    source_url: "https://elevenlabs.io/blog",
    image_url: IMG.space,
    service: SERVICES.elevenlabs,
    category: CATEGORIES.voice,
    days: 7,
  },
  {
    title_ru: "Suno: коммерческая лицензия на треки в базовом тарифе",
    title_uk: "Suno: комерційна ліцензія на треки в базовому тарифі",
    title_en: "Suno adds commercial rights to the base plan",
    summary_ru:
      "Треки можно использовать в рекламе и на YouTube без отдельной сделки. Для контент-мейкеров это снимает главный юридический стоп-фактор.",
    summary_uk:
      "Треки можна використовувати в рекламі та на YouTube без окремої угоди.",
    summary_en:
      "Tracks can be used in ads and on YouTube without a separate deal — the main legal blocker for creators is gone.",
    radar_type: "update",
    importance: "normal",
    source_name: "Suno",
    source_url: "https://suno.com/",
    image_url: IMG.laptop,
    service: SERVICES.suno,
    category: CATEGORIES.music,
    days: 8,
  },
  {
    title_ru: "Cursor: агент чинит упавшие тесты сам",
    title_uk: "Cursor: агент лагодить впалі тести сам",
    title_en: "Cursor's agent fixes failing tests on its own",
    summary_ru:
      "Редактор запускает тесты, читает трейс, правит код и повторяет цикл до зелёного прогона. Ревью всё ещё за человеком, но рутина ушла.",
    summary_uk:
      "Редактор запускає тести, читає трейс, править код і повторює цикл до зеленого прогону.",
    summary_en:
      "The editor runs the suite, reads the trace, patches the code and loops until green. Review still belongs to a human.",
    radar_type: "tool",
    importance: "normal",
    source_name: "Cursor",
    source_url: "https://cursor.com/changelog",
    image_url: IMG.code,
    service: SERVICES.cursor,
    category: CATEGORIES.code,
    days: 9,
  },
  {
    title_ru: "Perplexity добавила режим глубокого исследования",
    title_uk: "Perplexity додала режим глибокого дослідження",
    title_en: "Perplexity adds a deep research mode",
    summary_ru:
      "Система обходит десятки источников, сверяет цифры и отдаёт отчёт со сносками. Хорошая замена ручному ресёрчу рынка перед запуском продукта.",
    summary_uk:
      "Система обходить десятки джерел, звіряє цифри та віддає звіт із виносками.",
    summary_en:
      "It walks dozens of sources, cross-checks the numbers and returns a footnoted report.",
    radar_type: "research",
    importance: "normal",
    source_name: "Perplexity",
    source_url: "https://www.perplexity.ai/",
    image_url: IMG.charts,
    service: SERVICES.perplexity,
    category: CATEGORIES.business,
    days: 10,
  },
  {
    title_ru: "AI-компаньоны выросли в отдельный рынок",
    title_uk: "AI-компаньйони виросли в окремий ринок",
    title_en: "AI companions became their own market",
    summary_ru:
      "Сервисы виртуальных собеседников показали кратный рост выручки за год и вышли в топ по удержанию аудитории. Партнёрские программы в нише — одни из самых доходных.",
    summary_uk:
      "Сервіси віртуальних співрозмовників показали кратне зростання виручки за рік.",
    summary_en:
      "Virtual-companion services multiplied their revenue over the year and now lead on retention.",
    radar_type: "trend",
    importance: "high",
    source_name: "AIVEXA Research",
    source_url: "",
    image_url: IMG.team,
    category: CATEGORIES.companions,
    days: 12,
  },
  {
    title_ru: "Инференс подешевел ещё вдвое",
    title_uk: "Інференс подешевшав ще вдвічі",
    title_en: "Inference got twice as cheap again",
    summary_ru:
      "Цена за миллион токенов у флагманских моделей продолжает падать, а лёгкие модели закрывают всё больше задач. Автоматизация становится рентабельной даже для малых проектов.",
    summary_uk:
      "Ціна за мільйон токенів у флагманських моделей продовжує падати, а легкі моделі закривають дедалі більше завдань.",
    summary_en:
      "Price per million tokens keeps falling while small models cover more tasks — automation now pays off for tiny projects too.",
    radar_type: "funding",
    importance: "low",
    source_name: "AIVEXA Research",
    source_url: "",
    image_url: IMG.chip,
    category: CATEGORIES.business,
    days: 14,
  },
];

async function main() {
  const existing = await sdk.crud.query("ai_radar", { _limit: 200 });
  if (existing.errors) throw new Error(JSON.stringify(existing.errors));
  const known = new Set((existing.data || []).map((row) => row.title_ru));

  let created = 0;
  for (let index = 0; index < ITEMS.length; index += 1) {
    const item = ITEMS[index];
    if (known.has(item.title_ru)) {
      console.log("[seed-radar] skip (exists):", item.title_ru);
      continue;
    }
    const { days, ...rest } = item;
    const payload = {
      ...rest,
      published_at: daysAgo(days),
      order_position: index + 1,
      pinned: item.pinned || "no",
      active: "yes",
    };
    const result = await sdk.crud.createRecord("ai_radar", payload);
    if (result.errors) {
      console.error("[seed-radar] failed:", item.title_ru, JSON.stringify(result.errors));
      throw new Error("radar seed failed");
    }
    created += 1;
    console.log("[seed-radar] created:", item.title_ru);
  }
  console.log(`[seed-radar] done — ${created} created, ${ITEMS.length - created} skipped`);
}

main().catch((err) => {
  console.error("[seed-radar] fatal:", err);
  process.exit(1);
});
