import { Buff } from './buff.js'
import { t } from '../i18n.js'

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

  getWeight(deck, cardType, stepsPerBattle = 4) {
    // Средний размер колоды ~40-50 карт
    // Шанс выбрать эту карту = 8 / deck.length
    const deckSize = deck.length
    const selectProbability = 8 / deckSize
    
    // Ожидаемый урон = размер колоды × вероятность выбора
    return 30 * selectProbability
  }

  getNotificationMessage(sel_card, value) {
    return t('cards.buffs.deck_count', { count: value })
  }
}
