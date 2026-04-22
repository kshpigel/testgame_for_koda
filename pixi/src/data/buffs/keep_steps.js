import { Buff } from './buff.js'
import { t } from '../i18n.js'

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

  getNotificationMessage(sel_card, value) {
    return t('cards.buffs.keep_steps')
  }

  getWeight(deck, cardType, stepsPerBattle = 4) {
    const count = deck.filter(t => t === cardType.type).length
    if (count >= this.params.count) {
      // Шанс собрать >= N карт этого типа в руке
      const probabilityPerTurn = this.calculateProbability(deck.length, this.params.count)
      // Ожидаемый урон за доп ход = средний урон за ход (20)
      return 20 * probabilityPerTurn
    }
    return 0
  }
}
