// Автоимпорт всех баффов
import { Buff } from './buff.js'
import { FactionHp } from './faction_hp.js'
import { SelectedIfNotSelected } from './selected_if_not_selected.js'
import { SelectedRandomIfNotSelected } from './selected_random_if_not_selected.js'
import { DeckCount } from './deck_count.js'
import { KeepSteps } from './keep_steps.js'
import { ExactTypeAndDiscard } from './exact_type_and_discard.js'
import { DiscardBuff } from './discard_buff.js'

// Маппинг имен классов баффов
export const BuffClasses = {
  FactionHp,
  SelectedIfNotSelected,
  SelectedRandomIfNotSelected,
  DeckCount,
  KeepSteps,
  ExactTypeAndDiscard,
  DiscardBuff
}

// Создать экземпляр баффа по имени класса и параметрам
export function createBuff(type, params) {
  const BuffClass = BuffClasses[type]
  if (!BuffClass) {
    console.warn(`Unknown buff type: ${type}`)
    return null
  }
  return new BuffClass(params)
}

// Экспорт базового класса для проверки
export { Buff }
