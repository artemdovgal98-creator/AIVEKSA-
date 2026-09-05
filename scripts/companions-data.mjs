/**
 * AIVEXA — 50 partner catalog entries requested by the owner.
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
  wellness: {
    tags: "здоровье, велнес, подписка",
    ru: {
      f: ["Подбор программы под цель", "Доставка заказа на дом", "Поддержка специалиста", "Гибкая подписка"],
      p: ["Заказ онлайн без визитов", "Понятные инструкции", "Скидка на первый заказ"],
      c: ["Доступно не во всех странах", "Только для совершеннолетних"],
    },
    uk: {
      f: ["Добір програми під ціль", "Доставка замовлення додому", "Підтримка спеціаліста", "Гнучка підписка"],
      p: ["Замовлення онлайн без візитів", "Зрозумілі інструкції", "Знижка на перше замовлення"],
      c: ["Доступно не в усіх країнах", "Лише для повнолітніх"],
    },
    en: {
      f: ["Goal-based program matching", "Home delivery", "Specialist support", "Flexible subscription"],
      p: ["Order online, no appointments", "Clear instructions", "First-order discount"],
      c: ["Not available in every country", "Adults only"],
    },
  },
};

/**
 * `offer` = order_position of the matching CrakRevenue offer, used to bind the
 * offer (and therefore its affiliate link) to this catalog card.
 */
export const COMPANION_SERVICES = [
  {
    offer: 1, name: "Crak: Companion AI - Type A", slug: "companion-ai-type-a", type: "companion",
    rating: 4.7, popularity: 92, price: "Бесплатный старт / Pro от $12 в мес.",
    ru: "AI-компаньон для живого общения: помнит контекст диалога, подстраивает характер и отвечает голосом.",
    uk: "AI-компаньйон для живого спілкування: пам'ятає контекст діалогу, підлаштовує характер і відповідає голосом.",
    en: "An AI companion for natural conversation: it remembers context, adapts its personality and replies with voice.",
  },
  {
    offer: 2, name: "Crak: Virtual GF - Type A", slug: "virtual-gf-type-a", type: "companion",
    rating: 4.5, popularity: 88, price: "Бесплатный старт / Pro от $9.99 в мес.",
    ru: "Виртуальный собеседник с настраиваемой личностью и постоянной историей общения.",
    uk: "Віртуальний співрозмовник із налаштовуваною особистістю та постійною історією спілкування.",
    en: "A virtual companion with a configurable personality and a persistent chat history.",
  },
  {
    offer: 3, name: "Crak: Dream Partner - Type A", slug: "dream-partner-type-a", type: "companion",
    rating: 4.4, popularity: 80, price: "Бесплатный старт / подписка от $14.99 в мес.",
    ru: "Платформа AI-компаньонов: выбираете образ и стиль речи и получаете диалог 24/7.",
    uk: "Платформа AI-компаньйонів: обираєте образ і стиль мовлення та отримуєте діалог 24/7.",
    en: "An AI companion platform: pick a persona and a speaking style, then chat around the clock.",
  },
  {
    offer: 4, name: "Crak: Assistant GO - Type A", slug: "assistant-go-type-a", type: "tool",
    rating: 4.3, popularity: 74, price: "Бесплатный тариф / Pro от $8 в мес.",
    ru: "Универсальный AI-ассистент для повседневных задач: ответы, идеи и черновики текстов.",
    uk: "Універсальний AI-асистент для щоденних завдань: відповіді, ідеї та чернетки текстів.",
    en: "A general-purpose AI assistant for everyday tasks: answers, ideas and draft texts.",
  },
  {
    offer: 5, name: "Crak: Chat Room - Type A", slug: "chat-room-type-a", type: "companion",
    rating: 4.4, popularity: 77, price: "Бесплатный старт / Pro от $11 в мес.",
    ru: "Тематические AI-чаты: несколько собеседников, групповые комнаты и приватные диалоги.",
    uk: "Тематичні AI-чати: кілька співрозмовників, групові кімнати та приватні діалоги.",
    en: "Themed AI chat rooms: multiple personas, group rooms and private conversations.",
  },
  {
    offer: 6, name: "Crak: Secure AI - Type A", slug: "secure-ai-type-a", type: "companion",
    rating: 4.6, popularity: 82, price: "Бесплатный старт / Pro от $10 в мес.",
    ru: "AI-чат с упором на приватность: изолированные сессии, шифрование и удаление истории в один клик.",
    uk: "AI-чат із наголосом на приватність: ізольовані сесії, шифрування та видалення історії в один клік.",
    en: "A privacy-first AI chat: isolated sessions, encryption and one-click history wipe.",
  },
  {
    offer: 7, name: "Crak: Secure AI - Pro", slug: "secure-ai-pro", type: "companion",
    rating: 4.7, popularity: 84, price: "Pro от $19 в мес.",
    ru: "Расширенный тариф приватного AI-чата: длинная память диалога, увеличенные лимиты и приоритетная скорость.",
    uk: "Розширений тариф приватного AI-чату: довга пам'ять діалогу, збільшені ліміти та пріоритетна швидкість.",
    en: "The premium tier of the privacy-first AI chat: longer memory, higher limits and priority speed.",
  },
  {
    offer: 8, name: "Crak: GF Assistant - Pro", slug: "gf-assistant-pro", type: "companion",
    rating: 4.6, popularity: 86, price: "Pro от $17 в мес.",
    ru: "Премиум AI-компаньон: расширенная память диалога, голосовые ответы и эксклюзивные образы.",
    uk: "Преміум AI-компаньйон: розширена пам'ять діалогу, голосові відповіді та ексклюзивні образи.",
    en: "A premium AI companion: extended conversation memory, voice replies and exclusive personas.",
  },
  {
    offer: 9, name: "Crak: Smart Link Net", slug: "smart-link-net", type: "smartlink",
    rating: 4.5, popularity: 90, price: "Бесплатно для партнёров",
    ru: "Умная ссылка: сама подбирает подходящий оффер под гео, устройство и источник трафика.",
    uk: "Розумне посилання: саме добирає відповідну пропозицію під гео, пристрій і джерело трафіку.",
    en: "A smart link that routes each visitor to the best-matching offer by geo, device and source.",
  },
  {
    offer: 10, name: "Crak: Companion AI - Type B", slug: "companion-ai-type-b", type: "companion",
    rating: 4.6, popularity: 85, price: "Бесплатный старт / Pro от $12 в мес.",
    ru: "Альтернативный вход в платформу AI-компаньонов — отдельная воронка и собственный лендинг.",
    uk: "Альтернативний вхід у платформу AI-компаньйонів — окрема воронка та власний лендинг.",
    en: "An alternative entry point to the AI companion platform with its own funnel and landing page.",
  },
  {
    offer: 11, name: "Crak: Companion AI - RevShare", slug: "companion-ai-revshare", type: "companion",
    rating: 4.7, popularity: 89, price: "Бесплатный старт / Pro от $12 в мес.",
    ru: "AI-компаньон с моделью пожизненного распределения дохода от подписок приведённого пользователя.",
    uk: "AI-компаньйон із моделлю довічного розподілу доходу від підписок приведеного користувача.",
    en: "The AI companion platform on a lifetime revenue-share model tied to the referred user's subscriptions.",
  },
  {
    offer: 12, name: "Crak: Short Video AI", slug: "short-video-ai", type: "video",
    rating: 4.4, popularity: 78, price: "Бесплатный тариф / Pro от $15 в мес.",
    ru: "Генератор коротких AI-видео для соцсетей: шаблоны, вертикальный формат и экспорт за минуту.",
    uk: "Генератор коротких AI-відео для соцмереж: шаблони, вертикальний формат та експорт за хвилину.",
    en: "A short-form AI video generator for social feeds: templates and vertical export in under a minute.",
  },
  {
    offer: 13, name: "Crak: Link Multi CPA", slug: "link-multi-cpa", type: "smartlink",
    rating: 4.3, popularity: 72, price: "Бесплатно для партнёров",
    ru: "Мульти-CPA поток: одна ссылка ведёт на пул офферов с оплатой за каждое целевое действие.",
    uk: "Мульти-CPA потік: одне посилання веде на пул пропозицій з оплатою за кожну цільову дію.",
    en: "A multi-CPA stream: one link feeds a pool of offers that pay per completed action.",
  },
  {
    offer: 14, name: "Crak: Link Standard", slug: "link-standard", type: "smartlink",
    rating: 4.2, popularity: 70, price: "Бесплатно для партнёров",
    ru: "Базовый поток трафика с фиксированной выплатой за каждую подтверждённую продажу.",
    uk: "Базовий потік трафіку з фіксованою виплатою за кожен підтверджений продаж.",
    en: "The standard traffic stream with a fixed payout per confirmed sale.",
  },
  {
    offer: 15, name: "Crak: Link RevShare", slug: "link-revshare", type: "smartlink",
    rating: 4.4, popularity: 75, price: "Бесплатно для партнёров",
    ru: "Тот же поток в модели revshare: процент с платежей приведённого пользователя без ограничения по сроку.",
    uk: "Той самий потік у моделі revshare: відсоток з платежів приведеного користувача без обмеження за строком.",
    en: "The same stream on revenue share: an uncapped percentage of every payment the referred user makes.",
  },
  {
    offer: 16, name: "Crak: Dondi Tool AI", slug: "dondi-tool-ai", type: "tool",
    rating: 4.3, popularity: 68, price: "Бесплатный тариф / Pro от $9 в мес.",
    ru: "AI-инструмент с готовыми сценариями: помогает получить результат без промпт-инжиниринга.",
    uk: "AI-інструмент із готовими сценаріями: допомагає отримати результат без промпт-інжинірингу.",
    en: "An AI tool with ready-made scenarios that gets results without prompt engineering.",
  },
  {
    offer: 17, name: "Crak: Dream BF - RevShare", slug: "dream-bf-revshare", type: "companion",
    rating: 4.5, popularity: 76, price: "Бесплатный старт / Pro от $13 в мес.",
    ru: "AI-компаньон в мужском образе: диалоги, голосовые ответы и долгосрочная память общения.",
    uk: "AI-компаньйон у чоловічому образі: діалоги, голосові відповіді та довгострокова пам'ять спілкування.",
    en: "A male-persona AI companion with conversations, voice replies and long-term memory.",
  },
  {
    offer: 18, name: "Crak: Dream GF - RevShare", slug: "dream-gf-revshare", type: "companion",
    rating: 4.6, popularity: 87, price: "Бесплатный старт / Pro от $13 в мес.",
    ru: "AI-компаньон в женском образе с настройкой внешности, характера и сценариев диалога.",
    uk: "AI-компаньйон у жіночому образі з налаштуванням зовнішності, характеру та сценаріїв діалогу.",
    en: "A female-persona AI companion with customisable looks, personality and conversation scenarios.",
  },
  {
    offer: 19, name: "Crak: Dreamz Platform", slug: "dreamz-platform", type: "companion",
    rating: 4.4, popularity: 73, price: "Бесплатный старт / Pro от $11 в мес.",
    ru: "Платформа генеративных образов и диалогов: создаёте персонажа и сразу общаетесь с ним.",
    uk: "Платформа генеративних образів і діалогів: створюєте персонажа й одразу спілкуєтеся з ним.",
    en: "A generative persona platform: build a character, then talk to it right away.",
  },
  {
    offer: 20, name: "Crak: H-Content AI", slug: "h-content-ai", type: "content",
    rating: 4.3, popularity: 71, price: "Бесплатный тариф / Pro от $16 в мес.",
    ru: "Генератор стилизованных изображений с галереей, подписками и монетизацией авторов.",
    uk: "Генератор стилізованих зображень із галереєю, підписками та монетизацією авторів.",
    en: "A stylised image generator with a gallery, subscriptions and creator monetisation.",
  },
  {
    offer: 21, name: "Crak: Fan Content - Type A", slug: "fan-content-type-a", type: "content",
    rating: 4.4, popularity: 79, price: "Бесплатная регистрация / комиссия с продаж",
    ru: "Площадка для авторов: платный контент, подписчики и прямые донаты.",
    uk: "Майданчик для авторів: платний контент, підписники та прямі донати.",
    en: "A creator platform with paid content, subscribers and direct tips.",
  },
  {
    offer: 22, name: "Crak: Fan Content - Revenue", slug: "fan-content-revenue", type: "content",
    rating: 4.4, popularity: 77, price: "Бесплатная регистрация / комиссия с продаж",
    ru: "Та же площадка в модели revshare: доля от всех платежей приведённых подписчиков.",
    uk: "Той самий майданчик у моделі revshare: частка від усіх платежів приведених підписників.",
    en: "The same creator platform on revenue share: a cut of every payment referred subscribers make.",
  },
  {
    offer: 23, name: "Crak: Fantasy Platform", slug: "fantasy-platform", type: "companion",
    rating: 4.5, popularity: 81, price: "Бесплатный старт / Pro от $10 в мес.",
    ru: "Сервис интерактивных историй с AI: пользователь выбирает сюжет и ведёт диалог с персонажами.",
    uk: "Сервіс інтерактивних історій з AI: користувач обирає сюжет і веде діалог із персонажами.",
    en: "An interactive AI storytelling service: pick a plot and talk your way through it.",
  },
  {
    offer: 24, name: "Crak: Cam Stream - Type A", slug: "cam-stream-type-a", type: "stream",
    rating: 4.3, popularity: 83, price: "Регистрация бесплатно / оплата за сессию",
    ru: "Интерактивные видеотрансляции с живым чатом и приватными комнатами.",
    uk: "Інтерактивні відеотрансляції з живим чатом та приватними кімнатами.",
    en: "Interactive live video streams with real-time chat and private rooms.",
  },
  {
    offer: 25, name: "Crak: Cam Stream - Revenue", slug: "cam-stream-revenue", type: "stream",
    rating: 4.3, popularity: 80, price: "Регистрация бесплатно / оплата за сессию",
    ru: "Тот же сервис трансляций в модели revshare: процент со всех пополнений приведённого пользователя.",
    uk: "Той самий сервіс трансляцій у моделі revshare: відсоток з усіх поповнень приведеного користувача.",
    en: "The same streaming service on revenue share: a percentage of every top-up the referred user makes.",
  },
  {
    offer: 26, name: "Crak: Generator Content - RevShare", slug: "generator-content-revshare", type: "content",
    rating: 4.3, popularity: 74, price: "Бесплатный тариф / Pro от $15 в мес.",
    ru: "Генератор изображений по текстовому описанию с моделью пожизненного распределения дохода.",
    uk: "Генератор зображень за текстовим описом із моделлю довічного розподілу доходу.",
    en: "A text-to-image generator on a lifetime revenue-share model.",
  },
  {
    offer: 27, name: "Crak: Generator Content - PPS", slug: "generator-content-pps", type: "content",
    rating: 4.3, popularity: 72, price: "Бесплатный тариф / Pro от $15 в мес.",
    ru: "Тот же генератор изображений с фиксированной выплатой за каждую подтверждённую подписку.",
    uk: "Той самий генератор зображень із фіксованою виплатою за кожну підтверджену підписку.",
    en: "The same image generator with a fixed payout per confirmed subscription.",
  },
  {
    offer: 28, name: "Crak: Harder Platform", slug: "harder-platform", type: "wellness",
    rating: 4.1, popularity: 64, price: "Разовый заказ / подписка со скидкой",
    ru: "Велнес-платформа для мужского здоровья: подбор программы, консультация и доставка на дом.",
    uk: "Велнес-платформа для чоловічого здоров'я: добір програми, консультація та доставка додому.",
    en: "A men's wellness platform: program matching, a consultation and home delivery.",
  },
  {
    offer: 29, name: "Crak: Joi Assistant - Type A", slug: "joi-assistant-type-a", type: "companion",
    rating: 4.5, popularity: 84, price: "Бесплатный старт / Pro от $12 в мес.",
    ru: "AI-компаньон с голосовыми сообщениями и сценарными диалогами под настроение пользователя.",
    uk: "AI-компаньйон із голосовими повідомленнями та сценарними діалогами під настрій користувача.",
    en: "An AI companion with voice messages and scripted conversations tuned to your mood.",
  },
  {
    offer: 30, name: "Crak: Joi Assistant - Tier 1 Pro", slug: "joi-assistant-tier-1-pro", type: "companion",
    rating: 4.6, popularity: 86, price: "Pro от $19 в мес.",
    ru: "Премиум-тариф компаньона для стран Tier-1: увеличенные лимиты и приоритетная генерация ответов.",
    uk: "Преміум-тариф компаньйона для країн Tier-1: збільшені ліміти та пріоритетна генерація відповідей.",
    en: "The premium companion tier for Tier-1 countries: higher limits and priority response generation.",
  },
  {
    offer: 31, name: "Crak: Joi Assistant - Lifetime", slug: "joi-assistant-lifetime", type: "companion",
    rating: 4.5, popularity: 82, price: "Бесплатный старт / Pro от $12 в мес.",
    ru: "Тот же компаньон в модели revshare: доход с каждого платежа приведённого пользователя без срока.",
    uk: "Той самий компаньйон у моделі revshare: дохід з кожного платежу приведеного користувача без строку.",
    en: "The same companion on revenue share: income from every payment a referred user ever makes.",
  },
  {
    offer: 32, name: "Crak: Kupid AI - PPS", slug: "kupid-ai-pps", type: "companion",
    rating: 4.5, popularity: 83, price: "Бесплатный старт / Pro от $12.99 в мес.",
    ru: "Платформа AI-знакомств: подбор собеседника по интересам и постоянная история диалогов.",
    uk: "Платформа AI-знайомств: добір співрозмовника за інтересами та постійна історія діалогів.",
    en: "An AI dating platform: interest-based matching and a persistent chat history.",
  },
  {
    offer: 33, name: "Crak: Kupid AI - RevShare", slug: "kupid-ai-revshare", type: "companion",
    rating: 4.5, popularity: 81, price: "Бесплатный старт / Pro от $12.99 в мес.",
    ru: "Та же платформа знакомств в модели пожизненного распределения дохода.",
    uk: "Та сама платформа знайомств у моделі довічного розподілу доходу.",
    en: "The same dating platform on a lifetime revenue-share model.",
  },
  {
    offer: 34, name: "Crak: Lovel Platform", slug: "lovel-platform", type: "companion",
    rating: 4.3, popularity: 70, price: "Бесплатный старт / Pro от $10 в мес.",
    ru: "AI-сервис общения с персонажами: готовые образы, свои сценарии и память диалога.",
    uk: "AI-сервіс спілкування з персонажами: готові образи, власні сценарії та пам'ять діалогу.",
    en: "An AI character chat service: ready-made personas, custom scenarios and conversation memory.",
  },
  {
    offer: 35, name: "Crak: Lovescape - Type A", slug: "lovescape-type-a", type: "companion",
    rating: 4.5, popularity: 82, price: "Бесплатный старт / Pro от $12 в мес.",
    ru: "Платформа AI-компаньонов с конструктором внешности и характера персонажа.",
    uk: "Платформа AI-компаньйонів із конструктором зовнішності та характеру персонажа.",
    en: "An AI companion platform with a builder for the character's looks and personality.",
  },
  {
    offer: 36, name: "Crak: Lovescape - RevShare", slug: "lovescape-revshare", type: "companion",
    rating: 4.5, popularity: 80, price: "Бесплатный старт / Pro от $12 в мес.",
    ru: "Та же платформа в модели revshare: процент со всех подписок приведённого пользователя.",
    uk: "Та сама платформа в моделі revshare: відсоток з усіх підписок приведеного користувача.",
    en: "The same platform on revenue share: a percentage of every subscription a referred user pays.",
  },
  {
    offer: 37, name: "Crak: Lusy Chat Platform", slug: "lusy-chat-platform", type: "companion",
    rating: 4.2, popularity: 68, price: "Бесплатный старт / Pro от $9 в мес.",
    ru: "AI-чат с быстрым стартом: без регистрации на первом шаге и с настройкой стиля общения.",
    uk: "AI-чат зі швидким стартом: без реєстрації на першому кроці та з налаштуванням стилю спілкування.",
    en: "A fast-start AI chat: no sign-up on the first step and a configurable conversation style.",
  },
  {
    offer: 38, name: "Crak: MyLovely AI - Type A", slug: "mylovely-ai-type-a", type: "companion",
    rating: 4.4, popularity: 76, price: "Бесплатный старт / Pro от $11 в мес.",
    ru: "Мобильный AI-компаньон: чат, голос и ежедневные сценарии общения в приложении.",
    uk: "Мобільний AI-компаньйон: чат, голос і щоденні сценарії спілкування в застосунку.",
    en: "A mobile AI companion: chat, voice and daily conversation scenarios inside the app.",
  },
  {
    offer: 39, name: "Crak: MyLovely AI - Revenue", slug: "mylovely-ai-revenue", type: "companion",
    rating: 4.4, popularity: 74, price: "Бесплатный старт / Pro от $11 в мес.",
    ru: "Тот же мобильный компаньон с долей дохода от платежей приведённого пользователя.",
    uk: "Той самий мобільний компаньйон із часткою доходу від платежів приведеного користувача.",
    en: "The same mobile companion with a revenue share of every referred user's payments.",
  },
  {
    offer: 40, name: "Crak: Ourdream AI - Type A", slug: "ourdream-ai-type-a", type: "companion",
    rating: 4.6, popularity: 85, price: "Бесплатный старт / Pro от $12.99 в мес.",
    ru: "Платформа генерации персонажей и диалогов: создаёте образ и общаетесь с ним в чате.",
    uk: "Платформа генерації персонажів і діалогів: створюєте образ і спілкуєтеся з ним у чаті.",
    en: "A character generation and chat platform: build a persona and talk to it right away.",
  },
  {
    offer: 41, name: "Crak: Ourdream AI - Pro", slug: "ourdream-ai-pro", type: "companion",
    rating: 4.6, popularity: 84, price: "Pro от $19.99 в мес.",
    ru: "Премиум-доступ к платформе: больше генераций, длинная память диалога и приоритетная очередь.",
    uk: "Преміум-доступ до платформи: більше генерацій, довга пам'ять діалогу та пріоритетна черга.",
    en: "Premium access to the platform: more generations, longer memory and a priority queue.",
  },
  {
    offer: 42, name: "Crak: Ourdream AI - Revenue", slug: "ourdream-ai-revenue", type: "companion",
    rating: 4.5, popularity: 82, price: "Бесплатный старт / Pro от $12.99 в мес.",
    ru: "Та же платформа в модели revshare: доля дохода со всех платежей приведённого пользователя.",
    uk: "Та сама платформа в моделі revshare: частка доходу з усіх платежів приведеного користувача.",
    en: "The same platform on revenue share: a cut of every payment a referred user makes.",
  },
  {
    offer: 43, name: "Crak: Ourdream AI - H Content", slug: "ourdream-ai-h-content", type: "content",
    rating: 4.3, popularity: 73, price: "Бесплатный тариф / Pro от $14 в мес.",
    ru: "Отдельное направление платформы: генерация стилизованных изображений в аниме-эстетике.",
    uk: "Окремий напрям платформи: генерація стилізованих зображень в аніме-естетиці.",
    en: "A dedicated branch of the platform: stylised image generation in an anime aesthetic.",
  },
  {
    offer: 44, name: "Crak: Promptchan Platform", slug: "promptchan-platform", type: "content",
    rating: 4.4, popularity: 79, price: "Бесплатный тариф / Pro от $12 в мес.",
    ru: "Генератор изображений по промпту: пресеты стилей, редактирование деталей и своя галерея.",
    uk: "Генератор зображень за промптом: пресети стилів, редагування деталей і власна галерея.",
    en: "A prompt-driven image generator: style presets, detail editing and a personal gallery.",
  },
  {
    offer: 45, name: "Crak: Secure AI - Lifetime", slug: "secure-ai-lifetime", type: "companion",
    rating: 4.6, popularity: 81, price: "Бесплатный старт / Pro от $10 в мес.",
    ru: "Приватный AI-чат в модели revshare: доход с подписок приведённого пользователя без ограничения срока.",
    uk: "Приватний AI-чат у моделі revshare: дохід з підписок приведеного користувача без обмеження строку.",
    en: "The privacy-first AI chat on revenue share: uncapped income from a referred user's subscriptions.",
  },
  {
    offer: 46, name: "Crak: Multi-CPA Network 2", slug: "multi-cpa-network-2", type: "smartlink",
    rating: 4.2, popularity: 69, price: "Бесплатно для партнёров",
    ru: "Второй мульти-CPA поток: пул офферов с оплатой за регистрацию, депозит или подписку.",
    uk: "Другий мульти-CPA потік: пул пропозицій з оплатою за реєстрацію, депозит або підписку.",
    en: "A second multi-CPA stream: a pool of offers paying per sign-up, deposit or subscription.",
  },
  {
    offer: 47, name: "Crak: Swipey Platform", slug: "swipey-platform", type: "companion",
    rating: 4.3, popularity: 75, price: "Бесплатный старт / Pro от $9.99 в мес.",
    ru: "Сервис знакомств со свайп-механикой и AI-подсказками для первого сообщения.",
    uk: "Сервіс знайомств зі свайп-механікою та AI-підказками для першого повідомлення.",
    en: "A swipe-based dating service with AI suggestions for the opening message.",
  },
  {
    offer: 48, name: "Crak: Xotic AI - Type A", slug: "xotic-ai-type-a", type: "companion",
    rating: 4.4, popularity: 77, price: "Бесплатный старт / Pro от $11.99 в мес.",
    ru: "AI-компаньон с генерацией изображений персонажа прямо в диалоге.",
    uk: "AI-компаньйон із генерацією зображень персонажа просто в діалозі.",
    en: "An AI companion that generates character images right inside the conversation.",
  },
  {
    offer: 49, name: "Crak: Xotic AI - Revenue", slug: "xotic-ai-revenue", type: "companion",
    rating: 4.4, popularity: 75, price: "Бесплатный старт / Pro от $11.99 в мес.",
    ru: "Тот же компаньон в модели revshare: доля выручки с каждого платежа приведённого пользователя.",
    uk: "Той самий компаньйон у моделі revshare: частка виручки з кожного платежу приведеного користувача.",
    en: "The same companion on revenue share: a cut of every payment a referred user makes.",
  },
  {
    offer: 50, name: "Crak: CrakRevenue Bonus Link", slug: "crakrevenue-bonus-link", type: "smartlink",
    rating: 4.2, popularity: 66, price: "Бесплатно для партнёров",
    ru: "Бонусная ссылка сети: универсальный вход в каталог офферов с автоподбором под трафик.",
    uk: "Бонусне посилання мережі: універсальний вхід у каталог пропозицій з автодобором під трафік.",
    en: "The network's bonus link: a universal entry point that auto-matches an offer to your traffic.",
  },
];
