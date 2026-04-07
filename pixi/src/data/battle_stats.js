import { player } from './player.js'

// Класс для хранения статистики боя
export class BattleStats {
  constructor() {
    this.reset()
  }
  
  reset() {
    this.stepsPlayed = 0        // Сыграно ходов
    this.cardsPlayed = 0        // Сыграно карт за бой
    this.cardsDiscarded = 0     // Сброшено карт
    this.damageDealt = 0        // Нанесённый урон врагу
    this.damageTaken = 0        // Полученный урон от врага
    this.healing = 0            // Восстановленное HP
    this.goldEarned = 0         // Получено золота
    this.crystalsEarned = 0     // Получено кристаллов
    this.enemyName = ''         // Имя врага
    this.enemyMaxHealth = 0     // Макс. HP врага
    this.enemyFinalHealth = 0   // HP врага в конце
    this.isVictory = false      // Победа или поражение
    this.deckSize = 0           // Размер колоды в начале
    this.remainingCards = 0     // Карт осталось в колоде
  }
  
  // Установить данные врага
  setEnemy(name, maxHealth) {
    this.enemyName = name
    this.enemyMaxHealth = maxHealth
  }
  
  // Записать результат боя
  finish(isVictory, remainingCards) {
    this.isVictory = isVictory
    this.remainingCards = remainingCards
  }
  
  // Рассчитать награду
  calculateReward(enemyHealth) {
    this.enemyFinalHealth = enemyHealth
    
    // Формула: базовое золото + бонус за убитого врага
    const baseGold = 25
    const killBonus = this.isVictory ? Math.floor(enemyHealth * 0.5) : 0
    this.goldEarned = baseGold + killBonus
    
    // Кристалы: 10% от золота (баланс 9/1), только за победу
    this.crystalsEarned = this.isVictory ? Math.floor(this.goldEarned * 0.1) : 0
    
    // Начислить игроку
    if (this.goldEarned > 0) {
      player.addGold(this.goldEarned)
    }
    if (this.crystalsEarned > 0) {
      player.addCrystals(this.crystalsEarned)
    }
    
    return {
      gold: this.goldEarned,
      crystals: this.crystalsEarned
    }
  }
  
  // Получить все данные для UI
  getData() {
    return {
      stepsPlayed: this.stepsPlayed,
      cardsPlayed: this.cardsPlayed,
      cardsDiscarded: this.cardsDiscarded,
      damageDealt: this.damageDealt,
      damageTaken: this.damageTaken,
      healing: this.healing,
      goldEarned: this.goldEarned,
      crystalsEarned: this.crystalsEarned,
      enemyName: this.enemyName,
      enemyMaxHealth: this.enemyMaxHealth,
      enemyFinalHealth: this.enemyFinalHealth,
      isVictory: this.isVictory,
      deckSize: this.deckSize,
      remainingCards: this.remainingCards
    }
  }
}

// Глобальный экземпляр
export const battleStats = new BattleStats()
