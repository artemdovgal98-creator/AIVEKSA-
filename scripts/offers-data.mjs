/**
 * AIVEXA — affiliate offer inventory.
 *
 * Every offer below is copied verbatim from the owner's own network dashboards
 * (CrakRevenue / MyLead / Awin). `affiliate_url` is ALWAYS empty here: the real
 * tracking link is unique per account and is pasted by the owner in
 * Admin → Партнёрские офферы. Nothing is invented.
 */

export const NETWORKS = [
  {
    slug: "crakrevenue",
    name: "CrakRevenue",
    website: "https://www.crakrevenue.com",
    accent_color: "#ff5a36",
    order_position: 1,
    description: "CPA-сеть с офферами AI-компаньонов и dating-вертикали. Модели выплат: PPS, RevShare Lifetime, Multi-CPA, Smartlink.",
  },
  {
    slug: "mylead",
    name: "MyLead",
    website: "https://mylead.global",
    accent_color: "#22c55e",
    order_position: 2,
    description: "Международная CPA-сеть: мобильные AI-приложения, подписки и лид-формы.",
  },
  {
    slug: "awin",
    name: "Awin",
    website: "https://www.awin.com",
    accent_color: "#4c6fff",
    order_position: 3,
    description: "Глобальная партнёрская платформа: софт, гаджеты, AI-сервисы и e-commerce бренды.",
  },
];

/** payout model is derived from the offer name as it appears in the network. */
export const OFFERS = {
  crakrevenue: [
    ["Candy.ai - PPS", "10335", "pps"],
    ["Девушка GPT - PPS", "10046", "pps"],
    ["DreamCompanion - PPS", "10480", "pps"],
    ["Golove.ai - PPS", "10463", "pps"],
    ["OhChat - PPS", "10464", "pps"],
    ["Secrets.ai - PPS", "10381", "pps"],
    ["Secrets.ai - PPS (Премиум)", "10515", "pps"],
    ["Girlfriend GPT - PPS (Премиум)", "10407", "pps"],
    ["AI Smartlink", "9403", "smartlink"],
    ["Candy.ai - PPS", "10022", "pps"],
    ["Candy.ai - Пожизненное распределение доходов", "9022", "revshare"],
    ["CandyShorts - PPS", "10468", "pps"],
    ["DarLink AI - Мульти-CPA", "10470", "multi_cpa"],
    ["DarLink AI - PPS", "10345", "pps"],
    ["DarLink AI - Пожизненное распределение доходов", "10344", "revshare"],
    ["Dondi.ai - PPS", "10418", "pps"],
    ["DreamBF.ai - Пожизненное распределение доходов", "9183", "revshare"],
    ["Dreamgf.ai - Пожизненное распределение доходов", "9057", "revshare"],
    ["Dreamz.ai - PPS", "10460", "pps"],
    ["eHentai.ai - Пожизненное распределение доходов", "9182", "revshare"],
    ["Фанфинити - PPS", "10141", "pps"],
    ["Fanfinity - Доля выручки", "10140", "revshare"],
    ["Fantasy.Ai - Доля выручки", "10057", "revshare"],
    ["FlirtCam.ai - PPS", "10404", "pps"],
    ["FlirtCam.ai - Пожизненное распределение доходов", "10403", "revshare"],
    ["GeneratePorn.ai - Пожизненное распределение доходов", "10512", "revshare"],
    ["GeneratePorn.ai - PPS", "10513", "pps"],
    ["Get-Harder - PPS", "10182", "pps"],
    ["Джой - PPS", "10415", "pps"],
    ["Joi - PPS - T1 (Премиум)", "10443", "pps"],
    ["Joi - Revshare Lifetime", "10222", "revshare"],
    ["Kupid.ai - PPS", "10469", "pps"],
    ["Kupid.ai - Пожизненное распределение доходов", "9619", "revshare"],
    ["Lovel.ai - PPS", "10423", "pps"],
    ["Лавскейп - PPS", "10223", "pps"],
    ["Lovescape - Пожизненное распределение доходов", "10224", "revshare"],
    ["LusyChat - PPS", "10467", "pps"],
    ["MyLovely Ai - PPS", "10417", "pps"],
    ["MyLovely Ai - Доля дохода", "10318", "revshare"],
    ["ourdream.ai - PPS", "10138", "pps"],
    ["ourdream.ai - PPS (Премиум)", "10402", "pps"],
    ["ourdream.ai - Доля дохода", "10139", "revshare"],
    ["ourdream.ai - PPS Хентай", "10482", "pps"],
    ["Promptchan - PPS", "10257", "pps"],
    ["Secrets.ai - Пожизненное распределение доходов", "10406", "revshare"],
    ["Более острый - Мульти-CPA", "10219", "multi_cpa"],
    ["Swipey - PPS", "10100", "pps"],
    ["Xotic AI - PPS", "10349", "pps"],
    ["Xotic AI - Доля выручки", "10401", "revshare"],
    ["CrakRevenue Bonus Link", "", "multi_cpa"],
  ],
  mylead: [
    ["Анкета опроса (Сертифицированный бухгалтер CPA) — Вариант 1", "", "cpa"],
    ["Анкета опроса (Сертифицированный бухгалтер CPA) — Вариант 2", "", "cpa"],
    ["MyLovely Ai - WorldWide", "", "cpa"],
    ["RexTrix AI - Android - США", "", "cpa"],
    ["EvaAI", "", "cpa"],
    ["Искусственный интеллект в сфере безопасности — iOS", "", "cpa"],
  ],
  awin: [
    ["Awin: 3DMakerpro Global", "", "cpa"],  // 3DMakerpro (Global)
    ["Awin: Longger Technology", "", "cpa"],  // ЛОНГГЕР ТЕХНОЛОГИЯ ИНК.
    ["Awin: Inner Technology Co", "", "cpa"],  // Компания Inner Technology LLC
    ["Awin: Guangdong Kansept Tech", "", "cpa"],  // GUANGDONG KANSEPT TECHNOLOGY CO.LTD
    ["Awin: Sweetmyo AI Health Care", "", "cpa"],  // Зарегистрированный FDA костюм Sweetmyo® AI для оказания неотложной медицинской помощи на всё тело
    ["Awin: Welling AI Health Coach", "", "cpa"],  // Welling AI Health & Diet Coach
    ["Awin: Smart Fox App", "", "cpa"],  // Умный Лис
    ["Awin: Everblog US", "", "cpa"],  // Эверблог США
    ["Awin: Traverseon Platform", "", "cpa"],  // Траверсеон
    ["Awin: Imalent Store", "", "cpa"],  // ИМАЛЕНТ
    ["Awin: Riibase CRM System", "", "cpa"],  // Riibase CRM
    ["Awin: Vapesourcing Electronics", "", "cpa"],  // Shenzhen Vapesourcing Electronics Co., Ltd.
    ["Awin: Independent Advice Pub", "", "cpa"],  // Издательство «Самостоятельный совет»
    ["Awin: MiniTool Software", "", "cpa"],  // MiniTool Software Ltd
    ["Awin: DealFuel Digital", "", "cpa"],  // HB Digital Inc (DealFuel)
    ["Awin: Ghostwriter Express", "", "cpa"],  // Ghostwriter Express
    ["Awin: Electron App", "", "cpa"],  // Электрон
    ["Awin: Codeyang Platform", "", "cpa"],  // Кодеянг
    ["Awin: Audio Video Tech Access", "", "cpa"],  // Доступ к аудио- и видеотехнологиям
    ["Awin: Nitecore Store", "", "cpa"],  // Магазин NITECORE
    ["Awin: Maiqiwei Tech", "", "cpa"],  // Shenzhen MaiQiWei Technology Co., Ltd
    ["Awin: 70mai Tech Limited", "", "cpa"],  // 70mai Technology Limited
    ["Awin: Wondershare Global", "", "cpa"],  // Wondershare Global Limited
    ["Awin: AirDroid Service", "", "cpa"],  // AirDroid
    ["Awin: Keysfan Store", "", "cpa"],  // keysfan
    ["Awin: Photowhoa Media", "", "cpa"],  // HB Digital Inc (photowhoa)
    ["Awin: Maniana AI US", "", "cpa"],  // Maniana AI (США)
    ["Awin: AI Expert Academy", "", "cpa"],  // Академия экспертов по искусственному интеллекту
    ["Awin: Magic Glow Service", "", "cpa"],  // Волшебное сияние
    ["Awin: Pai Technology Inc", "", "cpa"],  // Pai Technology Inc.
    ["Awin: Nova3D Printer", "", "cpa"],  // 3D-принтер Nova3D
    ["Awin: Mobile Sphere Hub", "", "cpa"],  // Мобильная сфера
    ["Awin: Einstar System", "", "cpa"],  // Эйнстар
    ["Awin: Nutrinixy AI Calorie Tracker", "", "cpa"],  // Nutrinixy — AI-трекер калорий
    ["Awin: Awin Partner Slot 1", "", "cpa"],  // свободный слот под новый оффер Awin
    ["Awin: Awin Partner Slot 2", "", "cpa"],  // свободный слот под новый оффер Awin
  ],
};
