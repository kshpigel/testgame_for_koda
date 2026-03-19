import { Buff } from './buff.js'

// 4. Если выбран, HP = количеству оставшихся в колоде карт
// Без параметров
export class DeckCount extends Buff {
  apply(sel_card, selectedCards, allCards, battle) {
    // Работает только если сам выбран
    if (!sel_card.isSelected) return []

    const deckCount = battle.currentDeck ? battle.currentDeck.length : 0

    // isSet = true - устанавливаем значение, не добавляем
    return [{ card: sel_card, value: deckCount, isSet: true }]
  }

  getWeight(deck, cardType) {
    // Средний размер колоды ~40-50 карт
    return 30 * 0.2
  }
}
