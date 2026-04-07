// Игровой конфиг (в будущем от сервера)
import configData from '../../public/assets/data/config.json' with { type: 'json' }

export const gameConfig = {
  // Ежедневная награда
  dailyReward: {
    crystals: configData.dailyReward?.crystals || 10,
    gold: configData.dailyReward?.gold || 50
  },
  
  // Стоимость входа в портал
  portalCost: {
    crystals: configData.portalCost?.crystals || 3
  },
  
  // Баланс наград
  rewards: {
    balance: {
      goldPercent: configData.rewards?.balance?.goldPercent || 90,
      crystalsPercent: configData.rewards?.balance?.crystalsPercent || 10
    }
  }
}
