import { Buff } from './buff.js'

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

  getWeight(deck, cardType) {
    // Среднее значение между min и max
    const avg = (this.params.min + this.params.max) / 2
    // Влияет на 2-3 карты
    return avg * 2 * 0.1
  }
}
