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

  // Рассчитать примерный вес баффа для симуляции
  // deck - массив typeId карт в колоде
  // cardType - тип текущей карты
  // Возвращает ожидаемый бонус к урону
  getWeight(deck, cardType) {
    return 0
  }
}
