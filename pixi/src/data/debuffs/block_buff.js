// Дебафф: блокирует определённый бафф у карт
// Параметры: faction, kind, id, buffType

let debuffCounter = 0

export function apply(cards, params) {
  const { faction = null, kind = null, id = null, buffType = null } = params

  // Уникальный ID для этого применения
  const debuffId = `block_${debuffCounter++}`

  cards.forEach(card => {
    // Фильтрация по параметрам
    if (faction && card.cardData?.faction !== faction) return
    if (kind && card.cardData?.kind !== kind) return
    if (id && card.cardData?.type !== id) return

    if (buffType) {
      card.blockBuff(buffType)
    }
  })
}

export const info = {
  name: 'Block Buff',
  description: 'Блокирует определённый бафф у карт'
}
