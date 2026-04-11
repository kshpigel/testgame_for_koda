# Архитектура сервера карточной игры

> **Статус:** Черновик (будет уточнён после завершения функционала клиента)

---

## 📋 Содержание

1. [Обзор архитектуры](#1-обзор-архитектуры)
2. [Сервисы и порты](#2-сервисы-и-порты)
3. [Структура проекта](#3-структура-проекта)
4. [База данных](#4-база-данных)
5. [REST API](#5-rest-api)
6. [Админка](#6-админка)
7. [Безопасность](#7-безопасность)
8. [Развёртывание](#8-развёртывание)

---

## 1. Обзор архитектуры

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Compose                        │
├───────────────────┬─────────────────────────────────────┤
│   Клиент          │      Laravel API                    │
│   (Pixi.js)       │      + MySQL + Redis                │
│                   │                                     │
│ • Vite dev        │ • REST API                          │
│ • Production      │ • Аутентификация (JWT)              │
│   (game.local)    │ • PvP (асинхронное)                 │
│                   │ • Уведомления                       │
│                   │ • Кэширование (Redis)               │
├───────────────────┴─────────────────────────────────────┤
│              MySQL + Redis                              │
└─────────────────────────────────────────────────────────┘
```

### Типы соединений

| Клиент → Сервер | Порт | Протокол | Описание |
|-----------------|------|----------|----------|
| Игра (разработка) | 8080 | HTTP | Vite dev-сервер |
| Игра (production) | 80 | HTTP | Nginx + Laravel |
| API | 8000 | HTTP | Laravel REST API |
| Adminer (БД) | 8081 | HTTP | Web-интерфейс MySQL (только dev) |

---

## 2. Сервисы и порты

| Сервис | Порт (dev) | Порт (prod) | Описание |
|--------|------------|-------------|----------|
| `client` | 8080 | - | Vite dev-сервер (только разработка) |
| `api` | 8000 | 80 | Laravel REST API + админка |
| `mysql` | 3306 | 3306 | База данных |
| `redis` | 6379 | 6379 | Кэширование |
| `adminer` | 8081 | - | Web-интерфейс БД (только dev) |

---

## 3. Структура проекта

```
/mnt/d/dev/testgame_for_koda/
├── pixi/                           # Клиент (Pixi.js)
│   ├── public/
│   │   └── assets/
│   │       ├── data/               # JSON (временные, до сервера)
│   │       │   ├── cards.json
│   │       │   ├── card_sleeves.json
│   │       │   ├── enemies.json
│   │       │   ├── decks.json
│   │       │   └── config.json
│   │       ├── img/
│   │       ├── fonts/
│   │       └── lang/
│   └── src/
│       ├── data/
│       │   ├── player.js           # Класс игрока → синхронизация с API
│       │   ├── collection_manager.js
│       │   ├── deck_manager.js
│       │   └── enemies.js
│       └── ui/
│           ├── battle.js
│           ├── map.js
│           └── base_screen.js
│
├── server/                         # Laravel API + Админка
│   ├── app/
│   │   ├── Models/
│   │   │   ├── User.php
│   │   │   ├── PlayerProfile.php
│   │   │   ├── Card.php
│   │   │   ├── CardSleeve.php
│   │   │   ├── Enemy.php
│   │   │   ├── Deck.php
│   │   │   ├── Dialog.php
│   │   │   └── Notification.php
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   ├── Api/
│   │   │   │   │   ├── AuthController.php
│   │   │   │   │   ├── PlayerController.php
│   │   │   │   │   ├── CardController.php
│   │   │   │   │   ├── EnemyController.php
│   │   │   │   │   ├── BattleController.php
│   │   │   │   │   ├── FriendController.php
│   │   │   │   │   └── NotificationController.php
│   │   │   │   └── Admin/
│   │   │   └── Requests/
│   │   └── Resources/
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   ├── resources/views/admin/      # Filament админка
│   └── artisan
│
├── docker-compose.yml
├── .env.example
├── SERVER_ARCHITECTURE.md          # Этот файл
├── GAME_DESIGN.md
└── KODA.md
```

---

## 4. База данных

### 4.1 ER-диаграмма (основные сущности)

```
┌──────────────┐       ┌──────────────────┐
│    users     │       │  player_profiles │
├──────────────┤       ├──────────────────┤
│ id           │──┐    │ id               │
│ username     │  │    │ user_id (FK)     │
│ email        │  │    │ gold             │
│ password     │  └───▶│ crystals         │
│ created_at   │       │ level            │
└──────────────┘       │ wins/losses      │
                       │ rating (ELO)     │
                       │ last_daily_claim │
                       └──────────────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   collections   │   │     decks       │   │  battle_history │
├─────────────────┤   ├─────────────────┤   ├─────────────────┤
│ id              │   │ id              │   │ id              │
│ user_id (FK)    │   │ user_id (FK)    │   │ attacker_id     │
│ card_id (FK)    │   │ name            │   │ defender_id     │
│ quantity        │   │ sleeve_id (FK)  │   │ battle_type     │
└─────────────────┘   │ power           │   │ winner_id       │
                      │ is_active       │   │ reward_gold     │
                      └─────────────────┘   │ reward_crystals │
                                            └─────────────────┘
```

### 4.2 Таблицы (детали)

#### users
| Поле | Тип | Описание |
|------|-----|----------|
| id | BIGINT PRIMARY KEY AUTO_INCREMENT | |
| username | VARCHAR(50) UNIQUE | Никнейм |
| email | VARCHAR(255) UNIQUE | |
| password_hash | VARCHAR(255) | bcrypt |
| is_banned | BOOLEAN DEFAULT FALSE | Бан |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### player_profiles
| Поле | Тип | Описание |
|------|-----|----------|
| id | BIGINT PRIMARY KEY AUTO_INCREMENT | |
| user_id | BIGINT FK → users | |
| gold | INT DEFAULT 0 | Валюта |
| crystals | INT DEFAULT 0 | Премиум валюта |
| level | INT DEFAULT 1 | |
| wins | INT DEFAULT 0 | Победы PvE |
| losses | INT DEFAULT 0 | Поражения |
| rating | INT DEFAULT 1000 | ELO для PvP |
| last_daily_claim | TIMESTAMP NULL | Последний вход |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### cards (мастер-таблица всех карт)
| Поле | Тип | Описание |
|------|-----|----------|
| id | BIGINT PRIMARY KEY AUTO_INCREMENT | |
| name | VARCHAR(100) | Название |
| description | TEXT | Описание способности |
| image | VARCHAR(255) | Путь к арту |
| cost | INT | Стоимость маны |
| hp | INT | HP |
| attack | INT | Атака |
| type | ENUM('unit','spell','ability') | Тип |
| faction | ENUM('people','dwarves','neutral','magic') | Фракция |
| rarity | ENUM('common','rare','epic','legendary') | Редкость |
| effect_type | VARCHAR(50) | Тип эффекта |
| effect_value | JSON | Параметры эффекта |
| created_at | TIMESTAMP | |

#### card_sleeves (рубашки колод)
| Поле | Тип | Описание |
|------|-----|----------|
| id | BIGINT PRIMARY KEY AUTO_INCREMENT | |
| name | VARCHAR(100) | |
| image | VARCHAR(255) | |
| turns_bonus | INT DEFAULT 0 | Бонус за ходы |
| discards_bonus | INT DEFAULT 0 | Бонус за сброс |
| rarity | ENUM('common','rare','epic','legendary') | |
| cost | INT | Цена в золоте |
| created_at | TIMESTAMP | |

#### enemies (мастер-таблица врагов)
| Поле | Тип | Описание |
|------|-----|----------|
| id | BIGINT PRIMARY KEY AUTO_INCREMENT | |
| name | VARCHAR(100) | |
| image | VARCHAR(255) | |
| hp | INT | HP |
| attack | INT | Атака |
| difficulty | ENUM('easy','medium','hard','boss') | |
| faction | VARCHAR(50) | Фракция |
| dialog_id | BIGINT FK → dialogs | Диалог при встрече |
| debuffs | JSON | Дебаффы |
| reward_gold | INT | Награда |
| reward_crystals | INT | Награда |
| rating | INT | Сила для PvP |
| created_at | TIMESTAMP | |

#### decks (колоды игроков)
| Поле | Тип | Описание |
|------|-----|----------|
| id | BIGINT PRIMARY KEY AUTO_INCREMENT | |
| user_id | BIGINT FK → users | |
| name | VARCHAR(100) | Название |
| sleeve_id | BIGINT FK → card_sleeves | Рубашка |
| power | INT | Расчётная сила |
| is_active | BOOLEAN DEFAULT TRUE | Активная колода |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### deck_cards (карты в колоде)
| Поле | Тип | Описание |
|------|-----|----------|
| id | BIGINT PRIMARY KEY AUTO_INCREMENT | |
| deck_id | BIGINT FK → decks | |
| card_id | BIGINT FK → cards | |
| quantity | INT DEFAULT 1 | Количество |

#### dialogs (диалоги)
| Поле | Тип | Описание |
|------|-----|----------|
| id | BIGINT PRIMARY KEY AUTO_INCREMENT | |
| name | VARCHAR(100) | Название |
| nodes | JSON | Структура диалога |
| created_at | TIMESTAMP | |

#### battle_history
| Поле | Тип | Описание |
|------|-----|----------|
| id | BIGINT PRIMARY KEY AUTO_INCREMENT | |
| attacker_id | BIGINT FK → users | Игрок (вызвавший) |
| defender_id | BIGINT FK → users | Защищающийся (друг) |
| battle_type | ENUM('pve','pvp') | Тип |
| winner_id | BIGINT FK → users | Победитель |
| duration_seconds | INT | Длительность |
| reward_gold | INT | Награда атакующего |
| reward_defender_gold | INT | Награда защищающегося (если победил) |
| reward_crystals | INT | Награда кристаллами |
| rating_change | INT | Изменение ELO (для PvP) |
| created_at | TIMESTAMP | |

#### notifications
| Поле | Тип | Описание |
|------|-----|----------|
| id | BIGINT PRIMARY KEY AUTO_INCREMENT | |
| user_id | BIGINT FK → users | Получатель |
| type | ENUM('pvp_challenge','pvp_result','daily_reward','system') | Тип |
| title | VARCHAR(255) | Заголовок |
| message | TEXT | Текст уведомления |
| data | JSON | Дополнительные данные (например, attacker_id) |
| read | BOOLEAN DEFAULT FALSE | Прочитано |
| created_at | TIMESTAMP | |

---

## 5. REST API

### 5.1 Аутентификация

#### POST /api/register
**Request:**
```json
{
  "username": "hero123",
  "email": "hero@example.com",
  "password": "secure_password"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "hero123",
      "email": "hero@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### POST /api/login
**Request:**
```json
{
  "email": "hero@example.com",
  "password": "secure_password"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {...},
    "token": "..."
  }
}
```

#### POST /api/logout
**Headers:** `Authorization: Bearer <token>`
**Response (200):**
```json
{ "success": true }
```

---

### 5.2 Профиль игрока

#### GET /api/player/profile
**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "hero123",
    "gold": 1500,
    "crystals": 50,
    "level": 5,
    "wins": 42,
    "losses": 8,
    "rating": 1250,
    "last_daily_claim": "2025-04-10T12:00:00Z"
  }
}
```

#### PUT /api/player/sync
**Headers:** `Authorization: Bearer <token>`
**Request:**
```json
{
  "gold": 1600,
  "crystals": 45,
  "wins": 43,
  "last_sync": "2025-04-11T10:00:00Z"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "gold": 1600,
    "crystals": 45,
    "wins": 43
  }
}
```

---

### 5.3 Коллекция карт

#### GET /api/player/collection
**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "card_id": 1,
      "card": {
        "id": 1,
        "name": "Рыцарь",
        "image": "cards/knight.png",
        "cost": 2,
        "hp": 3,
        "attack": 2
      },
      "quantity": 3,
      "haveInCollection": true,
      "inDeck": 2
    }
  ]
}
```

---

### 5.4 Колоды

#### GET /api/player/decks
**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Дварфская армия",
      "sleeve_id": 2,
      "sleeve": {
        "id": 2,
        "name": "Железная рубашка",
        "image": "sleeves/iron.png"
      },
      "power": 450,
      "is_active": true,
      "cards": [
        {
          "card_id": 1,
          "quantity": 3
        }
      ]
    }
  ]
}
```

#### POST /api/player/decks
**Headers:** `Authorization: Bearer <token>`
**Request:**
```json
{
  "name": "Новая колода",
  "sleeve_id": 2,
  "cards": [
    {"card_id": 1, "quantity": 3},
    {"card_id": 5, "quantity": 2}
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 4,
    "name": "Новая колода",
    "power": 380
  }
}
```

#### PUT /api/player/decks/{id}
**Request:** (аналогично POST, обновляет колоду)

#### DELETE /api/player/decks/{id}

---

### 5.5 Ежедневные награды

#### POST /api/player/daily-claim
**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "gold": 100,
    "crystals": 5,
    "streak": 3,
    "next_claim": "2025-04-12T00:00:00Z"
  }
}
```

**Response (429 - слишком рано):**
```json
{
  "success": false,
  "error": "Daily reward already claimed",
  "next_available": "2025-04-12T00:00:00Z"
}
```

---

### 5.6 Враги (PvE)

#### GET /api/enemies/random
**Headers:** `Authorization: Bearer <token>`
**Query:** `?difficulty=medium`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 15,
    "name": "Эльфийский лучник",
    "image": "enemies/elf_archer.png",
    "hp": 8,
    "attack": 3,
    "faction": "people",
    "dialog_id": 5,
    "debuffs": [
      {
        "type": "weaken_selected",
        "value": -3,
        "target_faction": "dwarves"
      }
    ],
    "reward_gold": 50,
    "reward_crystals": 5
  }
}
```

---

### 5.7 Бой

#### POST /api/battle/pve/complete
**Headers:** `Authorization: Bearer <token>`
**Request:**
```json
{
  "enemy_id": 15,
  "battle_log": [...],
  "duration_seconds": 120,
  "winner": "player"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "reward_gold": 50,
    "reward_crystals": 5,
    "new_gold": 1550,
    "new_wins": 43
  }
}
```

---

### 5.8 PvP (асинхронное)

#### GET /api/friends/invite
**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "invite_link": "https://game.local/register?token=abc123xyz",
    "token": "abc123xyz",
    "expires_at": "2025-04-18T00:00:00Z"
  }
}
```

#### POST /api/friends/accept-invite
**Request:**
```json
{
  "token": "abc123xyz",
  "username": "hero2",
  "email": "hero2@example.com",
  "password": "secure_password"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 43,
      "username": "hero2"
    },
    "inviter_id": 42,
    "message": "Добро пожаловать! Вы получили бонус за приглашение!"
  }
}
```

#### GET /api/friends/list
**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 42,
      "username": "friend1",
      "rating": 1250,
      "wins": 42,
      "last_seen": "2025-04-10T15:30:00Z"
    }
  ]
}
```

#### POST /api/battle/pvp/attack
**Headers:** `Authorization: Bearer <token>`
**Request:**
```json
{
  "defender_id": 42
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "battle_id": "pvp_123",
    "enemy": {
      "name": "hero1 (копия)",
      "image": "avatars/hero1.png",
      "hp": 15,
      "attack": 5,
      "faction": "dwarves",
      "debuffs": [
        {
          "type": "weaken_selected",
          "value": -3,
          "target_faction": "dwarves"
        }
      ],
      "deck_power": 450,
      "deck": {
        "name": "Дварфская армия",
        "sleeve": {...}
      }
    }
  }
}
```

**Response (400 - уже вызывал недавно):**
```json
{
  "success": false,
  "error": "Already challenged this friend recently",
  "next_available": "2025-04-12T00:00:00Z"
}
```

#### POST /api/battle/pvp/result
**Headers:** `Authorization: Bearer <token>`
**Request:**
```json
{
  "battle_id": "pvp_123",
  "defender_id": 42,
  "winner": "attacker",
  "battle_log": [...],
  "duration_seconds": 120
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "your_reward": {
      "gold": 50,
      "crystals": 5
    },
    "friend_notification_sent": true,
    "message": "Победа! Ваш друг получит уведомление."
  }
}
```

#### GET /api/notifications
**Headers:** `Authorization: Bearer <token>`
**Query:** `?unread_only=true&limit=20`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "type": "pvp_result",
      "title": "Дуэль завершена",
      "message": "hero2 вызвал вас на дуэль и победил!",
      "data": {
        "attacker_id": 43,
        "attacker_username": "hero2",
        "battle_id": "pvp_123"
      },
      "created_at": "2025-04-11T12:00:00Z",
      "read": false
    },
    {
      "id": 2,
      "type": "pvp_challenge",
      "title": "Новый вызов",
      "message": "hero3 хочет сразиться с вами!",
      "data": {
        "attacker_id": 44,
        "attacker_username": "hero3"
      },
      "created_at": "2025-04-11T10:00:00Z",
      "read": false
    }
  ],
  "total_unread": 2
}
```

#### PUT /api/notifications/{id}/read
**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "read": true
  }
}
```

---

### 5.9 Лидерборды

#### GET /api/leaderboard/global
**Query:** `?limit=100&offset=0`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "total": 1500,
    "players": [
      {"rank": 1, "username": "legend", "rating": 2500, "wins": 500},
      {"rank": 2, "username": "hero", "rating": 2450, "wins": 480}
    ]
  }
}
```

---

## 6. WebSocket протокол

### 6.1 Подключение

```javascript
const socket = io('ws://game-server:3000', {
  auth: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  }
});
```

### 6.2 События

#### client → server

| Событие | Данные | Описание |
|---------|--------|----------|
| `ping` | `{}` | Health check (каждые 30s) |
| `matchmaking_start` | `{ deck_id: number, rating_range?: number }` | Поиск соперника |
| `matchmaking_cancel` | `{}` | Отмена поиска |
| `battle_action` | `{ action: {...}, turn: number }` | Ход в бою |
| `battle_concede` | `{}` | Сдаться |
| `pong` | `{}` | Ответ на ping от сервера |

#### server → client

| Событие | Данные | Описание |
|---------|--------|----------|
| `pong` | `{ timestamp: number }` | Ответ на ping |
| `matchmaking_found` | `{ opponent_id: number, opponent_deck: {...} }` | Соперник найден |
| `matchmaking_not_found` | `{ reason: string }` | Поиск не удался |
| `battle_start` | `{ battle_id: string, opponent: {...}, your_deck: {...} }` | Начало боя |
| `opponent_action` | `{ action: {...}, turn: number }` | Ход противника |
| `battle_result` | `{ winner: 'you' | 'opponent', gold, crystals, rating_change }` | Результат |
| `error` | `{ code: string, message: string }` | Ошибка |

### 6.3 Пример сессии PvP

```javascript
// 1. Клиент ищет соперника
socket.emit('matchmaking_start', { deck_id: 1, rating_range: 100 });

// 2. Сервер нашёл соперника
socket.on('matchmaking_found', ({ opponent_id, opponent_deck }) => {
  console.log('Нашёл:', opponent_id);
});

// 3. Сервер начинает бой
socket.on('battle_start', ({ battle_id, opponent, your_deck }) => {
  // Отрисовка UI боя
});

// 4. Клиент делает ход
socket.emit('battle_action', {
  action: {
    type: 'play_card',
    card_id: 5,
    target: 'enemy'
  },
  turn: 1
});

// 5. Сервер передаёт ход противника
socket.on('opponent_action', ({ action, turn }) => {
  // Применяем ход противника
});

// 6. Бой закончен
socket.on('battle_result', ({ winner, gold, crystals, rating_change }) => {
  console.log(winner === 'you' ? 'Победа!' : 'Поражение');
  console.log('Рейтинг:', rating_change > 0 ? '+' : '', rating_change);
});
```

---

## 6. Админка

### 6.1 Платформа

Используем **Filament PHP** (готовая админка на Laravel):
- Автоматический CRUD
- Встроенная аутентификация
- Кастомные страницы и виджеты

### 6.2 Доступ

| Роль | Доступ |
|------|--------|
| Admin | Полный доступ |
| Moderator | Просмотр, редактирование контента (без пользователей) |
| Viewer | Только просмотр |

### 6.3 Пути

- `/admin` — главная админка (Dashboard)
- `/admin/cards` — управление картами
- `/admin/card-sleeves` — рубашки
- `/admin/enemies` — враги
- `/admin/dialogs` — диалоги (визуальный редактор)
- `/admin/decks` — просмотр колод игроков
- `/admin/users` — пользователи (бан, редактирование)
- `/admin/friends` — связи друзей (модерация)
- `/admin/notifications` — отправка уведомлений
- `/admin/battles` — история боёв (PvE + PvP)
- `/admin/leaderboard` — топ игроков

### 6.4 Визуальный редактор диалогов

```json
{
  "nodes": [
    {
      "id": "start",
      "text": "Приветствую, герой!",
      "speaker": "Копещица",
      "next": ["choice_1", "choice_2"]
    },
    {
      "id": "choice_1",
      "text": "Дай награду!",
      "speaker": "Игрок",
      "action": "claim_reward",
      "reward": { "gold": 100, "crystals": 5 }
    }
  ]
}
```

---

## 8. Безопасность

### 8.1 Аутентификация

- **JWT** для API (l tymon/laravel-jwt)
- **Refresh tokens** для продления сессии
- **WebSocket auth** — валидация JWT при подключении

### 8.2 Rate Limiting

| Эндпоинт | Лимит |
|----------|-------|
| /api/login | 5 за 60 сек |
| /api/register | 3 за 60 сек |
| /api/player/* | 60 за 60 сек |
| WebSocket | 30 сообщений/сек |

### 8.3 CORS

```
Allowed Origins:
- http://game.local:8080 (dev)
- http://game.local (prod)
- https://yourdomain.com (prod)
```

### 8.4 Защита данных

- Все чувствительные данные — через HTTPS (prod)
- Валидация входных данных (Form Requests)
- SQL Injection — защита через Eloquent ORM
- XSS — экранирование в Blade шаблонах

---

## 9. Развёртывание

### 9.1 Локальная разработка

```bash
# 1. Клонировать репозиторий
git clone <repo>
cd testgame_for_koda

# 2. Скопировать .env
cp .env.example .env

# 3. Запустить Docker
docker-compose up -d

# 4. Установить зависимости
cd server && composer install
cd ../game-server && npm install

# 5. Миграции БД
cd server && php artisan migrate --seed

# 6. Запустить dev-серверы
docker-compose exec api php artisan serve --host=0.0.0.0 --port=8000
cd game-server && npm run dev
```

### 9.2 Production

```bash
# 1. Сборка клиента
cd pixi && npm run build

# 2. Копировать dist в сервер
cp -r pixi/dist/* server/public/

# 3. Laravel production setup
cd server
composer install --optimize-autoloader --no-dev
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 4. Nginx конфиг
# См. docs/nginx.conf.production
```

### 9.3 Docker Compose (production)

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./server/public:/var/www/public
      - ./nginx.conf:/etc/nginx/nginx.conf

  api:
    build: ./server
    environment:
      - APP_ENV=production
      - DB_HOST=mysql
      - REDIS_HOST=redis

  game-server:
    build: ./game-server
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis

  mysql:
    image: mysql:8.0
    volumes:
      - mysql_data:/var/lib/mysql

  redis:
    image: redis:alpine

volumes:
  mysql_data:
```

---

## 10. План реализации

### Этап 0: Подготовка (текущий)
- [x] Создать SERVER_ARCHITECTURE.md (этот документ)
- [ ] Дописать функционал клиента (ежедневные награды, торговец, UI)
- [ ] Уточнить API контракты после завершения клиента

### Этап 1: Инфраструктура
- [ ] Настроить Docker (docker-compose.yml)
- [ ] Создать Laravel проект в `server/`
- [ ] Создать Node.js проект в `game-server/`
- [ ] Настроить CORS и health checks

### Этап 2: База данных + Laravel API
- [ ] Миграции БД (все таблицы из §4.2)
- [ ] Seeders — перенос из `pixi/public/assets/data/`
- [ ] JWT аутентификация (register, login, logout)
- [ ] API: /api/player/* (профиль, синхронизация)
- [ ] API: /api/cards/*, /api/decks/*
- [ ] API: /api/enemies/*, /api/battle/*

### Этап 3: Админка (Filament PHP)
- [ ] Установить Filament
- [ ] CardResource, CardSleeveResource, EnemyResource
- [ ] DialogResource (визуальный редактор)
- [ ] UserResource (бан, редактирование)
- [ ] Dashboard (виджеты: топ игроков, активность)

### Этап 4: Синхронизация клиента
- [ ] Заменить локальные JSON на API вызовы
- [ ] Player → PlayerAPI (синхронизация)
- [ ] CollectionManager → API
- [ ] DeckManager → API
- [ ] Кэширование на клиенте (IndexedDB)

### Этап 5: Node.js WebSocket сервер
- [ ] Socket.io сервер
- [ ] JWT middleware
- [ ] Matchmaking queue
- [ ] Battle room
- [ ] Интеграция с Laravel API (через HTTP или Redis)

### Этап 6: PvP поединки
- [ ] GET /api/enemies/pvp/list
- [ ] WebSocket: вызов друга, принятие
- [ ] Реалтайм бой
- [ ] ELO расчёт
- [ ] Лидерборды

### Этап 7: Тестирование + Релиз
- [ ] Load testing (ab, wrk)
- [ ] Security audit
- [ ] Production deployment
- [ ] Monitoring (Sentry, New Relic)

---

## 11. Контакты и ссылки

- **Репозиторий:** [GitHub](https://github.com/your-repo)
- **Документация:** SERVER_ARCHITECTURE.md, GAME_DESIGN.md
- **Локальный доступ:** http://game.local:8080 (dev), http://game.local (prod)

---

> **Последнее обновление:** 2026-04-11
> **Статус:** Черновик — ждёт уточнения после завершения функционала клиента
