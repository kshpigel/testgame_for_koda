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

    // Баффаем все карты в руке (кроме сброшенной и выбранных) — permanent бафф
    allCards.forEach(card => {
      if (card === discardedCard) return
      if (card.isSelected) return // не баффам выбранные

      // Фильтрация по параметрам
      if (faction && card.cardData?.faction !== faction) return
      if (kind && card.cardData?.kind !== kind) return
      if (id && card.cardData?.type !== id) return

      // Применяем PERMANENT бафф (не сбрасывается при выборе карты)
      card.addPermanentBuff(value)
    })

    // Добавляем в permanentBuffs для будущих карт из колоды
    if (faction) {
      battle.permanentBuffs[faction] = (battle.permanentBuffs[faction] || 0) + value
    }
    if (kind) {
      battle.permanentBuffs[kind] = (battle.permanentBuffs[kind] || 0) + value
    }
    if (id) {
      battle.permanentBuffs[id] = (battle.permanentBuffs[id] || 0) + value
    }
  }
}
