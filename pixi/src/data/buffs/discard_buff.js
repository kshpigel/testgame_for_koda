import { Buff } from './buff.js'

// Бафф: при сбросе этой карты — бафает определённые карты
// Параметры: faction, kind, id, value
export class DiscardBuff extends Buff {
  // Пустой apply — бафф активируется только при сбросе
  apply(sel_card, selectedCards, allCards, battle) {
    return []
  }

  onDiscard(discardedCard, allCards, battle) {
    const { faction = null, kind = null, id = null, value = 0 } = this.params

    // Баффаем все карты в руке (кроме сброшенной и выбранных)
    allCards.forEach(card => {
      if (card === discardedCard) return
      if (card.isSelected) return // не баффам выбранные

      // Фильтрация по параметрам
      if (faction && card.cardData?.faction !== faction) return
      if (kind && card.cardData?.kind !== kind) return
      if (id && card.cardData?.type !== id) return

      // Применяем бафф
      card.addBuff('discard_buff', 'discard', value)
    })

    // Баффаем карты в колоде (currentDeck)
    if (battle.currentDeck) {
      battle.currentDeck.forEach(cardData => {
        // Фильтрация по параметрам
        if (faction && cardData.faction !== faction) return
        if (kind && cardData.kind !== kind) return
        if (id && cardData.type !== id) return

        // Для колоды нужно хранить бафф отдельно
        // Пока пропустим - нужно продумать как хранить баффы в колоде
      })
    }
  }
}
