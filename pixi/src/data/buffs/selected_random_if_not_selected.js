import { Buff } from './buff.js'
import { t } from '../i18n.js'

// 3. Увеличивает HP всем выбранным картам в случайном порядке, если сам есть в руке и не выбран
// Параметры: min, max
export class SelectedRandomIfNotSelected extends Buff {
  apply(sel_card, selectedCards, allCards, battle) {
    const min = this.params.min || 1
    const max = this.params.max || 5

    // Работает только если сам НЕ выбран (лежит в руке)
    if (sel_card.isSelected) return []

    // Инициализируем хранилище если нет
    if (!battle.randomBuffs) {
      battle.randomBuffs = {}
    }

    const results = []
    selectedCards.forEach(card => {
      // Ключ для запоминания: id священника + id целевой карты
      const buffKey = `${sel_card.id}_${card.id}`
      
      // Если уже был бафф от этого священника для этой карты - используем его
      if (!battle.randomBuffs[buffKey]) {
        battle.randomBuffs[buffKey] = Math.floor(Math.random() * (max - min + 1)) + min
      }
      
      results.push({ card, value: battle.randomBuffs[buffKey] })
    })

    return results
  }

  getWeight(deck, cardType, stepsPerBattle = 4) {
    // Среднее значение между min и max
    const avg = (this.params.min + this.params.max) / 2
    
    const deckSize = deck.length
    const selfStayProbability = 1 - (8 / deckSize)  // шанс остаться в руке
    const targetsProbability = 0.5  // эвристика: есть ли выбранные карты
    
    const totalProbability = selfStayProbability * targetsProbability
    
    // В среднем бафф влияет на 3 карты
    return avg * 3 * totalProbability
  }

  getNotificationMessage(sel_card, value) {
    return t('cards.buffs.selected_random_if_not_selected', { value })
  }
}
