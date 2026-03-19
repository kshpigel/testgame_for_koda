import { Buff } from './buff.js'

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
}
