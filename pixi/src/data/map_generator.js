import { calculateDeckPower, getRecommendedHealth } from './deck_power.js'

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
      const difficulty = this.calculateDifficulty(i, numNodes - 1, deckOrCode)
      
      nodes.push({
        id: `node_${i}`,
        index: i,
        type: 'enemy',
        cardId: randomCard.type,
        cardData: randomCard,
        difficulty: difficulty,
        isBoss: false
      })
    }
    
    // Последний узел - босс из enemies.json
    const boss = this.selectBoss(portalId)
    if (boss) {
      nodes.push({
        id: `node_${numNodes - 1}`,
        index: numNodes - 1,
        type: 'boss',
        enemyId: boss.type,
        enemyData: boss,
        difficulty: 'boss',
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
   * Прогрессия: 0.8 → 1.0 → 1.2 → 1.5 → boss
   */
  calculateDifficulty(nodeIndex, totalNodes, deckOrCode) {
    if (totalNodes <= 1) return 'medium'
    
    const progress = nodeIndex / (totalNodes - 1)
    
    // Линейная прогрессия множителя силы: 0.8 → 2.0
    const powerMultiplier = 0.8 + progress * 1.2
    
    const deckPower = calculateDeckPower(deckOrCode)
    const baseDamage = deckPower.damagePerStep
    
    // Рассчитываем HP врага
    const enemyHealth = Math.floor(baseDamage * 5 * powerMultiplier)
    
    // Определяем уровень сложности по HP
    if (powerMultiplier >= 1.8) return 'boss'
    if (powerMultiplier >= 1.4) return 'strong'
    if (powerMultiplier >= 1.0) return 'medium'
    return 'easy'
  }

  /**
   * Рассчитывает здоровье врага для заданной сложности
   */
  getEnemyHealth(deckOrCode, difficulty) {
    return getRecommendedHealth(deckOrCode, difficulty)
  }
}
