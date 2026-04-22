import { Buff } from './buff.js'
import { t } from '../i18n.js'

// 2. Увеличивает HP всем выбранным картам, если сам есть в руке и не выбран
// Параметры: value (N)
export class SelectedIfNotSelected extends Buff {
  apply(sel_card, selectedCards, allCards, battle) {
    const value = this.params.value || 1

    // Работает только если сам НЕ выбран (лежит в руке)
    if (sel_card.isSelected) return []

    const results = []
    selectedCards.forEach(card => {
      results.push({ card, value })
    })

    return results
  }

  getWeight(deck, cardType, stepsPerBattle = 4) {
    const deckSize = deck.length
    const selfStayProbability = 1 - (8 / deckSize)  // шанс остаться в руке
    const targetsProbability = 0.5  // эвристика: есть ли выбранные карты
    
    const totalProbability = selfStayProbability * targetsProbability
    
    // В среднем бафф влияет на 3 карты
    return this.params.value * 3 * totalProbability
  }

  getNotificationMessage(sel_card, value) {
    return t('cards.buffs.selected_if_not_selected', { value })
  }
}
