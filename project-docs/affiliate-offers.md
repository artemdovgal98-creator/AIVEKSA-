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
Загружено **89 офферов**: CrakRevenue 49, MyLead 6, Awin 34 (ровно те, что перечислены в ТЗ).
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
