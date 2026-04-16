import { log } from './config.js'

export class GamePrices {
  constructor() {
    this.data = null
  }

  async load() {
    try {
      const response = await fetch('/assets/data/game_prices.json')
      this.data = await response.json()
      log('[GamePrices] loaded', this.data)
      return true
    } catch (e) {
      console.error('[GamePrices] failed to load:', e)
      return false
    }
  }

  getPremiumPortalCost() {
    return this.data?.costs?.portal_premium?.crystals || 200
  }

  getRandomPortalCost() {
    return this.data?.costs?.portal_random?.crystals || 3
  }

  getVictoryReward() {
    return this.data?.rewards?.victory || { gold: 50, crystals: 5 }
  }

  getStepReward() {
    return this.data?.rewards?.step || { gold: 5 }
  }

  getOverdamageReward() {
    return this.data?.rewards?.overdamage || { gold: 10 }
  }

  getBossReward() {
    return this.data?.rewards?.boss || { gold: 100, crystals: 20 }
  }
}

export const gamePrices = new GamePrices()
