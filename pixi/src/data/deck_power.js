import { getDeckByCode } from './deck.js'
import { card_types } from './card_types/index.js'

// Расчёт силы колоды с учётом баффов
export function calculateDeckPower(deckCode) {
  const deck = getDeckByCode(deckCode)
  const stepsPerBattle = deck.steps || 4
  const cards = deck.cards
  
  if (!cards || cards.length === 0) return 0
  
  // Сумма базовых значений карт
  let totalBaseValue = 0
  // Сумма веса баффов
  let totalBuffWeight = 0
  let cardCount = 0
  
  // Считаем уникальные типы карт в колоде для подсчёта баффов
  const uniqueTypes = [...new Set(cards)]
  
  cards.forEach(typeId => {
    const cardType = card_types.find(c => c.type === typeId)
    if (cardType) {
      totalBaseValue += cardType.value
      cardCount++
      
      // Добавляем вес баффа если есть (только для уникальных типов)
      if (cardType.buff && cardType.buff.getWeight) {
        const weight = cardType.buff.getWeight(cards, cardType)
        totalBuffWeight += weight
      }
    }
  })
  
  // console.log('Deck power:', { totalBaseValue, totalBuffWeight, cardCount })

  if (cardCount === 0) return 0
  
  // Среднее значение карты с учётом баффов
  const avgCardValue = (totalBaseValue + totalBuffWeight) / cardCount
  
  // Сколько карт можно сыграть за ход (максимум 5)
  const cardsPerStep = 5
  
  // Урон за ход (среднее * 5 карт)
  const damagePerStep = avgCardValue * cardsPerStep
  
  // Всего ходов
  const totalSteps = stepsPerBattle
  
  // Общая сила = урон за ход * количество ходов
  const totalDamage = damagePerStep * totalSteps
  
  return {
    avgCardValue,
    damagePerStep,
    totalDamage,
    cardCount,
    totalValue: totalBaseValue,
    buffWeight: totalBuffWeight
  }
}

// Получить уровень врага по силе колоды
export function getEnemyDifficulty(deckCode, enemyHealth) {
  const deckPower = calculateDeckPower(deckCode)
  
  // Базовая формула: сколько ходов нужно на убийство
  const turnsNeeded = enemyHealth / deckPower.damagePerStep
  
  // Градация с небольшим рандомом (±15%)
  const randomFactor = 0.85 + Math.random() * 0.3
  
  if (turnsNeeded <= 2 * randomFactor) {
    return 'boss'
  } else if (turnsNeeded <= 4 * randomFactor) {
    return 'strong'
  } else if (turnsNeeded <= 6 * randomFactor) {
    return 'medium'
  } else {
    return 'easy'
  }
}

// Рассчитать рекомендуемое здоровье врага для каждого уровня
export function getRecommendedHealth(deckCode, difficulty) {
  const deckPower = calculateDeckPower(deckCode)
  const baseDamage = deckPower.damagePerStep
  
  const multipliers = {
    easy: 3,      // 3 хода
    medium: 5,   // 5 ходов
    strong: 8,   // 8 ходов
    boss: 12     // 12 ходов
  }
  
  const multiplier = multipliers[difficulty] || 5
  const randomFactor = 0.9 + Math.random() * 0.2
  
  return Math.floor(baseDamage * multiplier * randomFactor)
}
