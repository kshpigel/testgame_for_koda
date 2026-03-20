// Загрузка врагов из JSON и генерация HP
import enemiesData from '../../../public/assets/data/enemies.json' with { type: 'json' }
import { calculateDeckPower } from '../deck_power.js'
import { getDeckByCode } from '../deck.js'
import { card_types } from '../card_types/index.js'
import { player } from '../player.js'

// Сначала генерируем HP для всех врагов
const tempEnemies = enemiesData.enemies.map((enemy, index) => {
  const isBoss = index === enemiesData.enemies.length - 1
  const total = enemiesData.enemies.length
  
  // Получаем steps из колоды
  const deck = getDeckByCode(player.deckCode)
  const steps = deck.steps || 4
  
  // Рассчитываем силу колоды
  const deckPower = calculateDeckPower(player.deckCode)
  const baseDamage = deckPower.damagePerStep
  
  // По нарастающей: от 2.5x до 7x шагов
  let turnsMultiplier
  if (isBoss) {
    turnsMultiplier = steps * 1.8 // Босс
  } else {
    // От 2.5x до 5.5x по нарастанию
    const progress = index / (total - 1) // 0 до 1
    turnsMultiplier = steps * (0.6 + progress * 0.9)
  }
  
  // Без рандома — HP строго по порядку
  const health = Math.floor(baseDamage * turnsMultiplier)
  
  return {
    type: enemy.type,
    name: enemy.name,
    description: enemy.description,
    image: enemy.image,
    image_bg: enemy.image_bg,
    health: health,
    isBoss: isBoss
  }
})

// Определяем min/max HP для расчёта относительной сложности
const healths = tempEnemies.map(e => e.health)
const minHealth = Math.min(...healths)
const maxHealth = Math.max(...healths)
const healthRange = maxHealth - minHealth

// Преобразуем в enemies с правильной сложностью
export const enemies = tempEnemies.map((enemy, index) => {
  let difficulty
  
  if (enemy.isBoss) {
    difficulty = 'boss'
  } else if (healthRange === 0) {
    difficulty = 'medium'
  } else {
    // Относительная позиция в диапазоне HP
    const relativeHealth = (enemy.health - minHealth) / healthRange
    
    if (relativeHealth < 0.25) {
      difficulty = 'easy'
    } else if (relativeHealth < 0.5) {
      difficulty = 'medium'
    } else if (relativeHealth < 0.75) {
      difficulty = 'strong'
    } else {
      difficulty = 'very_strong'
    }
  }
  
  return {
    type: enemy.type,
    name: enemy.name,
    description: enemy.description,
    image: enemy.image,
    image_bg: enemy.image_bg,
    health: enemy.health,
    difficulty: difficulty
  }
})

// console.log('enemies loaded:', enemies.length)
