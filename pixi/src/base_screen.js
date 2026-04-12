import * as PIXI from 'pixi.js'
import { ColorMatrixFilter } from 'pixi.js'
import { EventEmitter } from 'events'
import { FONT } from './data/fonts.js'
import { colors } from './data/colors.js'
import { log } from './data/config.js'
import { soundManager } from './audio/sound_manager.js'
import { player } from './data/player.js'
import { Portal } from './ui/portal.js'
import { PortalAltar } from './ui/portal_altar.js'
import { Castle } from './ui/castle.js'
import { Birds } from './ui/birds.js'
import { Clouds } from './ui/clouds.js'
import { getCardStyle } from './data/card_styles.js'
import { collectionManager } from './data/collection_manager.js'
import { deckManager } from './data/deck_manager.js'
import { t } from './data/i18n.js'
import { playerUI } from './ui/player_ui.js'
import { portalManager } from './data/portal_manager.js'

const ASSETS = {
  bg: '/assets/img/base_bg.png',
  base: '/assets/img/base.png',
  portal: '/assets/img/portal.png'
}

import { Z } from './data/z_index.js'

export class BaseScreen extends EventEmitter {
  constructor(app, cardTypes = []) {
    super()
    this.app = app
    this.cardTypes = cardTypes
    this.container = new PIXI.Container()
    this.container.zIndex = Z.bgBase
    this.assets = {}
    this._tickerCallback = null
  }

  async init(completedPortals = []) {
    this.completedPortals = completedPortals
    log('[BaseScreen] init() called with completedPortals:', completedPortals)
    
    // Загружаем конфигурацию порталов
    await portalManager.load()
    
    await this.loadAssets()
    this.render()
    this.app.stage.addChild(this.container)
    this.app.stage.sortChildren()
    this.container.alpha = 0
    this.fadeIn()
  }

  async loadAssets() {
    const urls = Object.values(ASSETS)
    await PIXI.Assets.load(urls)
    
    this.assets = {}
    for (const [key, url] of Object.entries(ASSETS)) {
      this.assets[key] = { texture: PIXI.Assets.get(url) }
    }
    
    // Загружаем ассеты алтарей
    await this.loadAltarAssets()
    
    // Загружаем ассеты карт (для хранилища и колоды)
    await this.loadCardAssets()
  }
  
  async loadAltarAssets() {
    const altarTypes = portalManager.altarTypes || {}
    const portalTypes = portalManager.portalTypes || {}
    const urls = []
    
    Object.values(altarTypes).forEach(config => {
      if (config.image) urls.push(config.image)
    })
    
    // Загружаем ассеты порталов по типам
    Object.values(portalTypes).forEach(config => {
      if (config.image) urls.push(config.image)
    })
    
    if (urls.length > 0) {
      await PIXI.Assets.load(urls)
      
      this.altarAssets = {}
      Object.entries(altarTypes).forEach(([key, config]) => {
        if (config.image) {
          this.altarAssets[key] = { texture: PIXI.Assets.get(config.image) }
        }
      })
      
      this.portalAssets = {}
      Object.entries(portalTypes).forEach(([key, config]) => {
        if (config.image) {
          this.portalAssets[key] = { texture: PIXI.Assets.get(config.image) }
        }
      })
    }
  }
  
  async loadCardAssets() {
    if (!this.cardTypes) return
    
    const urls = []
    this.cardTypes.forEach(type => {
      if (type.image) urls.push(type.image)
      // Получаем стиль для карты
      const style = getCardStyle(type.style)
      if (style && style.image_bg) urls.push(style.image_bg)
    })
    
    if (urls.length > 0) {
      await PIXI.Assets.load(urls)
      
      // Сохраняем маппинг
      this.cardAssets = {}
      this.cardTypes.forEach(type => {
        if (type.image) {
          this.cardAssets[`card_${type.type}`] = { texture: PIXI.Assets.get(type.image) }
        }
        const style = getCardStyle(type.style)
        if (style && style.image_bg) {
          this.cardAssets[`card_bg_${type.type}`] = { texture: PIXI.Assets.get(style.image_bg) }
        }
      })
    }
  }

  render() {
    log('[BaseScreen] render() START')
    this.container.removeChildren()

    // Фон (cover)
    if (this.assets.bg && this.assets.bg.texture) {
      const bg = new PIXI.Sprite(this.assets.bg.texture)
      this.scaleToCover(bg, this.app.screen.width, this.app.screen.height)
      this.container.addChild(bg)
    } else {
      const bg = new PIXI.Graphics()
      bg.beginFill(colors.background.map)
      bg.drawRect(0, 0, this.app.screen.width, this.app.screen.height)
      bg.endFill()
      this.container.addChild(bg)
    }

    // Птицы на фоне
    this.birds = new Birds(this.app, { count: 12, speed: 0.6 })
    this.container.addChild(this.birds.container)
    
    // Облака на фоне
    this.clouds = new Clouds(this.app, { count: 8, speed: 0.15 })
    this.container.addChild(this.clouds.container)

    // База - Замок (по центру горизонтально, 2/3 сверху)
    const baseTexture = this.assets.base?.texture || null
    // Объединяем базовые ассеты и ассеты карт
    const allAssets = { ...this.assets, ...this.cardAssets }
    this.castle = new Castle({
      texture: baseTexture,
      width: 220,
      height: 220,
      app: this.app,
      cardTypes: this.cardTypes || [],
      assets: allAssets,
      baseScreen: this // Передаём ссылку на себя для обновления UI
    })
    this.castle.setX(this.app.screen.width / 2)
    this.castle.setY(this.app.screen.height * 0.76)
    this.container.addChild(this.castle)

    // Порталы - загружаем из PortalManager
    this.createPortals()
    
    // Информация об игроке (левый верхний угол)
    this.createPlayerInfo()
  }

  createPlayerInfo() {
    // Используем playerUI
    const ui = playerUI.create(this.app)
    this.container.addChild(ui)
  }

  // Обновить информацию (теперь просто вызывает playerUI.update())
  updateDeckInfo() {
    playerUI.update()
  }

  // Позиции порталов на базе (статические позиции в долях экрана 1920×1080)
  // Учитываем что Portal имеет pivot по центру (160px / 2 = 80px смещение)
  getPortalPositions(){return[{id:"portal_1",x:.863,y:.511},{id:"portal_2",x:.25,y:.25},{id:"portal_3",x:.25,y:.8},{id:"portal_4",x:.906,y:.112},{id:"portal_5",x:.625,y:.833},{id:"portal_6",x:.594,y:.278}]}

  createPortals() {
    this.portals = []
    this.portalAltars = []

    log('[BaseScreen] createPortals() START')
    
    const allPortals = portalManager.getAllPortals()
    log('[BaseScreen]   total portals:', allPortals.length)
    log('[BaseScreen]   completedPortals:', this.completedPortals)

    // Сначала создаём ВСЕ алтари (включая закрытые порталы)
    allPortals.forEach(portalData => {
      const position = portalManager.getPosition(portalData.id)
      if (!position) return

      const x = this.app.screen.width * position.x
      const y = this.app.screen.height * position.y

      // Создаём алтарь для всех порталов с altarType
      if (portalData.altarType && this.altarAssets) {
        const altarConfig = portalManager.getAltarConfig(portalData.altarType)
        const altarTexture = altarConfig ? this.altarAssets[portalData.altarType]?.texture : null
        
        if (altarTexture) {
          const status = portalManager.getPortalStatus(portalData.id)
          const isAvailable = portalManager.isPortalAvailable(portalData.id)
          
          const altar = new PortalAltar({
            texture: altarTexture,
            width: 75,
            height: 75,
            app: this.app,
            portalType: portalData.type,
            status: isAvailable ? 'active' : status
          })
          altar.setX(x)
          altar.setY(y + 60)
          altar.portalId = portalData.id
          this.container.addChild(altar)
          this.portalAltars.push(altar)
        }
      }
    })

    // Затем создаём только активные порталы (над алтарями)
    allPortals.forEach(portalData => {
      // Пропускаем пройденные порталы
      if (this.completedPortals.includes(portalData.id)) {
        log('[BaseScreen]   skipping completed portal:', portalData.id)
        return
      }

      const position = portalManager.getPosition(portalData.id)
      if (!position) return

      const x = this.app.screen.width * position.x
      const y = this.app.screen.height * position.y

      // Проверяем доступность портала
      const status = portalManager.getPortalStatus(portalData.id)
      const isAvailable = portalManager.isPortalAvailable(portalData.id)

      // Получаем конфиг портала (картинка, цвет свечения)
      const portalConfig = portalManager.getPortalConfig(portalData.id)
      const glowColor = portalConfig?.glowColor || 0x00ff00
      
      // Загружаем текстуру портала по типу из кэша
      let portalTexture = null
      const portalType = portalManager.getPortalType(portalData.id)
      if (this.portalAssets && this.portalAssets[portalType]) {
        portalTexture = this.portalAssets[portalType].texture
      }
      if (!portalTexture) {
        portalTexture = this.assets.portal?.texture || null
      }

      // Создаём портал
      const portal = new Portal({
        texture: portalTexture,
        width: 160,
        height: 160,
        app: this.app,
        portalType: portalData.type,
        glowColor: glowColor,
        status: isAvailable ? 'active' : status,
        onClick: () => {
          if (isAvailable) {
            this.emit('start_game', portalData.id)
          }
        }
      })
      portal.setX(x)
      portal.setY(y)
      portal.portalId = portalData.id
      this.container.addChild(portal)
      this.portals.push(portal)

      log('[BaseScreen]   created portal:', portalData.id, 'type:', portalData.type, 'status:', status)
    })
  }

  fadeIn() {
    // Останавливаем музыку карты и запускаем музыку базы
    soundManager.stopMusic()
    soundManager.playMusic('baseBg')
    
    const animate = () => {
      this.container.alpha += 0.05
      if (this.container.alpha < 1) {
        requestAnimationFrame(animate)
      }
    }
    animate()
    
    // Сохраняем ссылку на функцию для корректного удаления
    this._tickerCallback = () => this.update()
    this.app.ticker.add(this._tickerCallback)
  }

  hide() {
    log('[BaseScreen] hide() called')
    
    // Флаг для защиты от обновлений во время fadeOut
    this._isHiding = true
    
    // Останавливаем тикер СРАЗУ, чтобы не вызывать update() во время fadeOut
    if (this._tickerCallback) {
      log('[BaseScreen] removing ticker')
      this.app.ticker.remove(this._tickerCallback)
      this._tickerCallback = null
    }
    
    // Удаляем порталы ПЕРЕД birds/clouds (чтобы остановить их update первыми)
    if (this.portals && this.portals.length > 0) {
      log('[BaseScreen] destroying portals, count:', this.portals.length)
      // Копируем массив чтобы не модифицировать во время итерации
      const portalsCopy = [...this.portals]
      this.portals = []
      portalsCopy.forEach((p, i) => {
        log('[BaseScreen] destroying portal', i)
        if (p && p.destroy) {
          try {
            p.destroy()
          } catch (e) {
            console.error('[BaseScreen] error destroying portal:', e)
          }
        }
      })
    }
    
    // Удаляем птиц
    if (this.birds) {
      log('[BaseScreen] destroying birds')
      try {
        this.birds.destroy()
      } catch (e) {
        console.error('[BaseScreen] error destroying birds:', e)
      }
      this.birds = null
    }
    
    // Удаляем облака
    if (this.clouds) {
      log('[BaseScreen] destroying clouds')
      try {
        this.clouds.destroy()
      } catch (e) {
        console.error('[BaseScreen] error destroying clouds:', e)
      }
      this.clouds = null
    }
    
    // Синхронно скрываем контейнер (без анимации для надёжности)
    log('[BaseScreen] removing container from stage')
    this.container.alpha = 0
    this._isHiding = false
    this.app.stage.removeChild(this.container)
    log('[BaseScreen] hide() done')
  }

  update() {
    // Защита от вызова после hide()
    if (this._isHiding) return
    
    // Обновляем статусы порталов (проверка времени роста)
    if (this.portals) {
      this.portals.forEach(p => {
        const newStatus = portalManager.getPortalStatus(p.portalId)
        if (p.status !== newStatus) {
          p.setStatus(newStatus)
        }
        p.update()
      })
    }
    
    // Обновляем алтари
    if (this.portalAltars) {
      this.portalAltars.forEach(a => {
        const newStatus = portalManager.getPortalStatus(a.portalId)
        if (a.status !== newStatus) {
          a.setStatus(newStatus)
        }
      })
    }
    
    if (this.castle) {
      this.castle.update()
    }
  }

  removePortal(portalId) {
    if (!this.portals) return
    const idx = this.portals.findIndex(p => p.portalId === portalId)
    if (idx !== -1) {
      const portal = this.portals[idx]
      this.container.removeChild(portal)
      this.portals.splice(idx, 1)
    }
  }

  scaleToCover(sprite, targetWidth, targetHeight) {
    const scaleX = targetWidth / sprite.texture.width
    const scaleY = targetHeight / sprite.texture.height
    const scale = Math.max(scaleX, scaleY)
    sprite.scale.set(scale)
    sprite.x = (targetWidth - sprite.texture.width * scale) / 2
    sprite.y = (targetHeight - sprite.texture.height * scale) / 2
  }
}
