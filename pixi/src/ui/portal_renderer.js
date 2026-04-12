import * as PIXI from 'pixi.js'
import { Portal } from './portal.js'
import { PortalAltar } from './portal_altar.js'
import { portalManager } from '../data/portal_manager.js'
import { log } from '../data/config.js'

/**
 * PortalRenderer - управление порталами и алтарями на базе
 * 
 * Отвечает за:
 * - Создание/удаление порталов
 * - Обновление alpha при смене статуса (locked/growing/active)
 * - Обработчики кликов на порталы и алтари
 */
export class PortalRenderer {
  constructor(container, app, game) {
    this.container = container
    this.app = app
    this.game = game
    this.portals = []
    this.portalAltars = []
    this.altarAssets = null
  }

  /**
   * Инициализация с ассетами алтарей
   */
  init(altarAssets) {
    this.altarAssets = altarAssets
  }

  /**
   * Создание всех порталов и алтарей
   */
  render(completedPortals) {
    log('[PortalRenderer] render() START, completedPortals:', completedPortals)
    
    const allPortals = portalManager.getAllPortals()
    
    // Создаём алтари
    this._createAltars(allPortals, completedPortals)
    
    // Создаём порталы
    this._createPortals(allPortals, completedPortals)
    
    log('[PortalRenderer] render() END, portals:', this.portals.length, 'altars:', this.portalAltars.length)
  }

  /**
   * Создание алтарей
   */
  _createAltars(allPortals, completedPortals) {
    allPortals.forEach(portalData => {
      const status = portalManager.getPortalStatus(portalData.id)
      
      // Пропускаем скрытые и пройденные
      if (status === 'hidden' || completedPortals.includes(portalData.id)) return
      if (!portalData.altarType || !this.altarAssets) {
        log('[PortalRenderer]   skipping altar:', portalData.id, 'altarType:', portalData.altarType, 'altarAssets:', !!this.altarAssets)
        return
      }

      const position = portalManager.getPosition(portalData.id)
      if (!position) return

      const x = this.app.screen.width * position.x
      const y = this.app.screen.height * position.y

      const altarConfig = portalManager.getAltarConfig(portalData.altarType)
      const altarTexture = altarConfig ? this.altarAssets[portalData.altarType]?.texture : null
      if (!altarTexture) {
        log('[PortalRenderer]   no texture for altar:', portalData.id, 'altarType:', portalData.altarType)
        return
      }

      log('[PortalRenderer]   creating altar:', portalData.id, 'texture:', !!altarTexture)

      const isAvailable = portalManager.isPortalAvailable(portalData.id)
      const altarStatus = isAvailable ? 'active' : status

      const altar = new PortalAltar({
        texture: altarTexture,
        width: 75,
        height: 75,
        app: this.app,
        portalType: portalData.type,
        status: altarStatus
      })
      altar.setX(x)
      altar.setY(y + 60)
      altar.portalId = portalData.id
      altar.zIndex = 20
      altar.eventMode = 'static'
      altar.cursor = 'pointer'

      // Обработчик клика на алтарь
      altar.on('pointerdown', () => this._onAltarClick(portalData))

      this.container.addChild(altar)
      this.portalAltars.push(altar)
    })
  }

  /**
   * Создание порталов
   */
  _createPortals(allPortals, completedPortals) {
    allPortals.forEach(portalData => {
      const status = portalManager.getPortalStatus(portalData.id)
      
      // Пропускаем скрытые и пройденные
      if (status === 'hidden' || completedPortals.includes(portalData.id)) return

      const position = portalManager.getPosition(portalData.id)
      if (!position) return

      const x = this.app.screen.width * position.x
      const y = this.app.screen.height * position.y

      const isAvailable = portalManager.isPortalAvailable(portalData.id)
      const portalStatus = isAvailable ? 'active' : status

      const portalConfig = portalManager.getPortalConfig(portalData.id)
      const glowColor = portalConfig?.glowColor || 0x00ff00

      const portalType = portalManager.getPortalType(portalData.id)
      let portalTexture = null
      if (this.altarAssets && this.altarAssets[portalType]) {
        portalTexture = this.altarAssets[portalType].texture
      }
      if (!portalTexture) {
        portalTexture = this.app.assets?.portal?.texture || null
      }

      const portal = new Portal({
        texture: portalTexture,
        width: 160,
        height: 160,
        app: this.app,
        portalType: portalData.type,
        glowColor: glowColor,
        status: portalStatus,
        onClick: () => this._onPortalClick(portalData, portalStatus)
      })
      portal.setX(x)
      portal.setY(y)
      portal.portalId = portalData.id
      portal.zIndex = 30

      // Скрываем locked порталы
      if (status === 'locked') {
        portal.alpha = 0
      }

      this.container.addChild(portal)
      this.portals.push(portal)

      log('[PortalRenderer]   created portal:', portalData.id, 'status:', status, 'alpha:', portal.alpha)
    })
  }

  /**
   * Обработчик клика на алтарь
   */
  _onAltarClick(portalData) {
    const status = portalManager.getPortalStatus(portalData.id)
    log('[PortalRenderer] clicked altar:', portalData.id, 'status:', status, 'type:', portalData.type)

    if (status === 'locked') {
      this.game.baseScreen.showPortalNotReadyModal(portalData.id, 'locked')
    } else if (status === 'growing') {
      this.game.baseScreen.showPortalNotReadyModal(portalData.id, 'growing')
    } else if (portalData.type === 'premium') {
      this.game.baseScreen.showPremiumPortalModal(portalData.id)
    }
  }

  /**
   * Обработчик клика на портал
   */
  _onPortalClick(portalData, portalStatus) {
    log('[PortalRenderer] portal clicked:', portalData.id, 'status:', portalStatus)

    if (portalStatus === 'active') {
      this.container.emit('start_game', portalData.id)
    } else if (portalStatus === 'growing') {
      this.game.baseScreen.showPortalNotReadyModal(portalData.id, 'growing')
    }
  }

  /**
   * Обновление статусов порталов (вызывается каждый тик)
   */
  update() {
    if (!this.portals) return

    // Проверяем завершение роста
    const randomPortals = portalManager.getRandomPortals()
    randomPortals.forEach(portal => {
      portalManager.checkPortalGrowthComplete(portal.id)
    })

    // Обновляем статусы и alpha
    this.portals.forEach(p => {
      const newStatus = portalManager.getPortalStatus(p.portalId)
      if (p.status !== newStatus) {
        p.setStatus(newStatus)
        // Обновляем alpha при смене статуса
        p.alpha = newStatus === 'locked' ? 0 : 1
        log('[PortalRenderer] portal:', p.portalId, 'status:', newStatus, 'alpha:', p.alpha)
      }
      p.update()
    })

    // Обновляем алтари
    this.portalAltars.forEach(a => {
      const newStatus = portalManager.getPortalStatus(a.portalId)
      if (a.status !== newStatus) {
        a.setStatus(newStatus)
      }
    })
  }

  /**
   * Удаление всех порталов и алтарей
   */
  destroy() {
    log('[PortalRenderer] destroy() called, portals:', this.portals.length, 'altars:', this.portalAltars.length)

    // Удаляем порталы первыми
    this.portals.forEach(p => {
      if (p && !p.destroyed) {
        p.destroy({ children: true })
      }
    })
    this.portals = []

    // Затем алтари
    this.portalAltars.forEach(a => {
      if (a && !a.destroyed) {
        a.destroy({ children: true })
      }
    })
    this.portalAltars = []
  }
}
