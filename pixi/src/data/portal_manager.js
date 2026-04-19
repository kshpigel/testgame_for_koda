import * as PIXI from 'pixi.js'
import { log, config } from '../data/config.js'
import { gameState } from './game_state.js'
import { gamePrices } from './game_prices.js'

export class PortalManager {
  constructor() {
    this.portalsData = null
    this.portalTypes = null
    this.altarTypes = null
    this.positions = null
    this.growthConfig = {
      testMode: true, // Включаем тестовый режим (10 сек)
      growthTimeMinutes: 10 / 60 // 10 секунд в минутах (10/60 = 0.167)
    }
  }

  async load() {
    try {
      const data = await PIXI.Assets.load('/assets/data/portals.json')
      
      // Сохраняем текущие статусы и growthStartTime перед перезагрузкой
      const savedState = {}
      if (this.portalsData) {
        this.portalsData.forEach((portal, id) => {
          savedState[id] = {
            status: portal.status,
            growthStartTime: portal.growthStartTime,
            lastWinTime: portal.lastWinTime
          }
        })
      }
      
      this.portalsData = new Map()
      this.portalTypes = data.portalTypes || {}
      this.altarTypes = data.altarTypes || {}
      this.positions = data.positions || []

      data.portals.forEach(p => {
        const newPortal = { ...p }
        // Восстанавливаем сохранённое состояние если есть
        if (savedState[p.id]) {
          newPortal.status = savedState[p.id].status
          newPortal.growthStartTime = savedState[p.id].growthStartTime
          newPortal.lastWinTime = savedState[p.id].lastWinTime
        }
        this.portalsData.set(p.id, newPortal)
      })

      log('[PortalManager] loaded', this.portalsData.size, 'portals, restored', Object.keys(savedState).length, 'states')
      
      // Синхронизируем GameState и запускаем первый портал
      const randomPortals = this.getRandomPortals()
      this.syncGameStateFromPortals(randomPortals)
      
      return true
    } catch (e) {
      console.error('[PortalManager] failed to load:', e)
      return false
    }
  }

  getPortal(id) {
    return this.portalsData?.get(id) || null
  }

  getPortalType(id) {
    const portal = this.getPortal(id)
    return portal?.type || 'random'
  }

  getPortalConfig(id) {
    const type = this.getPortalType(id)
    return this.portalTypes[type] || null
  }

  getAltarConfig(altarType) {
    if (!altarType) return null
    return this.altarTypes[altarType] || null
  }

  getPosition(id) {
    return this.positions.find(p => p.id === id) || null
  }

  getAllPortals() {
    return Array.from(this.portalsData?.values() || [])
  }

  // Получить все случайные порталы (для очереди роста)
  getRandomPortals() {
    return this.getAllPortals().filter(p => p.type === 'random')
  }

  // Получить следующий портал в очереди роста
  getNextPortalInQueue() {
    // Используем GameState для получения следующего портала
    return gameState.getNextFromQueue()
  }

  // Проверить, растёт ли портал
  isPortalGrowing(id) {
    const portal = this.getPortal(id)
    return portal?.status === 'growing'
  }

  // Проверить, виден ли портал
  isPortalVisible(id) {
    const portal = this.getPortal(id)
    if (!portal) return false
    
    // Скрытые порталы не видны
    if (portal.status === 'hidden') return false
    
    // Активные порталы видны
    if (portal.status === 'active') return true
    
    // Растущие порталы видны (с анимацией)
    if (portal.status === 'growing') return true
    
    // Locked порталы не видны
    return false
  }

  // Запустить рост портала
  startPortalGrowth(id) {
    const portal = this.getPortal(id)
    if (!portal) {
      return false
    }
    
    portal.status = 'growing'
    portal.growthStartTime = Date.now()
    
    return true
  }

  // Проверить, завершён ли рост портала
  checkPortalGrowthComplete(id) {
    const portal = this.getPortal(id)
    if (!portal || portal.status !== 'growing') return false
    
    const now = Date.now()
    const growthTime = this.growthConfig.growthTimeMinutes * 60 * 1000
    const growthStartTime = portal.growthStartTime || now
    
    const elapsed = now - growthStartTime
    const remaining = Math.max(0, growthTime - elapsed)
    
    if (remaining <= 0) {
      // Рост завершён — обновляем статус в данных
      portal.status = 'active'
      portal.growthStartTime = null
      
      // Обновляем статус в GameState (это автоматически проверит следующий портал)
      gameState.setStatus(id, 'active')
      gameState.setLastWinTime(id)
      
      log('[PortalManager] portal', id, 'is now active')
      
      return true
    }
    
    return false
  }

  // Запустить рост следующего портала в очереди
  startNextPortalGrowth() {
    // Используем GameState для запуска следующего портала
    gameState.checkNextPortalToGrow()
  }

  // Проверить, все ли порталы должны быть активны (игрок вернулся после долгого перерыва)
  checkAllPortalsAvailable() {
    const randomPortals = this.getRandomPortals()
    if (randomPortals.length === 0) return false
    
    // Если есть растущий портал - ничего не делаем
    if (gameState.currentGrowingPortalId) {
      log('[PortalManager] portal', gameState.currentGrowingPortalId, 'is growing, waiting')
      return false
    }
    
    const maxGrowthTime = this.growthConfig.growthTimeMinutes * 4 * 60 * 1000 // N * 4
    const now = Date.now()
    
    // Проверяем последний пройденный портал
    let lastCompletedPortal = null
    for (const portal of randomPortals) {
      if (portal.status === 'active' && portal.lastWinTime !== null) {
        if (!lastCompletedPortal || portal.lastWinTime > lastCompletedPortal.lastWinTime) {
          lastCompletedPortal = portal
        }
      }
    }
    
    // Если есть пройденный портал и прошло N*4 минут - все активны
    if (lastCompletedPortal && now - lastCompletedPortal.lastWinTime >= maxGrowthTime) {
      log('[PortalManager] all portals should be active (player returned after long break)')
      randomPortals.forEach(p => {
        p.status = 'active'
        p.growthStartTime = null
      })
      // Сбрасываем GameState
      gameState.reset()
      this.syncGameStateFromPortals(randomPortals)
      return true
    }
    
    // Нет растущего - запускаем следующий из очереди
    this.startNextPortalGrowth()
    
    return false
  }

  // Активировать портал (обычный или премиум)
  activatePortal(id, playerGold, playerCrystals) {
    const portal = this.getPortal(id)
    if (!portal) {
      return { success: false, error: 'Portal not found' }
    }
    
    // Все порталы (включая премиум) теперь за золото
    const cost = config.portalCost || 200
    if (playerGold < cost) {
      return { success: false, error: 'Not enough gold', needed: cost, have: playerGold, currency: 'gold' }
    }
    portal.status = 'active'
    log('[PortalManager] activated portal', id, 'for', cost, 'gold')
    return { success: true, cost, currency: 'gold' }
  }

  // Устаревший метод - использовать activatePortal()
  activatePremiumPortal(id, playerCrystals) {
    return this.activatePortal(id, 0, playerCrystals)
  }

  // Получить стоимость портала (для всех типов)
  getPortalCost(id) {
    const portal = this.getPortal(id)
    if (!portal) return 0
    
    // Премиум порталы
    if (portal.type === 'premium') {
      return gamePrices.getPremiumPortalCost()
    }
    
    // Обычные случайные порталы
    if (portal.type === 'random') {
      return gamePrices.getRandomPortalCost()
    }
    
    // PVP и другие - бесплатно
    return 0
  }

  // Устаревший метод - использовать getPortalCost()
  getPremiumPortalCost(id) {
    return this.getPortalCost(id)
  }

  // Обновить статус портала
  updatePortalStatus(id, status) {
    const portal = this.getPortal(id)
    if (portal) {
      portal.status = status
      if (status === 'active') {
        portal.lastWinTime = null
      }
      // Синхронизируем с GameState (источник истины)
      gameState.setStatus(id, status)
      if (status === 'active') {
        gameState.setLastWinTime(id)
      }
    }
  }

  // Пометить портал как пройденный
  markPortalCompleted(id) {
    const portal = this.getPortal(id)
    if (!portal) {
      return
    }
    
    // Premium порталы не участвуют в очереди - ничего не делаем
    if (portal.type === 'premium') {
      log('[PortalManager] premium portal, skipping markPortalCompleted')
      return
    }
    
    // Обновляем данные
    portal.lastWinTime = Date.now()
    portal.status = 'hidden'
    
    // Обновляем статус в GameState
    gameState.setLastWinTime(id)
    gameState.setStatus(id, 'hidden')
    
    // Запускаем следующий портал сразу!
    gameState.checkNextPortalToGrow()
  }

  // Проверить доступность портала
  isPortalAvailable(id) {
    const portal = this.getPortal(id)
    if (!portal) return false
    
    // Активные порталы доступны
    if (portal.status === 'active') return true
    
    // Скрытые порталы недоступны
    if (portal.status === 'hidden') return false
    
    return false
  }

  // Получить время до доступности
  getTimeUntilAvailable(id) {
    const portal = this.getPortal(id)
    if (!portal || portal.status === 'active') return 0
    
    if (portal.status !== 'growing') return 0
    
    const now = Date.now()
    const growthTime = this.growthConfig.growthTimeMinutes * 60 * 1000
    const growthStartTime = portal.growthStartTime || now
    
    const elapsed = now - growthStartTime
    return Math.max(0, growthTime - elapsed)
  }

  // Получить статус портала (для UI)
  getPortalStatus(id) {
    const portal = this.getPortal(id)
    if (!portal) return 'unknown'
    
    if (portal.status === 'hidden') return 'hidden'
    if (portal.status === 'active') return 'active'
    if (portal.status === 'growing') return 'growing'
    
    return portal.status
  }

  // Синхронизировать GameState с данными порталов (вызывается при загрузке BaseScreen)
  syncGameStateFromPortals(randomPortals) {
    // Инициализируем GameState если ещё не сделан
    if (!gameState.initialized) {
      gameState.initFromPortals(randomPortals)
    }

    // Синхронизируем статусы ИЗ GameState В данные (не наоборот!)
    // GameState - источник истины, portals.json только для начальной загрузки
    // ИСКЛЮЧАЕМ премиум порталы — они управляются отдельно
    gameState.portals.forEach(statePortal => {
      // Пропускаем премиум порталы
      if (statePortal.type === 'premium') return
      
      const managerPortal = this.getPortal(statePortal.id)
      if (managerPortal && managerPortal.status !== statePortal.status) {
        managerPortal.status = statePortal.status
        managerPortal.lastWinTime = statePortal.lastWinTime
      }
    })

    // Если никто не растёт и есть locked/hidden порталы — проверяем, можно ли запустить следующий
    const growing = gameState.getGrowingPortal()
    if (!growing) {
      // Проверяем, есть ли active порталы
      const activeCount = gameState.countByStatus('active')
      if (activeCount === 0) {
        // Все порталы скрыты — запускаем следующий
        gameState.checkNextPortalToGrow()
      }
    }
  }

  // Получить прогресс роста портала (0-1)
  getPortalGrowthProgress(id) {
    const portal = this.getPortal(id)
    if (!portal || portal.status !== 'growing') return 0
    
    const now = Date.now()
    const growthTime = this.growthConfig.growthTimeMinutes * 60 * 1000
    const growthStartTime = portal.growthStartTime || now
    
    const elapsed = now - growthStartTime
    return Math.min(1, elapsed / growthTime)
  }

  // Форматировать время в минуты и секунды
  formatTime(ms) {
    const totalSeconds = Math.ceil(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }
}

export const portalManager = new PortalManager()