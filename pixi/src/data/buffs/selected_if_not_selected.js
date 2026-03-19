import { Buff } from './buff.js'

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
}
