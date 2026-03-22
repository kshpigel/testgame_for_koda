import * as PIXI from 'pixi.js'
import { ColorMatrixFilter } from 'pixi.js'
import { EventEmitter } from 'events'
import { FONT } from './data/fonts.js'
import { colors } from './data/colors.js'
import { log } from './data/config.js'
import { soundManager } from './audio/sound_manager.js'
import { player } from './data/player.js'
import { Portal } from './ui/portal.js'

const ASSETS = {
  bg: '/assets/img/base_bg.png',
  base: '/assets/img/base.png',
  portal: '/assets/img/portal.png'
}

import { Z } from './data/z_index.js'

export class BaseScreen extends EventEmitter {
  constructor(app) {
    super()
    this.app = app
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

    // База (по центру горизонтально, 2/3 сверху)
    if (this.assets.base && this.assets.base.texture) {
      this.base = new PIXI.Sprite(this.assets.base.texture)
      this.base.anchor.set(0.5, 1)
      this.base.x = this.app.screen.width / 2
      this.base.y = this.app.screen.height * 0.76
      // Масштабируем до 300x300
      const targetW = 220
      const targetH = 220
      const scale = Math.min(
        targetW / this.base.texture.width,
        targetH / this.base.texture.height
      )
      this.base.scale.set(scale)
      this.base.eventMode = 'static'
      this.base.cursor = 'pointer'
      
      // Glow эффект для базы
      const baseGlow = new ColorMatrixFilter()
      baseGlow.brightness(1.3, false)
      
      this.base.on('pointerover', () => {
        this.base.filters = [baseGlow]
        soundManager.play('hover')
      })
      
      this.base.on('pointerout', () => {
        this.base.filters = null
      })
      
      this.container.addChild(this.base)
    }

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
        width: 200,
        height: 200,
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
    if (this._tickerCallback) {
      this.app.ticker.remove(this._tickerCallback)
      this._tickerCallback = null
    }
    const animate = () => {
      this.container.alpha -= 0.05
      if (this.container.alpha <= 0) {
        this.app.stage.removeChild(this.container)
      } else {
        requestAnimationFrame(animate)
      }
    }
    animate()
  }

  update() {
    if (this.portals) {
      this.portals.forEach(p => p.update())
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
