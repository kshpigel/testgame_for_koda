// Импорт JSON с картами и классов баффов
import cardsData from '../../../public/assets/data/cards.json' with { type: 'json' }
import { createBuff } from '../buffs/index.js'

// Преобразование JSON в формат card_types с созданием баффов
export const card_types = cardsData.cards.map(card => {
  const result = {
    type: card.type,
    name: card.name,
    description: card.description,
    bio: card.bio,
    mechanic: card.mechanic,
    value: card.value,
    image: card.image,
    image_bg: card.image_bg,
    kind: card.kind,
    faction: card.faction,
    maxInDeck: card.maxInDeck
  }

  // Создаём бафф если указан
  if (card.buff) {
    result.buff = createBuff(card.buff.type, card.buff.params)
    result.buffType = card.buff.type
    result.buffParams = card.buff.params
  }

  return result
}).sort((a, b) => a.type - b.type)

// console.log('card_types loaded:', card_types.length)
