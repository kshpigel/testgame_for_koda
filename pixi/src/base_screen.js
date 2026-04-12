import * as PIXI from 'pixi.js'
import { ColorMatrixFilter } from 'pixi.js'
import { EventEmitter } from 'events'
import { FONT } from './data/fonts.js'
import { colors } from './data/colors.js'
import { log } from './data/config.js'
import { soundManager } from './audio/sound_manager.js'
import { player } from './data/player.js'
import { Modal } from './ui/modal.js'
import { Castle } from './ui/castle.js'
import { Birds } from './ui/birds.js'
import { Clouds } from './ui/clouds.js'
import { getCardStyle } from './data/card_styles.js'
import { collectionManager } from './data/collection_manager.js'
import { deckManager } from './data/deck_manager.js'
import { t } from './data/i18n.js'
import { playerUI } from './ui/player_ui.js'
import { portalManager } from './data/portal_manager.js'
import { PortalRenderer } from './ui/portal_renderer.js'

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
    this.portalRenderer = null
  }

  async init(completedPortals = []) {
    this.completedPortals = completedPortals
    log('[BaseScreen] init() called with completedPortals:', completedPortals)
    
    // Включаем сортировку детей по zIndex
    this.container.sortableChildren = true
    
    // Загружаем конфигурацию порталов
    await portalManager.load()
    
    await this.loadAssets()
    
    // Создаём PortalRenderer ПОСЛЕ загрузки ассетов
    this.portalRenderer = new PortalRenderer(this.container, this.app, this)
    
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
    
    log('[BaseScreen] loaded main assets:', Object.keys(this.assets))
    
    // Загружаем ассеты алтарей
    await this.loadAltarAssets()
    
    log('[BaseScreen] altarAssets:', this.altarAssets ? Object.keys(this.altarAssets) : 'null')
    
    // Загружаем ассеты карт (для хранилища и колоды)
    await this.loadCardAssets()
  }
  
  async loadAltarAssets() {
    const altarTypes = portalManager.altarTypes || {}
    const portalTypes = portalManager.portalTypes || {}
    
    log('[BaseScreen] loadAltarAssets - altarTypes:', Object.keys(altarTypes), 'portalTypes:', Object.keys(portalTypes))
    
    const urls = []
    
    Object.values(altarTypes).forEach(config => {
      if (config.image) urls.push(config.image)
    })
    
    // Загружаем ассеты порталов по типам
    Object.values(portalTypes).forEach(config => {
      if (config.image) urls.push(config.image)
    })
    
    log('[BaseScreen] loading URLs:', urls)
    
    if (urls.length > 0) {
      await PIXI.Assets.load(urls)
      
      this.altarAssets = {}
      Object.entries(altarTypes).forEach(([key, config]) => {
        if (config.image) {
          const tex = PIXI.Assets.get(config.image)
          log('[BaseScreen] altarAssets[' + key + ']:', !!tex, config.image)
          this.altarAssets[key] = { texture: tex }
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
    
    // Фон и база (из уже загруженных ассетов)
    const bg = new PIXI.Sprite(this.assets.bg.texture)
    bg.width = this.app.screen.width
    bg.height = this.app.screen.height
    bg.zIndex = 0
    this.container.addChild(bg)

    const base = new PIXI.Sprite(this.assets.base.texture)
    base.width = this.app.screen.width * 0.6
    base.height = this.app.screen.height * 0.4
    base.x = (this.app.screen.width - base.width) / 2
    base.y = this.app.screen.height * 0.5
    base.zIndex = 10
    this.container.addChild(base)

    // Порталы и алтари
    this.portalRenderer.init(this.altarAssets)
    this.portalRenderer.render(this.completedPortals)

    // Замок (castle)
    this.castle = new Castle(this.app, this.assets.base.texture)
    this.castle.x = (this.app.screen.width - this.castle.width) / 2
    this.castle.y = this.app.screen.height * 0.5
    this.castle.zIndex = 10
    this.container.addChild(this.castle)

    // Птицы
    this.birds = new Birds(this.app)
    this.birds.y = 50
    this.birds.zIndex = 100
    this.container.addChild(this.birds)

    // Облака
    this.clouds = new Clouds(this.app)
    this.clouds.zIndex = 101
    this.container.addChild(this.clouds)

    // UI
    const playerUIContainer = playerUI.create(this.app)
    this.container.addChild(playerUIContainer)
    this.showDeckInfo()

    log('[BaseScreen] render() END')
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

  // Показать модалку "Портал не готов"
  showPortalNotReadyModal(portalId, status) {
    const timeLeft = portalManager.getTimeUntilAvailable(portalId)
    const timeStr = portalManager.formatTime(timeLeft)
    
    const title = status === 'growing' ? 'Портал растёт...' : 'Портал закрыт'
    const message = `Портал будет доступен через ${timeStr}`
    
    const modal = new Modal(this.app, {
      title,
      message,
      buttons: [{ text: 'OK', action: () => modal.destroy() }]
    })
    modal.container.zIndex = 100
    this.container.addChild(modal.container)
  }

  // Показать модалку премиум портала
  showPremiumPortalModal(portalId) {
    const cost = portalManager.getPremiumPortalCost(portalId)
    const crystals = player.crystals || 0
    
    const title = 'Активировать портал'
    const message = `Активировать премиум портал за ${cost} кристаллов?`
    
    const buttons = [
      { 
        text: 'Да', 
        action: () => {
          if (crystals >= cost) {
            const result = portalManager.activatePremiumPortal(portalId, crystals)
            if (result.success) {
              // Списать кристаллы
              player.crystals -= cost
              player.save()
              this.updateDeckInfo()
            }
          } else {
            const errModal = new Modal(this.app, {
              title: 'Недостаточно кристаллов',
              message: `У вас только ${crystals} кристаллов, нужно ${cost}`,
              buttons: [{ text: 'OK', action: () => errModal.destroy() }]
            })
            errModal.container.zIndex = 100
            this.container.addChild(errModal.container)
          }
        }
      },
      { text: 'Нет', action: () => {} }
    ]
    
    const modal = new Modal(this.app, { title, message, buttons })
    modal.container.zIndex = 100
    this.container.addChild(modal.container)
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
    
    // Удаляем порталы и алтари
    if (this.portalRenderer) {
      log('[BaseScreen] destroying portalRenderer')
      try {
        this.portalRenderer.destroy()
      } catch (e) {
        console.error('[BaseScreen] error destroying portalRenderer:', e)
      }
      this.portalRenderer = null
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
    
    // Обновляем порталы и алтари
    if (this.portalRenderer) {
      this.portalRenderer.update()
    }
    
    // Обновляем птиц и облака
    if (this.birds) this.birds.update()
    if (this.clouds) this.clouds.update()
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
