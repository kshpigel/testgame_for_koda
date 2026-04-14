/**
 * GameState - глобальное состояние порталов
 * Единый источник истины для статусов порталов и очереди роста
 */

export class GameState {
  constructor() {
    // Массив всех порталов с их статусами
    // Пример: [{ id: 'portal_1', status: 'locked', lastWinTime: null }, ...]
    this.portals = []
    
    // Инициализирован ли GameState
    this.initialized = false
  }

  /**
   * Инициализировать GameState из данных PortalManager
   * @param {Array} portalData - массив объектов порталов из PortalManager
   */
  initFromPortals(portalData) {
    if (this.initialized) {
      console.warn('[GameState] already initialized, skipping')
      return
    }

    this.portals = portalData.map(p => ({
      id: p.id,
      status: p.status,
      lastWinTime: p.lastWinTime || null
    }))

    this.initialized = true
    console.log('[GameState] initialized with', this.portals.length, 'portals')
    this.debug()
  }

  /**
   * Получить портал по ID
   * @param {string} portalId 
   * @returns {Object|null}
   */
  getPortal(portalId) {
    return this.portals.find(p => p.id === portalId) || null
  }

  /**
   * Установить статус портала (управляет очередью автоматически)
   * @param {string} portalId 
   * @param {string} newStatus - 'locked' | 'growing' | 'active' | 'hidden'
   */
  setStatus(portalId, newStatus) {
    const portal = this.getPortal(portalId)
    if (!portal) {
      console.error('[GameState] setStatus: portal not found', portalId)
      return
    }

    const oldStatus = portal.status
    portal.status = newStatus

    // Синхронизируем с PortalManager
    const managerPortal = portalManager.getPortal(portalId)
    if (managerPortal) {
      managerPortal.status = newStatus
    }

    console.log('[GameState] setStatus:', portalId, oldStatus, '->', newStatus)

    // После изменения статуса проверяем, нужно ли запустить следующий портал
    if (oldStatus === 'growing') {
      // Портал перестал расти (стал active или locked/hidden)
      this.checkNextPortalToGrow()
    }

    return true
  }

  /**
   * Получить растущий портал
   * @returns {Object|null}
   */
  getGrowingPortal() {
    return this.portals.find(p => p.status === 'growing') || null
  }

  /**
   * Получить первый locked/hidden портал для роста
   * Приоритет: новые порталы (без lastWinTime) > пройденные (по lastWinTime)
   */
  getNextLockedPortal() {
    // Ищем locked или hidden порталы (оба ждут роста)
    const waitingPortals = this.portals.filter(p => p.status === 'locked' || p.status === 'hidden')
    
    if (waitingPortals.length === 0) {
      return null
    }
    
    // Сортируем: новые (без lastWinTime) первыми, затем по lastWinTime
    waitingPortals.sort((a, b) => {
      // Новые порталы (без lastWinTime) идут первыми
      if (!a.lastWinTime && b.lastWinTime) return -1
      if (a.lastWinTime && !b.lastWinTime) return 1
      // Если оба имеют lastWinTime - сортируем по времени (раньше пройден = раньше растёт)
      return (a.lastWinTime || 0) - (b.lastWinTime || 0)
    })
    
    return waitingPortals[0] || null
  }

  /**
   * Проверить и запустить следующий портал на рост
   * Вызывается:
   * - когда портал завершил рост (growing -> active)
   * - когда игрок вернулся на базу и все порталы скрыты
   */
  checkNextPortalToGrow() {
    // Если уже есть растущий портал - ничего не делаем
    const growing = this.getGrowingPortal()
    if (growing) {
      console.log('[GameState] checkNextPortalToGrow: portal', growing.id, 'is already growing')
      return
    }

    // Ищем следующий locked/hidden портал
    const nextLocked = this.getNextLockedPortal()
    if (!nextLocked) {
      console.log('[GameState] checkNextPortalToGrow: no locked portals, all active')
      return
    }

    // Запускаем рост через PortalManager (устанавливает growthStartTime и меняет статус)
    console.log('[GameState] checkNextPortalToGrow: starting growth for', nextLocked.id)
    console.log('[GameState] window.portalManager exists:', !!window.portalManager)
    if (window.portalManager) {
      console.log('[GameState] calling startPortalGrowth')
      window.portalManager.startPortalGrowth(nextLocked.id)
      // startPortalGrowth уже меняет статус в portalsData, синхронизируем GameState
      // НЕ вызываем setStatus - это вызовет цикл (setStatus -> checkNextPortalToGrow)
      const portal = this.getPortal(nextLocked.id)
      if (portal) {
        portal.status = 'growing'
      }
    } else {
      console.error('[GameState] window.portalManager NOT FOUND!')
    }
  }

  /**
   * Обновить lastWinTime портала (после прохождения)
   * @param {string} portalId 
   */
  setLastWinTime(portalId) {
    const portal = this.getPortal(portalId)
    if (portal) {
      portal.lastWinTime = Date.now()
    }
  }

  /**
   * Проверить, все ли порталы active
   * @returns {boolean}
   */
  allPortalsActive() {
    return this.portals.every(p => p.status === 'active')
  }

  /**
   * Получить количество порталов со статусом
   * @param {string} status 
   * @returns {number}
   */
  countByStatus(status) {
    return this.portals.filter(p => p.status === status).length
  }

  /**
   * Вывести текущее состояние для отладки
   */
  debug() {
    console.log('[GameState] DEBUG:')
    console.log('  initialized:', this.initialized)
    console.log('  portals:')
    this.portals.forEach(p => {
      console.log('    -', p.id, ':', p.status, '(lastWinTime:', p.lastWinTime ? new Date(p.lastWinTime).toLocaleTimeString() : 'null', ')')
    })
    console.log('  growing:', this.getGrowingPortal()?.id || 'none')
    console.log('  next locked:', this.getNextLockedPortal()?.id || 'none')
  }

  /**
   * Сбросить состояние (для тестов или пересоздания)
   */
  reset() {
    this.portals = []
    this.initialized = false
    console.log('[GameState] reset')
  }
}

// Глобальный экземпляр GameState
export const gameState = new GameState()