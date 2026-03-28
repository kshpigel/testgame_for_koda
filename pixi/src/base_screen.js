import * as PIXI from 'pixi.js'
import { ColorMatrixFilter } from 'pixi.js'
import { EventEmitter } from 'events'
import { FONT } from './data/fonts.js'
import { colors } from './data/colors.js'
import { log } from './data/config.js'
import { soundManager } from './audio/sound_manager.js'
import { player } from './data/player.js'
import { Portal } from './ui/portal.js'
import { Castle } from './ui/castle.js'
import { Birds } from './ui/birds.js'
import { Clouds } from './ui/clouds.js'
import { getCardStyle } from './data/card_styles.js'
import { collectionManager } from './data/collection_manager.js'
import { deckManager } from './data/deck_manager.js'
import { t } from './data/i18n.js'

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
    
    // Загружаем ассеты карт (для хранилища и колоды)
    await this.loadCardAssets()
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
      assets: allAssets
    })
    this.castle.setX(this.app.screen.width / 2)
    this.castle.setY(this.app.screen.height * 0.76)
    this.container.addChild(this.castle)

    // Порталы - статические позиции
    const positions = this.getPortalPositions()
    this.createPortals(positions)
    
    // Информация об игроке (левый верхний угол)
    this.createPlayerInfo()
  }

  createPlayerInfo() {
    const padding = 10
    const fontSize = 14
    const lineHeight = 18
    
    const text1 = new PIXI.Text(player.name, {
      fontFamily: FONT,
      fontSize: fontSize,
      fill: colors.ui.text.primary
    })
    
    const text2 = new PIXI.Text(`💰 ${player.gold}`, {
      fontFamily: FONT,
      fontSize: fontSize,
      fill: colors.ui.text.gold
    })
    
    const text3 = new PIXI.Text(`💎 ${player.crystals}`, {
      fontFamily: FONT,
      fontSize: fontSize,
      fill: colors.ui.text.crystals
    })
    
    // Фон
    const totalWidth = text1.width + text2.width + text3.width + padding * 4
    const height = lineHeight + padding * 2
    
    const bg = new PIXI.Graphics()
    bg.beginFill(0x000000, 0.25)
    bg.drawRoundedRect(0, 0, totalWidth, height, 8)
    bg.endFill()
    bg.x = 10
    bg.y = 10
    this.container.addChild(bg)
    
    // Размещаем горизонтально
    text1.x = padding
    text1.y = padding
    
    text2.x = padding + text1.width + 20
    text2.y = padding
    
    text3.x = padding + text1.width + text2.width + 40
    text3.y = padding
    
    this.container.addChild(text1, text2, text3)
    
    this.playerInfoContainer = bg
    
    // Информация о колоде (справа сверху)
    this.createDeckInfo()
  }

  // Информер выбранной колоды
  createDeckInfo() {
    const activeDeck = deckManager.getActiveDeck()
    const padding = 10
    const fontSize = 14
    
    let deckName = t('base.deck_not_selected')
    let deckCards = 0
    let deckSleeve = ''
    let isValid = false
    
    if (activeDeck) {
      deckName = activeDeck.name || 'Без названия'
      deckCards = activeDeck.cards?.length || 0
      const sleeve = collectionManager.getSleeve(activeDeck.sleeveId || 1)
      const sleeveName = sleeve?.name || 'Standard'
      const minCards = collectionManager.getMinCards(activeDeck.sleeveId || 1)
      isValid = deckCards >= minCards
      
      const validation = deckManager.validateDeck(activeDeck.id, this.cardTypes)
      isValid = validation.valid
    }
    
    const deckText = new PIXI.Text(deckName, {
      fontFamily: FONT,
      fontSize: fontSize,
      fill: isValid ? colors.ui.text.primary : 0xff6644
    })
    
    const cardsText = new PIXI.Text(isValid ? t('base.deck_ready', { count: deckCards }) : t('base.deck_not_ready', { count: deckCards }), {
      fontFamily: FONT,
      fontSize: 12,
      fill: isValid ? colors.ui.text.secondary : 0xff6644
    })
    
    // Фон
    const totalWidth = Math.max(deckText.width, cardsText.width) + padding * 2
    const height = 50
    
    const bg = new PIXI.Graphics()
    bg.beginFill(0x000000, 0.25)
    bg.drawRoundedRect(0, 0, totalWidth, height, 8)
    bg.endFill()
    bg.x = this.app.screen.width - totalWidth - 10
    bg.y = 10
    this.container.addChild(bg)
    
    deckText.x = padding
    deckText.y = padding
    
    cardsText.x = padding
    cardsText.y = padding + 18
    
    this.container.addChild(deckText, cardsText)
    
    this.deckInfoContainer = bg
  }

  // Позиции порталов на базе (статические)
  getPortalPositions() {
    return [
      { id: 'portal_1', x: 0.8, y: 0.4 },
      { id: 'portal_2', x: 0.25, y: 0.25 },
      { id: 'portal_3', x: 0.25, y: 0.8 }
    ]
  }

  createPortals(positions) {
    const texture = this.assets.portal?.texture || null
    this.portals = []

    log('[BaseScreen] createPortals() START')
    log('[BaseScreen]   positions:', positions.map(p => p.id))
    log('[BaseScreen]   completedPortals:', this.completedPortals)

    // Фильтруем пройденные порталы
    const activePositions = positions.filter(pos => 
      !this.completedPortals.includes(pos.id)
    )

    log('[BaseScreen]   activePositions:', activePositions.map(p => p.id))

    activePositions.forEach(pos => {
      const portal = new Portal({
        texture: texture,
        scale: 1,
        width: 160,
        height: 160,
        app: this.app,
        onClick: () => {
          this.emit('start_game', pos.id)
        }
      })
      portal.setX(this.app.screen.width * pos.x)
      portal.setY(this.app.screen.height * pos.y)
      portal.portalId = pos.id
      this.container.addChild(portal)
      this.portals.push(portal)
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
    
    if (this.portals) {
      this.portals.forEach(p => p.update())
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
