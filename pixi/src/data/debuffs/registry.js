// Реестр дебаффов — подписка на события battle
import { apply as weakenSelected } from './weaken_selected.js'
import { apply as blockBuff } from './block_buff.js'

// Маппинг типов дебаффов на функции
const debuffHandlers = {
  weaken_selected: weakenSelected,
  block_buff: blockBuff
}

// Регистрация всех дебаффов в battle
export function registerDebuffs(battle) {
  // Подписка на beforeBuffs — для дебаффов блокировки
  battle.on('beforeBuffs', (selectedCards, allCards, battle) => {
    // Очищаем дебаффы у всех карт
    allCards.forEach(card => {
      card.clearDebuffs()
      card.valueCircle?.setNormalStyle()
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
}
