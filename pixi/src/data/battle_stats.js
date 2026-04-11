import { player } from './player.js'
import { config } from './config.js'

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
    this.stepsLeft = 0          // Остаток ходов
    this.isBoss = false         // Босс или обычный враг
  }
  
  // Установить данные врага
  setEnemy(name, maxHealth, isBoss = false) {
    this.enemyName = name
    this.enemyMaxHealth = maxHealth
    this.isBoss = isBoss
  }
  
  // Установить остаток ходов (для расчёта наград)
  setStepsLeft(stepsLeft) {
    this.stepsLeft = stepsLeft
  }
  
  // Записать результат боя
  finish(isVictory, remainingCards) {
    this.isVictory = isVictory
    this.remainingCards = remainingCards
  }
  
  // Рассчитать награду
  calculateReward(enemyHealth) {
    this.enemyFinalHealth = enemyHealth
    
    // Получаем настройки наград из config
    const { baseGold, goldPerStep, bossCrystals } = config.rewards
    
    // Расчёт золота:
    // 1. Базовая награда за победу
    const goldBase = baseGold
    
    // 2. Бонус за оставшиеся ходы
    const goldSteps = this.stepsLeft * goldPerStep
    
    // 3. Бонус за "добивание" (сверхурон = нанесённый урон - HP врага)
    const overflowDamage = this.damageDealt - this.enemyMaxHealth
    const goldOverflow = overflowDamage > 0 ? overflowDamage : 0
    
    // Итого золота
    this.goldEarned = goldBase + goldSteps + goldOverflow
    
    // Кристаллы: только за босса
    this.crystalsEarned = (this.isBoss && this.isVictory) ? bossCrystals : 0
    
    // Начислить игроку
    if (this.goldEarned > 0) {
      player.addGold(this.goldEarned)
    }
    if (this.crystalsEarned > 0) {
      player.addCrystals(this.crystalsEarned)
    }
    
    return {
      gold: this.goldEarned,
      crystals: this.crystalsEarned,
      breakdown: {
        base: goldBase,
        steps: goldSteps,
        overflow: goldOverflow
      }
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
      remainingCards: this.remainingCards,
      stepsLeft: this.stepsLeft,
      isBoss: this.isBoss
    }
  }
}

// Глобальный экземпляр
export const battleStats = new BattleStats()
