import * as PIXI from 'pixi.js'
import { log } from '../data/config.js'

export class PortalManager {
  constructor() {
    this.portalsData = null
    this.portalTypes = null
    this.altarTypes = null
    this.positions = null
    this.growthConfig = {
      testMode: true, // Включаем тестовый режим (2 мин)
      growthTimeMinutes: 2 // Время роста портала в тестовом режиме
    }
  }

  async load() {
    try {
      const data = await PIXI.Assets.load('/assets/data/portals.json')
      this.portalsData = new Map()
      this.portalTypes = data.portalTypes || {}
      this.altarTypes = data.altarTypes || {}
      this.positions = data.positions || []

      data.portals.forEach(p => {
        this.portalsData.set(p.id, p)
      })

      log('[PortalManager] loaded', this.portalsData.size, 'portals')
      
      // Проверяем, все ли порталы должны быть активны (игрок вернулся после долгого перерыва)
      this.checkAllPortalsAvailable()
      
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
    const randomPortals = this.getRandomPortals()
    
    // Ищем портал со статусом 'growing'
    const growingPortal = randomPortals.find(p => p.status === 'growing')
    if (growingPortal) {
      return growingPortal
    }
    
    // Ищем первый locked портал
    const lockedPortal = randomPortals.find(p => p.status === 'locked')
    return lockedPortal || null
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
    if (!portal) return false
    
    portal.status = 'growing'
    portal.growthStartTime = Date.now()
    
    log('[PortalManager] started growth for', id, 'at', portal.growthStartTime)
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
      // Рост завершён
      portal.status = 'active'
      portal.growthStartTime = null
      log('[PortalManager] portal', id, 'is now active')
      
      // Запускаем рост следующего портала
      this.startNextPortalGrowth()
      
      return true
    }
    
    return false
  }

  // Запустить рост следующего портала в очереди
  startNextPortalGrowth() {
    const nextPortal = this.getNextPortalInQueue()
    if (nextPortal) {
      this.startPortalGrowth(nextPortal.id)
    }
  }

  // Проверить, все ли порталы должны быть активны (игрок вернулся после долгого перерыва)
  checkAllPortalsAvailable() {
    const randomPortals = this.getRandomPortals()
    if (randomPortals.length === 0) return false
    
    // Находим последний активный портал (или тот, который был пройден последним)
    let lastCompletedPortal = null
    for (const portal of randomPortals) {
      if (portal.status === 'active' && portal.lastWinTime !== null) {
        if (!lastCompletedPortal || portal.lastWinTime > lastCompletedPortal.lastWinTime) {
          lastCompletedPortal = portal
        }
      }
    }
    
    // Если нет пройденных порталов, запускаем первый
    if (!lastCompletedPortal) {
      log('[PortalManager] no completed portals, starting growth for first portal')
      const firstLocked = randomPortals.find(p => p.status === 'locked')
      if (firstLocked) {
        this.startPortalGrowth(firstLocked.id)
      }
      return false
    }
    
    const maxGrowthTime = this.growthConfig.growthTimeMinutes * 4 * 60 * 1000 // N * 4
    const now = Date.now()
    
    // Если прошло N*4 минут с последнего прохождения, все порталы активны
    if (now - lastCompletedPortal.lastWinTime >= maxGrowthTime) {
      log('[PortalManager] all portals should be active (player returned after long break)')
      randomPortals.forEach(p => {
        p.status = 'active'
        p.growthStartTime = null
      })
      return true
    }
    
    // Если есть растущий портал, ничего не делаем
    const growingPortal = randomPortals.find(p => p.status === 'growing')
    if (growingPortal) {
      return false
    }
    
    // Запускаем следующий портал в очереди
    this.startNextPortalGrowth()
    return false
  }

  // Активировать премиум портал за кристаллы
  activatePremiumPortal(id, playerCrystals) {
    const portal = this.getPortal(id)
    if (!portal || portal.type !== 'premium') {
      log('[PortalManager] not a premium portal:', id)
      return { success: false, error: 'Not a premium portal' }
    }
    
    const cost = portal.cost?.crystals || 0
    if (playerCrystals < cost) {
      log('[PortalManager] not enough crystals:', playerCrystals, 'needed:', cost)
      return { success: false, error: 'Not enough crystals', needed: cost, have: playerCrystals }
    }
    
    // Активируем портал
    portal.status = 'active'
    log('[PortalManager] activated premium portal', id, 'for', cost, 'crystals')
    
    return { success: true, cost }
  }

  // Получить стоимость премиум портала
  getPremiumPortalCost(id) {
    const portal = this.getPortal(id)
    return portal?.cost?.crystals || 0
  }

  // Обновить статус портала
  updatePortalStatus(id, status) {
    const portal = this.getPortal(id)
    if (portal) {
      portal.status = status
      if (status === 'active') {
        portal.lastWinTime = null
      }
    }
  }

  // Пометить портал как пройденный
  markPortalCompleted(id) {
    const portal = this.getPortal(id)
    if (!portal) return
    
    portal.lastWinTime = Date.now()
    portal.status = 'locked'
    log('[PortalManager] marked', id, 'as completed, lastWinTime:', portal.lastWinTime)
    
    // Запускаем рост следующего портала
    this.startNextPortalGrowth()
  }

  // Проверить доступность портала
  isPortalAvailable(id) {
    const portal = this.getPortal(id)
    if (!portal) return false
    
    // Активные порталы доступны
    if (portal.status === 'active') return true
    
    // Премиум порталы доступны за оплату
    if (portal.type === 'premium') return true
    
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