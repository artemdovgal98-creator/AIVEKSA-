# Партнёрские офферы — структура и работа

## База данных

### `affiliate_networks` — партнёрские сети
| Поле | Тип | Назначение |
|---|---|---|
| `name` | string | CrakRevenue / MyLead / Awin |
| `slug` | string | `crakrevenue`, `mylead`, `awin` |
| `website` | string (link) | сайт сети |
| `description` | long-string | краткое описание вертикали |
| `accent_color` | string | HEX-акцент для бейджей в админке |
| `order_position` | number | порядок вкладок |
| `active` | options (yes/no) | активна ли сеть |
| `affiliate_offers` | objectReference oneToMany → `affiliate_offers` | все офферы сети |

### `affiliate_offers` — офферы
| Поле | Тип | Назначение |
|---|---|---|
| `offer_name` | string | название оффера как в кабинете сети |
| `external_id` | string | ID оффера в сети (напр. CrakRevenue `10335`) |
| `affiliate_url` | string (link) | **уникальная партнёрская ссылка владельца** |
| `payout_model` | options | `pps` / `revshare` / `multi_cpa` / `smartlink` / `cpa` / `other` |
| `network` | objectReference manyToOne → `affiliate_networks` | сеть оффера |
| `service` | objectReference manyToOne → `services` | привязка к AI-сервису каталога |
| `notes` | long-string | заметки |
| `order_position` | number | порядок в списке |
| `active` | options (yes/no) | включён ли оффер |
| `clicks` | objectReference oneToMany → `clicks` | клики по офферу |

Добавлено в существующие таблицы:
- `services.affiliate_offers` — oneToMany → `affiliate_offers`
- `clicks.offer` — manyToOne → `affiliate_offers` (клик по офферу пишется в общую статистику)

## Наполнение

`scripts/offers-data.mjs` + `scripts/seed-offers.mjs` — идемпотентный сидер.
Загружено **92 оффера**: CrakRevenue 50, MyLead 6, Awin 36.
`affiliate_url` всегда пустой — реальная ссылка уникальна для аккаунта и вставляется владельцем в админке.

Повторный запуск: `node scripts/seed-offers.mjs` (существующие офферы и уже сохранённые ссылки не перезаписываются).

## Админ-панель

`/admin/offers` — вкладка «Партнёрские офферы».

- Вкладки по сетям с счётчиком `со ссылкой / всего`.
- Карточки статистики: всего, со ссылкой, без ссылки, привязано к сервисам.
- Поиск по названию / ID оффера / ссылке, фильтр «все / со ссылкой / без ссылки».
- **У каждого оффера — поле ввода партнёрской ссылки и кнопка «Сохранить»** (кнопка активна только когда значение изменилось; Enter тоже сохраняет).
- Копирование ссылки, проверка перехода, вкл/выкл оффера, удаление.
- Селект «Сервис в каталоге» — привязка оффера к любому из AI-сервисов.
- Кнопка «Добавить оффер» — ручное добавление нового оффера в выбранную сеть.

API: `GET /api/admin/networks`, `GET|POST /api/admin/offers`, `PUT|DELETE /api/admin/offers/[id]`.
Все ответы в формате `{ ok, data }`, доступ только для роли `admin`.

## Куда ведут клики

1. `/go/offer/<id>` — прямой переход по офферу (публичная страница `/offers`). Пишет клик в `clicks` с `offer`, `target_url`, устройством и страной, затем 302 на сохранённый URL.
2. `/go/<slug>` (кнопка «Попробовать» у AI-сервиса) — приоритет ссылок:
   1. собственный `affiliate_url` сервиса,
   2. `affiliate_url` активного оффера, привязанного к этому сервису,
   3. официальный сайт сервиса.

## Публичная страница

`/offers` — витрина офферов, сгруппированных по сетям. Показывает **только** офферы, у которых
владелец сохранил ссылку и которые включены. Пока ссылок нет — страница показывает пустое
состояние. Ссылка добавлена в шапку сайта, в `middleware.ts` (публичный маршрут) и в `sitemap.xml`.

---

## Каталог: 50 партнёрских элементов (категория «AI-компаньоны»)

Категория `companions` (💬 AI-компаньоны / AI-компаньйони / AI companions) содержит
50 карточек каталога, добавленных по списку владельца. Каждая карточка привязана
1:1 к своему офферу CrakRevenue (позиции 1–50), поэтому ссылка, сохранённая на
оффере, сразу используется кнопкой «Попробовать» на карточке.

Куда вставлять ссылку — любой из трёх вариантов, все ведут к одному результату:

1. **Админка → Партнёрские офферы → CrakRevenue** — инлайн-поле + «Сохранить» у каждого оффера.
2. **Админка → Affiliate Manager** — инлайн-редактор ссылки у сервиса (ставит `is_affiliate: yes` и статус `connected`).
3. **Админка → Сервисы** — поле `affiliate_url` в редакторе карточки.

Приоритет перехода в `/go/[slug]`: собственная ссылка сервиса → ссылка привязанного
оффера → официальный сайт. Пока ссылки нет, переход ведёт на страницу сервиса
`/ai/[slug]`, а не в никуда.

| # | Карточка каталога | Оффер CrakRevenue |
|---|-------------------|-------------------|
| 1 | Companion AI - Type A | Candy.ai - PPS (10335) |
| 2 | Virtual GF - Type A | Девушка GPT - PPS (10046) |
| 3 | Dream Partner - Type A | DreamCompanion - PPS (10480) |
| 4 | Assistant GO - Type A | Golove.ai - PPS (10463) |
| 5 | Chat Room - Type A | OhChat - PPS (10464) |
| 6 | Secure AI - Type A | Secrets.ai - PPS (10381) |
| 7 | Secure AI - Pro | Secrets.ai - PPS Премиум (10515) |
| 8 | GF Assistant - Pro | Girlfriend GPT - PPS Премиум (10407) |
| 9 | Smart Link Net | AI Smartlink (9403) |
| 10 | Companion AI - Type B | Candy.ai - PPS (10022) |
| 11 | Companion AI - RevShare | Candy.ai - RevShare (9022) |
| 12 | Short Video AI | CandyShorts - PPS (10468) |
| 13 | Link Multi CPA | DarLink AI - Мульти-CPA (10470) |
| 14 | Link Standard | DarLink AI - PPS (10345) |
| 15 | Link RevShare | DarLink AI - RevShare (10344) |
| 16 | Dondi Tool AI | Dondi.ai - PPS (10418) |
| 17 | Dream BF - RevShare | DreamBF.ai - RevShare (9183) |
| 18 | Dream GF - RevShare | Dreamgf.ai - RevShare (9057) |
| 19 | Dreamz Platform | Dreamz.ai - PPS (10460) |
| 20 | H-Content AI | eHentai.ai - RevShare (9182) |
| 21 | Fan Content - Type A | Фанфинити - PPS (10141) |
| 22 | Fan Content - Revenue | Fanfinity - Доля выручки (10140) |
| 23 | Fantasy Platform | Fantasy.Ai - Доля выручки (10057) |
| 24 | Cam Stream - Type A | FlirtCam.ai - PPS (10404) |
| 25 | Cam Stream - Revenue | FlirtCam.ai - RevShare (10403) |
| 26 | Generator Content - RevShare | GeneratePorn.ai - RevShare (10512) |
| 27 | Generator Content - PPS | GeneratePorn.ai - PPS (10513) |
| 28 | Harder Platform | Get-Harder - PPS (10182) |
| 29 | Joi Assistant - Type A | Джой - PPS (10415) |
| 30 | Joi Assistant - Tier 1 Pro | Joi - PPS - T1 (Премиум) (10443) |
| 31 | Joi Assistant - Lifetime | Joi - Revshare Lifetime (10222) |
| 32 | Kupid AI - PPS | Kupid.ai - PPS (10469) |
| 33 | Kupid AI - RevShare | Kupid.ai - RevShare (9619) |
| 34 | Lovel Platform | Lovel.ai - PPS (10423) |
| 35 | Lovescape - Type A | Лавскейп - PPS (10223) |
| 36 | Lovescape - RevShare | Lovescape - RevShare (10224) |
| 37 | Lusy Chat Platform | LusyChat - PPS (10467) |
| 38 | MyLovely AI - Type A | MyLovely Ai - PPS (10417) |
| 39 | MyLovely AI - Revenue | MyLovely Ai - Доля дохода (10318) |
| 40 | Ourdream AI - Type A | ourdream.ai - PPS (10138) |
| 41 | Ourdream AI - Pro | ourdream.ai - PPS (Премиум) (10402) |
| 42 | Ourdream AI - Revenue | ourdream.ai - Доля дохода (10139) |
| 43 | Ourdream AI - H Content | ourdream.ai - PPS Хентай (10482) |
| 44 | Promptchan Platform | Promptchan - PPS (10257) |
| 45 | Secure AI - Lifetime | Secrets.ai - RevShare (10406) |
| 46 | Multi-CPA Network 2 | Более острый - Мульти-CPA (10219) |
| 47 | Swipey Platform | Swipey - PPS (10100) |
| 48 | Xotic AI - Type A | Xotic AI - PPS (10349) |
| 49 | Xotic AI - Revenue | Xotic AI - Доля выручки (10401) |
| 50 | CrakRevenue Bonus Link | CrakRevenue Bonus Link (без ID) |

Пересоздать/обновить: `scripts/seed-companions.mjs` (идемпотентный, сохранённые
ссылки никогда не перезаписываются). Данные карточек — `scripts/companions-data.mjs`.

Оффер №50 «CrakRevenue Bonus Link» не имеет ID в дашборде сети — он заведён в
`scripts/offers-data.mjs` с пустым `external_id`, поле для ссылки работает так же.

### Префикс «Crak: » в названиях

Все 50 карточек категории переименованы с префиксом `Crak: ` (например
`Crak: Companion AI - Type A`), чтобы сеть была видна сразу в каталоге и в
админ-панели. Переименование делает скрипт `scripts/prefix-crak-names.mjs`:
он читает сервисы категории `companions` из базы и добавляет префикс тем, у
кого его ещё нет — список названий нигде не захардкожен, повторный запуск
безопасен. Поле `keywords` намеренно не меняется, поэтому поиск по исходному
названию продолжает работать. Данные сидера (`scripts/companions-data.mjs`)
обновлены с тем же префиксом, чтобы повторный сид не откатывал названия.


### Префикс «Awin: » в названиях офферов

Все 36 позиций сети Awin переименованы с префиксом `Awin: ` (например
`Awin: 3DMakerpro Global`), чтобы они визуально отличались от офферов других
сетей в админ-панели. Позиции 35 и 36 — свободные слоты
(`Awin: Awin Partner Slot 1/2`) под новые офферы сети.

Переименование делает скрипт `scripts/sync-offer-names.mjs`: он берёт список
названий из `scripts/offers-data.mjs` (единственный источник правды по
инвентарю) и сопоставляет его с базой по `order_position` внутри каждой сети.
Скрипт идемпотентен: уже корректные названия пропускаются, недостающие позиции
создаются, а сохранённый владельцем `affiliate_url` никогда не перезаписывается.

Исходные названия из дашборда Awin сохранены построчными комментариями в
`scripts/offers-data.mjs`, поэтому соответствие «наше название ↔ оффер в сети»
не потеряно.


---

## Финальная структуризация каталога по сетям

Каждая позиция всех трёх сетей теперь существует и как оффер в админ-панели, и
как публичная карточка каталога. Карточка связана со своим оффером полем
`affiliate_offers.service` (objectReference), поэтому `/go/<slug>` открывает
именно ту ссылку, которую владелец сохранил в Admin → Партнёрские офферы.

| Сеть | Позиций | Категория каталога | Иконка |
|---|---|---|---|
| CrakRevenue | 50 | `companions` — «AI-компаньоны» | 🐋 `/brand/crakrevenue-whale.svg` |
| Awin | 36 | `awin-partners` — «Awin — софт и гаджеты» | 🔥 `/brand/awin-flame.svg` |
| MyLead | 6 | `mylead-offers` — «MyLead — мобильные офферы» | 💰 `/brand/mylead-moneybag.svg` |

Всего 92 партнёрские карточки + 53 обычных сервиса = 145 записей в `services`.

### Названия и префиксы

- Названия офферов — единый источник правды `scripts/offers-data.mjs`.
  Скрипт `scripts/sync-offer-names.mjs` приводит базу к этому файлу: сопоставляет
  по `order_position` внутри сети, переименовывает расхождения, создаёт
  недостающие позиции. Ничего не захардкожено, повторный запуск безопасен.
  Исходные названия из дашбордов сетей сохранены построчными комментариями.
- Все три префикса (`Crak: `, `Awin: `, `MyLead: `) стоят и на офферах, и на
  карточках каталога, поэтому сеть видна сразу в любом списке.

### Фирменные иконки

`scripts/brand-icons.mjs` проставляет `logo_url` и `affiliate_network`, определяя
сеть **по префиксу названия сервиса** — списка сервисов в скрипте нет. Иконки
лежат в `public/brand` и зарегистрированы в `assets/files.ts` (`BRAND_ICONS`).
Скрипт идемпотентен и вызывается автоматически в конце
`scripts/seed-networks-catalog.mjs`.

### Карточки Awin и MyLead

Данные — `scripts/networks-catalog-data.mjs` (две категории, 10 архетипов
контента, 36 + 6 карточек). Каждая карточка заполнена на трёх языках: описание,
особенности, плюсы и минусы, теги, цена, рейтинг — пустых карточек нет.
Сидер — `scripts/seed-networks-catalog.mjs`: идемпотентный, сопоставляет сервисы
по `slug`, привязывает их к офферам по `order_position` и никогда не
перезаписывает сохранённые владельцем ссылки (`affiliate_url`, `is_affiliate`,
`affiliate_status`, `logo_url`).

Позиции Awin 35–36 — свободные слоты (`Awin: Awin Partner Slot 1/2`) под новые
офферы сети: достаточно поменять название, описание и вставить ссылку в админке.

### Порядок запуска скриптов

1. `node scripts/seed-offers.mjs` — сети и инвентарь офферов
2. `node scripts/sync-offer-names.mjs` — названия офферов из `offers-data.mjs`
3. `node scripts/seed-companions.mjs` — 50 карточек CrakRevenue
4. `node scripts/seed-networks-catalog.mjs` — 36 карточек Awin + 6 MyLead + иконки
