import { Buff } from './buff.js'
import { card_types } from '../card_types/index.js'
import { t } from '../i18n.js'

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

  getNotificationMessage(sel_card, value) {
    return t('cards.buffs.faction_hp', { value })
  }

  getWeight(deck, cardType, stepsPerBattle = 4) {
    const factionCards = deck.filter(t => {
      const ct = card_types.find(c => c.type === t)
      return ct && ct.faction === this.params.faction && ct.type !== cardType.type
    }).length

    if (factionCards === 0) return 0

    const deckSize = deck.length
    if (deckSize === 0) return 0
    
    const selfProbability = 8 / deckSize
    
    // Шанс что хотя бы одна карта фракции попадёт в руку
    const noTargetProbability = Math.pow(1 - 8/deckSize, Math.min(factionCards, 2))
    const targetProbability = 1 - noTargetProbability
    
    const totalProbability = selfProbability * targetProbability
    
    // Ожидаемый урон = сила баффа × количество целей × вероятность
    const result = this.params.value * Math.min(factionCards, 2) * totalProbability
    
    if (isNaN(result) || !isFinite(result)) {
      console.error('[FactionHp.getWeight] NaN detected!', {
        deckSize, factionCards, selfProbability, targetProbability,
        expectedDamagePerTurn, stepsPerBattle, result,
        cardType: cardType.type, params: this.params
      })
      return 0
    }
    
    return result
  }
}
