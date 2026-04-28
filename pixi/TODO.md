# Текущее TODO

## Рефакторинг карт и баффов
- [x] Создать класс баффа (buff.js)
- [x] 6 баффов:
  - [x] FactionHp - фракция +N HP
  - [x] SelectedIfNotSelected - +N HP выбраным (если сам не выбран)
  - [x] SelectedRandomIfNotSelected - + случайное HP выбраным
  - [x] DeckCount - HP = кол-во в колоде
  - [x] KeepSteps - >= N карт этого типа, ходы не тратятся
  - [x] ExactTypeAndDiscard - строго N карт: бафф +A, остальные в колоде сбрасываются
- [x] JSON карт (cards.json) с kind, faction, maxInDeck
- [x] Интеграция в battle.js
- [x] Тестирование и отладка баффов
- [ ] Рефакторинг: баффы через события (battle emits: preTurn, postTurn, onSelect, onDeselect)

## Игровая экономика
- [x] Класс Player (localStorage)
- [x] 3 колоды в deck.js
- [x] Интеграция в game.js

## Следующие задачи
- Магазин карт
- Локализация
- [ ] Ежедневные награды за вход
- [ ] Торговец (магазин на карте)

## Коллекция карт и конструктор колоды

### Файлы данных
1. **public/assets/data/collection.json** - хранилище карт игрока
```json
{
  "maxCards": 60,
  "cards": {
    "1": 5,   // type 1 - 5 копий
    "2": 15,  // type 2 - 15 копий
    "5": 7,
    "6": 11,
    ...
  }
}
```
- `maxCards` - лимит хранимых карт (влияет на база)
- `cards` - объект { cardType: count }

2. **public/assets/data/decks.json** - колоды игрока
```json
{
  "decks": {
    "1": {
      "id": 1,
      "name": "Стартовая",
      "steps": 4,
      "cards": [6,6,6,5,5,3, ...]
    }
  },
  "activeDeck": 1
}
```
- `decks` - объект колод (пока 1)
- `activeDeck` - ID активной колоды

### Реализация
- [x] Создать файлы collection.json и decks.json с дефолтными данными
- [x] Класс CollectionManager (src/data/collection_manager.js)
  - load() / save() - работа с localStorage
  - addCard(type, count) / removeCard(type, count)
  - getCount(type) / getTotal()
  - getMax() - лимит
  - canAdd(type, count) - проверка лимита
- [x] Класс DeckManager (src/data/deck_manager.js)
  - load() / save() - работа с decks.json + localStorage
  - getDeck(id) / getActiveDeck()
  - setActiveDeck(id)
  - addCardToDeck(deckId, type) / removeCardFromDeck(deckId, type)
  - validateDeck(deckId) - проверить что карты есть в коллекции
- [x] Класс Castle (src/ui/castle.js)
  - Визуальный компонент на базе UINode
  - click -> главное модальное окно с двумя ярлыками
  - "Хранилище" -> Modal с списком карт коллекции
  - "Колода" -> Modal с информацией о колоде и валидацией
- [x] Интеграция Castle в BaseScreen

## Уровень базы (будущий функционал)
- Влияет на количество хранимых карт
- Влияет на количество колод
- Влияет на количество доступных порталов

## Баги и доработки
- [ ] HP врагов не пересчитывается при каждом входе на карту (должен быть рандом из deck_power.js)

## Разработка Layout системы
- [x] Разработать класс Layout для Pixi.js (src/ui/layout.js)
  - [x] direction: 'row' | 'column'
  - [x] gap, padding
  - [x] width, height: number | 'auto'
  - [x] add(child, {flex, zIndex}) / remove(child)
  - [x] Абсолютное позиционирование children
  - [x] resize() callback для children
- [ ] Расширения: wrap, align, justify
- [ ] Использовать для UI из Figma
- [ ] Пример: переписать battle UI на Layout

## Модальные окна и диалоги
- [x] Базовый класс Modal
  - [x] Единообразный дизайн (фон, бордер)
  - [x] showCloseButton опция
- [ ] Текст со скроллом (ScrollableText)
- [ ] Закрытие по ESC
- [ ] Класс Dialog (наследует Modal)
  - [ ] Текстовое поле на всю ширину (внизу экрана)
  - [ ] Картинка персонажа в правом углу
  - [ ] Может показываться на любом экране (база, карта, бой)
  - [ ] Глобальный метод: Game.showDialog(text, characterImage?)
- [ ] Диалог при начале боя
  - [ ] Противник представляется и говорит свою фразу
  - [ ] Показывает применяемый дебафф (если есть)

## Последние изменения
- Circle: радиальный градиент (normal, selected, buffed)
- HandRenderer: веер карт с наклоном, центрирование
- Card: анимированная тень при выборе, zIndex исправлен
- Portal: scale по центру
- DeckMenu: переписан на Modal
- Modal: showCloseButton опция
- Адаптивный ресайз через CSS transform (сохраняет пропорции 1600×900)
- PWA: Service Worker, manifest.json, meta-теги для полноэкранного режима на мобильных
  - [ ] Тестирование PWA на телефоне (добавление на главный экран)
  - [ ] Замена заглушек иконок на реальные (icon-192.png, icon-512.png)