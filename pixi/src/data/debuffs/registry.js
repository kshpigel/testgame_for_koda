// Реестр дебаффов и специальных баффов — подписка на события battle
import { apply as weakenSelected } from './weaken_selected.js'
import { apply as blockBuff } from './block_buff.js'
import { t } from '../i18n.js'

// Маппинг типов дебаффов на функции
const debuffHandlers = {
  weaken_selected: weakenSelected,
  block_buff: blockBuff
}

// Регистрация всех дебаффов и special баффов в battle
export function registerDebuffs(battle) {
  // Подписка на beforeBuffs — для дебаффов блокировки
  battle.on('beforeBuffs', (selectedCards, allCards, battle) => {
    // Очищаем дебаффы у всех карт
    allCards.forEach(card => {
      card.clearDebuffs()
    })

    if (!battle.enemyData.debuffs) return

    battle.enemyData.debuffs.forEach(debuff => {
      const handler = debuffHandlers[debuff.type]
      if (handler) {
        // block_buff применяем к selectedCards
        if (debuff.type === 'block_buff' && selectedCards.length > 0) {
          handler(selectedCards, debuff.params)
        }
      }
    })
  })

  // Подписка на afterBuffs — для дебаффов ослабления
  battle.on('afterBuffs', (selectedCards, allCards, battle) => {
    if (!battle.enemyData.debuffs) return

    battle.enemyData.debuffs.forEach(debuff => {
      const handler = debuffHandlers[debuff.type]
      if (handler) {
        // weaken_selected применяем к selectedCards
        if (debuff.type === 'weaken_selected' && selectedCards.length > 0) {
          handler(selectedCards, debuff.params)
        }

        // Обновляем визуал для дебафнутых карт
        selectedCards.forEach(card => {
          card.updateValue()
        })
      }
    })
  })

  // Подписка на onDiscard — для DiscardBuff карты
  battle.on('onDiscard', (discardedCard, allCards, battle) => {
    // Проверяем: есть ли у сброшенной карты DiscardBuff (по buffType)
    const cardType = battle.cardTypes.find(t => t.type === discardedCard.cardData.type)

    if (!cardType || cardType.buffType !== 'DiscardBuff') return

    // Применяем бафф
    cardType.buff.onDiscard(discardedCard, allCards, battle)
    
    // Уведомление о срабатывании Берсерка
    const { toastManager } = require('../ui/toast_manager.js')
    if (toastManager && cardType.buff.getNotificationMessage) {
      const value = cardType.buff.params?.value || 0
      const message = cardType.buff.getNotificationMessage(discardedCard, value)
      if (message) {
        toastManager.show(message, 'purple')
      }
    }
  })
}
