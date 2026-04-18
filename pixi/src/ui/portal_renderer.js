import * as PIXI from 'pixi.js'
import { Portal } from './portal.js'
import { PortalAltar } from './portal_altar.js'
import { portalManager } from '../data/portal_manager.js'
import { log } from '../data/config.js'

/**
 * PortalRenderer - управление порталами и алтарями на базе
 * 
 * Отвечает за:
 * - Создание порталов и алтарей ОДИН РАЗ при init()
 * - Обновление статусов через setStatus()
 * - Управление очередью роста
 */
export class PortalRenderer {
  constructor(container, app, baseScreen) {
    this.container = container
    this.app = app
    this.baseScreen = baseScreen
    this.portals = []
    this.portalAltars = []
    this.altarAssets = null
    this.portalAssets = null
    this.initialized = false
  }

  /**
   * Инициализация с ассетами алтарей и порталов
   */
  init(altarAssets, portalAssets) {
    this.altarAssets = altarAssets
    this.portalAssets = portalAssets
    
    // Создаём порталы и алтари ОДИН РАЗ
    if (!this.initialized) {
      this._createAllPortalsAndAltars()
      this.initialized = true
    }
  }

  /**
   * Создание всех порталов и алтарей (вызывается один раз)
   */
  _createAllPortalsAndAltars() {
    log('[PortalRenderer] _createAllPortalsAndAltars() called')
    
    const allPortals = portalManager.getAllPortals()
    
    // Создаём алтари
    allPortals.forEach(portalData => {
      const status = portalManager.getPortalStatus(portalData.id)
      
      // Пропускаем скрытые и пройденные
      if (status === 'hidden') return
      if (!portalData.altarType || !this.altarAssets) return

      const position = portalManager.getPosition(portalData.id)
      if (!position) return

      const x = this.app.screen.width * position.x
      const y = this.app.screen.height * position.y

      const altarConfig = portalManager.getAltarConfig(portalData.altarType)
      const altarTexture = altarConfig ? this.altarAssets[portalData.altarType]?.texture : null
      if (!altarTexture) return

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

      // Активные алтари кликабельны
      if (altarStatus === 'active') {
        altar.eventMode = 'static'
        altar.cursor = 'pointer'
        altar.on('pointerdown', () => this._onAltarClick(portalData))
      } else {
        altar.eventMode = 'none'
        altar.cursor = 'default'
      }

      this.container.addChild(altar)
      this.portalAltars.push(altar)
    })
    
    // Создаём порталы
    allPortals.forEach(portalData => {
      const status = portalManager.getPortalStatus(portalData.id)
      
      // Пропускаем скрытые
      if (status === 'hidden') return

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
      if (this.portalAssets && this.portalAssets[portalType]) {
        portalTexture = this.portalAssets[portalType].texture
      }
      if (!portalTexture) {
        portalTexture = this.app?.assets?.portal?.texture || null
      }

      const portal = new Portal({
        texture: portalTexture,
        width: 160,
        height: 160,
        app: this.app,
        portalType: portalData.type,
        portalId: portalData.id,
        glowColor: glowColor,
        status: portalStatus,
        baseScreen: this.baseScreen,
        onClick: () => this._onPortalClick(portalData.id)
      })
      portal.setX(x)
      portal.setY(y)
      portal.portalId = portalData.id
      portal.zIndex = 30

      // Скрываем locked порталы
      portal.alpha = portalStatus === 'locked' ? 0 : 1

      this.container.addChild(portal)
      this.portals.push(portal)

      log('[PortalRenderer] created portal:', portalData.id, 'status:', portalStatus, 'alpha:', portal.alpha)
    })
    
    log('[PortalRenderer] _createAllPortalsAndAltars() done, portals:', this.portals.length, 'altars:', this.portalAltars.length)
  }

  /**
   * Обновление статусов порталов (вызывается каждый тик)
   * Примечание: checkPortalGrowthComplete вызывается из Game.updatePortals() глобально
   */
  update() {
    if (!this.portals || this.portals.length === 0) return

    // Обновляем статусы и alpha
    this.portals.forEach(p => {
      const newStatus = portalManager.getPortalStatus(p.portalId)
      if (p.status !== newStatus) {
        p.setStatus(newStatus)
        p.status = newStatus
        log('[PortalRenderer] portal:', p.portalId, 'status changed to:', newStatus)
      }
      // Скрыты только hidden порталы, locked тоже скрыты (ждут роста)
      p.alpha = (p.status === 'hidden' || p.status === 'locked') ? 0 : 1
      p.update()
    })

    // Обновляем алтари
    this.portalAltars.forEach(a => {
      const newStatus = portalManager.getPortalStatus(a.portalId)
      if (a.status !== newStatus) {
        a.setStatus(newStatus)
        a.status = newStatus
      }
    })
  }

  /**
   * Обработчик клика на алтарь
   */
  _onAltarClick(portalData) {
    const status = portalManager.getPortalStatus(portalData.id)
    log('[PortalRenderer] clicked altar:', portalData.id, 'status:', status, 'type:', portalData.type, 'baseScreen:', !!this.baseScreen)

    if (!this.baseScreen) {
      log('[PortalRenderer] ERROR: baseScreen is null!')
      return
    }

    // Только активные порталы реагируют на клик
    if (status !== 'active') {
      log('[PortalRenderer] altar not active, ignoring click')
      return
    }

    // Клик по алтарю - показать модалку подтверждения
    altarContainer.eventMode = true
    altarContainer.hitArea = new PIXI.Rectangle(0, 0, altarWidth, altarHeight)
    altarContainer.on('pointertap', () => {
      this.baseScreen.showPortalConfirmModal(portalData.id)
    })
  }

  /**
   * Обработчик клика на портал
   */
  _onPortalClick(portalId) {
    const portalData = portalManager.getPortal(portalId)
    const portalStatus = portalManager.getPortalStatus(portalId)
    log('[PortalRenderer] portal clicked:', portalId, 'status:', portalStatus, 'type:', portalData?.type, 'baseScreen:', !!this.baseScreen)

    if (!this.baseScreen) {
      log('[PortalRenderer] ERROR: baseScreen is null!')
      return
    }

    if (portalStatus === 'active') {
      // Активный портал — показываем диалог подтверждения
      this.baseScreen.showPortalConfirmModal(portalId)
    }
  }
}
