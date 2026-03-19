import { Buff } from './buff.js'
import { card_types } from '../card_types/index.js'

// 1. Увеличивает HP всем картам своей фракции, кроме себя, на +N
// Параметры: faction (people, dwarves, neutral, magic), value (N)
export class FactionHp extends Buff {
  apply(sel_card, selectedCards, allCards, battle) {
    const faction = this.params.faction
    const value = this.params.value || 1

    // Работает только если сам ВЫБРАН
    if (!sel_card.isSelected) return []

    const results = []
    selectedCards.forEach(card => {
      // Не баффаем себя
      if (card === sel_card) return
      // Не баффаем карты того же типа (другие Копейщицы)
      if (card.cardData.type === sel_card.cardData.type) return
      // Фракция совпадает
      if (card.cardData.faction === faction) {
        results.push({ card, value })
      }
    })

    return results
  }

  getWeight(deck, cardType) {
    // Считаем сколько карт той же фракции в колоде (кроме себя)
    const factionCards = deck.filter(t => {
      const ct = card_types.find(c => c.type === t)
      return ct && ct.faction === this.params.faction && ct.type !== cardType.type
    })
    // Ожидаем что бафф сработает на 1-2 карты за ход
    return this.params.value * Math.min(factionCards.length, 2) * 0.1
  }
}
