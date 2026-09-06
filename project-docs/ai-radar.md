# AI Radar

Лента обновлений, новых моделей и трендов в мире AI. Полностью управляется из админки.

## Где смотреть

- Публичная страница: `/radar` — фильтр по типу записи, закреплённые записи всегда сверху.
- Главная страница: блок «AI Radar» с шестью последними записями (`getRadarItems({ limit: 6 })`).
- Ссылка в шапке сайта и в мобильном меню.

## Управление

Админка → **AI Radar** (`/admin/radar`). Поля карточки:

| Поле | Назначение |
|------|-----------|
| `title_ru` / `title_uk` / `title_en` | Заголовок на трёх языках (хотя бы один обязателен) |
| `summary_ru` / `summary_uk` / `summary_en` | Краткое описание |
| `radar_type` | `model`, `tool`, `update`, `research`, `funding`, `trend` |
| `importance` | `low`, `normal`, `high` — влияет на бейдж |
| `source_name` / `source_url` | Первоисточник, открывается в новой вкладке |
| `published_at` | Дата публикации, по ней идёт сортировка |
| `image_url` | Внешняя обложка |
| `cover` | Загруженная обложка (до 1 файла, 10 МБ) — приоритетнее `image_url` |
| `service` | Связь с карточкой сервиса из каталога |
| `category` | Связь с категорией |
| `pinned` | Закрепить в начале ленты |
| `active` | Показывать на сайте |
| `order_position` | Ручной порядок |

## Технические детали

- Таблица: `ai_radar`. Связи `service` → `services`, `category` → `categories` (objectReference, manyToOne).
- Публичный API: `GET /api/radar?type=<тип>&limit=<n>`.
- Админ-API: `GET/POST /api/admin/radar`, `PUT/DELETE /api/admin/radar/[id]`.
- Сортировка: сначала `pinned = yes`, затем `published_at` по убыванию.
- Стартовый контент: `scripts/seed-radar.mjs` (12 записей, идемпотентный).
