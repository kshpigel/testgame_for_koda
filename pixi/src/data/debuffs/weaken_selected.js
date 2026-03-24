// Дебафф: уменьшает силу выбранным картам
// Параметры: faction, kind, id, value

let debuffCounter = 0

export function apply(cards, params) {
  const { faction = null, kind = null, id = null, value = -1 } = params

  // Уникальный ID для этого применения (чтобы не накапливалось)
  const debuffId = `weaken_${debuffCounter++}`

  cards.forEach(card => {
    // Фильтрация по параметрам (все карты если параметры null)
    if (faction && card.cardData?.faction !== faction) return
    if (kind && card.cardData?.kind !== kind) return
    if (id && card.cardData?.type !== id) return

    // Применяем дебафф через Card API
    card.addDebuff(debuffId, 'weaken', value)
  })
}

export const info = {
  name: 'Weaken Selected',
  description: 'Уменьшает силу выбранных карт'
}
