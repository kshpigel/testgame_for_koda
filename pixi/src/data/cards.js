import { config, log } from './config.js'

let cardsData = null

/**
 * Загрузка данных всех карт из cards.json
 */
export async function loadCards() {
  try {
    const data = await fetch('/assets/data/cards.json').then(r => r.json())
    cardsData = data
    log('[cards.js] loaded', cardsData.cards?.length || 0, 'cards')
    return cardsData
  } catch (e) {
    console.error('[cards.js] failed to load cards.json:', e)
    return null
  }
}

/**
 * Получить все карты
 */
export const cards = cardsData || { cards: [] }

/**
 * Получить карту по типу (id)
 */
export function getCardByType(typeId) {
  if (!cardsData) return null
  return cardsData.cards.find(c => c.type === typeId)
}

/**
 * Получить все карты с kind = "base"
 */
export function getBaseCards() {
  if (!cardsData) return []
  return cardsData.cards.filter(c => c.kind === 'base')
}
