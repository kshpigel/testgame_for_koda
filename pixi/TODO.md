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

## Уровень базы (будущий функционал)
- Влияет на количество хранимых карт
- Влияет на количество колод
- Влияет на количество доступных порталов

## Разработка Layout системы
- [ ] Разработать класс Layout для Pixi.js
  - [ ] Рисование объектов в ряд (horizontal)
  - [ ] Рисование объектов в колонку (vertical)
  - [ ] Многострочный layout (wrap)
  - [ ] Центрирование (align: start/center/end)
  - [ ] Процентные колонки (flex: 1, 2, 3...)
  - [ ] Отступы (gap, padding)
  - [ ] Вложенные layout-ы
- [ ] Использовать для UI из Figma
- [ ] Пример: переписать battle UI на Layout