import { Buff } from './buff.js'
import { t } from '../i18n.js'
import { log } from '../config.js'

// 6. Если выбрано строго N карт этого типа и только они: бафф +A, остальные в колоде сбрасываются
// Параметры: count (N), value (A), type (тип карты для сброса), firstTurnBonus (бонус на первый ход)
export class ExactTypeAndDiscard extends Buff {
  apply(sel_card, selectedCards, allCards, battle) {
    const count = this.params.count || 3
    const value = this.params.value || 20
    const firstTurnBonus = this.params.firstTurnBonus || 0
    
    // Работает только если сам ВЫБРАН
    if (!sel_card.isSelected) return []
    
    // Проверяем условие
    if (!this.checkCondition(sel_card, selectedCards, allCards, battle)) {
      return []
    }

    // Если первый ход - добавляем бонус
    const finalValue = battle.cntSteps === battle.defCntSteps ? value + firstTurnBonus : value

    const results = []
    selectedCards.forEach(card => {
      // isSet: true - устанавливаем значение (базовое игнорируется)
      results.push({ card, value: finalValue, isSet: true })
    })

    return results
  }

  checkCondition(sel_card, selectedCards, allCards, battle) {
    const count = this.params.count || 3
    
    // Проверяем, что строго N карт этого типа и только они выбраны
    const typeCount = selectedCards.filter(c => c.cardData.type === sel_card.cardData.type).length
    
    return typeCount === count && typeCount === selectedCards.length
  }

  // Сброс карт этого типа в колоде - вызывается после хода
  discardFromDeck(battle) {
    const cardType = this.params.type
    if (!cardType || !battle.currentDeck) return

    const cntInDeck = battle.currentDeck.filter(card => card.type === cardType).length
    
    if (cntInDeck > 0) {
      battle.currentDeck = battle.currentDeck.filter(card => card.type !== cardType)
      log(`Сброшено ${cntInDeck} карт типа ${cardType}`)
    }
  }

  isSpecial() {
    return true
  }

  getSpecialAction() {
    return 'discardFromDeck'
  }

  getNotificationMessage(sel_card, value) {
    return t('cards.buffs.exact_type_and_discard', { 
      name: sel_card?.cardData?.name || 'Лучник',
      value 
    })
  }

  getWeight(deck, cardType, stepsPerBattle = 4) {
    const count = deck.filter(t => t === cardType.type).length
    if (count >= this.params.count) {
      const value = this.params.value + (this.params.firstTurnBonus || 0)
      // Шанс собрать ровно N карт этого типа в руке (все N и только они)
      const probabilityPerTurn = this.calculateProbability(deck.length, this.params.count)
      // Ожидаемый урон за ход = сила × количество × вероятность
      return value * this.params.count * probabilityPerTurn
    }
    return 0
  }
}
