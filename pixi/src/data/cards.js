import { log } from './config.js'

// Загружаем JSON синхронно при импорте
import cardsData from '../../public/assets/data/cards.json' with { type: 'json' }

/**
 * Получить все карты
 */
export const cards = cardsData

/**
 * Получить карту по типу (id)
 */
export function getCardByType(typeId) {
  return cardsData.cards?.find(c => c.type === typeId) || null
}

/**
 * Получить все карты с kind = "base"
 */
export function getBaseCards() {
  return cardsData.cards?.filter(c => c.kind === 'base') || []
}

/**
 * Загрузка данных (для совместимости, данные уже загружены)
 */
export async function loadCards() {
  log('[cards.js] loaded', cardsData.cards?.length || 0, 'cards')
  return cardsData
}
