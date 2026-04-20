// Базовый класс баффа
export class Buff {
  constructor(params = {}) {
    this.params = params
  }

  // Применить бафф к выбранным картам
  // sel_card - карта, которая применяет бафф
  // selectedCards - массив выбранных карт
  // allCards - все карты в руке
  // Возвращает: массив { card, value, isSet } для applyBuff
  // isSet = true означает не добавлять, а установить значение
  apply(sel_card, selectedCards, allCards, battle) {
    throw new Error('Buff.apply() must be implemented')
  }

  // Проверить условие применения (для баффов типа 5 и 6)
  // Возвращает true/false
  checkCondition(sel_card, selectedCards, allCards, battle) {
    return true
  }

  // Расчёт вероятности срабатывания баффа
  // handSize - размер руки (по умолчанию 8)
  // cardsNeeded - сколько карт нужно для срабатывания
  // deckSize - размер колоды
  calculateProbability(deckSize, cardsNeeded, handSize = 8) {
    // Упрощённая формула: шанс что все нужные карты попадут в руку
    // P = (handSize / deckSize)^cardsNeeded
    if (deckSize <= 0 || cardsNeeded <= 0) return 0
    const prob = Math.pow(handSize / deckSize, cardsNeeded)
    return Math.min(1, prob)
  }

  // Рассчитать примерный вес баффа для симуляции
  // deck - массив typeId карт в колоде
  // cardType - тип текущей карты
  // stepsPerBattle - количество ходов в бою (для расчёта вероятности срабатывания)
  // Возвращает ожидаемый бонус к урону (сила × количество × вероятность × попытки)
  getWeight(deck, cardType, stepsPerBattle = 4) {
    return 0
  }
}
