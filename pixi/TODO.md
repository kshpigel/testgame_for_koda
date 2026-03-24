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

## Последние изменения
- Circle: радиальный градиент (normal, selected, buffed)
- HandRenderer: веер карт с наклоном, центрирование
- Card: анимированная тень при выборе, zIndex исправлен
- Portal: scale по центру
- DeckMenu: переписан на Modal
- Modal: showCloseButton опция