/**
 * AIVEXA — affiliate expansion data.
 *
 * IMPORTANT: every `affiliate_program_url` below was verified live (HTTP 200 +
 * affiliate content on the official domain). Commission values are copied
 * verbatim from those official pages. Services whose official affiliate page
 * could NOT be confirmed get status "not_available" and no program URL —
 * nothing is invented. `affiliate_url` always starts empty: the owner pastes
 * their own tracking link in Admin → Affiliate Manager.
 */

export const AFFILIATE = {
  // ---- verified official affiliate programs --------------------------------
  synthesia: {
    program: "https://www.synthesia.io/partners",
    network: "",
    commission: "",
    status: "not_connected",
    notes: "Официальная страница партнёрских программ Synthesia (проверено). Условия комиссии уточняются при подаче заявки.",
  },
  heygen: {
    program: "https://www.heygen.com/affiliate",
    network: "",
    commission: "35% recurring (3 мес.)",
    status: "not_connected",
    notes: "HeyGen Social Creator / Affiliate program. Комиссия указана на официальной странице. Требование: 5K+ подписчиков.",
  },
  writesonic: {
    program: "https://writesonic.com/affiliate",
    network: "",
    commission: "20% recurring (12 мес.)",
    status: "not_connected",
    notes: "Writesonic Affiliate Program — комиссия с официальной страницы.",
  },
  pictory: {
    program: "https://pictory.ai/partners",
    network: "",
    commission: "",
    status: "not_connected",
    notes: "Официальная страница партнёрской программы Pictory (проверено).",
  },
  descript: {
    program: "https://www.descript.com/affiliate",
    network: "",
    commission: "",
    status: "not_connected",
    notes: "Официальная affiliate-страница Descript (проверено).",
  },
  "opus-clip": {
    program: "https://www.opus.pro/affiliate",
    network: "",
    commission: "25% recurring (первый год)",
    status: "not_connected",
    notes: "Opus Clip affiliate program — комиссия с официальной страницы.",
  },
  "murf-ai": {
    program: "https://murf.ai/partner-with-us/affiliate",
    network: "",
    commission: "20% recurring (24 мес.)",
    status: "not_connected",
    notes: "Murf AI affiliate program — комиссия с официальной страницы.",
  },
  speechify: {
    program: "https://speechify.com/affiliates",
    network: "",
    commission: "30% с продажи, cookie 30 дней",
    status: "not_connected",
    notes: "Speechify affiliate program — условия с официальной страницы.",
  },
  surfer: {
    program: "https://surferseo.com/affiliate-program/",
    network: "",
    commission: "",
    status: "not_connected",
    notes: "Официальная affiliate-страница Surfer (проверено).",
  },
  scalenut: {
    program: "https://www.scalenut.com/affiliate",
    network: "",
    commission: "30–50% recurring (пожизненно)",
    status: "not_connected",
    notes: "Scalenut affiliate program — комиссия с официальной страницы.",
  },
  notta: {
    program: "https://www.notta.ai/en/affiliate",
    network: "",
    commission: "30% с каждой продажи",
    status: "not_connected",
    notes: "Notta affiliate program — комиссия с официальной страницы.",
  },
  "fireflies-ai": {
    program: "https://fireflies.ai/affiliate",
    network: "",
    commission: "до 30% recurring (12 мес.)",
    status: "not_connected",
    notes: "Fireflies.ai affiliate program — комиссия с официальной страницы.",
  },

  // ---- affiliate program NOT confirmed → nothing invented ------------------
  jasper: {
    program: "",
    network: "",
    commission: "",
    status: "not_available",
    notes: "Публичная affiliate-страница не подтверждена (jasper.ai/partners ведёт на программу для агентств). Проверить вручную перед подключением.",
  },
  "invideo-ai": {
    program: "",
    network: "",
    commission: "",
    status: "not_available",
    notes: "Официальная affiliate-страница не найдена (все проверенные URL отдают 404).",
  },
  veed: {
    program: "",
    network: "",
    commission: "",
    status: "not_available",
    notes: "veed.io/affiliates перенаправляет на страницу входа — публичные условия не подтверждены.",
  },
  "copy-ai": {
    program: "",
    network: "",
    commission: "",
    status: "not_available",
    notes: "Официальная affiliate-страница не найдена (проверенные URL отдают 404).",
  },
  frase: {
    program: "",
    network: "",
    commission: "",
    status: "not_available",
    notes: "Официальная affiliate-страница не найдена (проверенные URL отдают 404).",
  },
  "beautiful-ai": {
    program: "",
    network: "",
    commission: "",
    status: "not_available",
    notes: "beautiful.ai/affiliates отдаёт обычную главную страницу — программа не подтверждена.",
  },
  gamma: {
    program: "",
    network: "",
    commission: "",
    status: "not_available",
    notes: "gamma.app закрыт защитой Cloudflare — страницу партнёрской программы подтвердить не удалось.",
  },
  tome: {
    program: "",
    network: "",
    commission: "",
    status: "not_available",
    notes: "Официальная affiliate-страница не найдена (проверенные URL отдают 404).",
  },
};

/** Services that already exist and only need affiliate data / category fixes. */
export const EXISTING_UPDATES = [
  { slug: "synthesia" },
  { slug: "heygen" },
  { slug: "jasper" },
  { slug: "descript", cat: "video" },
  { slug: "opus-clip" },
  { slug: "murf-ai" },
  { slug: "copy-ai" },
  { slug: "gamma", cat: "presentations" },
];

/** 12 services that are new to the catalog. */
export const NEW_SERVICES = [
  {
    name: "Writesonic", slug: "writesonic", cat: "writing", domain: "writesonic.com",
    url: "https://writesonic.com/", free: "yes", price_type: "freemium", price: "Free / от $16 в мес.",
    rating: 4.4, popularity: 76, popular: "yes", featured: "no",
    tags: "тексты, seo, копирайтинг, статьи, реклама",
    keywords: "writesonic, райтсоник, seo тексты, статьи, копирайтинг, реклама, лендинг, ai writer, seo content, blog",
    ru: {
      d: "AI-платформа для SEO-статей, рекламных текстов и описаний товаров: от идеи до готового материала с учётом ключевых слов.",
      f: ["Генерация SEO-статей по ключевым словам", "Рекламные тексты для Google и Meta", "Описания товаров и лендинги", "Чат-ассистент с доступом к поиску"],
      p: ["Сильный акцент на SEO", "Много готовых шаблонов", "Есть бесплатный тариф"],
      c: ["Длинные статьи требуют редактуры", "Интерфейс перегружен функциями"],
    },
    en: {
      d: "An AI platform for SEO articles, ad copy and product descriptions — from a keyword to a finished, search-optimised text.",
      f: ["Keyword-driven SEO article generation", "Ad copy for Google and Meta", "Product descriptions and landing pages", "Chat assistant with web access"],
      p: ["Strong SEO focus", "Large template library", "Free tier available"],
      c: ["Long articles need editing", "Feature-heavy interface"],
    },
  },
  {
    name: "Pictory", slug: "pictory", cat: "video", domain: "pictory.ai",
    url: "https://pictory.ai/", free: "yes", price_type: "freemium", price: "Free trial / от $19 в мес.",
    rating: 4.3, popularity: 70, popular: "no", featured: "no",
    tags: "видео, из текста, нарезка, субтитры, блог",
    keywords: "pictory, пикстори, видео из текста, видео из статьи, нарезка вебинара, субтитры, text to video, blog to video, shorts",
    ru: {
      d: "Превращает статьи, сценарии и длинные записи в готовые видео с подложкой, субтитрами и озвучкой — без навыков монтажа.",
      f: ["Видео из текста или статьи по ссылке", "Автонарезка вебинаров на короткие клипы", "Автоматические субтитры", "Библиотека стоковых кадров и музыки"],
      p: ["Не нужны навыки монтажа", "Хорошо подходит для блогов и вебинаров", "Быстрый результат"],
      c: ["Ограниченная кастомизация дизайна", "Стоковые кадры повторяются"],
    },
    en: {
      d: "Turns articles, scripts and long recordings into ready-made videos with footage, captions and voiceover — no editing skills needed.",
      f: ["Video from text or an article URL", "Auto-clipping of webinars into shorts", "Automatic captions", "Stock footage and music library"],
      p: ["No editing skills required", "Great for blogs and webinars", "Fast turnaround"],
      c: ["Limited design customisation", "Stock footage repeats"],
    },
  },
  {
    name: "InVideo AI", slug: "invideo-ai", cat: "video", domain: "invideo.io",
    url: "https://invideo.io/", free: "yes", price_type: "freemium", price: "Free / от $20 в мес.",
    rating: 4.3, popularity: 72, popular: "yes", featured: "no",
    tags: "видео, генерация, промпт, соцсети, шаблоны",
    keywords: "invideo, инвидео, видео по промпту, генератор видео, ролики для соцсетей, шаблоны видео, ai video generator, text to video",
    ru: {
      d: "Генератор видео по текстовому промпту: сам пишет сценарий, подбирает кадры, добавляет озвучку и субтитры за одну команду.",
      f: ["Видео целиком по одному промпту", "Правки голосом или текстом", "AI-озвучка на многих языках", "Тысячи шаблонов для соцсетей"],
      p: ["Очень низкий порог входа", "Быстрое создание роликов для соцсетей", "Есть бесплатный тариф"],
      c: ["Водяной знак на бесплатном тарифе", "Стоковые кадры не всегда точны"],
    },
    en: {
      d: "A prompt-to-video generator: it writes the script, picks the footage, adds voiceover and captions from a single instruction.",
      f: ["Full video from one prompt", "Edit by voice or text commands", "AI voiceover in many languages", "Thousands of social media templates"],
      p: ["Very low learning curve", "Fast social media content", "Free tier available"],
      c: ["Watermark on the free plan", "Stock footage isn't always on point"],
    },
  },
  {
    name: "VEED", slug: "veed", cat: "video", domain: "veed.io",
    url: "https://www.veed.io/", free: "yes", price_type: "freemium", price: "Free / от $19 в мес.",
    rating: 4.4, popularity: 74, popular: "yes", featured: "no",
    tags: "видео, монтаж, субтитры, браузер, перевод",
    keywords: "veed, вид, онлайн монтаж, редактор видео в браузере, субтитры, перевод видео, убрать фон, video editor online, captions",
    ru: {
      d: "Онлайн-редактор видео в браузере с AI-субтитрами, переводом, удалением фона и шума — без установки программ.",
      f: ["Монтаж прямо в браузере", "Автосубтитры и перевод на десятки языков", "Удаление фона и шума одним кликом", "Запись экрана и вебкамеры"],
      p: ["Ничего не нужно устанавливать", "Отличные субтитры и перевод", "Понятный интерфейс"],
      c: ["Водяной знак на бесплатном тарифе", "Тяжёлые проекты подтормаживают"],
    },
    en: {
      d: "A browser-based video editor with AI captions, translation, background and noise removal — nothing to install.",
      f: ["Editing straight in the browser", "Auto-captions and translation into dozens of languages", "One-click background and noise removal", "Screen and webcam recording"],
      p: ["No installation needed", "Excellent captions and translation", "Clean interface"],
      c: ["Watermark on the free plan", "Heavy projects can lag"],
    },
  },
  {
    name: "Speechify", slug: "speechify", cat: "voice", domain: "speechify.com",
    url: "https://speechify.com/", free: "yes", price_type: "freemium", price: "Free / от $11.58 в мес.",
    rating: 4.4, popularity: 73, popular: "yes", featured: "no",
    tags: "озвучка, чтение вслух, tts, аудиокниги, дислексия",
    keywords: "speechify, спичифай, читалка, чтение вслух, озвучить текст, tts, аудиокнига, pdf вслух, text to speech, voice over",
    ru: {
      d: "Озвучивает любой текст, PDF и веб-страницы естественным голосом — слушайте документы и статьи вместо чтения.",
      f: ["Чтение вслух PDF, сайтов и почты", "Естественные голоса на 30+ языках", "Регулируемая скорость до 4.5x", "Расширение для браузера и мобильные приложения"],
      p: ["Очень естественное звучание", "Работает почти с любым текстом", "Помогает при дислексии"],
      c: ["Лучшие голоса только на платном тарифе", "Русский звучит слабее английского"],
    },
    en: {
      d: "Reads any text, PDF or web page aloud in a natural voice — listen to documents and articles instead of reading them.",
      f: ["Reads PDFs, websites and email aloud", "Natural voices in 30+ languages", "Playback speed up to 4.5x", "Browser extension and mobile apps"],
      p: ["Very natural sounding", "Works with almost any text", "Helpful for dyslexia"],
      c: ["Best voices are paid only", "Non-English voices are weaker"],
    },
  },
  {
    name: "Surfer", slug: "surfer", cat: "seo", domain: "surferseo.com",
    url: "https://surferseo.com/", free: "no", price_type: "paid", price: "от $99 в мес.",
    rating: 4.6, popularity: 78, popular: "yes", featured: "yes",
    tags: "seo, оптимизация, контент, ключевые слова, аудит",
    keywords: "surfer, surfer seo, серфер, оптимизация статьи, семантика, ключевые слова, контент-план, аудит текста, seo content editor, serp analysis",
    ru: {
      d: "SEO-редактор, который анализирует топ выдачи и подсказывает, какие слова, заголовки и объём нужны, чтобы статья вышла в топ.",
      f: ["Content Editor с оценкой оптимизации в реальном времени", "Анализ конкурентов из топ-10 выдачи", "Аудит и доработка существующих страниц", "Кластеризация ключевых слов и контент-план"],
      p: ["Прозрачные и понятные рекомендации", "Заметно ускоряет работу над статьями", "Интеграция с Google Docs и WordPress"],
      c: ["Нет бесплатного тарифа", "Дорого для одиночных авторов"],
    },
    en: {
      d: "An SEO editor that analyses the top search results and tells you which terms, headings and length an article needs to rank.",
      f: ["Content Editor with a live optimisation score", "Competitor analysis of the top 10 results", "Audit and refresh of existing pages", "Keyword clustering and content planning"],
      p: ["Clear, actionable guidance", "Speeds up article production", "Integrates with Google Docs and WordPress"],
      c: ["No free plan", "Pricey for solo writers"],
    },
  },
  {
    name: "Frase", slug: "frase", cat: "seo", domain: "frase.io",
    url: "https://www.frase.io/", free: "no", price_type: "paid", price: "от $15 в мес.",
    rating: 4.3, popularity: 64, popular: "no", featured: "no",
    tags: "seo, брифы, контент, анализ выдачи, ии-текст",
    keywords: "frase, фрейз, контент бриф, анализ выдачи, seo статья, структура статьи, faq, content brief, serp research",
    ru: {
      d: "Собирает данные из поисковой выдачи в контент-бриф и помогает написать статью, которая отвечает на реальные запросы пользователей.",
      f: ["Автоматический контент-бриф по запросу", "Анализ структуры статей конкурентов", "AI-написание разделов по брифу", "Поиск вопросов и FAQ по теме"],
      p: ["Отличные брифы за минуты", "Недорогой стартовый тариф", "Хорош для командной работы"],
      c: ["Нет бесплатного тарифа", "AI-текст требует редактуры"],
    },
    en: {
      d: "Turns search results into a content brief and helps you write an article that answers what people actually search for.",
      f: ["Automatic content brief for any query", "Competitor article structure analysis", "AI writing of sections from the brief", "Topic question and FAQ research"],
      p: ["Great briefs in minutes", "Affordable entry plan", "Good for teams"],
      c: ["No free plan", "AI drafts need editing"],
    },
  },
  {
    name: "Scalenut", slug: "scalenut", cat: "seo", domain: "scalenut.com",
    url: "https://www.scalenut.com/", free: "yes", price_type: "freemium", price: "Free trial / от $39 в мес.",
    rating: 4.3, popularity: 62, popular: "no", featured: "no",
    tags: "seo, статьи, кластеры, контент-маркетинг, автопилот",
    keywords: "scalenut, скейлнат, seo статьи, кластеризация, контент маркетинг, автоматизация seo, seo blog writer, keyword clusters",
    ru: {
      d: "Платформа полного цикла: подбирает кластеры ключевых слов, пишет SEO-статью и сама дорабатывает её до нужного уровня оптимизации.",
      f: ["Cruise Mode — статья от ключа до готового текста", "Кластеризация ключевых слов", "Автооптимизация готовых страниц", "Планировщик контента"],
      p: ["Весь SEO-цикл в одном месте", "Быстрое создание объёмных статей", "Есть пробный период"],
      c: ["Тексты нуждаются в вычитке", "Слабее для не-английских языков"],
    },
    en: {
      d: "An end-to-end platform: it builds keyword clusters, writes the SEO article and then optimises it to the target score itself.",
      f: ["Cruise Mode — keyword to finished article", "Keyword clustering", "Auto-optimisation of existing pages", "Content planner"],
      p: ["The whole SEO cycle in one place", "Fast long-form production", "Free trial available"],
      c: ["Drafts need proofreading", "Weaker outside English"],
    },
  },
  {
    name: "Notta", slug: "notta", cat: "meetings", domain: "notta.ai",
    url: "https://www.notta.ai/", free: "yes", price_type: "freemium", price: "Free / от $8.17 в мес.",
    rating: 4.4, popularity: 66, popular: "no", featured: "no",
    tags: "транскрибация, встречи, заметки, перевод, аудио в текст",
    keywords: "notta, нотта, транскрибация, расшифровка аудио, аудио в текст, заметки со встречи, перевод записи, transcription, meeting notes",
    ru: {
      d: "Расшифровывает встречи, звонки и аудиозаписи в текст, делает саммари и переводит результат на другой язык.",
      f: ["Транскрибация в реальном времени", "Поддержка 58 языков", "AI-саммари и список задач", "Импорт аудио и видеофайлов"],
      p: ["Хорошее качество распознавания", "Много языков, включая русский", "Недорогой платный тариф"],
      c: ["Лимит минут на бесплатном тарифе", "Сложные акценты распознаёт хуже"],
    },
    en: {
      d: "Transcribes meetings, calls and recordings into text, summarises them and translates the result into another language.",
      f: ["Real-time transcription", "58 languages supported", "AI summaries and action items", "Audio and video file import"],
      p: ["Solid recognition quality", "Wide language coverage", "Affordable paid plan"],
      c: ["Minute limits on the free plan", "Struggles with heavy accents"],
    },
  },
  {
    name: "Fireflies.ai", slug: "fireflies-ai", cat: "meetings", domain: "fireflies.ai",
    url: "https://fireflies.ai/", free: "yes", price_type: "freemium", price: "Free / от $10 в мес.",
    rating: 4.5, popularity: 71, popular: "yes", featured: "no",
    tags: "встречи, zoom, саммари, crm, транскрибация",
    keywords: "fireflies, файрфлайс, ассистент встреч, запись zoom, google meet, teams, протокол встречи, саммари звонка, meeting assistant, notetaker",
    ru: {
      d: "AI-ассистент, который сам подключается к Zoom, Meet и Teams, записывает встречу, делает расшифровку, саммари и список задач.",
      f: ["Автоподключение к Zoom, Google Meet и Teams", "Расшифровка и поиск по всем встречам", "Саммари и задачи после звонка", "Интеграции с CRM и Slack"],
      p: ["Полностью автоматический протокол встреч", "Мощный поиск по разговорам", "Есть бесплатный тариф"],
      c: ["Нужно согласие участников на запись", "Русский распознаётся хуже английского"],
    },
    en: {
      d: "An AI assistant that joins your Zoom, Meet and Teams calls, records them and delivers transcripts, summaries and action items.",
      f: ["Auto-joins Zoom, Google Meet and Teams", "Transcripts with search across all meetings", "Post-call summaries and tasks", "CRM and Slack integrations"],
      p: ["Fully automatic meeting minutes", "Powerful conversation search", "Free tier available"],
      c: ["Requires participant consent to record", "Non-English accuracy is lower"],
    },
  },
  {
    name: "Beautiful.ai", slug: "beautiful-ai", cat: "presentations", domain: "beautiful.ai",
    url: "https://www.beautiful.ai/", free: "no", price_type: "paid", price: "от $12 в мес.",
    rating: 4.3, popularity: 60, popular: "no", featured: "no",
    tags: "презентации, слайды, дизайн, шаблоны, бренд",
    keywords: "beautiful ai, презентация, слайды, дизайн презентации, шаблоны слайдов, питч дек, presentation, slides, pitch deck",
    ru: {
      d: "Презентации, которые верстают себя сами: слайды автоматически перестраиваются под содержимое и остаются аккуратными.",
      f: ["Умные слайды с автовёрсткой", "Генерация презентации по теме", "Фирменные шаблоны и брендбук команды", "Экспорт в PowerPoint и PDF"],
      p: ["Всегда аккуратный дизайн", "Экономит часы на вёрстке", "Удобно для команд"],
      c: ["Нет бесплатного тарифа", "Меньше свободы, чем в PowerPoint"],
    },
    en: {
      d: "Presentations that design themselves: slides re-layout automatically as you add content and always stay tidy.",
      f: ["Smart slides with automatic layout", "Generate a deck from a topic", "Branded templates and team brand kit", "Export to PowerPoint and PDF"],
      p: ["Consistently polished design", "Saves hours of formatting", "Great for teams"],
      c: ["No free plan", "Less freedom than PowerPoint"],
    },
  },
  {
    name: "Tome", slug: "tome", cat: "presentations", domain: "tome.app",
    url: "https://tome.app/", free: "yes", price_type: "freemium", price: "Free / платные тарифы",
    rating: 4.1, popularity: 55, popular: "no", featured: "no",
    tags: "презентации, сторителлинг, питч, слайды, визуал",
    keywords: "tome, том, презентация по промпту, сторителлинг, питч дек, визуальная история, ai presentation, storytelling deck",
    ru: {
      d: "Генерирует презентации-истории по короткому описанию: сам пишет текст слайдов и подбирает визуальное оформление.",
      f: ["Презентация целиком по одному промпту", "Готовые визуальные макеты", "Совместная работа над документом", "Публикация по ссылке"],
      p: ["Очень быстрый черновик презентации", "Современный визуальный стиль", "Есть бесплатный тариф"],
      c: ["Продукт сменил фокус на B2B-сценарии", "Меньше контроля над вёрсткой"],
    },
    en: {
      d: "Generates story-style presentations from a short prompt — it writes the slide copy and picks the visual treatment for you.",
      f: ["A full deck from a single prompt", "Ready-made visual layouts", "Collaborative editing", "Share by link"],
      p: ["Very fast first draft", "Modern visual style", "Free tier available"],
      c: ["Product shifted focus to B2B use cases", "Less layout control"],
    },
  },
];
