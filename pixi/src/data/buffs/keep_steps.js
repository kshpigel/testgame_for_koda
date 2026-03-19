import { Buff } from './buff.js'

// 5. Если выбрано >= N карт этого типа и только они, ходы не тратятся
// Параметры: count (N) - минимальное количество карт этого типа
export class KeepSteps extends Buff {
  // Этот бафф не меняет HP, а влияет на логику боя
  // Возвращает специальный флаг для battle.js
  
  apply(sel_card, selectedCards, allCards, battle) {
    return [] // Не влияет на HP
  }

  checkCondition(sel_card, selectedCards, allCards, battle) {
    const count = this.params.count || 3
    
    // Проверяем, что все выбранные карты этого типа
    const typeCount = selectedCards.filter(c => c.cardData.type === sel_card.cardData.type).length
    
    // Должно быть >= N карт этого типа И только они выбраны
    return typeCount >= count && typeCount === selectedCards.length
  }

  // Для специальной обработки в battle.js
  isSpecial() {
    return true
  }

  getSpecialAction() {
    return 'keepSteps'
  }

  getWeight(deck, cardType) {
    // Считаем сколько таких карт в колоде
    const count = deck.filter(t => t === cardType.type).length
    // Если есть enough карт, можно получить +1 ход
    // Оцениваем как 1 ход = средний урон за ход
    if (count >= this.params.count) {
      return 20 * 0.1 // Ожидаемый урон за доп ход
    }
    return 0
  }
}
