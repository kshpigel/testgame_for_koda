import { calculateDeckPower, getRecommendedHealth } from './deck_power.js'
import { config } from './config.js'

/**
 * Генератор карты с врагами
 * - Промежуточные узлы: случайные карты из cards.json (kind: "base")
 * - Последний узел: босс из enemies.json
 */
export class MapGenerator {
  constructor(cardsData, enemiesData) {
    this.cards = cardsData.cards || []
    this.enemies = enemiesData.enemies || []
  }

  /**
   * Генерирует узлы карты для портала
   * @param {number} numNodes - количество узлов на карте (из local_config)
   * @param {number|Array} deckOrCode - колода игрока (deckCode или массив карт)
   * @param {string} portalId - ID портала (для выбора босса)
   * @returns {Array} массив узлов карты
   */
  generateMap(numNodes, deckOrCode, portalId) {
    const baseCards = this.cards.filter(c => c.kind === 'base')
    
    if (baseCards.length === 0) {
      console.error('[MapGenerator] No base cards found!')
      return []
    }

    const nodes = []
    
    // Промежуточные узлы - рандомные base карты
    for (let i = 0; i < numNodes - 1; i++) {
      const randomCard = this.randomBaseCard(baseCards)
      const { difficulty, health } = this.calculateDifficulty(i, numNodes - 1, deckOrCode)
      
      nodes.push({
        id: `node_${i}`,
        index: i,
        type: 'enemy',
        cardId: randomCard.type,
        cardData: { ...randomCard, health }, // Добавляем health для отображения
        difficulty: difficulty,
        health: health, // Сохраняем рассчитанное здоровье
        isBoss: false
      })
    }
    
    // Последний узел - босс из enemies.json
    const boss = this.selectBoss(portalId)
    if (boss) {
      // Рассчитываем HP для босса
      const { health: bossHealth } = this.calculateDifficulty(numNodes - 1, numNodes - 1, deckOrCode)
      
      nodes.push({
        id: `node_${numNodes - 1}`,
        index: numNodes - 1,
        type: 'boss',
        enemyId: boss.type,
        enemyData: { ...boss, health: bossHealth }, // Добавляем рассчитанное HP
        difficulty: 'boss',
        health: bossHealth,
        isBoss: true
      })
    }
    
    return nodes
  }

  /**
   * Выбирает босса для портала
   * Можно делать рандом или фиксированный по portalId
   */
  selectBoss(portalId) {
    if (this.enemies.length === 0) return null
    
    // Пока просто рандом из всех врагов
    const idx = Math.floor(Math.random() * this.enemies.length)
    return this.enemies[idx]
  }

  /**
   * Выбирает случайную base карту
   */
  randomBaseCard(baseCards) {
    const idx = Math.floor(Math.random() * baseCards.length)
    return baseCards[idx]
  }

  /**
   * Рассчитывает сложность врага на основе позиции и силы колоды
   * Прогрессия: enemyDifficultyBase → enemyDifficultyMax (настраивается через config)
   */
  calculateDifficulty(nodeIndex, totalNodes, deckOrCode) {
    if (totalNodes <= 1) return { difficulty: 'medium', health: 0 }
    
    const progress = nodeIndex / (totalNodes - 1)
    
    const deckPower = calculateDeckPower(deckOrCode)
    const totalDamage = deckPower.totalDamage || 0 // Урон за весь бой (4 хода)
    
    if (totalDamage === 0) return { difficulty: 'medium', health: 100 }
    
    // Множители сложности:
    // easy = enemyDifficultyBase (враг слабее твоего урона за бой)
    // medium/strong = промежуточные значения
    // boss = enemyDifficultyMax (враг сильнее твоего урона за бой)
    const baseMultiplier = config.enemyDifficultyBase || 0.5
    const maxMultiplier = config.enemyDifficultyMax || 1.5
    
    // Прямое использование коэффициентов для easy/boss
    let healthMultiplier
    let difficulty
    
    if (nodeIndex === totalNodes - 1) {
      // Босс — максимальный коэффициент
      healthMultiplier = maxMultiplier
      difficulty = 'boss'
    } else {
      // Промежуточные враги — линейная прогрессия
      healthMultiplier = baseMultiplier + progress * (maxMultiplier - baseMultiplier)
      
      // Определение сложности по прогрессу
      if (healthMultiplier >= 1.3) difficulty = 'strong'
      else if (healthMultiplier >= 0.9) difficulty = 'medium'
      else difficulty = 'easy'
    }
    
    // Здоровье = твой урон за бой × коэффициент
    let enemyHealth = Math.floor(totalDamage * healthMultiplier)
    
    // Добавляем рандомный разброс ±10% (0.9 - 1.1)
    const randomFactor = 0.9 + Math.random() * 0.2
    enemyHealth = Math.floor(enemyHealth * randomFactor)
    
    return { difficulty, health: enemyHealth }
  }

  /**
   * Рассчитывает здоровье врага для заданной сложности
   */
  getEnemyHealth(deckOrCode, difficulty) {
    return getRecommendedHealth(deckOrCode, difficulty)
  }
}
