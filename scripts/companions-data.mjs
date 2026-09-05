/**
 * AIVEXA — 25 partner catalog entries requested by the owner.
 *
 * Each entry mirrors one CrakRevenue offer (matched by its `order_position`
 * in the offers inventory) so the offer's affiliate link drives the catalog card.
 * `affiliate_url` is ALWAYS empty here — the real tracking link is unique per
 * account and is pasted by the owner in the admin panel. Nothing is invented.
 */

export const COMPANION_CATEGORY = {
  slug: "companions",
  icon: "💬",
  name_ru: "AI-компаньоны",
  name_uk: "AI-компаньйони",
  name_en: "AI companions",
  order_position: 16,
  keywords:
    "компаньон, собеседник, чат, общение, персонаж, компаньйон, співрозмовник, спілкування, companion, chat, persona, roleplay",
};

/** Shared feature / pro / con copy per archetype — keeps 25 cards consistent. */
export const ARCHETYPES = {
  companion: {
    tags: "AI-компаньон, чат, персонализация",
    ru: {
      f: ["Диалоги с памятью контекста", "Настройка характера и стиля общения", "Голосовые ответы", "Веб и мобильный доступ"],
      p: ["Быстрый старт без настройки", "Персонализация под пользователя", "Есть бесплатный пробный режим"],
      c: ["Расширенные функции по подписке", "Доступ только для 18+"],
    },
    uk: {
      f: ["Діалоги з пам'яттю контексту", "Налаштування характеру та стилю спілкування", "Голосові відповіді", "Веб і мобільний доступ"],
      p: ["Швидкий старт без налаштування", "Персоналізація під користувача", "Є безкоштовний пробний режим"],
      c: ["Розширені функції за підпискою", "Доступ лише для 18+"],
    },
    en: {
      f: ["Context-aware conversations", "Custom personality and tone", "Voice replies", "Web and mobile access"],
      p: ["Instant start, no setup", "Personalised experience", "Free trial mode available"],
      c: ["Advanced features need a subscription", "18+ only"],
    },
  },
  smartlink: {
    tags: "трафик, смартлинк, автоподбор",
    ru: {
      f: ["Автоподбор оффера под трафик", "Гео- и девайс-таргетинг", "Одна ссылка для всех источников", "Статистика в реальном времени"],
      p: ["Одна ссылка вместо десятков", "Автооптимизация конверсии", "Подходит для холодного трафика"],
      c: ["Меньше контроля над конкретным оффером", "Нужен объём трафика для оптимизации"],
    },
    uk: {
      f: ["Автодобір пропозиції під трафік", "Гео- та девайс-таргетинг", "Одне посилання для всіх джерел", "Статистика в реальному часі"],
      p: ["Одне посилання замість десятків", "Автооптимізація конверсії", "Підходить для холодного трафіку"],
      c: ["Менше контролю над конкретною пропозицією", "Потрібен обсяг трафіку для оптимізації"],
    },
    en: {
      f: ["Automatic offer matching", "Geo and device targeting", "One link for every source", "Real-time statistics"],
      p: ["One link instead of dozens", "Self-optimising conversion", "Works with cold traffic"],
      c: ["Less control over the exact offer", "Needs volume before it optimises"],
    },
  },
  video: {
    tags: "видео, генерация, соцсети",
    ru: {
      f: ["Генерация коротких AI-видео", "Библиотека готовых шаблонов", "Вертикальный формат для соцсетей", "Экспорт в один клик"],
      p: ["Готовый ролик за минуты", "Не нужен монтаж", "Форматы под Reels и Shorts"],
      c: ["Лимиты на бесплатном плане", "Водяной знак без подписки"],
    },
    uk: {
      f: ["Генерація коротких AI-відео", "Бібліотека готових шаблонів", "Вертикальний формат для соцмереж", "Експорт в один клік"],
      p: ["Готовий ролик за хвилини", "Не потрібен монтаж", "Формати під Reels і Shorts"],
      c: ["Ліміти на безкоштовному плані", "Водяний знак без підписки"],
    },
    en: {
      f: ["Short AI video generation", "Ready-made template library", "Vertical social formats", "One-click export"],
      p: ["A finished clip in minutes", "No editing skills needed", "Reels and Shorts presets"],
      c: ["Free plan is capped", "Watermark without a subscription"],
    },
  },
  stream: {
    tags: "трансляции, видеочат, интерактив",
    ru: {
      f: ["Интерактивные видеосессии", "Живой чат в реальном времени", "Приватные комнаты", "HD-качество трансляции"],
      p: ["Мгновенное подключение", "Работает прямо в браузере", "Гибкая оплата за сессию"],
      c: ["Нужен стабильный интернет", "Доступ только для 18+"],
    },
    uk: {
      f: ["Інтерактивні відеосесії", "Живий чат у реальному часі", "Приватні кімнати", "HD-якість трансляції"],
      p: ["Миттєве підключення", "Працює просто в браузері", "Гнучка оплата за сесію"],
      c: ["Потрібен стабільний інтернет", "Доступ лише для 18+"],
    },
    en: {
      f: ["Interactive video sessions", "Real-time live chat", "Private rooms", "HD streaming quality"],
      p: ["Connect instantly", "Runs in the browser", "Flexible pay-per-session"],
      c: ["Needs a stable connection", "18+ only"],
    },
  },
  content: {
    tags: "контент, авторы, монетизация",
    ru: {
      f: ["Генерация изображений и текстов", "Управление подписчиками", "Монетизация контента", "Аналитика доходов"],
      p: ["Всё в одном кабинете", "Быстрые выплаты авторам", "Гибкие тарифы"],
      c: ["Комиссия платформы", "Модерация занимает время"],
    },
    uk: {
      f: ["Генерація зображень і текстів", "Керування підписниками", "Монетизація контенту", "Аналітика доходів"],
      p: ["Усе в одному кабінеті", "Швидкі виплати авторам", "Гнучкі тарифи"],
      c: ["Комісія платформи", "Модерація займає час"],
    },
    en: {
      f: ["Image and text generation", "Subscriber management", "Content monetisation", "Revenue analytics"],
      p: ["Everything in one dashboard", "Fast creator payouts", "Flexible pricing"],
      c: ["Platform takes a commission", "Moderation takes time"],
    },
  },
  tool: {
    tags: "AI-инструмент, сценарии, ассистент",
    ru: {
      f: ["AI-ассистент под задачи пользователя", "Готовые сценарии и промпты", "История диалогов", "Интеграции через API"],
      p: ["Простой интерфейс", "Быстрые ответы", "Бесплатный тариф на старте"],
      c: ["Лимит запросов на бесплатном плане", "Часть функций только в Pro"],
    },
    uk: {
      f: ["AI-асистент під завдання користувача", "Готові сценарії та промпти", "Історія діалогів", "Інтеграції через API"],
      p: ["Простий інтерфейс", "Швидкі відповіді", "Безкоштовний тариф на старті"],
      c: ["Ліміт запитів на безкоштовному плані", "Частина функцій лише в Pro"],
    },
    en: {
      f: ["Task-oriented AI assistant", "Ready-made scenarios and prompts", "Conversation history", "API integrations"],
      p: ["Clean interface", "Fast responses", "Free tier to start"],
      c: ["Request limits on the free plan", "Some features are Pro-only"],
    },
  },
};

/**
 * `offer` = order_position of the matching CrakRevenue offer, used to bind the
 * offer (and therefore its affiliate link) to this catalog card.
 */
export const COMPANION_SERVICES = [
  {
    offer: 1, name: "Companion AI - Type A", slug: "companion-ai-type-a", type: "companion",
    rating: 4.7, popularity: 92, price: "Бесплатный старт / Pro от $12 в мес.",
    ru: "AI-компаньон для живого общения: помнит контекст диалога, подстраивает характер и отвечает голосом.",
    uk: "AI-компаньйон для живого спілкування: пам'ятає контекст діалогу, підлаштовує характер і відповідає голосом.",
    en: "An AI companion for natural conversation: it remembers context, adapts its personality and replies with voice.",
  },
  {
    offer: 2, name: "Virtual GF - Type A", slug: "virtual-gf-type-a", type: "companion",
    rating: 4.5, popularity: 88, price: "Бесплатный старт / Pro от $9.99 в мес.",
    ru: "Виртуальный собеседник с настраиваемой личностью и постоянной историей общения.",
    uk: "Віртуальний співрозмовник із налаштовуваною особистістю та постійною історією спілкування.",
    en: "A virtual companion with a configurable personality and a persistent chat history.",
  },
  {
    offer: 3, name: "Dream Partner - Type A", slug: "dream-partner-type-a", type: "companion",
    rating: 4.4, popularity: 80, price: "Бесплатный старт / подписка от $14.99 в мес.",
    ru: "Платформа AI-компаньонов: выбираете образ и стиль речи и получаете диалог 24/7.",
    uk: "Платформа AI-компаньйонів: обираєте образ і стиль мовлення та отримуєте діалог 24/7.",
    en: "An AI companion platform: pick a persona and a speaking style, then chat around the clock.",
  },
  {
    offer: 4, name: "Assistant GO - Type A", slug: "assistant-go-type-a", type: "tool",
    rating: 4.3, popularity: 74, price: "Бесплатный тариф / Pro от $8 в мес.",
    ru: "Универсальный AI-ассистент для повседневных задач: ответы, идеи и черновики текстов.",
    uk: "Універсальний AI-асистент для щоденних завдань: відповіді, ідеї та чернетки текстів.",
    en: "A general-purpose AI assistant for everyday tasks: answers, ideas and draft texts.",
  },
  {
    offer: 5, name: "Chat Room - Type A", slug: "chat-room-type-a", type: "companion",
    rating: 4.4, popularity: 77, price: "Бесплатный старт / Pro от $11 в мес.",
    ru: "Тематические AI-чаты: несколько собеседников, групповые комнаты и приватные диалоги.",
    uk: "Тематичні AI-чати: кілька співрозмовників, групові кімнати та приватні діалоги.",
    en: "Themed AI chat rooms: multiple personas, group rooms and private conversations.",
  },
  {
    offer: 6, name: "Secure AI - Type A", slug: "secure-ai-type-a", type: "companion",
    rating: 4.6, popularity: 82, price: "Бесплатный старт / Pro от $10 в мес.",
    ru: "AI-чат с упором на приватность: изолированные сессии, шифрование и удаление истории в один клик.",
    uk: "AI-чат із наголосом на приватність: ізольовані сесії, шифрування та видалення історії в один клік.",
    en: "A privacy-first AI chat: isolated sessions, encryption and one-click history wipe.",
  },
  {
    offer: 7, name: "Secure AI - Pro", slug: "secure-ai-pro", type: "companion",
    rating: 4.7, popularity: 84, price: "Pro от $19 в мес.",
    ru: "Расширенный тариф приватного AI-чата: длинная память диалога, увеличенные лимиты и приоритетная скорость.",
    uk: "Розширений тариф приватного AI-чату: довга пам'ять діалогу, збільшені ліміти та пріоритетна швидкість.",
    en: "The premium tier of the privacy-first AI chat: longer memory, higher limits and priority speed.",
  },
  {
    offer: 8, name: "GF Assistant - Pro", slug: "gf-assistant-pro", type: "companion",
    rating: 4.6, popularity: 86, price: "Pro от $17 в мес.",
    ru: "Премиум AI-компаньон: расширенная память диалога, голосовые ответы и эксклюзивные образы.",
    uk: "Преміум AI-компаньйон: розширена пам'ять діалогу, голосові відповіді та ексклюзивні образи.",
    en: "A premium AI companion: extended conversation memory, voice replies and exclusive personas.",
  },
  {
    offer: 9, name: "Smart Link Net", slug: "smart-link-net", type: "smartlink",
    rating: 4.5, popularity: 90, price: "Бесплатно для партнёров",
    ru: "Умная ссылка: сама подбирает подходящий оффер под гео, устройство и источник трафика.",
    uk: "Розумне посилання: саме добирає відповідну пропозицію під гео, пристрій і джерело трафіку.",
    en: "A smart link that routes each visitor to the best-matching offer by geo, device and source.",
  },
  {
    offer: 10, name: "Companion AI - Type B", slug: "companion-ai-type-b", type: "companion",
    rating: 4.6, popularity: 85, price: "Бесплатный старт / Pro от $12 в мес.",
    ru: "Альтернативный вход в платформу AI-компаньонов — отдельная воронка и собственный лендинг.",
    uk: "Альтернативний вхід у платформу AI-компаньйонів — окрема воронка та власний лендинг.",
    en: "An alternative entry point to the AI companion platform with its own funnel and landing page.",
  },
  {
    offer: 11, name: "Companion AI - RevShare", slug: "companion-ai-revshare", type: "companion",
    rating: 4.7, popularity: 89, price: "Бесплатный старт / Pro от $12 в мес.",
    ru: "AI-компаньон с моделью пожизненного распределения дохода от подписок приведённого пользователя.",
    uk: "AI-компаньйон із моделлю довічного розподілу доходу від підписок приведеного користувача.",
    en: "The AI companion platform on a lifetime revenue-share model tied to the referred user's subscriptions.",
  },
  {
    offer: 12, name: "Short Video AI", slug: "short-video-ai", type: "video",
    rating: 4.4, popularity: 78, price: "Бесплатный тариф / Pro от $15 в мес.",
    ru: "Генератор коротких AI-видео для соцсетей: шаблоны, вертикальный формат и экспорт за минуту.",
    uk: "Генератор коротких AI-відео для соцмереж: шаблони, вертикальний формат та експорт за хвилину.",
    en: "A short-form AI video generator for social feeds: templates and vertical export in under a minute.",
  },
  {
    offer: 13, name: "Link Multi CPA", slug: "link-multi-cpa", type: "smartlink",
    rating: 4.3, popularity: 72, price: "Бесплатно для партнёров",
    ru: "Мульти-CPA поток: одна ссылка ведёт на пул офферов с оплатой за каждое целевое действие.",
    uk: "Мульти-CPA потік: одне посилання веде на пул пропозицій з оплатою за кожну цільову дію.",
    en: "A multi-CPA stream: one link feeds a pool of offers that pay per completed action.",
  },
  {
    offer: 14, name: "Link Standard", slug: "link-standard", type: "smartlink",
    rating: 4.2, popularity: 70, price: "Бесплатно для партнёров",
    ru: "Базовый поток трафика с фиксированной выплатой за каждую подтверждённую продажу.",
    uk: "Базовий потік трафіку з фіксованою виплатою за кожен підтверджений продаж.",
    en: "The standard traffic stream with a fixed payout per confirmed sale.",
  },
  {
    offer: 15, name: "Link RevShare", slug: "link-revshare", type: "smartlink",
    rating: 4.4, popularity: 75, price: "Бесплатно для партнёров",
    ru: "Тот же поток в модели revshare: процент с платежей приведённого пользователя без ограничения по сроку.",
    uk: "Той самий потік у моделі revshare: відсоток з платежів приведеного користувача без обмеження за строком.",
    en: "The same stream on revenue share: an uncapped percentage of every payment the referred user makes.",
  },
  {
    offer: 16, name: "Dondi Tool AI", slug: "dondi-tool-ai", type: "tool",
    rating: 4.3, popularity: 68, price: "Бесплатный тариф / Pro от $9 в мес.",
    ru: "AI-инструмент с готовыми сценариями: помогает получить результат без промпт-инжиниринга.",
    uk: "AI-інструмент із готовими сценаріями: допомагає отримати результат без промпт-інжинірингу.",
    en: "An AI tool with ready-made scenarios that gets results without prompt engineering.",
  },
  {
    offer: 17, name: "Dream BF - RevShare", slug: "dream-bf-revshare", type: "companion",
    rating: 4.5, popularity: 76, price: "Бесплатный старт / Pro от $13 в мес.",
    ru: "AI-компаньон в мужском образе: диалоги, голосовые ответы и долгосрочная память общения.",
    uk: "AI-компаньйон у чоловічому образі: діалоги, голосові відповіді та довгострокова пам'ять спілкування.",
    en: "A male-persona AI companion with conversations, voice replies and long-term memory.",
  },
  {
    offer: 18, name: "Dream GF - RevShare", slug: "dream-gf-revshare", type: "companion",
    rating: 4.6, popularity: 87, price: "Бесплатный старт / Pro от $13 в мес.",
    ru: "AI-компаньон в женском образе с настройкой внешности, характера и сценариев диалога.",
    uk: "AI-компаньйон у жіночому образі з налаштуванням зовнішності, характеру та сценаріїв діалогу.",
    en: "A female-persona AI companion with customisable looks, personality and conversation scenarios.",
  },
  {
    offer: 19, name: "Dreamz Platform", slug: "dreamz-platform", type: "companion",
    rating: 4.4, popularity: 73, price: "Бесплатный старт / Pro от $11 в мес.",
    ru: "Платформа генеративных образов и диалогов: создаёте персонажа и сразу общаетесь с ним.",
    uk: "Платформа генеративних образів і діалогів: створюєте персонажа й одразу спілкуєтеся з ним.",
    en: "A generative persona platform: build a character, then talk to it right away.",
  },
  {
    offer: 20, name: "H-Content AI", slug: "h-content-ai", type: "content",
    rating: 4.3, popularity: 71, price: "Бесплатный тариф / Pro от $16 в мес.",
    ru: "Генератор стилизованных изображений с галереей, подписками и монетизацией авторов.",
    uk: "Генератор стилізованих зображень із галереєю, підписками та монетизацією авторів.",
    en: "A stylised image generator with a gallery, subscriptions and creator monetisation.",
  },
  {
    offer: 21, name: "Fan Content - Type A", slug: "fan-content-type-a", type: "content",
    rating: 4.4, popularity: 79, price: "Бесплатная регистрация / комиссия с продаж",
    ru: "Площадка для авторов: платный контент, подписчики и прямые донаты.",
    uk: "Майданчик для авторів: платний контент, підписники та прямі донати.",
    en: "A creator platform with paid content, subscribers and direct tips.",
  },
  {
    offer: 22, name: "Fan Content - Revenue", slug: "fan-content-revenue", type: "content",
    rating: 4.4, popularity: 77, price: "Бесплатная регистрация / комиссия с продаж",
    ru: "Та же площадка в модели revshare: доля от всех платежей приведённых подписчиков.",
    uk: "Той самий майданчик у моделі revshare: частка від усіх платежів приведених підписників.",
    en: "The same creator platform on revenue share: a cut of every payment referred subscribers make.",
  },
  {
    offer: 23, name: "Fantasy Platform", slug: "fantasy-platform", type: "companion",
    rating: 4.5, popularity: 81, price: "Бесплатный старт / Pro от $10 в мес.",
    ru: "Сервис интерактивных историй с AI: пользователь выбирает сюжет и ведёт диалог с персонажами.",
    uk: "Сервіс інтерактивних історій з AI: користувач обирає сюжет і веде діалог із персонажами.",
    en: "An interactive AI storytelling service: pick a plot and talk your way through it.",
  },
  {
    offer: 24, name: "Cam Stream - Type A", slug: "cam-stream-type-a", type: "stream",
    rating: 4.3, popularity: 83, price: "Регистрация бесплатно / оплата за сессию",
    ru: "Интерактивные видеотрансляции с живым чатом и приватными комнатами.",
    uk: "Інтерактивні відеотрансляції з живим чатом та приватними кімнатами.",
    en: "Interactive live video streams with real-time chat and private rooms.",
  },
  {
    offer: 25, name: "Cam Stream - Revenue", slug: "cam-stream-revenue", type: "stream",
    rating: 4.3, popularity: 80, price: "Регистрация бесплатно / оплата за сессию",
    ru: "Тот же сервис трансляций в модели revshare: процент со всех пополнений приведённого пользователя.",
    uk: "Той самий сервіс трансляцій у моделі revshare: відсоток з усіх поповнень приведеного користувача.",
    en: "The same streaming service on revenue share: a percentage of every top-up the referred user makes.",
  },
];
